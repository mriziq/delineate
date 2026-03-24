import { useState, useEffect, useCallback, useRef } from 'react'
import type { Project } from '../api/types'

interface Props {
  projects: Project[]
  currentProjectId: string | null
  onSelect: (projectId: string | null) => void
  onClose: () => void
}

export default function ProjectPicker({ projects, currentProjectId, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allItems = [
    { id: '__none__', name: 'No project' },
    ...projects,
  ]

  const filtered = allItems.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
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
      const item = filtered[highlightIndex]
      onSelect(item.id === '__none__' ? null : item.id)
    }
  }, [filtered, highlightIndex, onSelect, onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // Delay focus to prevent the triggering "p" keystroke from leaking into the input
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    setHighlightIndex(0)
  }, [search])

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel picker-panel" onClick={e => e.stopPropagation()}>
        <h3 className="overlay-title">Project</h3>
        <p className="picker-hint">Select a project &middot; Arrow keys to navigate &middot; Enter to confirm &middot; Esc to cancel</p>
        <input
          ref={inputRef}
          className="input picker-search"
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="picker-list">
          {filtered.map((project, idx) => {
            const isSelected = (project.id === '__none__' && currentProjectId === null) ||
              project.id === currentProjectId
            return (
              <button
                key={project.id}
                className={`picker-item ${idx === highlightIndex ? 'picker-highlighted' : ''} ${isSelected ? 'picker-item-selected' : ''}`}
                onClick={() => onSelect(project.id === '__none__' ? null : project.id)}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                <span className="picker-item-icon">
                  {project.id === '__none__' ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2 2" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2" />
                      <rect x="4" y="4" width="6" height="2" rx="0.5" fill="currentColor" opacity="0.5" />
                      <rect x="4" y="8" width="4" height="2" rx="0.5" fill="currentColor" opacity="0.3" />
                    </svg>
                  )}
                </span>
                <span className="picker-item-name">{project.name}</span>
                {isSelected && <span className="picker-check">&#10003;</span>}
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p className="picker-empty">No projects match</p>
          )}
        </div>
      </div>
      <style>{`
        .picker-panel {
          max-width: 420px;
          padding: var(--sp-4);
        }
        .picker-hint {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-bottom: var(--sp-2);
        }
        .picker-search {
          margin: var(--sp-2) 0 var(--sp-3) 0;
        }
        .picker-list {
          max-height: 320px;
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
        .picker-item-selected {
          background: rgba(94, 106, 210, 0.08);
        }
        .picker-item-icon {
          color: var(--text-muted);
          display: flex;
          align-items: center;
          flex-shrink: 0;
        }
        .picker-item-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 400;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .picker-check {
          color: var(--accent);
          font-size: 0.875rem;
          flex-shrink: 0;
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
