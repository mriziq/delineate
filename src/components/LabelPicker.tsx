import { useState, useEffect, useCallback, useRef } from 'react'
import type { Label } from '../api/types'

interface Props {
  labels: Label[]
  selectedIds: string[]
  onToggle: (labelId: string) => void
  onClose: () => void
}

export default function LabelPicker({ labels, selectedIds, onToggle, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = labels.filter(l =>
    l.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex(i => Math.min(i + 1, filtered.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex(i => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && filtered[highlightIndex]) {
      e.preventDefault()
      onToggle(filtered[highlightIndex].id)
    }
  }, [filtered, highlightIndex, onToggle, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [])

  function updateSearch(val: string) {
    setSearch(val)
    setHighlightIndex(0)
  }

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel picker-panel" onClick={e => e.stopPropagation()}>
        <h3 className="overlay-title">Labels</h3>
        <input
          ref={inputRef}
          className="input picker-search"
          placeholder="Search labels..."
          value={search}
          onChange={e => updateSearch(e.target.value)}
        />
        <div className="picker-list">
          {filtered.map((label, idx) => (
            <button
              key={label.id}
              className={`picker-item ${idx === highlightIndex ? 'picker-highlighted' : ''} ${selectedIds.includes(label.id) ? 'picker-item-selected' : ''}`}
              onClick={() => onToggle(label.id)}
              onMouseEnter={() => setHighlightIndex(idx)}
              style={selectedIds.includes(label.id) ? { background: `${label.color}12` } : undefined}
            >
              <span className="dot" style={{ background: label.color }} />
              <span className="picker-item-name">{label.name}</span>
              {selectedIds.includes(label.id) && <span className="picker-check">&#10003;</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="picker-empty">No labels match</p>
          )}
        </div>
      </div>
      <style>{`
        .picker-panel {
          max-width: 400px;
          padding: var(--sp-4);
        }
        .picker-search {
          margin: var(--sp-3) 0;
        }
        .picker-list {
          max-height: 300px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }
        .picker-item {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--radius-sm);
          cursor: pointer;
          text-align: left;
          transition: background 100ms;
        }
        .picker-item:hover, .picker-highlighted {
          background: var(--hover-bg);
        }
        .picker-item-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 400;
        }
        .picker-check {
          color: var(--accent);
          font-size: 0.875rem;
        }
        .picker-empty {
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 400;
          text-align: center;
          padding: var(--sp-4);
        }
      `}</style>
    </div>
  )
}
