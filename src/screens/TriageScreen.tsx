import { useEffect, useCallback, useState, useRef } from 'react'
import Markdown from 'react-markdown'
import { useApp } from '../store/useAppStore'
import AppHeader from '../components/AppHeader'
import IssueCard from '../components/IssueCard'
import ShortcutBar from '../components/ShortcutBar'
import EstimatePicker from '../components/EstimatePicker'
import LabelPicker from '../components/LabelPicker'
import AssigneePicker from '../components/AssigneePicker'
import ProjectPicker from '../components/ProjectPicker'
import CheatsheetModal from '../components/CheatsheetModal'

const PRIORITY_FLASH_COLORS: Record<number, string> = {
  0: '#6b7280',
  1: '#eb5757',
  2: '#f2994a',
  3: '#f2c94c',
  4: '#4cb782',
}

const PRIORITY_LABELS: Record<number, string> = {
  0: 'None', 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low',
}

export default function TriageScreen() {
  const { state, dispatch } = useApp()
  const { issues, currentIndex, pendingChanges, activeOverlay, availableLabels, availableMembers, availableProjects, filterConfig, selectedTeam } = state

  const currentIssue = issues[currentIndex]
  const currentPending = pendingChanges.find(p => p.issueId === currentIssue?.id)

  const [enterFrom, setEnterFrom] = useState<'right' | 'left'>('right')
  const [exiting, setExiting] = useState<'right' | 'left' | 'submit' | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cardKey, setCardKey] = useState(0)

  const [flash, setFlash] = useState<{ color: string; key: number } | null>(null)
  const flashCounter = useRef(0)

  // Review drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Review badge bounce
  const [reviewBounce, setReviewBounce] = useState(0)
  const prevPendingCount = useRef(pendingChanges.length)

  useEffect(() => {
    if (pendingChanges.length > prevPendingCount.current) {
      setReviewBounce(n => n + 1)
    }
    prevPendingCount.current = pendingChanges.length
  }, [pendingChanges.length])

  const prevIndex = useRef(currentIndex)
  useEffect(() => {
    if (currentIndex !== prevIndex.current) {
      setCardKey(k => k + 1)
      prevIndex.current = currentIndex
    }
  }, [currentIndex])

  function triggerFlash(priority: number) {
    const color = PRIORITY_FLASH_COLORS[priority]
    flashCounter.current++
    setFlash({ color, key: flashCounter.current })
    setTimeout(() => setFlash(null), 400)
  }

  const getCurrentLabelIds = useCallback(() => {
    if (!currentIssue) return []
    return currentPending?.changes.labelIds ?? currentIssue.labels.nodes.map(l => l.id)
  }, [currentIssue, currentPending])

  const getCurrentAssigneeId = useCallback(() => {
    if (!currentIssue) return null
    return currentPending?.changes.assigneeId !== undefined
      ? currentPending.changes.assigneeId
      : currentIssue.assignee?.id ?? null
  }, [currentIssue, currentPending])

  const getCurrentProjectId = useCallback(() => {
    if (!currentIssue) return null
    return currentPending?.changes.projectId !== undefined
      ? currentPending.changes.projectId
      : currentIssue.project?.id ?? null
  }, [currentIssue, currentPending])

  const getCurrentEstimate = useCallback(() => {
    if (!currentIssue) return null
    return currentPending?.changes.estimate !== undefined
      ? currentPending.changes.estimate
      : currentIssue.estimate ?? null
  }, [currentIssue, currentPending])

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!currentIssue) return

    // Close drawer on Escape if open
    if (drawerOpen && e.key === 'Escape') {
      setDrawerOpen(false)
      return
    }

    // Detail view: Esc closes
    if (activeOverlay === 'detail') {
      if (e.key === 'Escape') {
        dispatch({ type: 'CLOSE_OVERLAY' })
        return
      }
    }

    // If a picker overlay is open, only that picker handles keys
    if (activeOverlay && activeOverlay !== 'cheatsheet' && activeOverlay !== 'detail') return

    const key = e.key

    // Toggle drawer with R
    if (key === 'r' || key === 'R') {
      setDrawerOpen(o => !o)
      return
    }

    // Navigation
    if (key === ' ' || key === 'Enter') {
      e.preventDefault()
      if (exiting) return
      setEnterFrom('right')
      setExiting('submit')
      if (exitTimer.current) clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => {
        setExiting(null)
        dispatch({ type: 'ADVANCE_CARD' })
      }, 350)
      return
    }
    if (key === 'ArrowRight') {
      e.preventDefault()
      if (exiting) return
      setEnterFrom('right')
      setExiting('right')
      if (exitTimer.current) clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => {
        setExiting(null)
        dispatch({ type: 'ADVANCE_CARD' })
      }, 280)
      return
    }
    if (key === 'ArrowLeft') {
      e.preventDefault()
      if (exiting) return
      setEnterFrom('left')
      setExiting('left')
      if (exitTimer.current) clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => {
        setExiting(null)
        dispatch({ type: 'GO_BACK' })
      }, 280)
      return
    }

    // Expand detail
    if (key === '0') {
      if (activeOverlay === 'detail') {
        dispatch({ type: 'CLOSE_OVERLAY' })
      } else {
        dispatch({ type: 'OPEN_OVERLAY', overlay: 'detail' })
      }
      return
    }

    // Priority
    if (key >= '1' && key <= '4') {
      const value = parseInt(key)
      dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue.id, field: 'priority', value })
      triggerFlash(value)
      return
    }

    // Overlays
    if (key === 'e' || key === 'E') {
      dispatch({ type: 'OPEN_OVERLAY', overlay: 'estimate' })
      return
    }
    if (key === 'l' || key === 'L') {
      dispatch({ type: 'OPEN_OVERLAY', overlay: 'label' })
      return
    }
    if (key === 'a' || key === 'A') {
      dispatch({ type: 'OPEN_OVERLAY', overlay: 'assignee' })
      return
    }
    if (key === 'p' || key === 'P') {
      dispatch({ type: 'OPEN_OVERLAY', overlay: 'project' })
      return
    }

    // Undo
    if (key === 'z' || key === 'Z') {
      dispatch({ type: 'UNDO_CHANGE', issueId: currentIssue.id })
      return
    }

    // Cheatsheet
    if (key === '?') {
      if (activeOverlay === 'cheatsheet') {
        dispatch({ type: 'CLOSE_OVERLAY' })
      } else {
        dispatch({ type: 'OPEN_OVERLAY', overlay: 'cheatsheet' })
      }
      return
    }

    // Escape
    if (key === 'Escape') {
      dispatch({ type: 'CLOSE_OVERLAY' })
      return
    }
  }, [currentIssue, activeOverlay, dispatch, exiting, drawerOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Build scope chips
  const scopeLabel = filterConfig.mode === 'my-issues'
    ? 'My Issues'
    : selectedTeam ? selectedTeam.name : 'Team'
  const stateLabels = filterConfig.states.map(s => s.charAt(0).toUpperCase() + s.slice(1))

  // Pending changes with actual content
  const changesWithContent = pendingChanges.filter(pc => Object.keys(pc.changes).length > 0)

  if (issues.length === 0) {
    return (
      <div className="triage-screen">
        <div className="empty-confetti" aria-hidden="true">
          {Array.from({ length: 40 }, (_, i) => (
            <div
              key={i}
              className="empty-confetti-piece"
              style={{
                '--x': `${Math.random() * 100}%`,
                '--delay': `${Math.random() * 600}ms`,
                '--duration': `${1200 + Math.random() * 800}ms`,
                '--color': ['#5e6ad2','#4cb782','#f2c94c','#a78bfa','#f472b6','#f2994a'][i % 6],
                '--rotation': `${Math.random() * 360}deg`,
                '--size': `${4 + Math.random() * 5}px`,
                '--drift': `${-25 + Math.random() * 50}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="triage-empty">
          {/* Animated checkmark */}
          <div className="empty-icon">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="empty-checkmark">
              <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="2" className="empty-circle" />
              <path d="M18 29l7 7 13-15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="empty-check" />
            </svg>
          </div>
          <h2 className="empty-title">You're all caught up</h2>
          <p className="empty-subtitle">No issues match your current filters — inbox zero!</p>
          <div className="empty-actions">
            <button className="btn-primary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'filter' })}>
              Adjust filters
            </button>
            <a
              href="https://linear.app"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              Open Linear &rarr;
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (!currentIssue) {
    dispatch({ type: 'SET_SCREEN', screen: 'review' })
    return null
  }

  const nextIssue = issues[currentIndex + 1]
  const nextNextIssue = issues[currentIndex + 2]

  return (
    <div className="triage-screen">
      {/* Priority flash overlay */}
      {flash && (
        <div
          key={flash.key}
          className="priority-flash"
          style={{ '--flash-color': flash.color } as React.CSSProperties}
        />
      )}

      {/* Header */}
      <div className="triage-header">
        <div className="triage-header-left">
          <AppHeader />
          <button
            className="btn-secondary triage-back-btn"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'filter' })}
          >
            &larr; Filters
          </button>
        </div>
        <div className="triage-header-center">
          <div className="triage-scope-chips">
            <span className="scope-chip scope-chip-primary">{scopeLabel}</span>
            {stateLabels.map(s => (
              <span key={s} className="scope-chip">{s}</span>
            ))}
            {filterConfig.unestimatedOnly && (
              <span className="scope-chip">Unestimated</span>
            )}
          </div>
        </div>
        <div className="triage-header-right">
          <span className="triage-counter">{currentIndex + 1} / {issues.length}</span>
          <button
            className={`btn-secondary triage-review-btn ${drawerOpen ? 'triage-review-btn-active' : ''}`}
            onClick={() => setDrawerOpen(o => !o)}
          >
            Review
            {changesWithContent.length > 0 && (
              <span key={reviewBounce} className="triage-review-badge">
                {changesWithContent.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="triage-body">
        <div className={`triage-card-area ${drawerOpen ? 'triage-card-area-shifted' : ''}`}>
          <div className="card-stack">
            {nextNextIssue && <div className="stack-card stack-card-2" />}
            {nextIssue && <div className="stack-card stack-card-1" />}
            <div
              key={cardKey}
              className={`triage-card-wrapper ${
                exiting === 'right' ? 'card-exit-right' :
                exiting === 'left' ? 'card-exit-left' :
                exiting === 'submit' ? 'card-submit-glow' :
                enterFrom === 'right' ? 'card-enter-right' : 'card-enter-left'
              }`}
            >
              <IssueCard
                issue={currentIssue}
                pending={currentPending}
                availableLabels={availableLabels}
                onClick={() => dispatch({ type: 'OPEN_OVERLAY', overlay: 'detail' })}
              />
            </div>
          </div>
        </div>

        {/* Review drawer */}
        <div className={`review-drawer ${drawerOpen ? 'review-drawer-open' : ''}`}>
          <div className="drawer-header">
            <h3 className="drawer-title">Pending Changes</h3>
            <button className="btn-secondary drawer-review-all" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'review' })}>
              Review Mode &rarr;
            </button>
          </div>
          {changesWithContent.length === 0 ? (
            <p className="drawer-empty">No changes yet. Edit fields on cards and they'll appear here.</p>
          ) : (
            <div className="drawer-list">
              {changesWithContent.map(pc => {
                const issueIdx = issues.findIndex(i => i.id === pc.issueId)
                const changeFields = Object.keys(pc.changes)
                return (
                  <button
                    key={pc.issueId}
                    className={`drawer-row ${issueIdx === currentIndex ? 'drawer-row-active' : ''}`}
                    onClick={() => {
                      if (issueIdx >= 0) {
                        setEnterFrom(issueIdx > currentIndex ? 'right' : 'left')
                        dispatch({ type: 'JUMP_TO_ISSUE', index: issueIdx })
                      }
                    }}
                  >
                    <span className="drawer-row-id">{pc.identifier}</span>
                    <span className="drawer-row-title">{pc.title}</span>
                    <div className="drawer-row-changes">
                      {changeFields.map(f => (
                        <span key={f} className="drawer-change-chip">
                          {f === 'priority' ? PRIORITY_LABELS[pc.changes.priority!] :
                           f === 'estimate' ? `${pc.changes.estimate ?? '—'}pt` :
                           f === 'labelIds' ? 'Labels' :
                           f === 'assigneeId' ? 'Assignee' :
                           f === 'projectId' ? 'Project' : f}
                        </span>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail overlay */}
      {activeOverlay === 'detail' && (
        <div className="overlay-backdrop" onClick={() => dispatch({ type: 'CLOSE_OVERLAY' })}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <span className="card-identifier">{currentIssue.identifier}</span>
                {currentIssue.project && (
                  <span className="chip" style={{ marginLeft: 8 }}>{currentIssue.project.name}</span>
                )}
                <span className="chip" style={{ marginLeft: 4 }}>
                  <span className="dot" style={{ background: currentIssue.state.color }} />
                  {currentIssue.state.name}
                </span>
              </div>
              <button className="btn-secondary detail-close" onClick={() => dispatch({ type: 'CLOSE_OVERLAY' })}>
                Esc
              </button>
            </div>
            <h2 className="detail-title">{currentIssue.title}</h2>
            {currentIssue.description && (
              <div className="detail-description">
                <Markdown>{currentIssue.description}</Markdown>
              </div>
            )}
            <div className="card-divider" style={{ margin: '16px 0' }} />
            <div className="card-fields">
              <div className={`card-field ${currentPending?.changes.priority !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Priority</span>
                <span className="chip" style={{
                  borderColor: `var(--priority-${['none','urgent','high','medium','low'][currentPending?.changes.priority ?? currentIssue.priority]})`,
                  color: `var(--priority-${['none','urgent','high','medium','low'][currentPending?.changes.priority ?? currentIssue.priority]})`,
                }}>
                  {['No priority','Urgent','High','Medium','Low'][currentPending?.changes.priority ?? currentIssue.priority]}
                </span>
              </div>
              <div className={`card-field ${currentPending?.changes.estimate !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Estimate</span>
                <span className="chip">{(currentPending?.changes.estimate !== undefined ? currentPending.changes.estimate : currentIssue.estimate) ?? '—'}</span>
              </div>
              <div className={`card-field ${currentPending?.changes.labelIds !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Labels</span>
                <div className="card-labels">
                  {(currentPending?.changes.labelIds ?? currentIssue.labels.nodes.map(l => l.id))
                    .map(id => availableLabels.find(l => l.id === id) || currentIssue.labels.nodes.find(l => l.id === id))
                    .filter(Boolean)
                    .map(l => l && (
                      <span key={l.id} className="chip label-chip" style={{
                        background: `${l.color}1f`,
                        borderColor: `${l.color}40`,
                        color: l.color,
                      }}>
                        <span className="dot" style={{ background: l.color }} />
                        {l.name}
                      </span>
                    ))}
                </div>
              </div>
              <div className={`card-field ${currentPending?.changes.assigneeId !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Assignee</span>
                <span className="chip">{currentIssue.assignee?.displayName || currentIssue.assignee?.name || 'Unassigned'}</span>
              </div>
            </div>
            <div className="detail-footer">
              <a href={currentIssue.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                Open in Linear &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Picker overlays */}
      {activeOverlay === 'estimate' && (
        <EstimatePicker
          currentEstimate={getCurrentEstimate()}
          onSelect={(value) => {
            dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue.id, field: 'estimate', value })
            dispatch({ type: 'CLOSE_OVERLAY' })
          }}
          onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        />
      )}
      {activeOverlay === 'label' && (
        <LabelPicker
          labels={availableLabels}
          selectedIds={getCurrentLabelIds()}
          onToggle={(labelId) => {
            const current = getCurrentLabelIds()
            const next = current.includes(labelId)
              ? current.filter(id => id !== labelId)
              : [...current, labelId]
            dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue.id, field: 'labelIds', value: next })
          }}
          onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        />
      )}
      {activeOverlay === 'assignee' && (
        <AssigneePicker
          members={availableMembers}
          currentAssigneeId={getCurrentAssigneeId()}
          onSelect={(memberId) => {
            dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue.id, field: 'assigneeId', value: memberId })
            dispatch({ type: 'CLOSE_OVERLAY' })
          }}
          onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        />
      )}
      {activeOverlay === 'project' && (
        <ProjectPicker
          projects={availableProjects}
          currentProjectId={getCurrentProjectId()}
          onSelect={(projectId) => {
            dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue.id, field: 'projectId', value: projectId })
            dispatch({ type: 'CLOSE_OVERLAY' })
          }}
          onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        />
      )}
      {activeOverlay === 'cheatsheet' && (
        <CheatsheetModal onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      )}

      <ShortcutBar activeOverlay={activeOverlay} />

      <style>{`
        .triage-screen {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding-bottom: 44px;
          position: relative;
          overflow: hidden;
        }

        /* Header */
        .triage-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--sp-3) var(--sp-4);
          border-bottom: 1px solid var(--border-subtle);
          position: relative;
          z-index: 2;
          gap: var(--sp-3);
        }
        .triage-header-left {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          flex-shrink: 0;
        }
        .triage-header-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          min-width: 0;
        }
        .triage-scope-chips {
          display: flex;
          align-items: center;
          gap: var(--sp-1);
          flex-wrap: wrap;
          justify-content: center;
        }
        .scope-chip {
          font-size: 0.72rem;
          padding: 2px 7px;
          border-radius: var(--radius-sm);
          background: var(--chip-bg);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          white-space: nowrap;
          font-weight: 400;
        }
        .scope-chip-primary {
          color: var(--text-primary);
          font-weight: 400;
        }
        .triage-header-right {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          flex-shrink: 0;
        }
        .triage-counter {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          font-weight: 400;
        }
        .triage-back-btn {
          padding: var(--sp-1) var(--sp-3);
          font-size: 0.8rem;
        }
        .triage-review-btn {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }
        .triage-review-btn-active {
          background: rgba(94, 106, 210, 0.15) !important;
          border-color: var(--accent) !important;
          color: var(--accent);
        }
        .triage-review-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--accent);
          color: white;
          font-size: 0.72rem;
          font-weight: 500;
          min-width: 18px;
          height: 18px;
          border-radius: 9px;
          padding: 0 5px;
          animation: badge-bounce 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes badge-bounce {
          0% { transform: scale(1); }
          40% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }

        /* Body: card area + drawer */
        .triage-body {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }
        .triage-card-area {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--sp-4);
          position: relative;
          perspective: 1200px;
          transition: margin-right 250ms cubic-bezier(0.22, 1, 0.36, 1);
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            rgba(0, 0, 0, 0.15) 100%
          );
        }
        [data-theme="light"] .triage-card-area {
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            rgba(0, 0, 0, 0.04) 100%
          );
        }
        .triage-card-area-shifted {
          margin-right: 0;
        }

        /* Review drawer */
        .review-drawer {
          width: 340px;
          flex-shrink: 0;
          border-left: 1px solid var(--border-subtle);
          background: var(--bg-surface);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          margin-right: -340px;
          transition: margin-right 250ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        .review-drawer-open {
          margin-right: 0;
        }
        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--sp-3) var(--sp-4);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }
        .drawer-title {
          font-size: 0.875rem;
          font-weight: 500;
        }
        .drawer-review-all {
          font-size: 0.72rem;
          padding: var(--sp-1) var(--sp-2);
        }
        .drawer-empty {
          padding: var(--sp-6) var(--sp-4);
          text-align: center;
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .drawer-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--sp-2);
        }
        .drawer-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-align: left;
          transition: background 100ms;
          width: 100%;
        }
        .drawer-row:hover {
          background: var(--hover-bg);
        }
        .drawer-row-active {
          background: rgba(94, 106, 210, 0.08);
          border-left: 2px solid var(--accent);
        }
        .drawer-row-id {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
          font-weight: 400;
        }
        .drawer-row-title {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .drawer-row-changes {
          display: flex;
          gap: var(--sp-1);
          flex-wrap: wrap;
          margin-top: 2px;
        }
        .drawer-change-chip {
          font-size: 0.72rem;
          padding: 1px 5px;
          border-radius: var(--radius-sm);
          background: rgba(94, 106, 210, 0.10);
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          font-weight: 400;
        }

        /* Card stack — 3D perspective */
        .card-stack {
          position: relative;
          transform-style: preserve-3d;
        }
        .stack-card {
          position: absolute;
          width: 640px;
          max-width: 92vw;
          height: 100%;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }
        .stack-card-1 {
          transform: translateZ(-30px) translateY(5px) scale(0.97);
          opacity: 0.45;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        }
        .stack-card-2 {
          transform: translateZ(-60px) translateY(10px) scale(0.94);
          opacity: 0.2;
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        }

        /* Card wrapper — 3D transforms */
        .triage-card-wrapper {
          will-change: transform, opacity;
          position: relative;
          z-index: 1;
          transform-style: preserve-3d;
        }

        .card-enter-right,
        .card-enter-left {
          animation: card-lift-from-stack 320ms cubic-bezier(0.22, 1, 0.36, 1);
        }
        @keyframes card-lift-from-stack {
          0% { opacity: 0.4; transform: translateZ(-30px) translateY(5px) scale(0.97) rotateX(2deg); }
          100% { opacity: 1; transform: translateZ(0) translateY(0) scale(1) rotateX(0deg); }
        }

        .card-exit-right {
          animation: card-to-back-right 300ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        @keyframes card-to-back-right {
          0% { opacity: 1; transform: translateZ(0) translateX(0) translateY(0) rotateY(0deg) rotateX(0deg) scale(1); }
          40% { opacity: 0.7; transform: translateZ(-10px) translateX(30px) translateY(0) rotateY(-8deg) rotateX(1deg) scale(0.98); }
          100% { opacity: 0; transform: translateZ(-60px) translateX(10px) translateY(10px) rotateY(-3deg) rotateX(2deg) scale(0.92); }
        }

        .card-exit-left {
          animation: card-to-back-left 300ms cubic-bezier(0.4, 0, 0.6, 1) forwards;
        }
        @keyframes card-to-back-left {
          0% { opacity: 1; transform: translateZ(0) translateX(0) translateY(0) rotateY(0deg) rotateX(0deg) scale(1); }
          40% { opacity: 0.7; transform: translateZ(-10px) translateX(-30px) translateY(0) rotateY(8deg) rotateX(1deg) scale(0.98); }
          100% { opacity: 0; transform: translateZ(-60px) translateX(-10px) translateY(10px) rotateY(3deg) rotateX(2deg) scale(0.92); }
        }

        .card-submit-glow {
          animation: submit-bounce-to-back 380ms cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
        }
        .card-submit-glow .issue-card {
          animation: submit-glow-ring 380ms ease-out;
        }
        @keyframes submit-bounce-to-back {
          0% { opacity: 1; transform: translateZ(0) translateY(0) rotateX(0deg) scale(1); }
          25% { opacity: 1; transform: translateZ(20px) translateY(-6px) rotateX(-1deg) scale(1.02); }
          50% { opacity: 1; transform: translateZ(0) translateY(0) rotateX(0deg) scale(1); }
          100% { opacity: 0; transform: translateZ(-50px) translateY(8px) rotateX(3deg) scale(0.93); }
        }
        @keyframes submit-glow-ring {
          0% { box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 0 rgba(76, 183, 130, 0.5); border-color: var(--priority-low); }
          35% { box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 0 24px 6px rgba(76, 183, 130, 0.3); border-color: var(--priority-low); }
          100% { box-shadow: var(--shadow-card); border-color: var(--border-subtle); }
        }

        /* Empty / inbox-zero state */
        .triage-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: var(--sp-3);
          position: relative;
          z-index: 1;
        }
        .empty-icon {
          color: var(--priority-low);
          animation: empty-icon-enter 500ms cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes empty-icon-enter {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        .empty-checkmark .empty-circle {
          stroke-dasharray: 165;
          stroke-dashoffset: 165;
          animation: empty-draw-circle 600ms ease-out 100ms forwards;
        }
        .empty-checkmark .empty-check {
          stroke-dasharray: 44;
          stroke-dashoffset: 44;
          animation: empty-draw-check 400ms ease-out 500ms forwards;
        }
        @keyframes empty-draw-circle {
          to { stroke-dashoffset: 0; }
        }
        @keyframes empty-draw-check {
          to { stroke-dashoffset: 0; }
        }
        .empty-title {
          font-size: 1.5rem;
          font-weight: 300;
          letter-spacing: -0.02em;
          animation: empty-fade-up 400ms ease-out 300ms both;
        }
        .empty-subtitle {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--text-muted);
          animation: empty-fade-up 400ms ease-out 450ms both;
        }
        .empty-actions {
          display: flex;
          gap: var(--sp-3);
          margin-top: var(--sp-2);
          animation: empty-fade-up 400ms ease-out 600ms both;
        }
        .empty-actions a {
          text-decoration: none;
        }
        @keyframes empty-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Empty confetti */
        .empty-confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .empty-confetti-piece {
          position: absolute;
          top: -10px;
          left: var(--x);
          width: var(--size);
          height: var(--size);
          background: var(--color);
          border-radius: 1px;
          animation: empty-confetti-fall var(--duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards;
          transform: rotate(var(--rotation));
        }
        @keyframes empty-confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) translateX(0) rotate(var(--rotation)) scale(1);
          }
          75% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translateY(100vh) translateX(var(--drift)) rotate(calc(var(--rotation) + 720deg)) scale(0.5);
          }
        }

        /* Priority flash */
        .priority-flash {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          animation: priority-flash-anim 400ms ease-out forwards;
          background: radial-gradient(ellipse at center, var(--flash-color) 0%, transparent 70%);
        }
        @keyframes priority-flash-anim {
          0% { opacity: 0.18; }
          100% { opacity: 0; }
        }

        /* Detail panel */
        .detail-panel {
          background: var(--bg-elevated);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-lg);
          padding: var(--sp-6);
          max-width: 700px;
          width: 90vw;
          max-height: 85vh;
          overflow-y: auto;
          animation: scale-in 150ms ease-out;
        }
        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--sp-4);
        }
        .detail-close {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          padding: var(--sp-1) var(--sp-2);
        }
        .detail-title {
          font-size: 1.25rem;
          font-weight: 400;
          line-height: 1.4;
          letter-spacing: -0.01em;
          margin-bottom: var(--sp-4);
        }
        .detail-description {
          color: var(--text-secondary);
          font-size: 0.875rem;
          line-height: 1.6;
          font-weight: 400;
          word-break: break-word;
        }
        .detail-description p {
          margin: 0 0 0.6em;
        }
        .detail-description p:last-child {
          margin-bottom: 0;
        }
        .detail-description h1,
        .detail-description h2 {
          font-size: 1rem;
          font-weight: 500;
          color: var(--text-primary);
          margin: 1em 0 0.4em;
        }
        .detail-description h3,
        .detail-description h4 {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          margin: 0.8em 0 0.3em;
        }
        .detail-description h1:first-child,
        .detail-description h2:first-child,
        .detail-description h3:first-child {
          margin-top: 0;
        }
        .detail-description ul,
        .detail-description ol {
          padding-left: 1.4em;
          margin: 0 0 0.6em;
        }
        .detail-description li {
          margin-bottom: 0.2em;
        }
        .detail-description code {
          font-family: var(--font-mono);
          font-size: 0.85em;
          background: var(--chip-bg);
          padding: 2px 5px;
          border-radius: var(--radius-sm);
        }
        .detail-description pre {
          background: var(--chip-bg);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: var(--sp-3);
          overflow-x: auto;
          margin: 0.6em 0;
        }
        .detail-description pre code {
          background: none;
          padding: 0;
          font-size: 0.8rem;
        }
        .detail-description blockquote {
          border-left: 3px solid var(--border-medium);
          padding-left: var(--sp-3);
          margin: 0.6em 0;
          color: var(--text-muted);
        }
        .detail-description a {
          color: var(--accent);
        }
        .detail-description img {
          max-width: 100%;
          border-radius: var(--radius-md);
          margin: 0.4em 0;
        }
        .detail-description hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 0.8em 0;
        }
        .detail-description table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.6em 0;
          font-size: 0.85rem;
        }
        .detail-description th,
        .detail-description td {
          border: 1px solid var(--border-subtle);
          padding: var(--sp-1) var(--sp-2);
          text-align: left;
        }
        .detail-description th {
          background: var(--chip-bg);
          font-weight: 500;
        }
        .detail-footer {
          margin-top: var(--sp-5);
          display: flex;
          justify-content: flex-end;
        }
        .detail-footer a {
          text-decoration: none;
        }

        @media (max-width: 900px) {
          .review-drawer {
            width: 280px;
            margin-right: -280px;
          }
        }
      `}</style>
    </div>
  )
}
