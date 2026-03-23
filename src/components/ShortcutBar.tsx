import type { Overlay } from '../api/types'

interface Props {
  activeOverlay: Overlay
}

const SHORTCUTS = [
  { group: 'Navigate', items: [
    { key: '←', label: 'Back' },
    { key: 'Space', label: 'Next' },
    { key: '→', label: 'Next' },
  ]},
  { group: 'Priority', items: [
    { key: '1', label: 'Urgent' },
    { key: '2', label: 'High' },
    { key: '3', label: 'Medium' },
    { key: '4', label: 'Low' },
  ]},
  { group: 'Edit', items: [
    { key: '0', label: 'Expand' },
    { key: 'E', label: 'Estimate' },
    { key: 'L', label: 'Labels' },
    { key: 'A', label: 'Assignee' },
    { key: 'P', label: 'Project' },
  ]},
  { group: 'Util', items: [
    { key: 'R', label: 'Review' },
    { key: 'Z', label: 'Undo' },
    { key: 'T', label: 'Theme' },
    { key: '?', label: 'Help' },
  ]},
]

export default function ShortcutBar({ activeOverlay }: Props) {
  const overlayOpen = activeOverlay !== null

  return (
    <div className="shortcut-bar">
      {SHORTCUTS.map(group => (
        <div key={group.group} className="shortcut-group">
          {group.items.map(item => (
            <div
              key={item.key}
              className={`shortcut-item ${overlayOpen ? 'shortcut-inactive' : ''}`}
            >
              <kbd className="shortcut-key">{item.key}</kbd>
              <span className="shortcut-label">{item.label}</span>
            </div>
          ))}
        </div>
      ))}
      <style>{`
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
          gap: var(--sp-6);
          padding: var(--sp-2) var(--sp-4);
          z-index: 50;
        }
        .shortcut-group {
          display: flex;
          gap: var(--sp-3);
        }
        .shortcut-item {
          display: flex;
          align-items: center;
          gap: var(--sp-1);
          transition: opacity 150ms;
        }
        .shortcut-inactive {
          opacity: 0.3;
        }
        .shortcut-key {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          background: var(--key-bg);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 2px 7px;
          line-height: 1.4;
        }
        .shortcut-label {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
