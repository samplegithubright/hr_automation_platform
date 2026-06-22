"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getJobAssets, getJob, getStaticFileUrl, regenerateJobAssets, isAuthenticated, API_BASE_URL } from "@/lib/api";
import { ArrowLeft, Copy, ExternalLink, RefreshCw, Sparkles, Check, Download, AlertTriangle } from "lucide-react";
import Link from "next/link";

type PlatformData = {
  caption: string;
  groups: string[];
};

type SocialAssets = {
  linkedin_caption: string;
  linkedin_groups: string[];
  twitter_caption: string;
  twitter_groups: string[];
  facebook_caption: string;
  facebook_groups: string[];
  instagram_caption: string;
  instagram_groups: string[];
  visual_url: string;
};

export default function SocialAssetsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = Number(params.id);

  const [job, setJob] = useState<any>(null);
  const [assets, setAssets] = useState<SocialAssets | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [copiedPlatform, setCopiedPlatform] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/");
      return;
    }

    const loadData = async () => {
      try {
        const jobData = await getJob(jobId);
        setJob(jobData);
        
        const assetData = await getJobAssets(jobId);
        setAssets(assetData);
      } catch (err: any) {
        setError(err.message || "Failed to load social posting assets.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [jobId, router]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError("");
    try {
      const freshAssets = await regenerateJobAssets(jobId);
      setAssets(freshAssets);
    } catch (err: any) {
      setError(err.message || "Failed to regenerate assets.");
    } finally {
      setRegenerating(false);
    }
  };

  const copyToClipboard = (text: string, platform: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPlatform(platform);
    setTimeout(() => setCopiedPlatform(null), 2000);
  };

  const getSharingLink = (platform: string, caption: string) => {
    const encodedText = encodeURIComponent(caption);
    switch (platform) {
      case "linkedin":
        return "https://www.linkedin.com/feed/";
      case "twitter":
        return `https://twitter.com/intent/tweet?text=${encodedText}`;
      case "facebook":
        return "https://www.facebook.com/groups/";
      case "instagram":
        return "https://www.instagram.com/";
      default:
        return "#";
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
          <p style={{ color: "var(--text-secondary)" }}>Loading Assets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container" style={{ maxWidth: "800px", padding: "4rem 2rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "1.5rem", color: "var(--danger)", marginBottom: "1rem" }}>Error Loading Assets</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>{error}</p>
        <Link href="/dashboard" className="btn btn-primary">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Back button & Action */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
        <Link href={`/dashboard`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontWeight: 600 }}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>

        <button
          onClick={handleRegenerate}
          className={`btn btn-secondary ${regenerating ? "btn-disabled" : ""}`}
          disabled={regenerating}
        >
          <RefreshCw size={16} className={regenerating ? "animate-spin" : ""} />
          <span>Regenerate Assets</span>
        </button>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700, textTransform: "uppercase" }}>Posting Assistant</span>
        <h1 style={{ fontSize: "2rem", marginTop: "0.25rem" }}>Job Promotion Kit</h1>
        <p style={{ color: "var(--text-secondary)" }}>Social captions, targeted communities, and branded visuals for <strong>{job?.title}</strong> at <strong>{job?.organization_name}</strong>.</p>
      </div>

      <div className="assets-layout-grid">
        {/* Left Side: Social platforms */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* LinkedIn Asset */}
          <div className="glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#0077b5" }}>LinkedIn</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => copyToClipboard(assets?.linkedin_caption || "", "linkedin")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  {copiedPlatform === "linkedin" ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}
                  <span>{copiedPlatform === "linkedin" ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={getSharingLink("linkedin", assets?.linkedin_caption || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  <ExternalLink size={14} />
                  <span>Open Feed</span>
                </a>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#e5e7eb", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)", marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
              {assets?.linkedin_caption}
            </p>
            {assets?.linkedin_groups && assets.linkedin_groups.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  <AlertTriangle size={12} style={{ color: "var(--warning)" }} />
                  <span>Suggested Groups (AI-suggested & unverified)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {assets.linkedin_groups.map((group, idx) => (
                    <span key={idx} style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "#a5b4fc" }}>
                      {group}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Twitter Asset */}
          <div className="glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#1da1f2" }}>Twitter / X</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => copyToClipboard(assets?.twitter_caption || "", "twitter")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  {copiedPlatform === "twitter" ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}
                  <span>{copiedPlatform === "twitter" ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={getSharingLink("twitter", assets?.twitter_caption || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  <ExternalLink size={14} />
                  <span>Tweet</span>
                </a>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#e5e7eb", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)", marginBottom: "0.5rem", whiteSpace: "pre-wrap" }}>
              {assets?.twitter_caption}
            </p>
            <div style={{ fontSize: "0.75rem", textAlign: "right", color: (assets?.twitter_caption || "").length > 280 ? "var(--danger)" : "var(--text-muted)" }}>
              Character Count: {(assets?.twitter_caption || "").length} / 280 (Strictly enforced)
            </div>
          </div>

          {/* Facebook Asset */}
          <div className="glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#1877f2" }}>Facebook</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => copyToClipboard(assets?.facebook_caption || "", "facebook")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  {copiedPlatform === "facebook" ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}
                  <span>{copiedPlatform === "facebook" ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={getSharingLink("facebook", assets?.facebook_caption || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  <ExternalLink size={14} />
                  <span>Open Groups</span>
                </a>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#e5e7eb", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)", marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
              {assets?.facebook_caption}
            </p>
            {assets?.facebook_groups && assets.facebook_groups.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  <AlertTriangle size={12} style={{ color: "var(--warning)" }} />
                  <span>Suggested Communities (AI-suggested & unverified)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {assets.facebook_groups.map((group, idx) => (
                    <span key={idx} style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "#a5b4fc" }}>
                      {group}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Instagram Asset */}
          <div className="glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1.1rem", color: "#c13584" }}>Instagram</h3>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => copyToClipboard(assets?.instagram_caption || "", "instagram")}
                  className="btn btn-secondary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  {copiedPlatform === "instagram" ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}
                  <span>{copiedPlatform === "instagram" ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={getSharingLink("instagram", assets?.instagram_caption || "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem" }}
                >
                  <ExternalLink size={14} />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
            <p style={{ fontSize: "0.9rem", color: "#e5e7eb", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)", marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
              {assets?.instagram_caption}
            </p>
            {assets?.instagram_groups && assets.instagram_groups.length > 0 && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem", color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.5rem" }}>
                  <AlertTriangle size={12} style={{ color: "var(--warning)" }} />
                  <span>Suggested Hashtag Communities (AI-suggested & unverified)</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {assets.instagram_groups.map((group, idx) => (
                    <span key={idx} style={{ background: "rgba(99, 102, 241, 0.08)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "4px", padding: "0.2rem 0.5rem", fontSize: "0.75rem", color: "#a5b4fc" }}>
                      {group}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Branded visual preview */}
        <div className="assets-visual-sidebar">
          <div className="glass-card" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>Branded Promotion Card</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              A premium, high-resolution social graphic dynamically generated for this posting. Perfect to attach with captions.
            </p>

            {assets?.visual_url ? (
              <div style={{ position: "relative", width: "100%", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border-color)", background: "#000", marginBottom: "1.5rem" }}>
                {/* Visual Image */}
                <img
                  src={getStaticFileUrl(assets.visual_url)}
                  alt="Branded Visual Card"
                  style={{ width: "100%", height: "auto", display: "block" }}
                />
              </div>
            ) : (
              <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.2)", border: "1px dashed var(--border-color)", borderRadius: "8px", marginBottom: "1.5rem" }}>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Visual card is being generated...</p>
              </div>
            )}

            {assets?.visual_url && (
              <a
                href={`${API_BASE_URL}/api/jobs/${jobId}/assets/download`}
                className="btn btn-primary"
                style={{ width: "100%" }}
              >
                <Download size={18} />
                <span>Download Promocard PNG</span>
              </a>
            )}
          </div>
        </div>
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
