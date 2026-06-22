export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Retrieves the stored JWT token.
 */
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("hr_auth_token");
  }
  return null;
}

/**
 * Saves the JWT token to localStorage.
 */
export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("hr_auth_token", token);
  }
}

/**
 * Removes the stored JWT token.
 */
export function removeAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("hr_auth_token");
  }
}

/**
 * Helper to check if the HR user is authenticated.
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Generic fetch wrapper with auth header injection.
 */
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  // Do not set Content-Type if we're sending FormData (e.g. for uploads)
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = "Something went wrong";
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  // Handle empty or text responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
}

// ==========================================
// Authentication
// ==========================================

export async function loginHR(email: string, password: string) {
  const data = await fetchAPI("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data.access_token) {
    setAuthToken(data.access_token);
  }
  return data;
}

export async function getMe() {
  return fetchAPI("/api/auth/me");
}

// ==========================================
// Jobs
// ==========================================

export async function getJobs() {
  return fetchAPI("/api/jobs");
}

export async function getJob(jobId: number) {
  return fetchAPI(`/api/jobs/${jobId}`);
}

export async function getPublicJob(jobId: number) {
  return fetchAPI(`/api/jobs/public/${jobId}`);
}

export async function createJob(jobData: {
  title: string;
  organization_name: string;
  organization_details: string;
  apply_link: string;
  raw_description: string;
}) {
  return fetchAPI("/api/jobs", {
    method: "POST",
    body: JSON.stringify(jobData),
  });
}

export async function updateJob(jobId: number, updateData: any) {
  return fetchAPI(`/api/jobs/${jobId}`, {
    method: "PUT",
    body: JSON.stringify(updateData),
  });
}

export async function regenerateJobDescription(jobId: number) {
  return fetchAPI(`/api/jobs/${jobId}/regenerate`, {
    method: "POST",
  });
}

// ==========================================
// Social Assets
// ==========================================

export async function getJobAssets(jobId: number) {
  return fetchAPI(`/api/jobs/${jobId}/assets`);
}

export async function regenerateJobAssets(jobId: number) {
  return fetchAPI(`/api/jobs/${jobId}/assets/regenerate`, {
    method: "POST",
  });
}

// ==========================================
// Candidates
// ==========================================

export async function getJobCandidates(jobId: number) {
  return fetchAPI(`/api/candidates/job/${jobId}`);
}

export async function submitLinkedInCheck(
  candidateId: number,
  linkedinData: {
    linkedin_exists: boolean;
    linkedin_role_fit: string;
    linkedin_red_flags: string;
    linkedin_score: number;
  }
) {
  return fetchAPI(`/api/candidates/${candidateId}/linkedin`, {
    method: "POST",
    body: JSON.stringify(linkedinData),
  });
}

export async function deleteCandidate(candidateId: number) {
  return fetchAPI(`/api/candidates/${candidateId}`, {
    method: "DELETE",
  });
}

export async function deleteJob(jobId: number) {
  return fetchAPI(`/api/jobs/${jobId}`, {
    method: "DELETE",
  });
}

export async function applyJob(jobId: number, formData: FormData) {
  const response = await fetch(`${API_BASE_URL}/api/candidates/apply/${jobId}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = "Application submission failed";
    try {
      const errData = await response.json();
      errorMsg = errData.detail || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Returns absolute URL for static files (e.g. resumes, visual cards).
 */
export function getStaticFileUrl(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  
  // Replace Windows backslashes with forward slashes
  let cleanPath = path.replace(/\\/g, "/");
  
  // Remove leading slash if present
  if (cleanPath.startsWith("/")) {
    cleanPath = cleanPath.slice(1);
  }
  
  // Map "uploads/" prefix to "static/" prefix
  if (cleanPath.startsWith("uploads/")) {
    cleanPath = "static/" + cleanPath.substring("uploads/".length);
  }
  
  return `${API_BASE_URL}/${cleanPath}`;
}
