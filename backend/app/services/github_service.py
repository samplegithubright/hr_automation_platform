import httpx
import re
from typing import Dict, Any, List, Optional
from app.config import settings

class GitHubService:
    @staticmethod
    def extract_username(url_or_username: str) -> Optional[str]:
        """
        Extracts the GitHub username from a URL or raw string.
        e.g., "https://github.com/octocat/" or "octocat" -> "octocat"
        """
        if not url_or_username:
            return None
            
        clean_input = url_or_username.strip()
        if not clean_input:
            return None
            
        # Check if it's a URL
        if "github.com" in clean_input.lower():
            # Match github.com/username (ignoring queries or trailing slash)
            match = re.search(r"github\.com/([^/?#\s]+)", clean_input)
            if match:
                return match.group(1)
        
        # Strip simple symbols just in case
        username = clean_input.replace("@", "")
        # GitHub usernames only contain alphanumeric characters or single hyphens
        # Let's clean it up
        username = username.split("/")[0].strip()
        return username if username else None

    @classmethod
    async def fetch_profile_data(cls, url_or_username: str) -> Dict[str, Any]:
        """
        Queries public GitHub API for user repos, languages, and commit activity.
        Catches errors and returns a descriptive dictionary.
        """
        username = cls.extract_username(url_or_username)
        if not username:
            return {
                "applicable": False,
                "reason": "Invalid or empty GitHub username/URL provided."
            }

        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "HR-Automation-Platform-Agent"
        }
        
        if settings.GITHUB_TOKEN:
            headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                # 1. Fetch user base profile
                user_url = f"https://api.github.com/users/{username}"
                user_res = await client.get(user_url, headers=headers)
                
                if user_res.status_code == 404:
                    return {
                        "applicable": False,
                        "reason": f"GitHub user '{username}' not found (404)."
                    }
                elif user_res.status_code == 403:
                    return {
                        "applicable": False,
                        "reason": "GitHub API rate limit exceeded. Please configure GITHUB_TOKEN."
                    }
                elif user_res.status_code != 200:
                    return {
                        "applicable": False,
                        "reason": f"GitHub API error ({user_res.status_code})."
                    }
                
                profile_info = user_res.json()
                public_repos_count = profile_info.get("public_repos", 0)
                
                if public_repos_count == 0:
                    return {
                        "applicable": True,
                        "username": username,
                        "public_repos": 0,
                        "languages": [],
                        "recent_commits": [],
                        "reason": f"User '{username}' has no public repositories."
                    }

                # 2. Fetch repos to extract languages
                repos_url = f"https://api.github.com/users/{username}/repos?per_page=50&sort=updated"
                repos_res = await client.get(repos_url, headers=headers)
                
                languages = set()
                repos_list = []
                if repos_res.status_code == 200:
                    for repo in repos_res.json():
                        lang = repo.get("language")
                        if lang:
                            languages.add(lang)
                        repos_list.append({
                            "name": repo.get("name"),
                            "description": repo.get("description"),
                            "language": lang,
                            "stars": repo.get("stargazers_count", 0),
                            "forks": repo.get("forks_count", 0)
                        })

                # 3. Fetch public events to extract recent commits
                events_url = f"https://api.github.com/users/{username}/events/public?per_page=30"
                events_res = await client.get(events_url, headers=headers)
                
                recent_commits = []
                if events_res.status_code == 200:
                    for event in events_res.json():
                        if event.get("type") == "PushEvent":
                            repo_name = event.get("repo", {}).get("name")
                            payload = event.get("payload", {})
                            commits = payload.get("commits", [])
                            for commit in commits[:5]:  # Take up to 5 commits per push
                                msg = commit.get("message", "")
                                if msg:
                                    recent_commits.append(f"[{repo_name}] {msg}")
                                if len(recent_commits) >= 10:  # Max 10 recent commits
                                    break
                        if len(recent_commits) >= 10:
                            break

                return {
                    "applicable": True,
                    "username": username,
                    "public_repos": public_repos_count,
                    "languages": list(languages),
                    "repos": repos_list[:10],  # Return metadata for top 10 recent repos
                    "recent_commits": recent_commits
                }

            except Exception as e:
                return {
                    "applicable": False,
                    "reason": f"Network or unexpected error checking GitHub: {str(e)}"
                }
