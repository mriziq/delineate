export default function SetupScreen() {
  return (
    <div className="setup-screen">
      <div className="setup-card">
        <div className="setup-logo">&#9889; triage</div>
        <p className="setup-subtitle">Connect your Linear workspace to start triaging</p>
        <a href="/auth/login" className="btn-primary setup-btn">
          Sign in with Linear
        </a>
      </div>
      <style>{`
        .setup-screen {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .setup-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--sp-8);
          width: 400px;
          max-width: 90vw;
          text-align: center;
        }
        .setup-logo {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: var(--sp-2);
          letter-spacing: -0.02em;
        }
        .setup-subtitle {
          color: var(--text-secondary);
          font-size: 0.875rem;
          margin-bottom: var(--sp-6);
        }
        .setup-btn {
          display: block;
          width: 100%;
          padding: var(--sp-3) var(--sp-4);
          text-align: center;
          text-decoration: none;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
