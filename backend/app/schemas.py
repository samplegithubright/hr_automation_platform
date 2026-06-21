from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import List, Optional, Union
from datetime import datetime

# ==========================================
# Auth Schemas
# ==========================================

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ==========================================
# Job Schemas
# ==========================================

class JobCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=100)
    organization_name: str = Field(..., min_length=2, max_length=100)
    organization_details: str = Field(..., min_length=10)
    apply_link: str = Field(..., min_length=5)
    raw_description: str = Field(..., min_length=10)

class JobUpdate(BaseModel):
    title: Optional[str] = None
    organization_name: Optional[str] = None
    organization_details: Optional[str] = None
    apply_link: Optional[str] = None
    raw_description: Optional[str] = None
    polished_description: Optional[str] = None
    status: Optional[str] = None  # draft, approved, rejected

class JobResponse(BaseModel):
    id: int
    title: str
    organization_name: str
    organization_details: str
    apply_link: str
    raw_description: str
    polished_description: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==========================================
# Social Asset Schemas
# ==========================================

class SocialAssetResponse(BaseModel):
    id: int
    job_id: int
    linkedin_caption: Optional[str] = None
    linkedin_groups: Optional[List[str]] = None
    twitter_caption: Optional[str] = None
    twitter_groups: Optional[List[str]] = None
    facebook_caption: Optional[str] = None
    facebook_groups: Optional[List[str]] = None
    instagram_caption: Optional[str] = None
    instagram_groups: Optional[List[str]] = None
    visual_url: Optional[str] = None

    class Config:
        from_attributes = True


# ==========================================
# Screening Schemas
# ==========================================

class LinkedInCheckInput(BaseModel):
    linkedin_exists: bool
    linkedin_role_fit: str = Field(..., description="Low, Medium, High")
    linkedin_red_flags: Optional[str] = ""
    linkedin_score: int = Field(..., ge=0, le=100)

class ScreeningResponse(BaseModel):
    id: int
    candidate_id: int
    skills_score: int
    experience_score: int
    education_score: int
    overall_score: int
    reasoning: Optional[str] = None
    github_applicable: bool
    github_score: Optional[int] = None
    github_analysis: Optional[str] = None
    ai_resume_flag: str
    ai_resume_reason: Optional[str] = None
    linkedin_exists: Optional[bool] = None
    linkedin_role_fit: Optional[str] = None
    linkedin_red_flags: Optional[str] = None
    linkedin_score: Optional[int] = None
    combined_score: Optional[float] = None

    class Config:
        from_attributes = True


# ==========================================
# Candidate Schemas
# ==========================================

class CandidateCreate(BaseModel):
    name: str = Field(..., min_length=2)
    email: EmailStr
    phone: str = Field(..., min_length=5)
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    consent_given: bool = Field(..., description="Must be true")

class CandidateResponse(BaseModel):
    id: int
    job_id: int
    name: str
    email: EmailStr
    phone: str
    resume_path: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    consent_given: bool
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateDetailResponse(BaseModel):
    id: int
    job_id: int
    name: str
    email: EmailStr
    phone: str
    resume_path: str
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    consent_given: bool
    status: str
    created_at: datetime
    screening: Optional[ScreeningResponse] = None

    class Config:
        from_attributes = True
