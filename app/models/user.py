from sqlmodel import SQLModel, Field
from pydantic import EmailStr
from typing import Optional


# Base model (shared fields)
class UserBase(SQLModel):
    name: str
    email: EmailStr


# Database table model
class User(UserBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    hashed_password: str
    is_active: bool = Field(default=False)


# Model for creating a user (request body)
class UserCreate(UserBase):
    password: str


# Model for returning a user (response body)
class UserRead(UserBase):
    id: int
    is_admin: bool