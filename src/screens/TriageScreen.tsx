import { useEffect, useCallback, useState, useRef } from 'react'
import { useApp } from '../store/useAppStore'
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
        <div className="triage-empty">
          <p>No issues to triage</p>
          <button className="btn-secondary" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'filter' })}>
            Adjust filters
          </button>
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
          <button
            className="btn-secondary triage-back-btn"
            onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'filter' })}
          >
            &larr; Filter Mode
          </button>
        </div>
        <div className="triage-header-center">
          <div className="triage-mode-row">
            <p className="triage-mode-label">Triage Mode</p>
            {state.organization && (
              <span className="workspace-badge">{state.organization.name}</span>
            )}
          </div>
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
              <div className="detail-description">{currentIssue.description}</div>
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
          padding-bottom: 48px;
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
        .triage-mode-row {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          justify-content: center;
        }
        .triage-mode-label {
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
        .triage-scope-chips {
          display: flex;
          align-items: center;
          gap: var(--sp-1);
          flex-wrap: wrap;
          justify-content: center;
        }
        .scope-chip {
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: 3px;
          background: var(--chip-bg);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          white-space: nowrap;
        }
        .scope-chip-primary {
          color: var(--text-primary);
          font-weight: 500;
        }
        .triage-header-right {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
          flex-shrink: 0;
        }
        .triage-counter {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
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
          font-size: 0.7rem;
          font-weight: 600;
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
          font-size: 0.85rem;
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
          font-size: 0.7rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }
        .drawer-row-title {
          font-size: 0.8rem;
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
          font-size: 0.6rem;
          padding: 1px 4px;
          border-radius: 2px;
          background: rgba(94, 106, 210, 0.12);
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.03em;
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

        .triage-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-4);
          margin-top: 30vh;
          color: var(--text-secondary);
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
          font-size: 1.35rem;
          font-weight: 600;
          line-height: 1.35;
          margin-bottom: var(--sp-4);
        }
        .detail-description {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
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
