import os
from fastapi import FastAPI
from app.database import init_db
from app.routers import health
from app.routers import users
from app.routers import tickets
from app.routers import comments
from app.routers import chat
from app.routers import export
from fastapi.middleware.cors import CORSMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

ENV = os.getenv("ENV", "dev")  # "prod" on Render

app = FastAPI(
    title="Mini Service Desk",
    docs_url=None if ENV == "prod" else "/docs",
    redoc_url=None if ENV == "prod" else "/redoc",
    openapi_url=None if ENV == "prod" else "/openapi.json",
)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(health.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")
app.include_router(comments.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/")
def read_root():
    return {"message": "Service Desk API is running!"}


FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
