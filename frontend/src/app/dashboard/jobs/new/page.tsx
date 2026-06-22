"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createJob, updateJob, regenerateJobDescription, isAuthenticated } from "@/lib/api";
import { ArrowLeft, Sparkles, Check, X, RefreshCw, Edit, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function NewJobPage() {
  const router = useRouter();
  
  // Form states
  const [title, setTitle] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgDetails, setOrgDetails] = useState("");
  const [applyLink, setApplyLink] = useState("");
  const [rawDescription, setRawDescription] = useState("");
  
  // App logic states
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<number | null>(null);
  const [polishedJD, setPolishedJD] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<"form" | "review" | "approved" | "rejected">("form");
  const [error, setError] = useState("");

  // Authenticate user
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
    }
  }, [router]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await createJob({
        title,
        organization_name: orgName,
        organization_details: orgDetails,
        apply_link: applyLink,
        raw_description: rawDescription
      });
      setJobId(data.id);
      setPolishedJD(data.polished_description || "");
      setStatus("review");
    } catch (err: any) {
      setError(err.message || "Failed to generate job description.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!jobId) return;
    setError("");
    setLoading(true);

    try {
      const data = await regenerateJobDescription(jobId);
      setPolishedJD(data.polished_description || "");
      setIsEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate job description.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!jobId) return;
    setError("");
    setLoading(true);

    try {
      await updateJob(jobId, {
        status: "approved",
        polished_description: polishedJD
      });
      setStatus("approved");
    } catch (err: any) {
      setError(err.message || "Failed to approve job description.");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!jobId) return;
    setError("");
    setLoading(true);

    try {
      await updateJob(jobId, {
        status: "rejected"
      });
      setStatus("rejected");
    } catch (err: any) {
      setError(err.message || "Failed to reject job description.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container" style={{ maxWidth: "800px" }}>
      {/* Back button */}
      <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", marginBottom: "2.5rem", fontWeight: 600 }}>
        <ArrowLeft size={16} />
        <span>Back to Dashboard</span>
      </Link>

      <div className="glass-card animate-fade">
        {status === "form" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff"
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: "1.5rem" }}>New Job Description</h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Rewrite raw specs into a professional, one-page JD using AI.</p>
              </div>
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", gap: "0.5rem" }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleGenerate}>
              <div className="grid-2">
                <div className="form-group">
                  <label htmlFor="title">Job Title</label>
                  <input
                    id="title"
                    type="text"
                    required
                    className="glass-input"
                    placeholder="e.g. Senior Software Engineer"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="orgName">Organization Name</label>
                  <input
                    id="orgName"
                    type="text"
                    required
                    className="glass-input"
                    placeholder="e.g. Google DeepMind"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="applyLink">Apply Link</label>
                <input
                  id="applyLink"
                  type="text"
                  required
                  className="glass-input"
                  placeholder="e.g. https://careers.company.com/apply/123"
                  value={applyLink}
                  onChange={(e) => setApplyLink(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="orgDetails">Organization Details</label>
                <textarea
                  id="orgDetails"
                  required
                  className="glass-input"
                  rows={3}
                  placeholder="e.g. Headquartered in London, building AI models for positive impact. Hybrid setup, strong research focus."
                  value={orgDetails}
                  onChange={(e) => setOrgDetails(e.target.value)}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "2rem" }}>
                <label htmlFor="rawDescription">Raw Job Description</label>
                <textarea
                  id="rawDescription"
                  required
                  className="glass-input"
                  rows={8}
                  placeholder="Paste raw requirements, lists, unstructured text or notes here..."
                  value={rawDescription}
                  onChange={(e) => setRawDescription(e.target.value)}
                  style={{ resize: "vertical", fontFamily: "inherit" }}
                />
              </div>

              <button
                type="submit"
                className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
                style={{ width: "100%" }}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Rewriting Job Description...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    <span>Generate Polished Job Description</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {status === "review" && (
          <div>
            <div className="new-job-review-header">
              <div>
                <h1 style={{ fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Sparkles size={22} style={{ color: "var(--secondary)" }} />
                  <span>Review AI Output</span>
                </h1>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>HR must review and approve before publishing downstream.</p>
              </div>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`btn ${isEditing ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              >
                <Edit size={16} />
                <span>{isEditing ? "Done Editing" : "Edit Description"}</span>
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#fca5a5", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                {error}
              </div>
            )}

            {/* Content box */}
            <div style={{ marginBottom: "2rem" }}>
              {isEditing ? (
                <textarea
                  className="glass-input"
                  rows={20}
                  value={polishedJD}
                  onChange={(e) => setPolishedJD(e.target.value)}
                  style={{ fontFamily: "monospace", fontSize: "0.9rem", resize: "vertical", lineHeight: "1.5" }}
                />
              ) : (
                <div style={{
                  background: "rgba(7, 10, 19, 0.3)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "1.5rem",
                  fontSize: "0.95rem",
                  lineHeight: "1.6",
                  color: "#e5e7eb",
                  maxHeight: "500px",
                  overflowY: "auto",
                  whiteSpace: "pre-wrap"
                }}>
                  {polishedJD}
                </div>
              )}
            </div>

            {/* Word count warning indicator */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", fontSize: "0.825rem", color: "var(--text-secondary)" }}>
              <span>Word Budget Enforced: <strong style={{ color: polishedJD.split(/\s+/).filter(Boolean).length > 800 ? "var(--danger)" : "var(--accent)" }}>{polishedJD.split(/\s+/).filter(Boolean).length} / 800 words</strong></span>
              {polishedJD.split(/\s+/).filter(Boolean).length > 800 && (
                <span style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <ShieldAlert size={14} /> Exceeds budget. Please edit or truncate.
                </span>
              )}
            </div>

            {/* Action buttons */}
            <div className="new-job-actions">
              <button
                onClick={handleApprove}
                className={`btn btn-primary ${loading || polishedJD.split(/\s+/).filter(Boolean).length > 800 ? "btn-disabled" : ""}`}
                style={{ flex: 2, minWidth: "150px" }}
                disabled={loading || polishedJD.split(/\s+/).filter(Boolean).length > 800}
              >
                <Check size={18} />
                <span>Approve & Publish</span>
              </button>

              <button
                onClick={handleRegenerate}
                className={`btn btn-secondary ${loading ? "btn-disabled" : ""}`}
                style={{ flex: 1, minWidth: "120px" }}
                disabled={loading}
              >
                <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                <span>Regenerate</span>
              </button>

              <button
                onClick={handleReject}
                className={`btn btn-danger ${loading ? "btn-disabled" : ""}`}
                style={{ flex: 1, minWidth: "120px" }}
                disabled={loading}
              >
                <X size={16} />
                <span>Reject</span>
              </button>
            </div>
          </div>
        )}

        {status === "approved" && (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
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
              <Check size={36} />
            </div>

            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Job Description Approved!</h1>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 2.5rem", fontSize: "0.95rem" }}>
              The polished job description has been saved and is now live. Candidate applications can now be collected.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href={`/dashboard/jobs/${jobId}/assets`} className="btn btn-primary" style={{ padding: "0.75rem 2rem" }}>
                <span>Open Posting Assistant</span>
              </Link>
              <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.75rem 2rem" }}>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        )}

        {status === "rejected" && (
          <div style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "2px solid var(--danger)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--danger)",
              marginBottom: "1.5rem"
            }}>
              <X size={36} />
            </div>

            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.75rem" }}>Job Description Rejected</h1>
            <p style={{ color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 2.5rem", fontSize: "0.95rem" }}>
              The job posting was rejected. You can create a new description or view previous postings in the dashboard.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button onClick={() => setStatus("form")} className="btn btn-primary" style={{ padding: "0.75rem 2rem" }}>
                <span>Create New Job</span>
              </button>
              <Link href="/dashboard" className="btn btn-secondary" style={{ padding: "0.75rem 2rem" }}>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
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
