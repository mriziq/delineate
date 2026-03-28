import { useState, useEffect, useCallback } from 'react'
import type { Overlay } from '../api/types'

interface Props {
  activeOverlay: Overlay
}

const ROW_1 = [
  { group: 'Navigate', items: [
    { key: '←', label: 'Back' },
    { key: 'Space', label: 'Next' },
    { key: '→', label: 'Skip' },
  ]},
  { group: 'Priority', items: [
    { key: '1', label: 'Urgent' },
    { key: '2', label: 'High' },
    { key: '3', label: 'Medium' },
    { key: '4', label: 'Low' },
  ]},
]

const ROW_2 = [
  { group: 'Fields', items: [
    { key: '0', label: 'Expand' },
    { key: 'E', label: 'Estimate' },
    { key: 'L', label: 'Labels' },
    { key: 'A', label: 'Assignee' },
    { key: 'P', label: 'Project' },
  ]},
  { group: 'Actions', items: [
    { key: 'R', label: 'Review' },
    { key: 'Z', label: 'Undo' },
    { key: 'T', label: 'Theme' },
    { key: '?', label: 'Help' },
  ]},
]

function ShortcutRow({ groups, dimmed }: { groups: typeof ROW_1; dimmed: boolean }) {
  return (
    <div className="shortcut-row">
      {groups.map((group, gi) => (
        <div key={group.group} className="shortcut-group">
          {gi > 0 && <span className="shortcut-sep" />}
          <span className="shortcut-group-label">{group.group}</span>
          {group.items.map(item => (
            <div
              key={item.key}
              className={`shortcut-item ${dimmed ? 'shortcut-inactive' : ''}`}
            >
              <kbd className="shortcut-key">{item.key}</kbd>
              <span className="shortcut-label">{item.label}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function ShortcutBar({ activeOverlay }: Props) {
  const [open, setOpen] = useState(false)
  const overlayOpen = activeOverlay !== null

  const handleKey = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault()
      setOpen(o => !o)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <>
      {/* Collapsed: small pill toggle */}
      <button
        className={`shortcut-toggle ${open ? 'shortcut-toggle-hidden' : ''}`}
        onClick={() => setOpen(true)}
        aria-label="Show keyboard shortcuts"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="14" height="9" rx="2" />
          <line x1="4" y1="7.5" x2="5" y2="7.5" />
          <line x1="7.5" y1="7.5" x2="8.5" y2="7.5" />
          <line x1="11" y1="7.5" x2="12" y2="7.5" />
          <line x1="5" y1="10.5" x2="11" y2="10.5" />
        </svg>
        <span className="shortcut-toggle-label">Shortcuts</span>
        <kbd className="shortcut-toggle-key">/</kbd>
      </button>

      {/* Expanded: full shortcut tray */}
      <div className={`shortcut-bar ${open ? 'shortcut-bar-open' : ''}`}>
        <div className="shortcut-bar-inner">
          <ShortcutRow groups={ROW_1} dimmed={overlayOpen} />
          <ShortcutRow groups={ROW_2} dimmed={overlayOpen} />
        </div>
        <button
          className="shortcut-close"
          onClick={() => setOpen(false)}
          aria-label="Hide shortcuts"
        >
          <kbd className="shortcut-key">/</kbd>
        </button>
      </div>

      <style>{`
        /* Toggle pill */
        .shortcut-toggle {
          position: fixed;
          bottom: var(--sp-3);
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface);
          border: 1px solid var(--border-light);
          border-radius: 20px;
          padding: 5px 12px 5px 10px;
          color: var(--text-muted);
          cursor: pointer;
          transition: opacity 200ms, transform 200ms, background 150ms;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
        .shortcut-toggle:hover {
          background: var(--bg-elevated);
          color: var(--text-secondary);
        }
        .shortcut-toggle-hidden {
          opacity: 0;
          transform: translateX(-50%) translateY(8px);
          pointer-events: none;
        }
        .shortcut-toggle-label {
          font-size: 0.72rem;
          font-weight: 400;
        }
        .shortcut-toggle-key {
          font-family: var(--font-mono);
          font-size: 0.65rem;
          font-weight: 400;
          background: var(--key-bg);
          border: 1px solid var(--border-medium);
          border-radius: 3px;
          padding: 0 4px;
          line-height: 1.5;
          color: var(--text-muted);
        }

        /* Expanded bar */
        .shortcut-bar {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-app);
          border-top: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--sp-4);
          padding: var(--sp-3) var(--sp-4);
          z-index: 50;
          transform: translateY(100%);
          opacity: 0;
          transition: transform 250ms cubic-bezier(0.22, 1, 0.36, 1),
                      opacity 200ms ease;
          pointer-events: none;
        }
        .shortcut-bar-open {
          transform: translateY(0);
          opacity: 1;
          pointer-events: auto;
        }
        .shortcut-bar-inner {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .shortcut-close {
          position: absolute;
          right: var(--sp-3);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          align-items: center;
          cursor: pointer;
          opacity: 0.5;
          transition: opacity 150ms;
        }
        .shortcut-close:hover {
          opacity: 1;
        }

        /* Row & group layout */
        .shortcut-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--sp-2);
        }
        .shortcut-group {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }
        .shortcut-group-label {
          font-size: 0.65rem;
          font-weight: 500;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.04em;
          opacity: 0.6;
          margin-right: var(--sp-1);
        }
        .shortcut-sep {
          width: 1px;
          height: 14px;
          background: var(--border-subtle);
          margin: 0 var(--sp-3);
          flex-shrink: 0;
        }
        .shortcut-item {
          display: flex;
          align-items: center;
          gap: 5px;
          transition: opacity 150ms;
        }
        .shortcut-inactive {
          opacity: 0.3;
        }
        .shortcut-key {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          font-weight: 400;
          background: var(--key-bg);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 1px 5px;
          line-height: 1.5;
          min-width: 20px;
          text-align: center;
        }
        .shortcut-label {
          font-size: 0.68rem;
          font-weight: 400;
          color: var(--text-muted);
        }
      `}</style>
    </>
  )
}
