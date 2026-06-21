import io
import os
import uuid
import zipfile
from typing import Tuple
from fastapi import UploadFile, HTTPException
from app.config import settings

class StorageService:
    @staticmethod
    def validate_and_detect_mime(content: bytes) -> str:
        """
        Validate file content by checking its magic bytes rather than just extension.
        Returns the detected MIME type, or raises ValueError.
        """
        # PDF signature: %PDF
        if content.startswith(b'%PDF'):
            return "application/pdf"
            
        # DOCX signature: PK\x03\x04 (standard zip archive)
        if content.startswith(b'PK\x03\x04'):
            try:
                # Open zip in-memory to confirm it contains word/document.xml
                with zipfile.ZipFile(io.BytesIO(content)) as z:
                    if "word/document.xml" in z.namelist():
                        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            except zipfile.BadZipFile:
                pass
                
        raise ValueError("Invalid file content. Only real PDF and DOCX files are allowed.")

    @classmethod
    async def save_resume(cls, file: UploadFile) -> str:
        """
        Validates file size (max 10MB) and content (MIME/magic bytes),
        saves the file to local storage or S3 based on config,
        and returns the stored file path/URL.
        """
        # Read file contents in-memory
        content = await file.read()
        
        # Check size (max 10MB)
        max_size = 10 * 1024 * 1024  # 10 MB
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="File size exceeds the 10 MB limit.")
            
        # Validate MIME type by magic bytes
        try:
            mime_type = cls.validate_and_detect_mime(content)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
            
        # Reset file seek position in case it's used elsewhere
        await file.seek(0)
        
        # Determine extension based on validated MIME
        extension = ".pdf" if mime_type == "application/pdf" else ".docx"
        unique_filename = f"{uuid.uuid4()}{extension}"
        
        if settings.STORAGE_TYPE == "s3" and settings.AWS_BUCKET_NAME:
            return await cls._save_to_s3(content, unique_filename, mime_type)
        else:
            return await cls._save_to_local(content, unique_filename)

    @classmethod
    async def _save_to_local(cls, content: bytes, filename: str) -> str:
        """Saves file to local disk under the configured upload directory."""
        resumes_dir = os.path.join(settings.UPLOAD_DIR, "resumes")
        os.makedirs(resumes_dir, exist_ok=True)
        
        file_path = os.path.join(resumes_dir, filename)
        with open(file_path, "wb") as f:
            f.write(content)
            
        # Return path relative to the workspace, or absolute
        return file_path

    @classmethod
    async def _save_to_s3(cls, content: bytes, filename: str, mime_type: str) -> str:
        """
        Saves file to AWS S3. Fallbacks to local if boto3 is not installed 
        or fails to initialize due to credentials.
        """
        try:
            import boto3
            from botocore.exceptions import NoCredentialsError
            
            s3_client = boto3.client(
                's3',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            
            s3_key = f"resumes/{filename}"
            s3_client.put_object(
                Bucket=settings.AWS_BUCKET_NAME,
                Key=s3_key,
                Body=content,
                ContentType=mime_type
            )
            
            # Form public S3 URL
            return f"https://{settings.AWS_BUCKET_NAME}.s3.{settings.AWS_REGION}.amazonaws.com/{s3_key}"
            
        except ImportError:
            # If boto3 is not installed (e.g. locally), fall back to local disk and log warnings
            print("WARNING: boto3 not installed. Falling back to local storage.")
            return await cls._save_to_local(content, filename)
        except Exception as e:
            print(f"WARNING: S3 upload failed: {str(e)}. Falling back to local storage.")
            return await cls._save_to_local(content, filename)
