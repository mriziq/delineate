import { useState, useEffect, useRef } from 'react'
import { useApp, clearSession } from '../store/useAppStore'
import { updateIssue } from '../api/linear'
import type { PendingChange } from '../api/types'

const PRIORITY_LABELS: Record<number, string> = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
}

type PendingWithExclude = PendingChange & { _excluded?: boolean }

// Confetti system
const CONFETTI_COLORS = ['#5e6ad2', '#eb5757', '#f2994a', '#f2c94c', '#4cb782', '#a78bfa', '#f472b6']

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 600,
      duration: 1200 + Math.random() * 800,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      size: 4 + Math.random() * 6,
      drift: -30 + Math.random() * 60,
    }))
  )

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            '--x': `${p.left}%`,
            '--delay': `${p.delay}ms`,
            '--duration': `${p.duration}ms`,
            '--color': p.color,
            '--rotation': `${p.rotation}deg`,
            '--size': `${p.size}px`,
            '--drift': `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

// Count-up number animation
function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick)
      }
    }
    ref.current = requestAnimationFrame(tick)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
  }, [target, duration])

  return <>{value}</>
}

function ChangeRow({
  pc,
  labels,
  members,
  projects,
  onToggle,
}: {
  pc: PendingWithExclude
  labels: { id: string; name: string; color: string }[]
  members: { id: string; name: string; displayName: string }[]
  projects: { id: string; name: string }[]
  onToggle: () => void
}) {
  const excluded = pc._excluded ?? false

  function renderFieldChange(field: string, value: unknown) {
    const orig = pc.originalValues

    if (field === 'priority') {
      return (
        <div className="review-field" key={field}>
          <span className="review-field-name">priority:</span>
          <span className="review-old">{PRIORITY_LABELS[orig.priority]}</span>
          <span className="review-arrow">&rarr;</span>
          <span className="review-new">{PRIORITY_LABELS[value as number]}</span>
        </div>
      )
    }

    if (field === 'estimate') {
      return (
        <div className="review-field" key={field}>
          <span className="review-field-name">estimate:</span>
          <span className="review-old">{orig.estimate ?? '—'}</span>
          <span className="review-arrow">&rarr;</span>
          <span className="review-new">{value != null ? String(value) : '—'}</span>
        </div>
      )
    }

    if (field === 'labelIds') {
      const oldIds = new Set(orig.labelIds)
      const newIds = new Set(value as string[])
      const added = [...newIds].filter(id => !oldIds.has(id))
      const removed = [...oldIds].filter(id => !newIds.has(id))
      const getName = (id: string) => labels.find(l => l.id === id)?.name || id

      return (
        <div className="review-field" key={field}>
          <span className="review-field-name">labels:</span>
          {added.map(id => {
            const color = labels.find(l => l.id === id)?.color
            return <span key={id} className="review-label-change review-added" style={color ? { color, background: `${color}1a` } : undefined}>+ {getName(id)}</span>
          })}
          {removed.map(id => {
            const color = labels.find(l => l.id === id)?.color
            return <span key={id} className="review-label-change review-removed" style={color ? { color: `${color}99` } : undefined}>- {getName(id)}</span>
          })}
        </div>
      )
    }

    if (field === 'assigneeId') {
      const oldName = orig.assigneeId
        ? members.find(m => m.id === orig.assigneeId)?.displayName || 'Someone'
        : 'Unassigned'
      const newName = value
        ? members.find(m => m.id === value)?.displayName || 'Someone'
        : 'Unassigned'
      return (
        <div className="review-field" key={field}>
          <span className="review-field-name">assignee:</span>
          <span className="review-old">{oldName}</span>
          <span className="review-arrow">&rarr;</span>
          <span className="review-new">{newName}</span>
        </div>
      )
    }

    if (field === 'projectId') {
      const oldName = orig.projectId
        ? projects.find(p => p.id === orig.projectId)?.name || 'Project'
        : 'None'
      const newName = value
        ? projects.find(p => p.id === (value as string))?.name || 'Project'
        : 'None'
      return (
        <div className="review-field" key={field}>
          <span className="review-field-name">project:</span>
          <span className="review-old">{oldName}</span>
          <span className="review-arrow">&rarr;</span>
          <span className="review-new">{newName}</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className={`review-row ${excluded ? 'review-excluded' : ''}`}>
      <label className="review-checkbox-label">
        <input
          type="checkbox"
          checked={!excluded}
          onChange={onToggle}
          className="review-checkbox"
        />
      </label>
      <div className="review-row-content">
        <div className="review-row-header">
          <span className="review-identifier">{pc.identifier}</span>
          <span className="review-title">{pc.title}</span>
        </div>
        <div className="review-fields">
          {Object.entries(pc.changes).map(([field, value]) => renderFieldChange(field, value))}
        </div>
      </div>
    </div>
  )
}

export default function ReviewScreen() {
  const { state, dispatch } = useApp()
  const { pendingChanges, issues, availableLabels, availableMembers, availableProjects } = state
  const [committing, setCommitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)
  const [failures, setFailures] = useState<PendingChange[]>([])

  const activePending = (pendingChanges as PendingWithExclude[]).filter(
    pc => !pc._excluded && Object.keys(pc.changes).length > 0
  )

  const priorityCount = activePending.filter(pc => pc.changes.priority !== undefined).length
  const estimateCount = activePending.filter(pc => pc.changes.estimate !== undefined).length
  const labelCount = activePending.filter(pc => pc.changes.labelIds !== undefined).length

  async function handleCommit() {
    setCommitting(true)
    setProgress(0)
    const failed: PendingChange[] = []

    for (let i = 0; i < activePending.length; i++) {
      const pc = activePending[i]
      try {
        await updateIssue(pc.issueId, pc.changes)
      } catch {
        failed.push(pc)
      }
      setProgress(i + 1)
    }

    setFailures(failed)
    setCommitting(false)
    setDone(true)
    clearSession()
  }

  const successCount = activePending.length - failures.length
  const allSucceeded = failures.length === 0

  if (done) {
    return (
      <div className="review-screen">
        {allSucceeded && <Confetti />}
        <div className="review-done">
          {/* Animated checkmark */}
          <div className={`done-icon ${allSucceeded ? 'done-icon-success' : 'done-icon-partial'}`}>
            {allSucceeded ? (
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="done-checkmark">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" className="done-circle" />
                <path d="M15 25l6 6 12-14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="done-check" />
              </svg>
            ) : (
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5" />
                <path d="M24 16v12M24 32h.02" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
          </div>

          <h2 className="review-done-title">
            {allSucceeded
              ? 'All changes committed!'
              : `${successCount} of ${activePending.length} updated`}
          </h2>

          {/* Animated stats */}
          <div className="done-stats">
            <div className="done-stat">
              <span className="done-stat-value">
                <CountUp target={successCount} />
              </span>
              <span className="done-stat-label">changes saved</span>
            </div>
            <div className="done-stat">
              <span className="done-stat-value">
                <CountUp target={issues.length} duration={600} />
              </span>
              <span className="done-stat-label">issues reviewed</span>
            </div>
          </div>

          {failures.length > 0 && (
            <p className="review-done-fail">{failures.length} failed — you can retry these in Linear</p>
          )}

          <div className="review-done-actions">
            <a
              href="https://linear.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Open Linear &rarr;
            </a>
            <button
              className="btn-secondary"
              onClick={() => {
                dispatch({ type: 'RESET' })
                dispatch({ type: 'SET_SCREEN', screen: 'filter' })
              }}
            >
              Triage More &rarr;
            </button>
          </div>
        </div>
        <style>{reviewStyles}</style>
      </div>
    )
  }

  // Progress percentage for gradient
  const pct = activePending.length > 0 ? (progress / activePending.length) * 100 : 0

  return (
    <div className="review-screen">
      <div className="review-header">
        <button
          className="btn-secondary"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'triage' })}
        >
          &larr; Back
        </button>
        <div className="review-header-title">
          <div className="review-mode-row">
            <p className="review-mode-label">Review Mode</p>
            {state.organization && (
              <span className="workspace-badge">{state.organization.name}</span>
            )}
          </div>
          <h2 className="review-heading">Review Changes</h2>
        </div>
      </div>

      <div className="review-layout">
        <div className="review-list">
          {pendingChanges.length === 0 ? (
            <div className="review-empty">
              <p>No changes made</p>
              <button
                className="btn-secondary"
                onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'triage' })}
              >
                Go back
              </button>
            </div>
          ) : (
            (pendingChanges as PendingWithExclude[])
              .filter(pc => Object.keys(pc.changes).length > 0)
              .map(pc => (
                <ChangeRow
                  key={pc.issueId}
                  pc={pc}
                  labels={availableLabels}
                  members={availableMembers}
                  projects={availableProjects}
                  onToggle={() => dispatch({ type: 'TOGGLE_PENDING', issueId: pc.issueId })}
                />
              ))
          )}
        </div>

        <div className="review-summary">
          <div className="review-summary-card">
            <div className="review-stat">
              <span className="review-stat-value">{issues.length}</span>
              <span className="review-stat-label">issues reviewed</span>
            </div>
            <div className="review-stat">
              <span className="review-stat-value">{activePending.length}</span>
              <span className="review-stat-label">changes queued</span>
            </div>
            <div className="review-breakdown">
              {priorityCount > 0 && <div className="review-breakdown-item">Priority updates: {priorityCount}</div>}
              {estimateCount > 0 && <div className="review-breakdown-item">Estimates set: {estimateCount}</div>}
              {labelCount > 0 && <div className="review-breakdown-item">Labels changed: {labelCount}</div>}
            </div>
            {committing ? (
              <div className="review-progress">
                <div className="review-progress-bar">
                  <div
                    className="review-progress-fill"
                    style={{ width: `${pct}%` }}
                  >
                    <div className="review-progress-glow" />
                  </div>
                </div>
                <span className="review-progress-text">Saving {progress} / {activePending.length}...</span>
              </div>
            ) : (
              <button
                className="btn-primary review-commit-btn"
                onClick={handleCommit}
                disabled={activePending.length === 0}
              >
                Commit {activePending.length} Changes
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{reviewStyles}</style>
    </div>
  )
}

const reviewStyles = `
  .review-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .review-header {
    display: flex;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--border-subtle);
  }
  .review-header-title {
    flex: 1;
  }
  .review-mode-row {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .review-mode-label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent);
    font-weight: 600;
  }
  .workspace-badge {
    font-size: 0.6rem;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--chip-bg);
    border: 1px solid var(--border-light);
    color: var(--text-secondary);
    white-space: nowrap;
    font-weight: 500;
  }
  .review-heading {
    font-size: 1rem;
    font-weight: 500;
  }
  .review-layout {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .review-list {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-4);
  }
  .review-summary {
    width: 280px;
    padding: var(--sp-4);
    border-left: 1px solid var(--border-subtle);
    position: sticky;
    top: 0;
  }
  .review-summary-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--sp-4);
  }
  .review-stat {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    margin-bottom: var(--sp-2);
  }
  .review-stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .review-stat-label {
    font-size: 0.8rem;
    color: var(--text-muted);
  }
  .review-breakdown {
    margin: var(--sp-3) 0;
    padding-top: var(--sp-3);
    border-top: 1px solid var(--border-subtle);
  }
  .review-breakdown-item {
    font-size: 0.8rem;
    color: var(--text-secondary);
    padding: 2px 0;
  }
  .review-commit-btn {
    width: 100%;
    padding: var(--sp-3);
    margin-top: var(--sp-3);
  }
  .review-row {
    display: flex;
    gap: var(--sp-3);
    padding: var(--sp-3);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    margin-bottom: var(--sp-2);
    transition: opacity 150ms;
  }
  .review-excluded {
    opacity: 0.4;
  }
  .review-checkbox-label {
    display: flex;
    align-items: flex-start;
    padding-top: 2px;
  }
  .review-checkbox {
    accent-color: var(--accent);
  }
  .review-row-content {
    flex: 1;
    min-width: 0;
  }
  .review-row-header {
    display: flex;
    gap: var(--sp-2);
    align-items: baseline;
    margin-bottom: var(--sp-1);
  }
  .review-identifier {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }
  .review-title {
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .review-fields {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .review-field {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    font-size: 0.8rem;
  }
  .review-field-name {
    color: var(--text-muted);
    min-width: 60px;
  }
  .review-old {
    color: var(--text-muted);
    text-decoration: line-through;
  }
  .review-arrow {
    color: var(--text-muted);
    font-size: 0.7rem;
  }
  .review-new {
    color: var(--accent);
    font-weight: 500;
  }
  .review-label-change {
    font-size: 0.8rem;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .review-added {
    color: var(--priority-low);
  }
  .review-removed {
    text-decoration: line-through;
    color: var(--priority-urgent);
  }

  /* Enhanced progress bar */
  .review-progress {
    margin-top: var(--sp-3);
  }
  .review-progress-bar {
    height: 6px;
    background: var(--chip-bg);
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: var(--sp-2);
  }
  .review-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent) 0%, #a78bfa 50%, var(--priority-low) 100%);
    background-size: 200% 100%;
    animation: progress-gradient 2s ease infinite;
    transition: width 250ms cubic-bezier(0.22, 1, 0.36, 1);
    border-radius: 3px;
    position: relative;
    overflow: hidden;
  }
  .review-progress-glow {
    position: absolute;
    right: 0;
    top: -2px;
    bottom: -2px;
    width: 20px;
    background: radial-gradient(ellipse at right, rgba(255,255,255,0.4), transparent);
    animation: glow-pulse 1s ease-in-out infinite;
  }
  @keyframes progress-gradient {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  @keyframes glow-pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
  .review-progress-text {
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  /* Done state */
  .review-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--sp-4);
    padding: var(--sp-8);
    color: var(--text-secondary);
  }
  .review-done {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--sp-4);
    position: relative;
    z-index: 1;
  }
  .done-icon {
    animation: done-icon-enter 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .done-icon-success {
    color: var(--priority-low);
  }
  .done-icon-partial {
    color: var(--priority-high);
  }
  @keyframes done-icon-enter {
    0% { opacity: 0; transform: scale(0.5); }
    100% { opacity: 1; transform: scale(1); }
  }
  .done-checkmark .done-circle {
    stroke-dasharray: 140;
    stroke-dashoffset: 140;
    animation: draw-circle 600ms ease-out 100ms forwards;
  }
  .done-checkmark .done-check {
    stroke-dasharray: 40;
    stroke-dashoffset: 40;
    animation: draw-check 400ms ease-out 500ms forwards;
  }
  @keyframes draw-circle {
    to { stroke-dashoffset: 0; }
  }
  @keyframes draw-check {
    to { stroke-dashoffset: 0; }
  }
  .review-done-title {
    font-size: 1.25rem;
    font-weight: 600;
    animation: fade-up 400ms ease-out 300ms both;
  }
  .done-stats {
    display: flex;
    gap: var(--sp-8);
    animation: fade-up 400ms ease-out 500ms both;
  }
  .done-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .done-stat-value {
    font-size: 2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--accent);
  }
  .done-stat-label {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-top: 2px;
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .review-done-fail {
    color: var(--priority-urgent);
    font-size: 0.85rem;
    animation: fade-up 400ms ease-out 600ms both;
  }
  .review-done-actions {
    display: flex;
    gap: var(--sp-3);
    margin-top: var(--sp-4);
    animation: fade-up 400ms ease-out 700ms both;
  }

  /* Confetti */
  .confetti-container {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    z-index: 0;
  }
  .confetti-piece {
    position: absolute;
    top: -10px;
    left: var(--x);
    width: var(--size);
    height: var(--size);
    background: var(--color);
    border-radius: 1px;
    animation: confetti-fall var(--duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards;
    transform: rotate(var(--rotation));
  }
  @keyframes confetti-fall {
    0% {
      opacity: 1;
      transform: translateY(0) translateX(0) rotate(var(--rotation)) scale(1);
    }
    75% {
      opacity: 1;
    }
    100% {
      opacity: 0;
      transform: translateY(100vh) translateX(var(--drift)) rotate(calc(var(--rotation) + 720deg)) scale(0.5);
    }
  }

  @media (max-width: 768px) {
    .review-layout {
      flex-direction: column;
    }
    .review-summary {
      width: 100%;
      border-left: none;
      border-top: 1px solid var(--border-subtle);
    }
  }
`
