import type { Issue, PendingChange, Label } from '../api/types'

const PRIORITY_LABELS: Record<number, string> = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Medium',
  4: 'Low',
}

const PRIORITY_COLORS: Record<number, string> = {
  0: 'var(--priority-none)',
  1: 'var(--priority-urgent)',
  2: 'var(--priority-high)',
  3: 'var(--priority-medium)',
  4: 'var(--priority-low)',
}

function tintBg(hex: string, opacity = 0.12): string {
  return `${hex}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`
}

interface Props {
  issue: Issue
  pending: PendingChange | undefined
  availableLabels: Label[]
  onClick?: () => void
  compact?: boolean
}

export default function IssueCard({ issue, pending, availableLabels, onClick, compact }: Props) {
  const priority = pending?.changes.priority ?? issue.priority
  const estimate = pending?.changes.estimate !== undefined ? pending.changes.estimate : issue.estimate
  const labelIds = pending?.changes.labelIds ?? issue.labels.nodes.map(l => l.id)

  const resolvedLabels = labelIds
    .map(id => availableLabels.find(l => l.id === id) || issue.labels.nodes.find(l => l.id === id))
    .filter(Boolean) as Label[]

  const hasChanges = pending && Object.keys(pending.changes).length > 0
  const priorityChanged = pending?.changes.priority !== undefined
  const estimateChanged = pending?.changes.estimate !== undefined
  const labelsChanged = pending?.changes.labelIds !== undefined
  const assigneeChanged = pending?.changes.assigneeId !== undefined
  const projectChanged = pending?.changes.projectId !== undefined

  let assigneeName = issue.assignee?.displayName || issue.assignee?.name || null
  if (assigneeChanged && pending?.changes.assigneeId === null) {
    assigneeName = null
  }

  return (
    <div
      className={`issue-card ${compact ? 'issue-card-compact' : ''} ${onClick ? 'issue-card-clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header: identifier left, status right */}
      <div className="card-header">
        <span className="card-identifier">{issue.identifier}</span>
        <span className="card-chip card-status-chip">
          <span className="dot" style={{ background: issue.state.color }} />
          {issue.state.name}
        </span>
      </div>

      <h3 className="card-title">{issue.title}</h3>

      {!compact && issue.description && (
        <p className="card-description">
          {issue.description.length > 300
            ? issue.description.slice(0, 300) + '...'
            : issue.description}
        </p>
      )}

      <div className="card-divider" />

      {/* 2x2 field grid */}
      <div className="card-fields-grid">
        {/* Row 1 */}
        <div className={`card-field ${priorityChanged ? 'field-changed' : ''}`}>
          <span className="field-label">Priority</span>
          <span className="card-chip" style={{ borderColor: PRIORITY_COLORS[priority], color: PRIORITY_COLORS[priority] }}>
            <span className="dot" style={{ background: PRIORITY_COLORS[priority] }} />
            {PRIORITY_LABELS[priority]}
          </span>
        </div>

        <div className={`card-field ${estimateChanged ? 'field-changed' : ''}`}>
          <span className="field-label">Estimate</span>
          <span className="card-chip">{estimate != null ? `${estimate} pts` : '—'}</span>
        </div>

        {/* Row 2 */}
        <div className={`card-field ${labelsChanged ? 'field-changed' : ''}`}>
          <span className="field-label">Labels</span>
          <div className="card-labels">
            {resolvedLabels.length > 0
              ? resolvedLabels.map(l => (
                  <span
                    key={l.id}
                    className="card-chip label-chip"
                    style={{
                      background: tintBg(l.color),
                      borderColor: `${l.color}40`,
                      color: l.color,
                    }}
                  >
                    <span className="dot" style={{ background: l.color }} />
                    {l.name}
                  </span>
                ))
              : <span className="text-muted">—</span>}
          </div>
        </div>

        <div className={`card-field ${assigneeChanged ? 'field-changed' : ''}`}>
          <span className="field-label">Assignee</span>
          <span className="card-chip">{assigneeName || 'Unassigned'}</span>
        </div>
      </div>

      {/* Project at bottom */}
      {(issue.project || projectChanged) && (
        <div className="card-project-row">
          <span className="card-chip card-project-chip">
            {issue.project?.name || 'No project'}
            {projectChanged && <span className="card-project-changed">(changed)</span>}
          </span>
        </div>
      )}

      {hasChanges && (
        <div className="card-changed-badge">Modified — press Z to undo</div>
      )}

      {onClick && (
        <div className="card-expand-hint">Click to expand</div>
      )}

      <style>{`
        .issue-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--sp-6);
          width: 640px;
          min-height: 380px;
          max-width: 92vw;
          position: relative;
          box-shadow:
            0 1px 2px rgba(0, 0, 0, 0.12),
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 12px 32px rgba(0, 0, 0, 0.06);
          transform-style: preserve-3d;
          backface-visibility: hidden;
          display: flex;
          flex-direction: column;
        }
        .issue-card-clickable {
          cursor: pointer;
          transition: border-color 150ms, box-shadow 200ms, transform 200ms;
        }
        .issue-card-clickable:hover {
          border-color: var(--border-light);
          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.14),
            0 8px 20px rgba(0, 0, 0, 0.1),
            0 16px 40px rgba(0, 0, 0, 0.08);
          transform: translateY(-1px);
        }
        .issue-card-compact {
          padding: var(--sp-4);
          min-height: auto;
        }

        /* Header */
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--sp-3);
        }
        .card-identifier {
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--text-muted);
          font-variant-numeric: tabular-nums;
        }

        /* Title + desc */
        .card-title {
          font-size: 1.1rem;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: var(--sp-2);
        }
        .card-description {
          color: var(--text-secondary);
          font-size: 0.85rem;
          line-height: 1.5;
          margin-bottom: var(--sp-2);
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
          flex: 1;
        }
        .card-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: var(--sp-3) 0;
        }

        /* 2x2 grid */
        .card-fields-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--sp-2);
        }
        .card-field {
          display: flex;
          flex-direction: column;
          gap: var(--sp-1);
          padding: var(--sp-2);
          border-radius: var(--radius-sm);
          transition: background 300ms;
        }
        .field-changed {
          background: rgba(94, 106, 210, 0.1);
          animation: field-pulse 400ms ease-out;
        }
        @keyframes field-pulse {
          0% { background: rgba(94, 106, 210, 0.25); }
          100% { background: rgba(94, 106, 210, 0.1); }
        }
        .field-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .card-labels {
          display: flex;
          flex-wrap: wrap;
          gap: var(--sp-1);
        }
        .text-muted {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        /* Shared chip style — all rounded */
        .card-chip {
          display: inline-flex;
          align-items: center;
          gap: var(--sp-1);
          background: var(--chip-bg);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          padding: 3px 10px;
          font-size: 0.75rem;
          white-space: nowrap;
          font-weight: 500;
        }
        .card-chip .dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .card-status-chip {
          font-size: 0.7rem;
          padding: 2px 8px;
        }
        .label-chip {
          font-weight: 500;
        }

        /* Project row at bottom */
        .card-project-row {
          margin-top: var(--sp-3);
          display: flex;
        }
        .card-project-chip {
          font-size: 0.7rem;
          background: var(--chip-bg);
          color: var(--text-secondary);
        }
        .card-project-changed {
          font-size: 0.6rem;
          color: var(--accent);
          margin-left: var(--sp-1);
        }

        /* Badge + hint */
        .card-changed-badge {
          margin-top: var(--sp-3);
          font-size: 0.72rem;
          color: var(--accent);
          text-align: center;
        }
        .card-expand-hint {
          position: absolute;
          top: var(--sp-2);
          right: var(--sp-3);
          font-size: 0.65rem;
          color: var(--text-muted);
          opacity: 0;
          transition: opacity 150ms;
        }
        .issue-card-clickable:hover .card-expand-hint {
          opacity: 1;
        }
      `}</style>
    </div>
  )
}
