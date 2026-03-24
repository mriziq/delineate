import { useEffect, useCallback } from 'react'

const ESTIMATES = [
  { value: 1, label: '~30min', keys: ['1'] },
  { value: 2, label: '1-2hrs', keys: ['2'] },
  { value: 3, label: 'Half day', keys: ['3'] },
  { value: 5, label: '1 day', keys: ['5'] },
  { value: 8, label: '~2 days', keys: ['8'] },
  { value: 13, label: '3-5 days', keys: ['9'] },
  { value: 21, label: 'Break it up', keys: ['0'] },
]

// Keys that map to values
const KEY_TO_VALUE: Record<string, number> = { '1': 1, '2': 2, '3': 3, '5': 5, '8': 8, '9': 13, '0': 21 }

interface Props {
  currentEstimate: number | null
  onSelect: (value: number | null) => void
  onClose: () => void
}

export default function EstimatePicker({ currentEstimate, onSelect, onClose }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Backspace') {
      onSelect(null)
      return
    }
    if (e.key in KEY_TO_VALUE) {
      onSelect(KEY_TO_VALUE[e.key])
    }
  }, [onSelect, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel estimate-panel" onClick={e => e.stopPropagation()}>
        <h3 className="overlay-title">Set Estimate</h3>
        <p className="overlay-hint">Press key to select (1, 2, 3, 5, 8, 9→13, 0→21) &middot; Backspace to clear &middot; Esc to cancel</p>
        <div className="estimate-grid">
          {ESTIMATES.map((est) => (
            <button
              key={est.value}
              className={`estimate-tile ${currentEstimate === est.value ? 'estimate-active' : ''}`}
              onClick={() => onSelect(est.value)}
            >
              <span className="estimate-value">{est.value}</span>
              <span className="estimate-label">{est.label}</span>
              {est.keys.length > 0 && (
                <kbd className="estimate-key">{est.keys[0]}</kbd>
              )}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        .estimate-panel {
          max-width: 640px;
        }
        .overlay-title {
          font-size: 1rem;
          font-weight: 400;
          margin-bottom: var(--sp-1);
        }
        .overlay-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 400;
          margin-bottom: var(--sp-4);
        }
        .estimate-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: var(--sp-2);
        }
        .estimate-tile {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--sp-1);
          padding: var(--sp-3) var(--sp-2);
          background: var(--chip-bg);
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 150ms;
          min-height: 72px;
        }
        .estimate-tile:hover {
          background: var(--hover-bg);
          border-color: var(--accent);
        }
        .estimate-active {
          background: rgba(94, 106, 210, 0.2) !important;
          border-color: var(--accent) !important;
        }
        .estimate-value {
          font-size: 1.25rem;
          font-weight: 300;
        }
        .estimate-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 400;
          text-align: center;
        }
        .estimate-key {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          font-weight: 400;
          color: var(--text-muted);
          background: var(--key-bg);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-sm);
          padding: 1px 4px;
        }
        @media (max-width: 600px) {
          .estimate-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
      `}</style>
    </div>
  )
}
