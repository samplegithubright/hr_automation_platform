"use main"
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getJob, getJobCandidates, submitLinkedInCheck, getStaticFileUrl, isAuthenticated, deleteCandidate } from "@/lib/api";
import { ArrowLeft, User, Mail, Phone, Calendar, ShieldAlert, Award, CheckCircle2, ChevronRight, FileText } from "lucide-react";
import Link from "next/link";

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = Number(params.id);

  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingLinkedin, setSubmittingLinkedin] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");
  const [showMobileDetail, setShowMobileDetail] = useState(false);

  // LinkedIn form fields
  const [linkedinExists, setLinkedinExists] = useState(true);
  const [linkedinRoleFit, setLinkedinRoleFit] = useState("Medium");
  const [linkedinRedFlags, setLinkedinRedFlags] = useState("");
  const [linkedinScore, setLinkedinScore] = useState(70);

  const loadData = async () => {
    try {
      const jobData = await getJob(jobId);
      setJob(jobData);
      
      const candidatesData = await getJobCandidates(jobId);
      setCandidates(candidatesData);
      
      if (candidatesData.length > 0 && !selectedCandidate) {
        setSelectedCandidate(candidatesData[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load job details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }
    loadData();
  }, [jobId, router]);

  // Update LinkedIn form fields when selected candidate changes
  useEffect(() => {
    if (selectedCandidate?.screening) {
      const scr = selectedCandidate.screening;
      setLinkedinExists(scr.linkedin_exists !== null ? scr.linkedin_exists : true);
      setLinkedinRoleFit(scr.linkedin_role_fit || "Medium");
      setLinkedinRedFlags(scr.linkedin_red_flags || "");
      setLinkedinScore(scr.linkedin_score !== null ? scr.linkedin_score : 70);
    }
  }, [selectedCandidate]);

  const handleLinkedInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;
    setSubmittingLinkedin(true);
    
    try {
      const updatedScreening = await submitLinkedInCheck(selectedCandidate.id, {
        linkedin_exists: linkedinExists,
        linkedin_role_fit: linkedinRoleFit,
        linkedin_red_flags: linkedinRedFlags,
        linkedin_score: Number(linkedinScore)
      });
      
      // Update local state
      const updatedCandidates = candidates.map(cand => {
        if (cand.id === selectedCandidate.id) {
          return { ...cand, screening: updatedScreening };
        }
        return cand;
      });
      
      setCandidates(updatedCandidates);
      setSelectedCandidate({ ...selectedCandidate, screening: updatedScreening });
      alert("LinkedIn observation saved. Combined score updated successfully.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSubmittingLinkedin(false);
    }
  };

  const handleDeleteCandidate = async () => {
    if (!selectedCandidate) return;
    if (
      !confirm(
        `Are you sure you want to delete candidate "${selectedCandidate.name}"? This will permanently remove all their CV scores, screening history, and uploaded resume.`
      )
    )
      return;

    setDeleteLoading(true);
    try {
      await deleteCandidate(selectedCandidate.id);

      const updatedCandidates = candidates.filter((cand) => cand.id !== selectedCandidate.id);
      setCandidates(updatedCandidates);

      if (updatedCandidates.length > 0) {
        setSelectedCandidate(updatedCandidates[0]);
      } else {
        setSelectedCandidate(null);
      }
      alert("Candidate deleted successfully.");
    } catch (err: any) {
      alert("Error deleting candidate: " + err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const getCombinedScoreBreakdown = (scr: any) => {
    if (!scr) return null;
    const cvScore = scr.overall_score || 0;
    const ghScore = scr.github_score || 0;
    const liScore = scr.linkedin_score || 0;
    const ghApp = scr.github_applicable;

    if (ghApp) {
      const cvContrib = cvScore * 0.70;
      const ghContrib = ghScore * 0.15;
      const liContrib = liScore * 0.15;
      return {
        formula: "CV (70%) + GitHub (15%) + LinkedIn (15%)",
        cvContrib: cvContrib.toFixed(2),
        ghContrib: ghContrib.toFixed(2),
        liContrib: liContrib.toFixed(2),
        total: (cvContrib + ghContrib + liContrib).toFixed(2),
        ghApp: true
      };
    } else {
      const cvRaw = cvScore * 0.70;
      const liRaw = liScore * 0.15;
      const total = (cvRaw + liRaw) / 0.85;
      return {
        formula: "Scaled: (CV * 70% + LinkedIn * 15%) / 0.85",
        cvContrib: (cvRaw / 0.85).toFixed(2),
        ghContrib: "N/A",
        liContrib: (liRaw / 0.85).toFixed(2),
        total: total.toFixed(2),
        ghApp: false
      };
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
          <p style={{ color: "var(--text-secondary)" }}>Loading Candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
        {job?.status === "approved" && (
          <Link href={`/apply/${job.id}`} target="_blank" className="btn btn-secondary" style={{ fontSize: "0.85rem", padding: "0.5rem 1rem" }}>
            <ExternalLinkIcon size={14} />
            <span>Open Public Form</span>
          </Link>
        )}
      </div>

      <div style={{ marginBottom: "2.5rem" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase" }}>Job details & Review</span>
        <h1 style={{ fontSize: "2rem", marginTop: "0.25rem" }}>{job?.title}</h1>
        <p style={{ color: "var(--text-secondary)" }}>Company: <strong>{job?.organization_name}</strong> | Candidates applied: <strong>{candidates.length}</strong></p>
      </div>

      {candidates.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <User size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>No candidates have applied yet</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Share the public application URL with candidates to collect submissions.
          </p>
          {job?.status === "approved" && (
            <div style={{ marginTop: "1.5rem" }}>
              <input
                type="text"
                readOnly
                className="glass-input"
                value={`${window.location.origin}/apply/${job.id}`}
                style={{ width: "100%", maxWidth: "400px", textAlign: "center", cursor: "pointer", marginBottom: "1rem" }}
                onClick={(e) => {
                  navigator.clipboard.writeText((e.target as HTMLInputElement).value);
                  alert("Link copied to clipboard!");
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Click the input box to copy the public apply URL.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="job-detail-grid">
          {/* Left panel: Candidate List Table */}
          <div className={`glass-table-container candidate-list-panel ${showMobileDetail ? "hide-mobile" : ""}`}>
            <table className="glass-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Applied On</th>
                  <th style={{ textAlign: "center" }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((cand) => {
                  const combined = cand.screening?.combined_score;
                  const isSelected = selectedCandidate?.id === cand.id;
                  return (
                    <tr
                      key={cand.id}
                      onClick={() => {
                        setSelectedCandidate(cand);
                        setShowMobileDetail(true);
                      }}
                      style={{
                        backgroundColor: isSelected ? "rgba(99, 102, 241, 0.08)" : "",
                        borderLeft: isSelected ? "3px solid var(--primary)" : ""
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: isSelected ? "#fff" : "var(--text-primary)" }}>{cand.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{cand.email}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          {new Date(cand.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          color: combined && combined >= 75 ? "var(--accent)" : combined && combined >= 50 ? "var(--warning)" : "var(--danger)"
                        }}>
                          {combined !== null && combined !== undefined ? `${combined}%` : "Pending"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Right panel: Screening detail cards */}
          {selectedCandidate && (
            <div className={`candidate-detail-panel ${!showMobileDetail ? "hide-mobile" : ""}`}>
              {/* Mobile Back Button */}
              <button 
                onClick={() => setShowMobileDetail(false)}
                className="btn btn-secondary mobile-back-btn"
              >
                <ArrowLeft size={16} />
                <span>Back to Candidates</span>
              </button>
              {/* Profile Card */}
              <div className="glass-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1.5rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.35rem", marginBottom: "0.25rem" }}>{selectedCandidate.name}</h2>
                    <div style={{ display: "flex", gap: "1rem", color: "var(--text-secondary)", fontSize: "0.85rem", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Mail size={14} /> {selectedCandidate.email}</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}><Phone size={14} /> {selectedCandidate.phone}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <a
                      href={getStaticFileUrl(selectedCandidate.resume_path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                    >
                      <FileText size={14} />
                      <span>View CV</span>
                    </a>
                    <button
                      onClick={handleDeleteCandidate}
                      className={`btn btn-danger ${deleteLoading ? "btn-disabled" : ""}`}
                      style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                      disabled={deleteLoading}
                    >
                      <span>Delete</span>
                    </button>
                  </div>
                </div>

                {/* Score visualization row */}
                {selectedCandidate.screening ? (
                  <div>
                    <div className="score-circles-container" style={{ marginBottom: "1.5rem", background: "rgba(0,0,0,0.15)", padding: "1rem", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                      {/* Overall circular badge */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          className="score-circle"
                          style={{
                            "--val": selectedCandidate.screening.combined_score || 0,
                            "--color": "var(--primary)"
                          } as any}
                        >
                          <div className="score-text">
                            <span>{selectedCandidate.screening.combined_score || 0}%</span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.5rem", color: "var(--primary)" }}>Combined</span>
                      </div>

                      {/* CV Circular badge */}
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div
                          className="score-circle"
                          style={{
                            "--val": selectedCandidate.screening.overall_score || 0,
                            "--color": "var(--accent)"
                          } as any}
                        >
                          <div className="score-text">
                            <span>{selectedCandidate.screening.overall_score || 0}%</span>
                          </div>
                        </div>
                        <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.5rem", color: "var(--accent)" }}>CV Screening</span>
                      </div>

                      {/* GitHub badge */}
                      {selectedCandidate.screening.github_applicable ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            className="score-circle"
                            style={{
                              "--val": selectedCandidate.screening.github_score || 0,
                              "--color": "var(--secondary)"
                            } as any}
                          >
                            <div className="score-text">
                              <span>{selectedCandidate.screening.github_score || 0}%</span>
                            </div>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.5rem", color: "var(--secondary)" }}>GitHub Code</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.4 }}>
                          <div className="score-circle" style={{ "--val": 0, "--color": "var(--text-muted)" } as any}>
                            <div className="score-text" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>N/A</div>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.5rem", color: "var(--text-muted)" }}>GitHub</span>
                        </div>
                      )}

                      {/* LinkedIn badge */}
                      {selectedCandidate.screening.linkedin_score !== null ? (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                          <div
                            className="score-circle"
                            style={{
                              "--val": selectedCandidate.screening.linkedin_score || 0,
                              "--color": "var(--warning)"
                            } as any}
                          >
                            <div className="score-text">
                              <span>{selectedCandidate.screening.linkedin_score || 0}%</span>
                            </div>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.5rem", color: "var(--warning)" }}>LinkedIn</span>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", opacity: 0.5 }}>
                          <div className="score-circle" style={{ "--val": 0, "--color": "var(--text-muted)" } as any}>
                            <div className="score-text" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Unchecked</div>
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginTop: "0.5rem", color: "var(--text-muted)" }}>LinkedIn</span>
                        </div>
                      )}
                    </div>

                    {/* Combined Score Contribution Breakdown Box */}
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "8px", fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                      <div style={{ fontWeight: 700, color: "#fff", marginBottom: "0.5rem", fontSize: "0.9rem" }}>Score Formula Breakdown</div>
                      <div style={{ fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                        <div>Formula: {getCombinedScoreBreakdown(selectedCandidate.screening)?.formula}</div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "0.5rem", marginTop: "0.5rem" }}>
                          <span>CV (70%):</span>
                          <strong style={{ color: "#fff" }}>
                            {getCombinedScoreBreakdown(selectedCandidate.screening)?.ghApp ? `0.70 × ${selectedCandidate.screening.overall_score}` : `(0.70 × ${selectedCandidate.screening.overall_score}) / 0.85`} = {getCombinedScoreBreakdown(selectedCandidate.screening)?.cvContrib}%
                          </strong>
                        </div>
                        {selectedCandidate.screening.github_applicable && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span>GitHub (15%):</span>
                            <strong style={{ color: "#fff" }}>
                              0.15 × {selectedCandidate.screening.github_score || 0} = {getCombinedScoreBreakdown(selectedCandidate.screening)?.ghContrib}%
                            </strong>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>LinkedIn (15%):</span>
                          <strong style={{ color: "#fff" }}>
                            {getCombinedScoreBreakdown(selectedCandidate.screening)?.ghApp ? `0.15 × ${selectedCandidate.screening.linkedin_score || 0}` : `(0.15 × ${selectedCandidate.screening.linkedin_score || 0}) / 0.85`} = {getCombinedScoreBreakdown(selectedCandidate.screening)?.liContrib}%
                          </strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px dashed var(--border-color)", paddingTop: "0.5rem", marginTop: "0.5rem", fontSize: "0.95rem", color: "#fff" }}>
                          <span>Final Composite Score:</span>
                          <strong style={{ color: "var(--accent)" }}>{getCombinedScoreBreakdown(selectedCandidate.screening)?.total}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: "1rem", textAlign: "center", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                    Screening data is compiling...
                  </div>
                )}
              </div>

              {selectedCandidate.screening && (
                <>
                  {/* AI Resume Flag advisory indicator */}
                  <div className="glass-card" style={{
                    borderColor: selectedCandidate.screening.ai_resume_flag === "High" ? "rgba(239, 68, 68, 0.4)" : selectedCandidate.screening.ai_resume_flag === "Medium" ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.2)",
                    background: selectedCandidate.screening.ai_resume_flag === "High" ? "rgba(239, 68, 68, 0.04)" : selectedCandidate.screening.ai_resume_flag === "Medium" ? "rgba(245, 158, 11, 0.04)" : "rgba(16, 185, 129, 0.02)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      <ShieldAlert size={20} style={{
                        color: selectedCandidate.screening.ai_resume_flag === "High" ? "var(--danger)" : selectedCandidate.screening.ai_resume_flag === "Medium" ? "var(--warning)" : "var(--accent)"
                      }} />
                      <h3 style={{ fontSize: "1.1rem" }}>AI-Generated Style Check</h3>
                      <span className="badge" style={{
                        backgroundColor: selectedCandidate.screening.ai_resume_flag === "High" ? "rgba(239, 68, 68, 0.2)" : selectedCandidate.screening.ai_resume_flag === "Medium" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)",
                        color: selectedCandidate.screening.ai_resume_flag === "High" ? "var(--danger)" : selectedCandidate.screening.ai_resume_flag === "Medium" ? "var(--warning)" : "var(--accent)",
                        marginLeft: "auto"
                      }}>
                        {selectedCandidate.screening.ai_resume_flag} Risk
                      </span>
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.5" }}>
                      {selectedCandidate.screening.ai_resume_reason}
                    </p>
                    <div style={{ display: "flex", gap: "0.25rem", color: "var(--text-muted)", fontSize: "0.725rem", marginTop: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "0.5rem" }}>
                      <strong>Note:</strong> Advisory heuristic. Never use as an automatic rejection criterion.
                    </div>
                  </div>

                  {/* CV screening details */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Award size={18} style={{ color: "var(--accent)" }} />
                      <span>CV Screening Insights</span>
                    </h3>
                    
                    {/* CV breakdown */}
                    <div className="grid-3" style={{ marginBottom: "1rem", gap: "1rem" }}>
                      <div style={{ background: "rgba(0,0,0,0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Skills</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem" }}>{selectedCandidate.screening.skills_score}%</div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Experience</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem" }}>{selectedCandidate.screening.experience_score}%</div>
                      </div>
                      <div style={{ background: "rgba(0,0,0,0.1)", padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--border-color)", textAlign: "center" }}>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Education</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem" }}>{selectedCandidate.screening.education_score}%</div>
                      </div>
                    </div>

                    <div style={{ fontSize: "0.9rem", color: "#d1d5db", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                      {selectedCandidate.screening.reasoning}
                    </div>
                  </div>

                  {/* GitHub Profile check (Tech Roles Only) */}
                  {selectedCandidate.screening.github_applicable && (
                    <div className="glass-card">
                      <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Github size={18} style={{ color: "var(--secondary)" }} />
                        <span>GitHub Code Footprint Check</span>
                      </h3>

                      {selectedCandidate.github_url ? (
                        <div>
                          <div style={{ background: "rgba(0,0,0,0.15)", border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Profile URL:</span>
                              <a href={selectedCandidate.github_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                <span>{selectedCandidate.github_url.split("/").pop()}</span>
                                <ExternalLinkIcon size={12} />
                              </a>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Footprint Consistency:</span>
                              <strong style={{ fontSize: "1.1rem", color: selectedCandidate.screening.github_score >= 70 ? "var(--accent)" : selectedCandidate.screening.github_score >= 50 ? "var(--warning)" : "var(--danger)" }}>
                                {selectedCandidate.screening.github_score}%
                              </strong>
                            </div>
                          </div>

                          <div style={{ fontSize: "0.9rem", color: "#d1d5db", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                            {selectedCandidate.screening.github_analysis}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: "0.5rem", color: "var(--text-muted)", fontSize: "0.875rem", padding: "1rem", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                          <span>⚠️</span>
                          <span>Candidate did not provide a GitHub profile. Consistency score default is 0.</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual LinkedIn Assessment Form */}
                  <div className="glass-card">
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Linkedin size={18} style={{ color: "var(--warning)" }} />
                      <span>Manual LinkedIn Profile Verification</span>
                    </h3>

                    {selectedCandidate.linkedin_url ? (
                      <div style={{ marginBottom: "1.25rem" }}>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Candidate LinkedIn Link: </span>
                        <a href={selectedCandidate.linkedin_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                          <span>View Profile</span>
                          <ExternalLinkIcon size={12} />
                        </a>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>
                        ⚠️ Candidate did not supply a LinkedIn URL. You can search manually on LinkedIn.
                      </div>
                    )}

                    <form onSubmit={handleLinkedInSubmit}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <input
                          id="liExists"
                          type="checkbox"
                          checked={linkedinExists}
                          onChange={(e) => setLinkedinExists(e.target.checked)}
                          style={{ width: "16px", height: "16px", cursor: "pointer" }}
                        />
                        <label htmlFor="liExists" style={{ cursor: "pointer", fontWeight: "normal" }}>Profile exists & verified</label>
                      </div>

                      {linkedinExists && (
                        <div className="grid-2">
                          <div className="form-group">
                            <label htmlFor="liFit">Role Fit Assessment</label>
                            <select
                              id="liFit"
                              className="glass-input"
                              value={linkedinRoleFit}
                              onChange={(e) => setLinkedinRoleFit(e.target.value)}
                            >
                              <option value="High" style={{ background: "var(--bg-deep)" }}>High Fit</option>
                              <option value="Medium" style={{ background: "var(--bg-deep)" }}>Medium Fit</option>
                              <option value="Low" style={{ background: "var(--bg-deep)" }}>Low Fit</option>
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor="liScore">Score Rating (0 - 100): <strong>{linkedinScore}</strong></label>
                            <input
                              id="liScore"
                              type="range"
                              min="0"
                              max="100"
                              className="glass-input"
                              value={linkedinScore}
                              onChange={(e) => setLinkedinScore(Number(e.target.value))}
                              style={{ padding: "0.25rem", cursor: "pointer" }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="form-group" style={{ marginBottom: "1.5rem" }}>
                        <label htmlFor="liFlags">Observations / Red Flags</label>
                        <textarea
                          id="liFlags"
                          className="glass-input"
                          rows={3}
                          placeholder="e.g. Work history matches resume, active poster. No red flags found."
                          value={linkedinRedFlags}
                          onChange={(e) => setLinkedinRedFlags(e.target.value)}
                          style={{ resize: "vertical", fontFamily: "inherit" }}
                        />
                      </div>

                      <button
                        type="submit"
                        className={`btn btn-primary ${submittingLinkedin ? "btn-disabled" : ""}`}
                        style={{ width: "100%" }}
                        disabled={submittingLinkedin}
                      >
                        {submittingLinkedin ? "Saving Check..." : "Save Assessment & Recalculate Score"}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        .score-circle {
          --val: 0;
          --color: var(--primary);
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

// Minimal Icons locally referenced in layout
function ExternalLinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6"></path>
      <path d="M10 14 21 3"></path>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
    </svg>
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
