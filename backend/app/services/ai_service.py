import json
import re
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

class AIService:
    @staticmethod
    def _enforce_word_limit(text: str, limit: int = 800) -> str:
        """Enforces a word budget on the polished JD in python code."""
        words = text.split()
        if len(words) <= limit:
            return text
            
        # Prune to limit, and try to cut off at the last sentence boundary
        pruned_words = words[:limit]
        pruned_text = " ".join(pruned_words)
        
        # Look for the last punctuation mark to end cleanly
        last_punctuation = max(
            pruned_text.rfind('.'),
            pruned_text.rfind('!'),
            pruned_text.rfind('?')
        )
        
        if last_punctuation != -1 and last_punctuation > (len(pruned_text) * 0.8):
            return pruned_text[:last_punctuation + 1]
            
        return pruned_text + "..."

    @staticmethod
    def _run_ai_resume_heuristic(resume_text: str) -> Dict[str, Any]:
        """
        Runs a heuristic on the resume text to spot markers of AI-generation.
        Returns a flag (Low, Medium, High) and a reason.
        """
        lower_text = resume_text.lower()
        
        # ChatGPT-signature keywords
        buzzwords = [
            "delve", "tapestry", "testament", "foster", "spearheaded", "streamlined",
            "synergy", "pioneered", "leveraged", "orchestrated", "transformative",
            "passionate", "dynamic professional", "proven track record", "highly motivated"
        ]
        
        matches = [word for word in buzzwords if word in lower_text]
        score = len(matches)
        
        # Simple heuristic scaling
        if score >= 7:
            flag = "High"
            reason = f"High density of generic AI-style buzzwords ({', '.join(matches[:5])})."
        elif score >= 3:
            flag = "Medium"
            reason = f"Contains several typical AI resume buzzwords ({', '.join(matches[:3])})."
        else:
            flag = "Low"
            reason = "Resume style appears standard, with few typical AI-generated clichés."
            
        return {"flag": flag, "reason": reason}

    @classmethod
    async def _call_llm(cls, prompt: str, json_mode: bool = False) -> str:
        """Asynchronously calls the OpenAI API. Falls back to mock responses if API key is not set."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set.")
            
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
            
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code != 200:
                raise Exception(f"OpenAI API returned error {response.status_code}: {response.text}")
                
            res_data = response.json()
            try:
                content = res_data["choices"][0]["message"]["content"]
                return content
            except (KeyError, IndexError):
                raise Exception(f"Unexpected response structure from OpenAI: {res_data}")

    @classmethod
    async def polish_job_description(
        cls, title: str, org_name: str, org_details: str, raw_desc: str, apply_link: str
    ) -> str:
        """Polishes raw job description input into a structured copy under 800 words."""
        if not settings.OPENAI_API_KEY:
            # Mock Fallback
            mock_jd = f"""# Role Summary
We are seeking a talented {title} to join our growing team at {org_name}. In this role, you will be responsible for building key components and driving engineering excellence.

# About the Company
{org_name} is a leading organization. Details: {org_details}. We build state-of-the-art products and value innovation.

# Key Responsibilities
- Design, implement, and maintain software components.
- Collaborate with cross-functional teams to deliver high-quality features.
- Write clean, maintainable, and well-tested code.
- Participate in code reviews and architectural discussions.

# Requirements
- 3+ years of experience in software development.
- Strong knowledge of technology stack, data structures, and algorithms.
- Excellent communication and collaboration skills.
- Bachelor's degree in Computer Science or equivalent experience.

