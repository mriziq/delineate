import { useState, useEffect, useCallback, useRef } from 'react'
import type { Member } from '../api/types'

interface Props {
  members: Member[]
  currentAssigneeId: string | null
  onSelect: (memberId: string | null) => void
  onClose: () => void
}

export default function AssigneePicker({ members, currentAssigneeId, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const allItems = [
    { id: '__unassigned__', name: 'Unassigned', displayName: 'Unassigned', avatarUrl: undefined },
    ...members,
  ]

  const filtered = allItems.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.displayName.toLowerCase().includes(search.toLowerCase())
  )

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key === 'Backspace' && search === '') {
      onSelect(null)
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
      onSelect(item.id === '__unassigned__' ? null : item.id)
    }
  }, [filtered, highlightIndex, onSelect, onClose, search])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  useEffect(() => {
    const raf = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    setHighlightIndex(0)
  }, [search])

  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div className="overlay-panel picker-panel" onClick={e => e.stopPropagation()}>
        <h3 className="overlay-title">Assignee</h3>
        <input
          ref={inputRef}
          className="input picker-search"
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="picker-list">
          {filtered.map((member, idx) => (
            <button
              key={member.id}
              className={`picker-item ${idx === highlightIndex ? 'picker-highlighted' : ''}`}
              onClick={() => onSelect(member.id === '__unassigned__' ? null : member.id)}
              onMouseEnter={() => setHighlightIndex(idx)}
            >
              {member.avatarUrl
                ? <img src={member.avatarUrl} alt="" className="picker-avatar" />
                : <div className="picker-avatar-placeholder">{(member.displayName || member.name).charAt(0)}</div>
              }
              <span className="picker-item-name">{member.displayName || member.name}</span>
              {((member.id === '__unassigned__' && currentAssigneeId === null) ||
                member.id === currentAssigneeId) && (
                <span className="picker-check">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <style>{`
        .picker-avatar {
          width: 20px;
          height: 20px;
          border-radius: 50%;
        }
        .picker-avatar-placeholder {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--chip-bg);
          border: 1px solid var(--border-light);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          font-weight: 400;
        }
      `}</style>
    </div>
  )
}
