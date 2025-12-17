from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from app.database import get_session
from app.models.user import User, UserCreate, UserRead
from app.models.token import Token
from app.services.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter()


# ========= CREATE USER =========

@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def create_user(data: UserCreate, session: Session = Depends(get_session)):
    existing = session.exec(select(User).where(User.email == data.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
    )

    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user


# ========= CURRENT USER (PROTECTED) =========

@router.get("/users/me", response_model=UserRead)
async def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


# ========= GET USER BY ID =========

@router.get("/users/{user_id}", response_model=UserRead)
def get_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ========= LOGIN (OAuth2 password flow) =========

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: Session = Depends(get_session),
):
    # We log in using *email*, but OAuth2 form uses "username"
    email = form_data.username

    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    # Verify password using pwdlib
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token({"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}