#!/usr/bin/env python3
"""
Async Refresh Script - Session 09 Deliverable

This script demonstrates:
- Bounded concurrency using asyncio.Semaphore
- Retry logic with exponential backoff
- Redis-backed idempotency to prevent duplicate processing

Usage:
    uv run python -m scripts.refresh
    # or
    python scripts/refresh.py
"""

import asyncio
import hashlib
import os
import sys
from datetime import datetime, timezone

# Add parent directory for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import redis.asyncio as aioredis
except ImportError:
    print("Redis package not installed. Run: uv add redis")
    sys.exit(1)

from sqlmodel import Session, select

from app.database import engine
from app.models.ticket import Ticket


# Configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
MAX_CONCURRENCY = 5  # Bounded concurrency
MAX_RETRIES = 3
RETRY_DELAY_BASE = 1  # seconds, exponential backoff
IDEMPOTENCY_TTL = 3600  # 1 hour


def get_idempotency_key(ticket_id: int, operation: str) -> str:
    """Generate a unique idempotency key for an operation."""
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    raw = f"refresh:{operation}:{ticket_id}:{date_str}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


async def refresh_ticket(
    ticket_id: int,
    redis_client: aioredis.Redis,
    semaphore: asyncio.Semaphore,
    dry_run: bool = False,
) -> dict:
    """
    Refresh a single ticket with idempotency check.

    Returns dict with status: 'processed', 'skipped', or 'error'
    """
    async with semaphore:  # Bounded concurrency
        idempotency_key = get_idempotency_key(ticket_id, "refresh")

        # Check if already processed (idempotency)
        if await redis_client.exists(idempotency_key):
            return {
                "ticket_id": ticket_id,
                "status": "skipped",
                "reason": "already processed",
            }

        # Retry logic with exponential backoff
        last_error = None
        for attempt in range(MAX_RETRIES):
            try:
                if dry_run:
                    result = f"Would refresh ticket {ticket_id}"
                else:
                    # Simulate refresh operation (e.g., update timestamp, sync with external system)
                    with Session(engine) as session:
                        ticket = session.get(Ticket, ticket_id)
                        if ticket:
                            ticket.updated_at = datetime.now(timezone.utc)
                            session.add(ticket)
                            session.commit()
                            result = f"Refreshed ticket {ticket_id}"
                        else:
                            result = f"Ticket {ticket_id} not found"

                # Mark as processed in Redis (idempotency)
                await redis_client.setex(idempotency_key, IDEMPOTENCY_TTL, "processed")

                return {"ticket_id": ticket_id, "status": "processed", "result": result}

            except Exception as e:
                last_error = str(e)
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAY_BASE * (2**attempt)
                    print(
                        f"Retry {attempt + 1}/{MAX_RETRIES} for ticket {ticket_id} in {delay}s: {e}"
                    )
                    await asyncio.sleep(delay)

        return {"ticket_id": ticket_id, "status": "error", "error": last_error}


async def refresh_all_tickets(dry_run: bool = False) -> dict:
    """
    Refresh all tickets with bounded concurrency and Redis idempotency.

    Returns summary of processed, skipped, and errored tickets.
    """
    # Connect to Redis
    redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

    try:
        # Verify Redis connection
        await redis_client.ping()
        print(f"Connected to Redis at {REDIS_URL}")

        # Get all ticket IDs
        with Session(engine) as session:
            tickets = session.exec(select(Ticket)).all()
            ticket_ids = [t.id for t in tickets]

        print(f"Found {len(ticket_ids)} tickets to process")

        # Process tickets concurrently with bounded concurrency
        tasks = [
            refresh_ticket(tid, redis_client, semaphore, dry_run) for tid in ticket_ids
        ]
        results = await asyncio.gather(*tasks)

        # Summarize results
        summary = {
            "total": len(results),
            "processed": sum(1 for r in results if r["status"] == "processed"),
            "skipped": sum(1 for r in results if r["status"] == "skipped"),
            "errors": sum(1 for r in results if r["status"] == "error"),
            "details": results,
        }

        return summary

    finally:
        await redis_client.aclose()


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Refresh tickets with Redis idempotency"
    )
    parser.add_argument(
        "--dry-run", action="store_true", help="Don't actually update tickets"
    )
    args = parser.parse_args()

    print("=" * 50)
    print("Ticket Refresh Script")
    print(f"Max Concurrency: {MAX_CONCURRENCY}")
    print(f"Max Retries: {MAX_RETRIES}")
    print(f"Dry Run: {args.dry_run}")
    print("=" * 50)

    summary = await refresh_all_tickets(dry_run=args.dry_run)

    print("\n" + "=" * 50)
    print("Summary:")
    print(f"  Total: {summary['total']}")
    print(f"  Processed: {summary['processed']}")
    print(f"  Skipped (idempotent): {summary['skipped']}")
    print(f"  Errors: {summary['errors']}")
    print("=" * 50)

    return summary


if __name__ == "__main__":
    asyncio.run(main())
