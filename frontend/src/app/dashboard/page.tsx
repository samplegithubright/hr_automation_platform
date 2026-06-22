"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getJobs, isAuthenticated, removeAuthToken, getMe, deleteJob } from "@/lib/api";
import { Plus, Briefcase, FileText, Share2, LogOut, Search, Settings, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Authenticate user
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const me = await getMe();
        setUserEmail(me.email);
        
        const jobsList = await getJobs();
        setJobs(jobsList);
      } catch (err) {
        console.error("Auth failed, redirecting to login:", err);
        removeAuthToken();
        router.push("/");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleLogout = () => {
    removeAuthToken();
    router.push("/");
  };

  const handleDeleteJob = async (jobId: number, jobTitle: string) => {
    if (!confirm(`Are you sure you want to delete the job posting "${jobTitle}"? This will permanently delete all candidate submissions and AI screenings for this job.`)) {
      return;
    }
    try {
      await deleteJob(jobId);
      setJobs(jobs.filter(j => j.id !== jobId));
    } catch (err: any) {
      alert("Error deleting job: " + err.message);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const searchString = searchTerm.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchString) ||
      job.organization_name.toLowerCase().includes(searchString)
    );
  });

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "3px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "var(--primary)",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 1rem"
          }} />
          <p style={{ color: "var(--text-secondary)" }}>Loading Dashboard...</p>
          <style jsx global>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Premium Header */}
      <header className="glass-header">
        <div className="app-container header-container" style={{ padding: "0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff"
            }}>
              <Sparkles size={20} />
            </div>
            <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>HR Dashboard</span>
          </div>

          <div className="header-controls">
            <span className="header-email-text" style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              Logged in as: <strong style={{ color: "#fff" }}>{userEmail}</strong>
            </span>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
              <LogOut size={16} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Section */}
      <main className="app-container">
        {/* Actions Bar */}
        <div className="dashboard-actions">
          {/* Search bar */}
          <div className="search-wrapper">
            <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Search jobs or companies..."
              className="glass-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: "2.5rem" }}
            />
          </div>

          <Link href="/dashboard/jobs/new" className="btn btn-primary">
            <Plus size={18} />
            <span>Create New Job Description</span>
          </Link>
        </div>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: "center", padding: "4rem 2rem" }}>
            <Briefcase size={48} style={{ color: "var(--text-muted)", marginBottom: "1rem" }} />
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>No job postings found</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              {searchTerm ? "No results match your search term." : "Get started by generating your first AI polished job description."}
            </p>
            {!searchTerm && (
              <Link href="/dashboard/jobs/new" className="btn btn-primary">
                <Plus size={18} />
                <span>Create Job</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid-3">
            {filteredJobs.map((job, idx) => (
              <div key={job.id} className="glass-card animate-fade" style={{ animationDelay: `${idx * 0.05}s` }}>
                {/* Header status */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span className={`badge badge-${job.status}`}>
                      {job.status}
                    </span>
                    <button
                      onClick={() => handleDeleteJob(job.id, job.title)}
                      title="Delete Job Posting"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        padding: "2px",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "color 0.2s ease"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = "var(--danger)"}
                      onMouseLeave={(e) => e.currentTarget.style.color = "var(--text-muted)"}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                </div>

                {/* Job Info */}
                <h3 style={{ fontSize: "1.15rem", marginBottom: "0.25rem" }}>{job.title}</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
                  {job.organization_name}
                </p>

                {/* Footer Buttons */}
                <div style={{
                  display: "flex",
                  gap: "0.5rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1rem",
                  marginTop: "1.5rem"
                }}>
                  <Link href={`/dashboard/jobs/${job.id}`} className="btn btn-secondary" style={{ flex: 1, padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
                    <FileText size={14} />
                    <span>Review Candidates</span>
                  </Link>

                  {job.status === "approved" && (
                    <Link href={`/dashboard/jobs/${job.id}/assets`} className="btn btn-primary" style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}>
                      <Share2 size={14} />
                      <span>Socials</span>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
