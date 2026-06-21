import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.future import select
from contextlib import asynccontextmanager

from app.config import settings
from app.database import Base, engine, AsyncSessionLocal
from app.models import User
from app.utils.security import get_password_hash
from app.routers import auth, jobs, candidates

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup tasks:
    # 1. Create database tables if they do not exist
    print("Database initialization starting...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables initialized.")

    # 2. Seed a default HR user if none exists
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == "hr@company.com"))
        default_user = result.scalars().first()
        if not default_user:
            print("Seeding default HR user: hr@company.com")
            hashed_pwd = get_password_hash("password123")
            new_user = User(email="hr@company.com", hashed_password=hashed_pwd)
            session.add(new_user)
            await session.commit()
            print("Default HR user seeded successfully.")
        else:
            # Check if existing user hash is a legacy bcrypt hash and migrate it to pbkdf2_sha256
            if not default_user.hashed_password.startswith("$pbkdf2-sha256$"):
                print("Legacy password hash detected. Migrating to pbkdf2_sha256...")
                default_user.hashed_password = get_password_hash("password123")
                await session.commit()
                print("Default HR user migrated to pbkdf2_sha256 successfully.")
            else:
                print("HR user already exists with a valid password hash.")
            
    yield
    # Shutdown tasks go here (none needed currently)

app = FastAPI(
    title="HR Automation Platform API",
    description="Backend API for candidate screening and job description management",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
# Allow Next.js frontend local port (usually 3000) and any production URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For production, narrow down to frontend host
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

# Mount the uploads folder statically under /static
app.mount("/static", StaticFiles(directory=settings.UPLOAD_DIR), name="static")


@app.get("/")
async def root():
    return {"message": "HR Automation Platform API is running."}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(candidates.router, prefix="/api")
