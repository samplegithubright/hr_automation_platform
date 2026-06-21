import os
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import json

from app.database import get_db, AsyncSessionLocal
from app.models import Candidate, Screening, Job, User
from app.schemas import CandidateResponse, CandidateDetailResponse, ScreeningResponse, LinkedInCheckInput
from app.routers.auth import get_current_user
from app.services.storage_service import StorageService
from app.services.github_service import GitHubService
from app.services.ai_service import AIService
from app.utils.resume_parser import ResumeParser

router = APIRouter(prefix="/candidates", tags=["Candidates"])

def is_tech_role(job_title: str, polished_description: str) -> bool:
    """Helper to detect if a job description represents a technical role."""
    tech_keywords = [
        "software", "developer", "engineer", "tech", "programmer", "architect", 
        "data scientist", "analyst", "devops", "qa", "testing", "coder", 
        "frontend", "backend", "fullstack", "programming", "web"
    ]
    title_lower = job_title.lower()
    desc_lower = polished_description.lower() if polished_description else ""
    return any(kw in title_lower or kw in desc_lower for kw in tech_keywords)


@router.post("/apply/{job_id}", status_code=status.HTTP_201_CREATED)
async def apply_job(
    job_id: int,
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    consent_given: bool = Form(...),
    linkedin_url: Optional[str] = Form(None),
    github_url: Optional[str] = Form(None),
    resume: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Public candidate application endpoint.
    Uploads/validates resume (magic bytes, size <= 10MB) and registers candidate.
    Launches AI screening in the background.
    """
    if not consent_given:
        raise HTTPException(
            status_code=400, 
            detail="You must consent to AI screening and social checks to apply."
        )

    # Verify job exists and is approved
    job_res = await db.execute(select(Job).where(Job.id == job_id))
    job = job_res.scalars().first()
    if not job or job.status != "approved":
        raise HTTPException(status_code=404, detail="Job posting is not active.")

    # Validate and save resume file
    resume_path = await StorageService.save_resume(resume)

    # Save candidate
    candidate = Candidate(
        job_id=job_id,
        name=name,
        email=email,
        phone=phone,
        resume_path=resume_path,
        linkedin_url=linkedin_url,
        github_url=github_url,
        consent_given=consent_given,
        status="applied"
    )
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)

    # Trigger background AI screening task
    background_tasks.add_task(run_background_screening, candidate.id)

    return {
        "message": "Application submitted successfully.",
        "candidate_id": candidate.id
    }


@router.get("/job/{job_id}", response_model=List[CandidateDetailResponse])
async def get_job_candidates(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all candidates who applied to a specific job (HR only)."""
    # Eager load the screening relationship
    result = await db.execute(
        select(Candidate)
        .where(Candidate.job_id == job_id)
        .options(selectinload(Candidate.screening))
        .order_by(Candidate.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{candidate_id}/linkedin", response_model=ScreeningResponse)
async def submit_linkedin_check(
    candidate_id: int,
    check_in: LinkedInCheckInput,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Saves HR manual observations for LinkedIn profile.
    Recalculates the candidate's combined score.
    """
    # Fetch candidate
    cand_res = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = cand_res.scalars().first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Fetch screening record
    screen_res = await db.execute(select(Screening).where(Screening.candidate_id == candidate_id))
    screening = screen_res.scalars().first()
    if not screening:
        raise HTTPException(status_code=400, detail="Background screening has not run for this candidate yet.")

    # Update manual LinkedIn findings
    screening.linkedin_exists = check_in.linkedin_exists
    screening.linkedin_role_fit = check_in.linkedin_role_fit
    screening.linkedin_red_flags = check_in.linkedin_red_flags
    screening.linkedin_score = check_in.linkedin_score

    # Recompute combined score
    screening.combined_score = AIService.calculate_combined_score(
        cv_overall=screening.overall_score,
        github_applicable=screening.github_applicable,
        github_score=screening.github_score,
        linkedin_score=screening.linkedin_score
    )

    await db.commit()
    await db.refresh(screening)
    return screening


@router.delete("/{candidate_id}", status_code=status.HTTP_200_OK)
async def delete_candidate(
    candidate_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a candidate and their screening results (HR only)."""
    cand_res = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = cand_res.scalars().first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    # Remove resume file locally if present
    if candidate.resume_path and os.path.exists(candidate.resume_path):
        try:
            os.remove(candidate.resume_path)
        except Exception as e:
            print(f"Failed to delete resume file: {e}")

    await db.delete(candidate)
    await db.commit()
    return {"message": "Candidate deleted successfully."}


async def run_background_screening(candidate_id: int):
    """
    FastAPI Background Worker task:
    Parses resume text -> Scores CV -> Fetches GitHub data -> Scores consistency -> Saves screening details.
    """
    # Since background tasks run outside the request lifecycle, we open a new database session
    async with AsyncSessionLocal() as db:
        try:
            # 1. Fetch Candidate & Job details
            cand_res = await db.execute(
                select(Candidate)
                .where(Candidate.id == candidate_id)
                .options(selectinload(Candidate.job))
            )
            candidate = cand_res.scalars().first()
            if not candidate:
                print(f"Background worker: Candidate {candidate_id} not found.")
                return

            job = candidate.job
            
            # 2. Extract Resume text
            resume_text = ""
            try:
                resume_text = await ResumeParser.extract_text(candidate.resume_path)
            except Exception as e:
                print(f"Background worker: Resume parsing error for {candidate_id}: {e}")
                resume_text = f"[Resume text extraction failed: {str(e)}]"

            # 3. Call AI CV Screening
            cv_analysis = await AIService.screen_candidate_cv(resume_text, job.polished_description)

            # 4. Perform GitHub checks if role is technical AND candidate provided profile
            github_applicable = is_tech_role(job.title, job.polished_description)
            github_profile_data = None
            github_score = None
            github_analysis = None

            if github_applicable and candidate.github_url:
                # Fetch public repository metrics
                github_profile_data = await GitHubService.fetch_profile_data(candidate.github_url)
                
                if github_profile_data.get("applicable", False):
                    # Evaluate codebase consistency against resume
                    consistency_res = await AIService.analyze_github_consistency(
                        github_data=github_profile_data,
                        resume_text=resume_text,
                        job_description=job.polished_description
                    )
                    github_score = consistency_res.get("github_score", 0)
                    github_analysis = consistency_res.get("github_analysis")
                else:
                    # Gracefully record non-existent/private/inapplicable profiles
                    github_score = 0
                    github_analysis = f"GitHub analysis skipped: {github_profile_data.get('reason', 'Profile is not accessible.')}"
            elif github_applicable:
                github_score = 0
                github_analysis = "GitHub profile was not provided by the candidate."
            else:
                github_analysis = "GitHub check not applicable for this non-technical role."

            # Calculate initial combined score (treating LinkedIn as 0 since it is not inputted yet)
            combined = AIService.calculate_combined_score(
                cv_overall=cv_analysis.get("overall_score", 0),
                github_applicable=github_applicable,
                github_score=github_score,
                linkedin_score=0
            )

            # 5. Save screening findings to database
            screening = Screening(
                candidate_id=candidate.id,
                skills_score=cv_analysis.get("skills_score", 0),
                experience_score=cv_analysis.get("experience_score", 0),
                education_score=cv_analysis.get("education_score", 0),
                overall_score=cv_analysis.get("overall_score", 0),
                reasoning=cv_analysis.get("reasoning"),
                github_applicable=github_applicable,
                github_score=github_score,
                github_analysis=github_analysis,
                ai_resume_flag=cv_analysis.get("ai_resume_flag", "Low"),
                ai_resume_reason=cv_analysis.get("ai_resume_reason"),
                linkedin_exists=None,
                linkedin_role_fit=None,
                linkedin_red_flags=None,
                linkedin_score=None,
                combined_score=combined
            )
            
            db.add(screening)
            await db.commit()
            print(f"Background worker: Completed screening for candidate {candidate.name} (ID: {candidate.id}) successfully.")

        except Exception as e:
            print(f"Background worker critical failure screening candidate {candidate_id}: {str(e)}")
            # Rollback session to prevent corrupt state
            await db.rollback()
