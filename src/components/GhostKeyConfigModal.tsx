import { useCallback, useEffect, useRef, useState } from 'react'
import type { GhostKeyPosition, GhostStepConfig, GhostStepId } from '../api/types'

interface Props {
  position: GhostKeyPosition
  steps: GhostStepConfig[]
  opacity: number
  onPositionChange: (pos: GhostKeyPosition) => void
  onStepsChange: (steps: GhostStepConfig[]) => void
  onOpacityChange: (v: number) => void
  onClose: () => void
}

const POSITION_OPTIONS: { value: GhostKeyPosition; label: string; icon: string }[] = [
  { value: 'above', label: 'Above', icon: '↑' },
  { value: 'overlay', label: 'On card', icon: '◻' },
  { value: 'below', label: 'Below', icon: '↓' },
]

const STEP_META: Record<GhostStepId, { label: string; key: string; color: string }> = {
  priority: { label: 'Priority', key: '1-4', color: '#f2994a' },
  estimate: { label: 'Estimate', key: 'E', color: '#5e6ad2' },
  label:    { label: 'Label', key: 'L', color: '#9b59b6' },
  assignee: { label: 'Assignee', key: 'A', color: '#3498db' },
  project:  { label: 'Project', key: 'P', color: '#e67e22' },
}

