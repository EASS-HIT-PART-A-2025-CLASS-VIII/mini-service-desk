#!/usr/bin/env python3
"""
Admin Seed Script - Creates an initial admin user for the mini-service-desk.

Usage:
    python scripts/seed_admin.py

Environment variables:
    ADMIN_EMAIL    - Admin email (default: admin@example.com)
    ADMIN_PASSWORD - Admin password (REQUIRED for production)
    ADMIN_NAME     - Admin name (default: Admin)
    DATABASE_URL   - Database connection URL
"""

import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session, select

from app.database import engine, init_db
from app.models.user import User
from app.services.security import hash_password, validate_password


def seed_admin():
    """Create initial admin user if not exists."""
    init_db()

    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_name = os.getenv("ADMIN_NAME", "Admin")
    admin_password = os.getenv("ADMIN_PASSWORD")

    if not admin_password:
        if os.getenv("ENV") == "prod":
            print("ERROR: ADMIN_PASSWORD environment variable required in production")
            sys.exit(1)
        # Default password for development only
        admin_password = "Admin123!"
        print("WARNING: Using default dev password. Set ADMIN_PASSWORD in production.")

    # Validate password strength
    is_valid, error_msg = validate_password(admin_password)
    if not is_valid:
        print(f"ERROR: {error_msg}")
        sys.exit(1)

    with Session(engine) as session:
        # Check if admin already exists
        existing = session.exec(select(User).where(User.email == admin_email)).first()

        if existing:
            print(f"Admin user already exists: {admin_email}")
            if not existing.is_admin:
                existing.is_admin = True
                session.add(existing)
                session.commit()
                print(f"Promoted existing user to admin: {admin_email}")
            return

        # Create new admin user
        admin_user = User(
            name=admin_name,
            email=admin_email,
            hashed_password=hash_password(admin_password),
            is_admin=True,
        )

        session.add(admin_user)
        session.commit()
        print(f"Created admin user: {admin_email}")


if __name__ == "__main__":
    seed_admin()
