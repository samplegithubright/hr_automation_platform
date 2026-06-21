from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON, Float, func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String, nullable=False)
    organization_name = Column(String, nullable=False)
    organization_details = Column(Text, nullable=False)
    apply_link = Column(String, nullable=False)
    raw_description = Column(Text, nullable=False)
    polished_description = Column(Text, nullable=True)
    status = Column(String, default="draft", nullable=False)  # draft, approved, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    candidates = relationship("Candidate", back_populates="job", cascade="all, delete-orphan")
    social_asset = relationship("SocialAsset", back_populates="job", cascade="all, delete-orphan", uselist=False)


class SocialAsset(Base):
    __tablename__ = "social_assets"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    linkedin_caption = Column(Text, nullable=True)
    linkedin_groups = Column(JSON, nullable=True)  # List of strings
    
    twitter_caption = Column(String(500), nullable=True)
    twitter_groups = Column(JSON, nullable=True)
    
    facebook_caption = Column(Text, nullable=True)
    facebook_groups = Column(JSON, nullable=True)
    
    instagram_caption = Column(Text, nullable=True)
    instagram_groups = Column(JSON, nullable=True)
    
    visual_url = Column(String, nullable=True)  # URL/Path to the generated PNG

    # Relationships
    job = relationship("Job", back_populates="social_asset")


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    resume_path = Column(String, nullable=False)
    linkedin_url = Column(String, nullable=True)
    github_url = Column(String, nullable=True)
    consent_given = Column(Boolean, default=False, nullable=False)
    status = Column(String, default="applied", nullable=False)  # applied, shortlisted, rejected, interview
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    job = relationship("Job", back_populates="candidates")
    screening = relationship("Screening", back_populates="candidate", cascade="all, delete-orphan", uselist=False)


class Screening(Base):
    __tablename__ = "screenings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # CV screening scores
    skills_score = Column(Integer, default=0)
    experience_score = Column(Integer, default=0)
    education_score = Column(Integer, default=0)
    overall_score = Column(Integer, default=0)  # CV match score
    reasoning = Column(Text, nullable=True)
    
    # GitHub Check
    github_applicable = Column(Boolean, default=False)
    github_score = Column(Integer, nullable=True)  # consistency score
    github_analysis = Column(Text, nullable=True)
    
    # AI Resume Flag
    ai_resume_flag = Column(String, default="Low")  # Low, Medium, High
    ai_resume_reason = Column(Text, nullable=True)
    
    # Manual LinkedIn assessment (HR Input)
    linkedin_exists = Column(Boolean, nullable=True)
    linkedin_role_fit = Column(String, nullable=True)  # Low, Medium, High
    linkedin_red_flags = Column(Text, nullable=True)
    linkedin_score = Column(Integer, nullable=True)  # 0-100 rating input by HR
    
    # Combined score
    combined_score = Column(Float, nullable=True)

    # Relationships
    candidate = relationship("Candidate", back_populates="screening")