export default function GhostKeyConfigModal({ position, steps, opacity, onPositionChange, onStepsChange, onOpacityChange, onClose }: Props) {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  function toggleStep(id: GhostStepId) {
    onStepsChange(steps.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s))
  }

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    // Make the drag image slightly transparent
    const el = e.currentTarget as HTMLElement
    el.style.opacity = '0.5'
  }

  function handleDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = ''
    if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
      const next = [...steps]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(overIdx, 0, moved)
      onStepsChange(next)
    }
    setDragIdx(null)
    setOverIdx(null)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setOverIdx(idx)
  }

  const enabledSteps = steps.filter(s => s.enabled)

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel gc-panel" onClick={e => e.stopPropagation()}>
        <h3 className="overlay-title">Ghost Key Settings</h3>

        {/* ── Position section ─────────────────── */}
        <div className="gc-section">
          <label className="gc-section-label">Position</label>
          <div className="gc-pos-row">
            {POSITION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                className={`gc-pos-btn ${position === opt.value ? 'gc-pos-btn-active' : ''}`}
                onClick={() => onPositionChange(opt.value)}
              >
                <span className="gc-pos-icon">{opt.icon}</span>
                <span className="gc-pos-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Opacity section ──────────────────── */}
        <div className="gc-section">
          <label className="gc-section-label">Transparency</label>
          <div className="gc-opacity-row">
            <input
              type="range"
              className="gc-opacity-slider"
              min={10}
              max={100}
              step={5}
              value={opacity}
              onChange={e => onOpacityChange(Number(e.target.value))}
              style={{ '--gc-slider-pct': `${opacity}%` } as React.CSSProperties}
            />
            <span className="gc-opacity-value">{opacity}%</span>
          </div>
        </div>

        {/* ── Steps section ────────────────────── */}
        <div className="gc-section">
          <label className="gc-section-label">Steps</label>
          <p className="gc-section-hint">Drag to reorder. Toggle steps on or off. Submit is always last.</p>
          <div className="gc-steps-list" ref={listRef}>
            {steps.map((step, idx) => {
              const meta = STEP_META[step.id]
              const isDragging = dragIdx === idx
              const isOver = overIdx === idx && dragIdx !== null && dragIdx !== idx
              return (
                <div
                  key={step.id}
                  draggable
                  onDragStart={e => handleDragStart(e, idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => handleDragOver(e, idx)}
                  className={`gc-step-row ${step.enabled ? '' : 'gc-step-row-disabled'} ${isDragging ? 'gc-step-row-dragging' : ''} ${isOver ? 'gc-step-row-over' : ''}`}
                >
                  <div className="gc-drag-handle" title="Drag to reorder">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>

                  <button
                    className={`gc-step-toggle ${step.enabled ? 'gc-step-toggle-on' : ''}`}
                    onClick={() => toggleStep(step.id)}
                    style={step.enabled ? { '--gc-color': meta.color } as React.CSSProperties : undefined}
                  >
                    <span className="gc-toggle-track">
                      <span className="gc-toggle-thumb" />
                    </span>
                  </button>

                  <div className="gc-step-info">
                    <span className="gc-step-name" style={step.enabled ? { color: meta.color } : undefined}>{meta.label}</span>
                    <kbd className="gc-step-key">{meta.key}</kbd>
                  </div>
                </div>
              )
            })}

            {/* Submit — always last, always on */}
            <div className="gc-step-row gc-step-row-fixed">
              <div className="gc-drag-handle gc-drag-handle-locked">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div className="gc-step-fixed-spacer" />
              <div className="gc-step-info">
                <span className="gc-step-name" style={{ color: '#4cb782' }}>Submit</span>
                <kbd className="gc-step-key">Enter</kbd>
              </div>
              <span className="gc-step-locked">always last</span>
            </div>
          </div>
        </div>

        {/* ── Preview ──────────────────────────── */}
        <div className="gc-section">
          <label className="gc-section-label">Flow preview</label>
          <div className="gc-preview">
            {enabledSteps.map((step, i) => {
              const meta = STEP_META[step.id]
              return (
                <span key={step.id} className="gc-preview-step">
                  <span className="gc-preview-dot" style={{ background: meta.color }} />
                  <span className="gc-preview-name">{meta.label}</span>
                  {i < enabledSteps.length && <span className="gc-preview-arrow">&rarr;</span>}
                </span>
              )
            })}
            <span className="gc-preview-step">
              <span className="gc-preview-dot" style={{ background: '#4cb782' }} />
              <span className="gc-preview-name">Submit</span>
            </span>
          </div>
        </div>

        <p className="gc-dismiss">Press <kbd className="shortcut-key">Esc</kbd> to close</p>
      </div>
      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .gc-panel {
    max-width: 420px;
  }

  /* ── Sections ─────────────────────────────── */
  .gc-section {
    margin-top: var(--sp-5);
  }
  .gc-section-label {
    display: block;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
    margin-bottom: var(--sp-2);
  }
  .gc-section-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin-bottom: var(--sp-3);
  }

  /* ── Opacity slider ─────────────────────────── */
  .gc-opacity-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
  }
  .gc-opacity-slider {
    flex: 1;
    -webkit-appearance: none;
    appearance: none;
    height: 6px;
    border-radius: 3px;
    background: linear-gradient(
      to right,
      var(--accent) 0%,
      var(--accent) var(--gc-slider-pct, 50%),
      var(--border-medium) var(--gc-slider-pct, 50%),
      var(--border-medium) 100%
    );
    outline: none;
    cursor: pointer;
  }
  .gc-opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--accent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: grab;
    transition: transform 150ms;
  }
  .gc-opacity-slider::-webkit-slider-thumb:active {
    cursor: grabbing;
    transform: scale(1.15);
  }
  .gc-opacity-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--accent);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    cursor: grab;
  }
  .gc-opacity-value {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-secondary);
    min-width: 36px;
    text-align: right;
  }

  /* ── Position row ─────────────────────────── */
  .gc-pos-row {
    display: flex;
    gap: var(--sp-2);
  }
  .gc-pos-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: var(--sp-3) var(--sp-2);
    border-radius: var(--radius-lg);
    border: 1.5px solid var(--border-subtle);
    background: var(--bg-surface);
    color: var(--text-secondary);
    cursor: pointer;
    transition: border-color 150ms, background 150ms, color 150ms;
  }
  .gc-pos-btn:hover {
    border-color: var(--border-light);
    background: var(--bg-hover);
  }
  .gc-pos-btn-active {
    border-color: var(--accent);
    background: color-mix(in srgb, var(--accent) 8%, var(--bg-surface));
    color: var(--accent);
  }
  .gc-pos-btn-active:hover {
    border-color: var(--accent);
  }
  .gc-pos-icon {
    font-size: 1rem;
    line-height: 1;
  }
  .gc-pos-label {
    font-size: 0.75rem;
    font-weight: 500;
  }

  /* ── Steps list ───────────────────────────── */
  .gc-steps-list {
    display: flex;
    flex-direction: column;
    gap: var(--sp-1);
  }
  .gc-step-row {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    transition: opacity 150ms, border-color 150ms, transform 150ms, box-shadow 150ms;
    cursor: grab;
    user-select: none;
  }
  .gc-step-row:active {
    cursor: grabbing;
  }
  .gc-step-row-disabled {
    opacity: 0.45;
  }
  .gc-step-row-fixed {
    border-style: dashed;
    opacity: 0.7;
    cursor: default;
  }
  .gc-step-row-dragging {
    opacity: 0.4;
  }
  .gc-step-row-over {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent), inset 0 0 12px color-mix(in srgb, var(--accent) 8%, transparent);
  }

  /* ── Drag handle ──────────────────────────── */
  .gc-drag-handle {
    flex-shrink: 0;
    width: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    opacity: 0.4;
    transition: opacity 150ms, color 150ms;
  }
  .gc-step-row:hover .gc-drag-handle:not(.gc-drag-handle-locked) {
    opacity: 0.8;
    color: var(--text-secondary);
  }
  .gc-drag-handle-locked {
    opacity: 0.25;
    cursor: default;
  }

  /* ── Toggle switch ────────────────────────── */
  .gc-step-toggle {
    flex-shrink: 0;
    width: 32px;
    height: 18px;
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
  }
  .gc-toggle-track {
    display: block;
    width: 32px;
    height: 18px;
    border-radius: 9px;
    background: var(--border-medium);
    position: relative;
    transition: background 200ms;
  }
  .gc-step-toggle-on .gc-toggle-track {
    background: var(--gc-color, var(--accent));
  }
  .gc-toggle-thumb {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    transition: transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  .gc-step-toggle-on .gc-toggle-thumb {
    transform: translateX(14px);
  }

  /* ── Step info ────────────────────────────── */
  .gc-step-info {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    min-width: 0;
  }
  .gc-step-name {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    transition: color 150ms;
  }
  .gc-step-row-disabled .gc-step-name {
    color: var(--text-muted) !important;
  }
  .gc-step-key {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 1px 6px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-medium);
    background: var(--bg-app);
    color: var(--text-secondary);
  }

  /* ── Fixed step spacer (replaces toggle width) ── */
  .gc-step-fixed-spacer {
    width: 32px;
    flex-shrink: 0;
  }

  .gc-step-locked {
    font-size: 0.68rem;
    color: var(--text-muted);
    font-style: italic;
    white-space: nowrap;
  }

  /* ── Flow preview ─────────────────────────── */
  .gc-preview {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--sp-1);
    padding: var(--sp-3);
    border-radius: var(--radius-lg);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
  }
  .gc-preview-step {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .gc-preview-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .gc-preview-name {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-secondary);
  }
  .gc-preview-arrow {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin: 0 2px;
  }

  /* ── Dismiss ──────────────────────────────── */
  .gc-dismiss {
    text-align: center;
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: var(--sp-5);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--sp-1);
  }
`
