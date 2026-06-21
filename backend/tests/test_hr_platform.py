import pytest
import io
import zipfile
from app.services.storage_service import StorageService
from app.services.ai_service import AIService
from app.utils.resume_parser import ResumeParser

# ==========================================
# 1. Test Magic Bytes MIME Detection
# ==========================================

def test_validate_and_detect_mime_pdf():
    pdf_bytes = b"%PDF-1.5\n%hello"
    mime = StorageService.validate_and_detect_mime(pdf_bytes)
    assert mime == "application/pdf"

def test_validate_and_detect_mime_docx():
    # Construct a minimal in-memory zip file representing a docx
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        z.writestr("word/document.xml", "<xml>Document Content</xml>")
        z.writestr("any_other_file.txt", "Some other stuff")
    
    docx_bytes = zip_buffer.getvalue()
    mime = StorageService.validate_and_detect_mime(docx_bytes)
    assert mime == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

def test_validate_and_detect_mime_invalid():
    invalid_bytes = b"Hello, this is just a standard text file"
    with pytest.raises(ValueError) as excinfo:
        StorageService.validate_and_detect_mime(invalid_bytes)
    assert "Only real PDF and DOCX files are allowed" in str(excinfo.value)

def test_validate_and_detect_mime_invalid_zip():
    # standard zip file but lacks word/document.xml (so not a DOCX)
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w") as z:
        z.writestr("some_text.txt", "Plain text inside zip")
    
    zip_bytes = zip_buffer.getvalue()
    with pytest.raises(ValueError) as excinfo:
        StorageService.validate_and_detect_mime(zip_bytes)
    assert "Only real PDF and DOCX files are allowed" in str(excinfo.value)


# ==========================================
# 2. Test Composite Score Calculations
# ==========================================

def test_calculate_combined_score_tech_role():
    # Combined = CV * 70% + GitHub * 15% + LinkedIn * 15%
    # Inputs: CV = 80, GitHub = 90, LinkedIn = 100
    # Expected: 80 * 0.70 + 90 * 0.15 + 100 * 0.15 = 56.0 + 13.5 + 15.0 = 84.5
    score = AIService.calculate_combined_score(
        cv_overall=80,
        github_applicable=True,
        github_score=90,
        linkedin_score=100
    )
    assert score == 84.5

def test_calculate_combined_score_non_tech_role():
    # Combined = (CV * 70% + LinkedIn * 15%) / 0.85
    # Inputs: CV = 80, LinkedIn = 100
    # Expected: (80 * 0.70 + 100 * 0.15) / 0.85 = (56 + 15) / 0.85 = 71 / 0.85 = 83.53
    score = AIService.calculate_combined_score(
        cv_overall=80,
        github_applicable=False,
        github_score=None,
        linkedin_score=100
    )
    assert score == 83.53

def test_calculate_combined_score_tech_role_defaults():
    # Unset scores default to 0
    # Inputs: CV = 80, GitHub = None (0), LinkedIn = None (0)
    # Expected: 80 * 0.70 + 0 * 0.15 + 0 * 0.15 = 56.0
    score = AIService.calculate_combined_score(
        cv_overall=80,
        github_applicable=True,
        github_score=None,
        linkedin_score=None
    )
    assert score == 56.0


# ==========================================
# 3. Test Resume Word Limiter
# ==========================================

def test_enforce_word_limit():
    text = "word " * 900
    pruned = AIService._enforce_word_limit(text, limit=800)
    words = pruned.split()
    assert len(words) <= 800