# How to Apply
To apply, please visit: {apply_link}"""
            return cls._enforce_word_limit(mock_jd)

        prompt = f"""
        You are a professional HR copywriter. Rewrite the raw job description below into a polished, professional, compelling one-page Job Description (JD).
        
        The output MUST:
        1. Be clearly structured with these exact sections:
           - Role Summary
           - Key Responsibilities
           - Requirements
           - About the Company
           - How to Apply
        2. Use Markdown headings for structure.
        3. Fit within 750 words.
        
        Job Details:
        - Job Title: {title}
        - Organization Name: {org_name}
        - Organization Details: {org_details}
        - Apply Link: {apply_link}
        - Raw Job Description:
        {raw_desc}
        
        Polished Job Description:
        """
        try:
            result = await cls._call_llm(prompt, json_mode=False)
            return cls._enforce_word_limit(result.strip())
        except Exception as e:
            print(f"OpenAI JD polish failed, using fallback mock: {e}")
            return cls._enforce_word_limit(f"Error calling AI: {e}\n\nFallback JD for {title}...")

    @classmethod
    async def generate_social_assets(
        cls, title: str, company: str, location: str, polished_jd: str
    ) -> Dict[str, Any]:
        """Generates captions and suggested groups for LinkedIn, Twitter, Facebook, and Instagram."""
        default_groups = ["Local Tech Jobs", "Job Search & Careers Network", "Software Engineers Hub"]
        
        if not settings.OPENAI_API_KEY:
            # Mock Fallback
            return {
                "linkedin": {
                    "caption": f"🚀 We're hiring a {title} at {company} in {location}! If you're passionate about innovation and want to make an impact, check out our latest role and apply today. #hiring #{title.replace(' ', '')}",
                    "groups": [f"{location} Tech Professionals", f"{title} Careers", f"{company} Jobs & Careers"]
                },
                "twitter": {
                    "caption": f"We are hiring a {title} at {company} ({location})! Apply now and join our growing team. #{title.replace(' ', '')} #jobs #hiring",
                    "groups": []
                },
                "facebook": {
                    "caption": f"Exciting Opportunity! {company} is looking for a {title} to join our team in {location}. We offer a dynamic work environment, great benefits, and the chance to build amazing products. Apply now!",
                    "groups": [f"{location} Job Board", f"{title} Jobs Community", "Remote Work Careers"]
                },
                "instagram": {
                    "caption": f"We are hiring! 🌟 We're looking for a {title} to join the {company} family. Located in {location}. Click the link in bio to apply! 🚀\n\n#hiring #careers #{title.replace(' ', '')} #jobs",
                    "groups": [f"Instagram Career Seekers", "Creative Jobs Network", "Millennial Professionals"]
                }
            }

        prompt = f"""
        You are a social media manager. Generate ready-to-share social media content for a job posting.
        Job Title: {title}
        Company: {company}
        Location: {location}
        Job Description:
        {polished_jd}

        Generate a JSON object containing:
        1. "linkedin": {{ "caption": "appropriate caption", "groups": ["Group Name 1", "Group Name 2", "Group Name 3"] }}
        2. "twitter": {{ "caption": "short caption, MUST be under 260 characters" }}
        3. "facebook": {{ "caption": "appropriate caption", "groups": ["Group Name 1", "Group Name 2", "Group Name 3"] }}
        4. "instagram": {{ "caption": "appropriate caption with hashtags", "groups": ["Community 1", "Community 2", "Community 3"] }}

        For groups, suggest actual relevant categories, groups, or pages (3-5 items) where HR could post this role based on the role and location. Keep these suggested groups specific and realistic.
        Ensure you return valid JSON only.
        """
        try:
            result_str = await cls._call_llm(prompt, json_mode=True)
            data = json.loads(result_str)
            
            # Enforce Twitter character limit in Python
            twitter_caption = data.get("twitter", {}).get("caption", "")
            if len(twitter_caption) > 280:
                data["twitter"]["caption"] = twitter_caption[:277] + "..."
                
            return data
        except Exception as e:
            print(f"OpenAI social assets failed, returning defaults: {e}")
            return {
                "linkedin": {"caption": f"We're hiring a {title} at {company} ({location})!", "groups": default_groups},
                "twitter": {"caption": f"We're hiring a {title} at {company} ({location})! #jobs"},
                "facebook": {"caption": f"We're hiring a {title} at {company} ({location})!", "groups": default_groups},
                "instagram": {"caption": f"We're hiring a {title} at {company} ({location})!", "groups": default_groups}
            }

    @classmethod
    async def screen_candidate_cv(
        cls, resume_text: str, job_description: str
    ) -> Dict[str, Any]:
        """Screens candidate resume against job description and flags AI writing markers."""
        # Run local heuristic checker first
        heuristic_res = cls._run_ai_resume_heuristic(resume_text)
        
        if not settings.OPENAI_API_KEY:
            # Mock Fallback
            return {
                "skills_score": 85,
                "experience_score": 80,
                "education_score": 90,
                "overall_score": 83,
                "reasoning": "The candidate has strong technical skills matching the job description, including Python and backend frameworks. Their work history aligns well, though they lack direct experience with cloud deployments requested in the requirements.",
                "ai_resume_flag": heuristic_res["flag"],
                "ai_resume_reason": f"Heuristic check: {heuristic_res['reason']}. AI writing style score looks moderate."
            }

        prompt = f"""
        You are an expert HR recruitment assistant. Screen the candidate's resume against the Job Description.
        
        Job Description:
        {job_description}
        
        Resume:
        {resume_text}

        Evaluate and return a JSON object with:
        1. "skills_score": Integer from 0 to 100
        2. "experience_score": Integer from 0 to 100
        3. "education_score": Integer from 0 to 100
        4. "overall_score": Integer from 0 to 100
        5. "reasoning": A detailed explanation of why they got these scores, highlight gaps, and state their main strengths.
        6. "ai_style_check": A score from 0 (natural) to 100 (definitely AI generated) reflecting if the writing style seems heavily generated by ChatGPT or another LLM, and why.

        Return valid JSON only.
        """
        try:
            result_str = await cls._call_llm(prompt, json_mode=True)
            data = json.loads(result_str)
            
            # Mix heuristic check with LLM style check
            llm_style_score = data.get("ai_style_check", 0)
            if llm_style_score >= 70 or heuristic_res["flag"] == "High":
                ai_flag = "High"
                ai_reason = f"Significant indicators. Heuristic: {heuristic_res['reason']} LLM flagged style score: {llm_style_score}/100."
            elif llm_style_score >= 35 or heuristic_res["flag"] == "Medium":
                ai_flag = "Medium"
                ai_reason = f"Moderate indicators. Heuristic: {heuristic_res['reason']} LLM flagged style score: {llm_style_score}/100."
            else:
                ai_flag = "Low"
                ai_reason = f"Normal writing style. Heuristic: {heuristic_res['reason']} LLM style score: {llm_style_score}/100."

            return {
                "skills_score": int(data.get("skills_score", 0)),
                "experience_score": int(data.get("experience_score", 0)),
                "education_score": int(data.get("education_score", 0)),
                "overall_score": int(data.get("overall_score", 0)),
                "reasoning": data.get("reasoning", "No evaluation summary generated."),
                "ai_resume_flag": ai_flag,
                "ai_resume_reason": ai_reason
            }
        except Exception as e:
            print(f"OpenAI resume screening failed, using fallback: {e}")
            return {
                "skills_score": 50,
                "experience_score": 50,
                "education_score": 50,
                "overall_score": 50,
                "reasoning": f"CV evaluation system encountered an error: {str(e)}",
                "ai_resume_flag": heuristic_res["flag"],
                "ai_resume_reason": f"Heuristic: {heuristic_res['reason']}"
            }

    @classmethod
    async def analyze_github_consistency(
        cls, github_data: Dict[str, Any], resume_text: str, job_description: str
    ) -> Dict[str, Any]:
        """Analyzes GitHub data and scores consistency against CV and JD."""
        if not settings.OPENAI_API_KEY:
            # Mock Fallback
            return {
                "github_score": 85,
                "github_analysis": f"Candidate has {github_data.get('public_repos', 0)} repositories. Main programming languages ({', '.join(github_data.get('languages', []))}) are consistent with the backend tech stack. Commit activity shows recent activity (recent commits: {len(github_data.get('recent_commits', []))}) matching Python developer patterns."
            }

        prompt = f"""
        You are a technical recruiter. Compare the candidate's actual public GitHub code footprint with their CV claims and the Job Description requirements.
        
        Job Description Requirements:
        {job_description}
        
        Candidate CV claims:
        {resume_text}
        
        GitHub Profile Raw Data:
        {json.dumps(github_data, indent=2)}

        Assess if their actual code output (repositories, languages, commits) matches and supports what they claim on their resume.
        Provide a JSON object containing:
        1. "github_score": Integer from 0 to 100 (representing consistency rating)
        2. "github_analysis": A summary explaining the rating. E.g. Does their actual commit volume, repo quality, and primary languages validate the skills listed in their CV?

        Return valid JSON only.
        """
        try:
            result_str = await cls._call_llm(prompt, json_mode=True)
            data = json.loads(result_str)
            return {
                "github_score": int(data.get("github_score", 0)),
                "github_analysis": data.get("github_analysis", "No analysis compiled.")
            }
        except Exception as e:
            print(f"OpenAI GitHub consistency check failed, returning default: {e}")
            return {
                "github_score": 50,
                "github_analysis": f"GitHub analysis system encountered an error: {str(e)}"
            }
        
    @staticmethod
    def calculate_combined_score(
        cv_overall: int,
        github_applicable: bool,
        github_score: Optional[int],
        linkedin_score: Optional[int]
    ) -> float:
        """
        Calculates the combined score:
        - Tech Role: CV * 70% + GitHub * 15% + LinkedIn * 15%
        - Non-Tech Role (or no GitHub): scaled to (CV * 70% + LinkedIn * 15%) / 0.85
        """
        # If LinkedIn is not set yet, treat it as 0 or default to CV score?
        # Standard: Treat it as 0 or neutral (e.g. 50), let's treat it as 0 (not assessed yet)
        # or we can show combined score only after LinkedIn is inputted. Let's make it calculate
        # with whatever is available, defaulting unset values to 0.
        l_score = linkedin_score if linkedin_score is not None else 0
        
        if github_applicable:
            g_score = github_score if github_score is not None else 0
            return round((cv_overall * 0.70) + (g_score * 0.15) + (l_score * 0.15), 2)
        else:
            # Rescale the remaining weights (0.70 CV and 0.15 LinkedIn) to sum to 1.0 (divided by 0.85)
            raw = (cv_overall * 0.70) + (l_score * 0.15)
            return round(raw / 0.85, 2)
