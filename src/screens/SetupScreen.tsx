import { useEffect, useRef, useState } from 'react'
import { DelineateLockup } from '../components/DelineateIcon'

/* ─── GitHub stars ───────────────────────────────────── */

function useGitHubStars() {
  const [stars, setStars] = useState<number | null>(null)
  useEffect(() => {
    fetch('https://api.github.com/repos/mriziq/delineate')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.stargazers_count != null) setStars(d.stargazers_count) })
      .catch(() => {})
  }, [])
  return stars
}

/* ─── Mini confetti burst ────────────────────────────── */

const CONFETTI_COLORS = ['#f2994a', '#5e6ad2', '#9b59b6', '#4cb782', '#f2c94c', '#eb5757']
const CONFETTI_COUNT = 18

interface Particle {
  id: number
  x: number
  y: number
  color: string
  angle: number
  speed: number
  size: number
}

function ConfettiBurst() {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 20,
      y: 50 + (Math.random() - 0.5) * 10,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      angle: (360 / CONFETTI_COUNT) * i + (Math.random() - 0.5) * 30,
      speed: 40 + Math.random() * 50,
      size: 3 + Math.random() * 3,
    }))
  )

  return (
    <div className="confetti-container">
      {particles.map(p => (
        <span
          key={p.id}
          className="confetti-particle"
          style={{
            '--cx': `${p.x}%`,
            '--cy': `${p.y}%`,
            '--ca': `${p.angle}deg`,
            '--cd': `${p.speed}px`,
            '--cs': `${p.size}px`,
            background: p.color,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

/* ─── Ghost key demo ─────────────────────────────────── */

interface DemoStep {
  prompt: string
  keys: { label: string; display: string; color: string; wide?: boolean }[]
  fireIndex: number
  badge?: string
  badgeColor?: string
}

const DEMO_STEPS: DemoStep[] = [
  {
    prompt: 'Set priority',
    keys: [
      { label: 'Urgent', display: '1', color: '#eb5757' },
      { label: 'High',   display: '2', color: '#f2994a' },
      { label: 'Medium', display: '3', color: '#f2c94c' },
      { label: 'Low',    display: '4', color: '#4cb782' },
    ],
    fireIndex: 1,
    badge: 'High',
    badgeColor: '#f2994a',
  },
  {
    prompt: 'Add estimate',
    keys: [{ label: 'Estimate', display: 'E', color: '#5e6ad2' }],
    fireIndex: 0,
    badge: '3 pts',
    badgeColor: '#5e6ad2',
  },
  {
    prompt: 'Add label',
    keys: [{ label: 'Label', display: 'L', color: '#9b59b6' }],
    fireIndex: 0,
    badge: 'Bug',
    badgeColor: '#9b59b6',
  },
  {
    prompt: 'Submit & next',
    keys: [{ label: 'Submit', display: 'Enter', color: '#4cb782', wide: true }],
    fireIndex: 0,
  },
]

const CARD_CHIPS: { after: number; text: string; color: string }[] = [
  { after: 0, text: 'High',  color: '#f2994a' },
  { after: 1, text: '3 pts', color: '#5e6ad2' },
  { after: 2, text: 'Bug',   color: '#9b59b6' },
]

const ISSUE_TITLES = [
  'Fix dropdown not closing on blur',
  'Add dark mode to settings page',
  'Paginate the activity feed',
]

const BREATHE_MS  = 980
const FIRE_MS     = 350
const BADGE_MS    = 420
const LOOP_PAUSE  = 840

function GhostKeyDemo() {
  const [stepIdx, setStepIdx] = useState(0)
  const [phase, setPhase] = useState<'breathe' | 'fire' | 'badge' | 'submit'>('breathe')
  const [loopCount, setLoopCount] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    clearTimeout(timer.current)

    if (phase === 'breathe') {
      timer.current = setTimeout(() => setPhase('fire'), BREATHE_MS)
    } else if (phase === 'fire') {
      timer.current = setTimeout(() => {
        const step = DEMO_STEPS[stepIdx]
        if (step.badge) {
          setPhase('badge')
        } else {
          setPhase('submit')
        }
      }, FIRE_MS)
    } else if (phase === 'badge') {
      timer.current = setTimeout(() => {
        const next = stepIdx + 1
        if (next < DEMO_STEPS.length) {
          setStepIdx(next)
          setPhase('breathe')
        } else {
          setPhase('submit')
        }
      }, BADGE_MS)
    } else if (phase === 'submit') {
      timer.current = setTimeout(() => {
        setStepIdx(0)
        setLoopCount(c => c + 1)
        setPhase('breathe')
      }, LOOP_PAUSE)
    }

    return () => clearTimeout(timer.current)
  }, [stepIdx, phase])

  const step = DEMO_STEPS[stepIdx]

  const completedSteps = (() => {
    let n = stepIdx
    if (phase === 'fire' || phase === 'badge' || phase === 'submit') n = stepIdx + 1
    if (phase === 'submit') n = DEMO_STEPS.length
    return n
  })()

  const visibleChips = CARD_CHIPS.filter(c => completedSteps > c.after)

  const progress = DEMO_STEPS.map((_, i) => {
    if (i < stepIdx) return 'done'
    if (i === stepIdx && phase !== 'breathe') return 'done'
    if (i === stepIdx) return 'active'
    return 'pending'
  })

  const issueTitle = ISSUE_TITLES[loopCount % ISSUE_TITLES.length]
  const cardSubmitting = phase === 'submit'

  return (
    <div className="demo" aria-hidden="true">
      {/* ── Issue card ──────────────────────────────── */}
      <div className="demo-card-area">
        <div className={`demo-card-wrap ${cardSubmitting ? 'demo-card-out' : 'demo-card-in'}`} key={loopCount}>
          <div className="demo-card">
            <div
              className={`demo-card-pbar ${completedSteps > 0 ? 'demo-card-pbar-on' : ''}`}
              style={{ '--pbar-color': '#f2994a' } as React.CSSProperties}
            />
            <div className="demo-card-body">
              <span className="demo-card-id">ENG-{142 + loopCount}</span>
              <span className="demo-card-title">{issueTitle}</span>
              <div className="demo-card-lines">
                <div className="demo-card-line demo-card-line-long" />
                <div className="demo-card-line demo-card-line-med" />
              </div>
              <div className="demo-card-chips">
                {visibleChips.map((c, i) => (
                  <span
                    key={i}
                    className="demo-card-chip demo-card-chip-in"
                    style={{ '--chip-color': c.color } as React.CSSProperties}
                  >
                    <span className="demo-card-chip-dot" />
                    {c.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Confetti — fires on submit */}
        {cardSubmitting && <ConfettiBurst key={`confetti-${loopCount}`} />}
      </div>

      {/* ── Keys section ────────────────────────────── */}
      <div className="demo-keys-section">
        <div className="demo-progress">
          {progress.map((status, i) => (
            <span
              key={i}
              className={`demo-dot demo-dot-${status}`}
              style={{ '--dot-color': DEMO_STEPS[i].keys[DEMO_STEPS[i].fireIndex].color } as React.CSSProperties}
            />
          ))}
        </div>

        {!cardSubmitting && (
          <span className="demo-prompt" key={`p-${stepIdx}`}>{step.prompt}</span>
        )}

        {!cardSubmitting && (
          <div className="demo-keys" key={`k-${stepIdx}`}>
            {step.keys.map((k, ki) => (
              <div
                key={ki}
                className={`demo-key ${phase === 'fire' && ki === step.fireIndex ? 'demo-key-fire' : 'demo-key-idle'} ${k.wide ? 'demo-key-wide' : ''}`}
                style={{ '--dk-color': k.color } as React.CSSProperties}
              >
                <kbd className="demo-kbd">{k.display}</kbd>
                <span className="demo-label">{k.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Landing page ───────────────────────────────────── */

export default function SetupScreen() {
  const stars = useGitHubStars()

  return (
    <div className="landing">
      {/* ── Above the fold ────────────────────────────── */}
      <div className="landing-fold">
        <nav className="landing-nav">
          <DelineateLockup iconSize={24} fontSize={16} />
          <div className="landing-nav-right">
            <a
              href="https://github.com/mriziq/delineate"
              target="_blank"
              rel="noopener noreferrer"
              className="gh-btn"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>
              <span className="gh-label">GitHub</span>
              {stars !== null && (
                <span className="gh-stars">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.75.75 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25z"/></svg>
                  {stars}
                </span>
              )}
            </a>
            <a href="/auth/login" className="btn-primary landing-signin">
              <img src="/marketing/linear_light.png" alt="" className="linear-logo linear-logo-dark" width="16" height="16" />
              <img src="/marketing/linear_dark.webp" alt="" className="linear-logo linear-logo-light" width="16" height="16" />
              Sign in with Linear
            </a>
            <button
              className="theme-toggle"
              aria-label="Toggle light/dark mode"
              onClick={() => {
                const current = document.documentElement.getAttribute('data-theme')
                const next = current === 'light' ? 'dark' : 'light'
                document.documentElement.setAttribute('data-theme', next)
                localStorage.setItem('theme', next)
              }}
            >
              <svg className="theme-icon-sun" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="8" cy="8" r="3" />
                <path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M3.4 12.6l.7-.7M11.9 4.1l.7-.7" />
              </svg>
              <svg className="theme-icon-moon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13.5 8.5a5.5 5.5 0 0 1-7-7 5.5 5.5 0 1 0 7 7z" />
              </svg>
            </button>
          </div>
        </nav>

        <div className="landing-hero">
          <div className="landing-hero-left">
            <h1 className="landing-headline">
              Triage your backlog<br />in&nbsp;minutes, not&nbsp;hours
            </h1>
            <p className="landing-sub">
              Guitar Hero meets Linear meets Inbox Zero. Issues come at you
              one by one, you nail each with a keystroke, and you don't stop
              until you've cleared the queue. Fly through issues with your
              keyboard, tag each one in seconds, and hit zero.
            </p>
            <a href="/auth/login" className="btn-primary landing-cta">
              Get Started
            </a>
            <span className="landing-cta-note">
              Self-hosted or hosted — MIT licensed, deploy anywhere
            </span>
          </div>

          <div className="landing-hero-right">
            <GhostKeyDemo />
          </div>
        </div>
      </div>

      {/* ── Below the fold ────────────────────────────── */}
      <div className="landing-below">
        {/* Sassy "not just shortcuts" section */}
        <div className="landing-sass">
          <h2 className="landing-sass-title">
            "But Linear already has keyboard shortcuts"
          </h2>
          <p className="landing-sass-body">
            It does, and they're great. Linear is genuinely one of the best tools
            out there. I use it every day and love it so much I built this just to
            keep using it faster. But triage isn't the same as navigation. It's a
            <em> workflow</em>. You need to rip through 50 issues, make a decision
            on each one, and move on. That means chaining priority, estimate,
            label, and submit into a single flow instead of tabbing between
            sidebars and dropdowns.
          </p>
          <p className="landing-sass-body">
            Delineate doesn't replace Linear (obviously). It's a focused triage
            mode built on top of your existing workspace. Sign in with your Linear
            account and start triaging. That's it.
          </p>
        </div>

        {/* Features — compact 4-col row */}
        <div className="landing-features">
          <div className="lf">
            <span className="lf-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 10h2m2 0h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </span>
            <strong className="lf-title">Keyboard-first</strong>
            <span className="lf-desc">Priority, estimate, labels, and assignee — all single keystrokes.</span>
          </div>
          <div className="lf">
            <span className="lf-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M3 5h14M3 10h10M3 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </span>
            <strong className="lf-title">Smart filters</strong>
            <span className="lf-desc">Filter by team, project, assignee, or state before you start.</span>
          </div>
          <div className="lf">
            <span className="lf-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 3v7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5"/></svg>
            </span>
            <strong className="lf-title">Batch submit</strong>
            <span className="lf-desc">Review every change, undo anything, then push all at once.</span>
          </div>
          <div className="lf">
            <span className="lf-icon">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>
            </span>
            <strong className="lf-title">Ghost keys</strong>
            <span className="lf-desc">Chain actions into an automatic flow with a single keystroke.</span>
          </div>
        </div>

        {/* Open source / project info */}
        <div className="landing-oss">
          <h2 className="landing-oss-title">Open source</h2>
          <p className="landing-oss-desc">
            Delineate is free and open source under the MIT license. Self-host it,
            fork it, or contribute. The code is on GitHub.
          </p>
          <div className="landing-oss-details">
            <div className="landing-oss-item">
              <span className="landing-oss-label">Stack</span>
              <span className="landing-oss-value">React + Vite + Express</span>
            </div>
            <div className="landing-oss-item">
              <span className="landing-oss-label">License</span>
              <span className="landing-oss-value">MIT</span>
            </div>
            <div className="landing-oss-item">
              <span className="landing-oss-label">Auth</span>
              <span className="landing-oss-value">Linear OAuth 2.0 (read + write)</span>
            </div>
            <div className="landing-oss-item">
              <span className="landing-oss-label">Data</span>
              <span className="landing-oss-value">Nothing stored. Session only, no database</span>
            </div>
          </div>
          <p className="landing-disclaimer">
            Delineate is an independent open source project and is not affiliated with, endorsed by, or sponsored by Linear.
          </p>
        </div>

        {/* Footer */}
        <footer className="landing-footer">
          <div className="landing-footer-links">
            <a href="https://github.com/mriziq/delineate" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span className="landing-dot" aria-hidden="true" />
            <a href="https://github.com/mriziq/delineate/issues" target="_blank" rel="noopener noreferrer">Issues</a>
            <span className="landing-dot" aria-hidden="true" />
            <span className="landing-muted">MIT License</span>
            <span className="landing-dot" aria-hidden="true" />
            <span className="landing-muted">Made by <a href="https://github.com/mriziq" target="_blank" rel="noopener noreferrer">@mriziq</a></span>
          </div>
        </footer>
      </div>

      <style>{`
        .landing {
          height: 100%;
          overflow-y: auto;
        }

        /* ── Above the fold ─────────────────────────── */
        .landing-fold {
          display: flex;
          flex-direction: column;
          padding: 0 var(--sp-6);
          max-width: 960px;
          margin: 0 auto;
          width: 100%;
        }
        .landing-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: var(--sp-4) 0;
          flex-shrink: 0;
        }
        .landing-nav-right {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }
        .landing-signin {
          text-decoration: none;
          padding: 6px var(--sp-4);
          font-size: 0.8125rem;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .landing-signin:hover { text-decoration: none; }
        .linear-logo {
          display: block;
          flex-shrink: 0;
        }
        .linear-logo-light { display: none; }
        [data-theme="light"] .linear-logo-dark { display: none; }
        [data-theme="light"] .linear-logo-light { display: block; }

        /* Theme toggle */
        .theme-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: var(--bg-surface);
          color: var(--text-secondary);
          cursor: pointer;
          transition: border-color 150ms, color 150ms;
        }
        .theme-toggle:hover {
          border-color: var(--border-medium);
          color: var(--text-primary);
        }
        .theme-icon-moon { display: block; }
        .theme-icon-sun  { display: none; }
        [data-theme="light"] .theme-icon-moon { display: none; }
        [data-theme="light"] .theme-icon-sun  { display: block; }

        /* GitHub button */
        .gh-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
          background: var(--bg-surface);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
          text-decoration: none;
          transition: border-color 150ms, color 150ms;
        }
        .gh-btn:hover {
          border-color: var(--border-medium);
          color: var(--text-primary);
          text-decoration: none;
        }
        .gh-label {
          line-height: 1;
        }
        .gh-stars {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          padding-left: 6px;
          border-left: 1px solid var(--border-light);
          margin-left: 2px;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }

        /* Hero — two-column layout */
        .landing-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: var(--sp-8);
          padding: min(12vh, 80px) 0 var(--sp-6);
        }

        .landing-hero-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .landing-headline {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 300;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: var(--sp-3);
        }
        .landing-sub {
          font-size: 0.9375rem;
          font-weight: 400;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: var(--sp-5);
          max-width: 400px;
        }
        .landing-cta {
          text-decoration: none;
          padding: var(--sp-2) var(--sp-6);
          font-size: 0.875rem;
        }
        .landing-cta:hover { text-decoration: none; }
        .landing-cta-note {
          margin-top: var(--sp-2);
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 400;
        }

        .landing-hero-right {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* ═══════════════════════════════════════════════
           Demo — card + confetti + keyboard
           ═══════════════════════════════════════════════ */
        .demo {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }

        /* Card area — relative container for confetti */
        .demo-card-area {
          position: relative;
          width: 280px;
        }

        .demo-card-wrap {
          width: 100%;
        }
        .demo-card-in {
          animation: demo-card-enter 350ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .demo-card-out {
          animation: demo-card-exit 420ms cubic-bezier(0.55, 0, 1, 0.45) forwards;
        }
        @keyframes demo-card-enter {
          from { opacity: 0; transform: translateY(24px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes demo-card-exit {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-40px) scale(0.92); }
        }

        .demo-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          overflow: hidden;
          display: flex;
          box-shadow: var(--shadow-card);
        }

        .demo-card-pbar {
          width: 3px;
          flex-shrink: 0;
          background: transparent;
          transition: background 400ms ease;
        }
        .demo-card-pbar-on {
          background: var(--pbar-color);
          box-shadow: 0 0 8px color-mix(in srgb, var(--pbar-color) 40%, transparent);
        }

        .demo-card-body {
          flex: 1;
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }

        .demo-card-id {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--text-muted);
          letter-spacing: 0.02em;
        }

        .demo-card-title {
          font-size: 0.84rem;
          font-weight: 500;
          color: var(--text-primary);
          line-height: 1.35;
        }

        .demo-card-lines {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 2px;
        }
        .demo-card-line {
          height: 4px;
          border-radius: 2px;
          background: var(--border-subtle);
        }
        .demo-card-line-long { width: 90%; }
        .demo-card-line-med  { width: 60%; }

        .demo-card-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          min-height: 20px;
          margin-top: 4px;
        }
        .demo-card-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 0.65rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          border: 1px solid color-mix(in srgb, var(--chip-color) 30%, transparent);
          background: color-mix(in srgb, var(--chip-color) 10%, transparent);
          color: var(--chip-color);
        }
        .demo-card-chip-in {
          animation: demo-chip-pop 245ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .demo-card-chip-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--chip-color);
        }
        @keyframes demo-chip-pop {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Confetti ──────────────────────────────── */
        .confetti-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: visible;
        }
        .confetti-particle {
          position: absolute;
          left: var(--cx);
          top: var(--cy);
          width: var(--cs);
          height: var(--cs);
          border-radius: 1px;
          animation: confetti-burst 600ms cubic-bezier(0.15, 0.8, 0.3, 1) forwards;
        }
        @keyframes confetti-burst {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          60% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform:
              translate(
                calc(cos(var(--ca)) * var(--cd)),
                calc(sin(var(--ca)) * var(--cd))
              )
              rotate(360deg)
              scale(0.5);
          }
        }

        /* ── Keys section ──────────────────────────── */
        .demo-keys-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          min-height: 110px;
          justify-content: center;
        }

        .demo-progress {
          display: flex;
          gap: 10px;
        }
        .demo-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--border-medium);
          transition: background 300ms, transform 300ms, box-shadow 300ms;
        }
        .demo-dot-active {
          background: var(--text-muted);
          transform: scale(1.4);
        }
        .demo-dot-done {
          background: var(--dot-color, var(--accent));
          transform: scale(1.3);
          box-shadow: 0 0 10px color-mix(in srgb, var(--dot-color, var(--accent)) 45%, transparent);
        }

        .demo-prompt {
          font-size: 0.75rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted);
          animation: demo-prompt-in 280ms ease-out both;
        }
        @keyframes demo-prompt-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 0.6; transform: translateY(0); }
        }

        .demo-keys {
          display: flex;
          align-items: center;
          gap: 12px;
          animation: demo-keys-in 280ms ease-out both;
        }
        @keyframes demo-keys-in {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .demo-key {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .demo-kbd {
          font-family: var(--font-mono);
          font-size: 1rem;
          font-weight: 600;
          min-width: 46px;
          height: 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid color-mix(in srgb, var(--dk-color) 45%, transparent);
          color: var(--dk-color);
          box-shadow: 0 0 12px color-mix(in srgb, var(--dk-color) 10%, transparent),
                      0 2px 4px rgba(0, 0, 0, 0.15);
          text-shadow: 0 0 8px color-mix(in srgb, var(--dk-color) 25%, transparent);
        }
        .demo-key-wide .demo-kbd {
          min-width: 88px;
          padding: 0 16px;
          font-size: 0.875rem;
        }
        .demo-label {
          font-size: 0.62rem;
          font-weight: 500;
          color: var(--text-muted);
          opacity: 0.5;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .demo-key-idle {
          animation: demo-breathe 1.7s ease-in-out infinite;
        }
        .demo-key-idle:nth-child(2) { animation-delay: 150ms; }
        .demo-key-idle:nth-child(3) { animation-delay: 300ms; }
        .demo-key-idle:nth-child(4) { animation-delay: 450ms; }

        @keyframes demo-breathe {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%      { transform: translateY(-3px); opacity: 0.85; }
        }

        .demo-key-fire {
          animation: demo-pop 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .demo-key-fire .demo-kbd {
          animation: demo-kbd-glow 350ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes demo-pop {
          0%   { transform: scale(1); opacity: 1; }
          30%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes demo-kbd-glow {
          0% {
            background: rgba(255,255,255,0.03);
            box-shadow: 0 0 12px color-mix(in srgb, var(--dk-color) 12%, transparent);
          }
          30% {
            background: color-mix(in srgb, var(--dk-color) 30%, transparent);
            box-shadow: 0 0 40px color-mix(in srgb, var(--dk-color) 50%, transparent),
                        0 0 80px color-mix(in srgb, var(--dk-color) 20%, transparent);
            border-color: var(--dk-color);
          }
          100% {
            background: color-mix(in srgb, var(--dk-color) 15%, transparent);
            box-shadow: 0 0 60px color-mix(in srgb, var(--dk-color) 35%, transparent);
            border-color: transparent;
          }
        }

        [data-theme="light"] .demo-kbd {
          background: rgba(0,0,0,0.02);
          box-shadow: 0 0 12px color-mix(in srgb, var(--dk-color) 8%, transparent),
                      0 2px 4px rgba(0,0,0,0.06);
        }

        /* ── Below the fold ─────────────────────────── */
        .landing-below {
          display: flex;
          flex-direction: column;
          padding: 0 var(--sp-6);
          max-width: 960px;
          margin: 0 auto;
          width: 100%;
        }

        /* Sassy section */
        .landing-sass {
          padding: var(--sp-8) 0;
          border-top: 1px solid var(--border-subtle);
          max-width: 560px;
        }
        .landing-sass-title {
          font-size: 1.125rem;
          font-weight: 300;
          letter-spacing: -0.01em;
          font-style: italic;
          color: var(--text-secondary);
          margin-bottom: var(--sp-4);
        }
        .landing-sass-body {
          font-size: 0.84rem;
          font-weight: 400;
          color: var(--text-secondary);
          line-height: 1.65;
          margin-bottom: var(--sp-3);
        }
        .landing-sass-body:last-child {
          margin-bottom: 0;
        }
        .landing-sass-body em {
          color: var(--text-primary);
          font-style: normal;
          font-weight: 500;
        }

        /* Features row */
        .landing-features {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--sp-4);
          padding: var(--sp-8) 0;
          border-top: 1px solid var(--border-subtle);
        }
        .lf {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .lf-icon { color: var(--accent); line-height: 0; }
        .lf-title {
          font-size: 0.8125rem;
          font-weight: 500;
        }
        .lf-desc {
          font-size: 0.75rem;
          font-weight: 400;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        /* Open source section */
        .landing-oss {
          padding: var(--sp-8) 0;
          border-top: 1px solid var(--border-subtle);
        }
        .landing-oss-title {
          font-size: 1rem;
          font-weight: 300;
          letter-spacing: -0.01em;
          margin-bottom: var(--sp-2);
        }
        .landing-oss-desc {
          font-size: 0.8125rem;
          font-weight: 400;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: var(--sp-5);
          max-width: 480px;
        }
        .landing-oss-details {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--sp-3) var(--sp-6);
        }
        .landing-oss-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .landing-oss-label {
          font-size: 0.6875rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .landing-oss-value {
          font-size: 0.8125rem;
          font-weight: 400;
          color: var(--text-primary);
        }

        /* Footer */
        .landing-footer {
          padding: var(--sp-6) 0;
          margin-top: auto;
          border-top: 1px solid var(--border-subtle);
        }
        .landing-footer-links {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          font-size: 0.75rem;
        }
        .landing-footer-links a {
          color: var(--text-secondary);
        }
        .landing-footer-links a:hover {
          color: var(--text-primary);
          text-decoration: none;
        }
        .landing-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--text-muted);
        }
        .landing-muted {
          color: var(--text-muted);
        }
        .landing-disclaimer {
          margin-top: var(--sp-5);
          font-size: 0.6875rem;
          color: var(--text-muted);
          line-height: 1.5;
          max-width: 480px;
        }

        /* ── Tablet ─────────────────────────────────── */
        @media (max-width: 700px) {
          .landing-hero {
            grid-template-columns: 1fr;
            text-align: center;
            gap: var(--sp-6);
            padding-top: min(6vh, 40px);
          }
          .landing-hero-left {
            align-items: center;
          }
          .landing-sub {
            max-width: 100%;
          }
          .landing-cta-note {
            text-align: center;
          }
          .landing-features {
            grid-template-columns: repeat(2, 1fr);
          }
          .landing-fold {
            padding: 0 var(--sp-4);
          }
          .landing-below {
            padding: 0 var(--sp-4);
          }
          .demo-card-area {
            width: 260px;
          }
          .gh-label {
            display: none;
          }
        }

        /* ── Small mobile ──────────────────────────────── */
        @media (max-width: 480px) {
          .landing-nav {
            gap: var(--sp-2);
          }
          .landing-nav-right {
            gap: var(--sp-2);
          }
          .landing-signin {
            padding: 6px var(--sp-3);
            font-size: 0.75rem;
          }
          .landing-signin .linear-logo {
            display: none;
          }
          .gh-btn {
            padding: 5px 8px;
          }
          .gh-stars {
            display: none;
          }
          .landing-hero {
            padding-top: var(--sp-5);
          }
          .landing-headline {
            font-size: 1.5rem;
          }
          .landing-sub {
            font-size: 0.8125rem;
          }
          .demo-card-area {
            width: 240px;
          }
          .demo-kbd {
            font-size: 0.875rem;
            min-width: 40px;
            height: 40px;
          }
          .demo-key-wide .demo-kbd {
            min-width: 74px;
            padding: 0 12px;
            font-size: 0.8125rem;
          }
          .landing-sass-title {
            font-size: 1rem;
          }
          .landing-sass-body {
            font-size: 0.8125rem;
          }
          .landing-features {
            grid-template-columns: 1fr;
            gap: var(--sp-5);
          }
          .landing-oss-details {
            grid-template-columns: 1fr;
            gap: var(--sp-3);
          }
          .landing-footer-links {
            flex-wrap: wrap;
            justify-content: center;
            gap: var(--sp-2);
          }
          .landing-disclaimer {
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}
