import os
import re
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from app.database import get_db
from app.models import Job, SocialAsset, User
from app.schemas import JobCreate, JobUpdate, JobResponse, SocialAssetResponse
from app.routers.auth import get_current_user
from app.services.ai_service import AIService
from app.utils.image_generator import ImageGenerator
from app.config import settings

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    job_in: JobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Creates a new Job in 'draft' status.
    Uses Gemini LLM to polish the raw description into a professional JD.
    """
    # 1. Polish raw description using AI service
    polished_desc = await AIService.polish_job_description(
        title=job_in.title,
        org_name=job_in.organization_name,
        org_details=job_in.organization_details,
        raw_desc=job_in.raw_description,
        apply_link=job_in.apply_link
    )
    
    # 2. Save job to database
    db_job = Job(
        title=job_in.title,
        organization_name=job_in.organization_name,
        organization_details=job_in.organization_details,
        apply_link=job_in.apply_link,
        raw_description=job_in.raw_description,
        polished_description=polished_desc,
        status="draft"
    )
    
    db.add(db_job)
    await db.commit()
    await db.refresh(db_job)
    return db_job


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Lists all jobs (HR only)."""
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    return result.scalars().all()


@router.get("/public/{job_id}", response_model=JobResponse)
async def get_public_job(
    job_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint to fetch a single approved job description (no auth)."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    if job.status != "approved":
        raise HTTPException(status_code=403, detail="Job posting is not active.")
    return job


@router.get("/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches details of a single job (HR only)."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    return job


@router.put("/{job_id}", response_model=JobResponse)
async def update_job(
    job_id: int,
    job_in: JobUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Updates an existing job. 
    If status transitions to 'approved', automatically triggers generation 
    of social media assets and branded visuals.
    """
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
        
    old_status = job.status
    
    # Update fields
    update_data = job_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(job, field, value)
        
    await db.commit()
    await db.refresh(job)
    
    # Check if newly approved
    if old_status != "approved" and job.status == "approved":
        await generate_job_social_assets(job, db)
        
    return job


@router.post("/{job_id}/regenerate", response_model=JobResponse)
async def regenerate_polished_jd(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force-regenerates the polished JD from the raw description."""
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
        
    polished_desc = await AIService.polish_job_description(
        title=job.title,
        org_name=job.organization_name,
        org_details=job.organization_details,
        raw_desc=job.raw_description,
        apply_link=job.apply_link
    )
    
    job.polished_description = polished_desc
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/{job_id}/assets", response_model=SocialAssetResponse)
async def get_job_assets(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetches social media posting assets for an approved job."""
    result = await db.execute(select(SocialAsset).where(SocialAsset.job_id == job_id))
    assets = result.scalars().first()
    if not assets:
        # Check if job is approved. If approved but no assets, generate them
        job_res = await db.execute(select(Job).where(Job.id == job_id))
        job = job_res.scalars().first()
        if not job:
            raise HTTPException(status_code=404, detail="Job posting not found.")
        if job.status == "approved":
            assets = await generate_job_social_assets(job, db)
        else:
            raise HTTPException(
                status_code=400, 
                detail="Job must be approved to generate and view social media assets."
            )
    return assets


@router.post("/{job_id}/assets/regenerate", response_model=SocialAssetResponse)
async def regenerate_job_assets(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Force-regenerates the captions and communities for social assets."""
    job_res = await db.execute(select(Job).where(Job.id == job_id))
    job = job_res.scalars().first()
    if not job:
        raise HTTPException(status_code=404, detail="Job posting not found.")
    if job.status != "approved":
        raise HTTPException(status_code=400, detail="Job must be approved first.")
        
    return await generate_job_social_assets(job, db, overwrite=True)


async def generate_job_social_assets(job: Job, db: AsyncSession, overwrite: bool = False) -> SocialAsset:
    """Helper to generate captions, communities, and PNG card, then save to DB."""
    # Check if assets already exist
    asset_res = await db.execute(select(SocialAsset).where(SocialAsset.job_id == job.id))
    existing_asset = asset_res.scalars().first()
    
    if existing_asset and not overwrite:
        return existing_asset

    # 1. Generate text captions and communities using LLM
    # Location defaults to 'Remote' if not explicitly defined in org details
    location = "Remote"
    org_det_lower = job.organization_details.lower()
    loc_match = re.search(r"(?:located in|location:|based in)\s*([a-zA-Z\s,]+)", org_det_lower)
    if loc_match:
        location = loc_match.group(1).strip().title()

    social_data = await AIService.generate_social_assets(
        title=job.title,
        company=job.organization_name,
        location=location,
        polished_jd=job.polished_description
    )

    # 2. Generate branded visual card using Pillow
    visual_path = ImageGenerator.generate_job_card(
        title=job.title,
        company=job.organization_name,
        location=location,
        job_id=job.id
    )
    
    # Save path as a web-accessible static path
    # Replace backward slashes with forward slashes for Windows URL compatibility
    web_visual_url = f"/static/visuals/{os.path.basename(visual_path)}"

    # 3. Save to database
    if existing_asset:
        existing_asset.linkedin_caption = social_data.get("linkedin", {}).get("caption")
        existing_asset.linkedin_groups = social_data.get("linkedin", {}).get("groups")
        existing_asset.twitter_caption = social_data.get("twitter", {}).get("caption")
        existing_asset.twitter_groups = social_data.get("twitter", {}).get("groups", [])
        existing_asset.facebook_caption = social_data.get("facebook", {}).get("caption")
        existing_asset.facebook_groups = social_data.get("facebook", {}).get("groups")
        existing_asset.instagram_caption = social_data.get("instagram", {}).get("caption")
        existing_asset.instagram_groups = social_data.get("instagram", {}).get("groups")
        existing_asset.visual_url = web_visual_url
        db_asset = existing_asset
    else:
        db_asset = SocialAsset(
            job_id=job.id,
            linkedin_caption=social_data.get("linkedin", {}).get("caption"),
            linkedin_groups=social_data.get("linkedin", {}).get("groups"),
            twitter_caption=social_data.get("twitter", {}).get("caption"),
            twitter_groups=social_data.get("twitter", {}).get("groups", []),
            facebook_caption=social_data.get("facebook", {}).get("caption"),
            facebook_groups=social_data.get("facebook", {}).get("groups"),
            instagram_caption=social_data.get("instagram", {}).get("caption"),
            instagram_groups=social_data.get("instagram", {}).get("groups"),
            visual_url=web_visual_url
        )
        db.add(db_asset)

    await db.commit()
    if existing_asset:
        await db.refresh(db_asset)
    return db_asset
