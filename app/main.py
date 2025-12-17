from fastapi import FastAPI
from app.database import init_db
from app.routers import health
from app.routers import users
from app.routers import tickets

app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()

app.include_router(health.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(tickets.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Fitness API is running!"}