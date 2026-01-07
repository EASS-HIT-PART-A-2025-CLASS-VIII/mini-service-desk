"""Rate Limiter - Simple in-memory rate limiting for security-sensitive endpoints."""

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status


class RateLimiter:
    """
    Simple in-memory rate limiter using sliding window algorithm.
    Note: Resets on server restart. For production with multiple instances,
    consider using Redis.
    """

    def __init__(self):
        # Structure: {key: [(timestamp, count), ...]}
        self._requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str, limit: int, window_seconds: int) -> bool:
        """
        Check if a request is allowed for the given key.

        Args:
            key: Unique identifier (e.g., IP address + endpoint)
            limit: Maximum number of requests allowed
            window_seconds: Time window in seconds

        Returns:
            True if request is allowed, False if rate limited
        """
        now = time.time()
        window_start = now - window_seconds

        # Remove old entries outside the window
        self._requests[key] = [ts for ts in self._requests[key] if ts > window_start]

        if len(self._requests[key]) >= limit:
            return False

        self._requests[key].append(now)
        return True

    def clear(self, key: str) -> None:
        """Clear rate limit history for a key (e.g., after successful login)."""
        if key in self._requests:
            del self._requests[key]


# Global rate limiter instance
rate_limiter = RateLimiter()


def get_client_ip(request: Request) -> str:
    """Extract client IP from request, handling proxied requests."""
    # Check for forwarded header (when behind proxy)
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(limit: int = 5, window_seconds: int = 60, key_prefix: str = ""):
    """
    Dependency for rate limiting endpoints.

    Args:
        limit: Maximum requests per window
        window_seconds: Time window in seconds
        key_prefix: Optional prefix for the rate limit key
    """

    def dependency(request: Request):
        ip = get_client_ip(request)
        key = f"{key_prefix}:{ip}" if key_prefix else ip

        if not rate_limiter.is_allowed(key, limit, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests. Please wait {window_seconds} seconds.",
            )
        return ip

    return dependency


# Predefined rate limit dependencies for common use cases
rate_limit_login = rate_limit(limit=5, window_seconds=60, key_prefix="login")
rate_limit_register = rate_limit(limit=3, window_seconds=60, key_prefix="register")
