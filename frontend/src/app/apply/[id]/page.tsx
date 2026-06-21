"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPublicJob, applyJob } from "@/lib/api";
import { Sparkles, FileText, CheckCircle2, User, Mail, Phone, ShieldCheck, Terminal, AlertTriangle } from "lucide-react";

export default function CandidateApplyPage() {
  const params = useParams();
  const jobId = Number(params.id);

  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Client-side validation states
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    const loadJob = async () => {
      try {
        const jobData = await getPublicJob(jobId);
        setJob(jobData);
      } catch (err: any) {
        setError(err.message || "This job posting is not active or could not be found.");
      } finally {
        setLoading(false);
      }
    };
    loadJob();
  }, [jobId]);

  // Heuristic to detect tech role on client-side to show/hide GitHub
  const isTech = () => {
    if (!job) return false;
    const titleLower = job.title.toLowerCase();
    const descLower = (job.polished_description || "").toLowerCase();
    const techKeywords = [
      "software", "developer", "engineer", "tech", "programmer", "architect", 
      "data scientist", "analyst", "devops", "qa", "testing", "coder", 
      "frontend", "backend", "fullstack", "programming", "web"
    ];
    return techKeywords.some(kw => titleLower.includes(kw) || descLower.includes(kw));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError("");
    setResumeFile(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const extension = file.name.split(".").pop()?.toLowerCase();
    
    // Check extension
    if (extension !== "pdf" && extension !== "docx") {
      setFileError("Only PDF and DOCX files are allowed.");
      return;
    }

    // Check size (10 MB limit)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setFileError("File exceeds the 10 MB limit.");
      return;
    }

    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!resumeFile) {
      setFileError("Please upload your resume.");
      return;
    }

    if (!consentGiven) {
      setError("You must check the consent box to submit your application.");
      return;
    }

    setSubmitLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("phone", phone);
      formData.append("consent_given", consentGiven ? "true" : "false");
      formData.append("resume", resumeFile);
      
      if (linkedinUrl) formData.append("linkedin_url", linkedinUrl);
      if (githubUrl && isTech()) formData.append("github_url", githubUrl);

      await applyJob(jobId, formData);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit application. Please verify your fields and file.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", margin: "auto" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "3px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem"
          }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading Job Details...</p>
        </div>
      </div>
    );
  }

  if (error && !job) {
    return (
      <div className="app-container" style={{ maxWidth: "600px", padding: "6rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", color: "var(--danger)", marginBottom: "1rem" }}>Unavailable</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div className="glass-card animate-fade" style={{ width: "100%", maxWidth: "500px", textAlign: "center", padding: "3rem 2rem" }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "2px solid var(--accent)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent)",
            marginBottom: "1.5rem"
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Application Submitted!</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6", marginBottom: "2rem" }}>
            Thank you for applying for the <strong>{job.title}</strong> position at <strong>{job.organization_name}</strong>.
            Our team is reviewing your profile and resume. We will contact you via email or WhatsApp if you are shortlisted.
          </p>

          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "center" }}>
            <Terminal size={14} />
            <span>AI Background Screening Triggered</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ maxWidth: "1100px", padding: "3rem 1.5rem" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: "3rem", alignItems: "start" }}>
        
        {/* Left Side: Job description details */}
        <div>
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)", padding: "0.3rem 0.75rem", borderRadius: "999px", color: "var(--primary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.75rem" }}>
              <Sparkles size={12} />
              <span>We're Hiring</span>
            </div>
            <h1 style={{ fontSize: "2.25rem", marginBottom: "0.25rem" }}>{job.title}</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>{job.organization_name}</p>
          </div>

          {/* Render the polished markdown/plain description */}
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "16px",
            padding: "2rem",
            fontSize: "0.975rem",
            lineHeight: "1.7",
            color: "#e5e7eb",
            whiteSpace: "pre-wrap"
          }}>
            {job.polished_description}
          </div>
        </div>

        {/* Right Side: Apply Form */}
        <div style={{ position: "sticky", top: "40px" }}>
          <div className="glass-card" style={{ padding: "2rem" }}>
            <h2 style={{ fontSize: "1.35rem", marginBottom: "0.5rem" }}>Apply for this Role</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>Complete the form below and upload your resume to apply.</p>

            {error && (
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "8px", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="candName">Full Name</label>
                <div style={{ position: "relative" }}>
                  <User size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    id="candName"
                    type="text"
                    required
                    className="glass-input"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="candEmail">Email Address</label>
                <div style={{ position: "relative" }}>
                  <Mail size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    id="candEmail"
                    type="email"
                    required
                    className="glass-input"
                    placeholder="jane.doe@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="candPhone">Phone Number</label>
                <div style={{ position: "relative" }}>
                  <Phone size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    id="candPhone"
                    type="tel"
                    required
                    className="glass-input"
                    placeholder="+1 (555) 019-2834"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="candLinkedin">LinkedIn Profile URL</label>
                <div style={{ position: "relative" }}>
                  <Linkedin size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                  <input
                    id="candLinkedin"
                    type="url"
                    className="glass-input"
                    placeholder="https://linkedin.com/in/janedoe"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    style={{ paddingLeft: "2.5rem" }}
                  />
                </div>
              </div>

              {isTech() && (
                <div className="form-group animate-fade">
                  <label htmlFor="candGithub">GitHub Profile URL (Required for Tech Roles)</label>
                  <div style={{ position: "relative" }}>
                    <Github size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    <input
                      id="candGithub"
                      type="url"
                      required
                      className="glass-input"
                      placeholder="https://github.com/janedoe"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      style={{ paddingLeft: "2.5rem" }}
                    />
                  </div>
                </div>
              )}

              {/* File upload resume */}
              <div className="form-group">
                <label>Resume CV (PDF or DOCX, max 10MB)</label>
                <div style={{
                  border: fileError ? "1px dashed var(--danger)" : resumeFile ? "1px solid var(--accent)" : "1px dashed var(--border-color)",
                  borderRadius: "8px",
                  padding: "1.25rem",
                  background: "rgba(0,0,0,0.15)",
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative"
                }}>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, opacity: 0, cursor: "pointer" }}
                  />
                  <FileText size={28} style={{ color: resumeFile ? "var(--accent)" : "var(--text-muted)", marginBottom: "0.5rem" }} />
                  {resumeFile ? (
                    <div style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>{resumeFile.name}</div>
                  ) : (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      Click to browse or drag & drop files
                    </div>
                  )}
                </div>
                {fileError && <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{fileError}</span>}
              </div>

              {/* AI Consent Checkbox */}
              <div style={{
                display: "flex",
                gap: "0.75rem",
                marginTop: "1.5rem",
                marginBottom: "2rem",
                background: "rgba(99, 102, 241, 0.03)",
                border: "1px solid rgba(99, 102, 241, 0.1)",
                padding: "1rem",
                borderRadius: "8px"
              }}>
                <input
                  id="consentCheckbox"
                  type="checkbox"
                  required
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  style={{ width: "18px", height: "18px", marginTop: "2px", cursor: "pointer" }}
                />
                <label htmlFor="consentCheckbox" style={{ fontSize: "0.785rem", color: "var(--text-secondary)", lineHeight: "1.55", cursor: "pointer", fontWeight: "normal" }}>
                  I consent to having my resume and profile details processed by <strong>AI algorithms</strong> for screening against this position. I understand that my public GitHub code commits and social data may be evaluated, and that I may be contacted via <strong>WhatsApp</strong> if my application is shortlisted.
                </label>
              </div>

              <button
                type="submit"
                className={`btn btn-primary ${submitLoading ? "btn-disabled" : ""}`}
                style={{ width: "100%" }}
                disabled={submitLoading}
              >
                {submitLoading ? (
                  <>
                    <div className="spinner animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />
                    <span>Submit Candidate Application</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

      </div>

      <style jsx global>{`
        .spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function Github({ size = 16, style = {} }: { size?: number; style?: any }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
      <path d="M9 18c-4.51 2-5-2-7-2"></path>
    </svg>
  );
}

function Linkedin({ size = 16, style = {} }: { size?: number; style?: any }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
      <rect width="4" height="12" x="2" y="9"></rect>
      <circle cx="4" cy="4" r="2"></circle>
    </svg>
  );
}
