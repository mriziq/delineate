import { useState, useEffect, useCallback, useRef } from 'react'
import type { GhostKeyPosition, GhostStepConfig, GhostStepId } from '../api/types'

interface Props {
  pending: Record<string, boolean>
  overlayOpen: boolean
  cardKey: number
  position: GhostKeyPosition
  steps: GhostStepConfig[]
  opacity: number
}

const PRIORITY_KEYS = [
  { key: '1', label: 'Urgent', color: '#eb5757' },
  { key: '2', label: 'High', color: '#f2994a' },
  { key: '3', label: 'Medium', color: '#f2c94c' },
  { key: '4', label: 'Low', color: '#4cb782' },
]

const STEP_RENDER: Record<GhostStepId, {
  prompt: string
  keys: { key: string; label: string; color: string; wide?: boolean }[]
  matchKey: (k: string) => string | null
}> = {
  priority: {
    prompt: 'Set priority',
    keys: PRIORITY_KEYS,
    matchKey: k => (k >= '1' && k <= '4') ? k : null,
  },
  estimate: {
    prompt: 'Add estimate',
    keys: [{ key: 'E', label: 'Estimate', color: '#5e6ad2' }],
    matchKey: k => (k === 'e' || k === 'E') ? 'E' : null,
  },
  label: {
    prompt: 'Add label',
    keys: [{ key: 'L', label: 'Label', color: '#9b59b6' }],
    matchKey: k => (k === 'l' || k === 'L') ? 'L' : null,
  },
  assignee: {
    prompt: 'Set assignee',
    keys: [{ key: 'A', label: 'Assignee', color: '#3498db' }],
    matchKey: k => (k === 'a' || k === 'A') ? 'A' : null,
  },
  project: {
    prompt: 'Set project',
    keys: [{ key: 'P', label: 'Project', color: '#e67e22' }],
    matchKey: k => (k === 'p' || k === 'P') ? 'P' : null,
  },
}

// Maps step IDs to the pending change field they correspond to
const STEP_FIELD: Record<GhostStepId, string> = {
  priority: 'priority',
  estimate: 'estimate',
  label: 'labelIds',
  assignee: 'assigneeId',
  project: 'projectId',
}

export default function GhostKeyHints({ pending, overlayOpen, cardKey, position, steps, opacity }: Props) {
  const [poppedKeys, setPoppedKeys] = useState<Set<string>>(new Set())
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const prevCardKey = useRef(cardKey)

  const enabledSteps = steps.filter(s => s.enabled)

  // Reset when card changes
  useEffect(() => {
    if (cardKey !== prevCardKey.current) {
      setPoppedKeys(new Set())
      setCurrentStepIdx(0)
      prevCardKey.current = cardKey
    }
  }, [cardKey])

  // Advance step based on pending state
  useEffect(() => {
    // Find the first enabled step that hasn't been completed
    const nextIncomplete = enabledSteps.findIndex(s => !pending[STEP_FIELD[s.id]])
    if (nextIncomplete === -1) {
      // All steps completed — show submit
      setCurrentStepIdx(enabledSteps.length)
    } else {
      setCurrentStepIdx(nextIncomplete)
    }
  }, [pending, enabledSteps.length, ...enabledSteps.map(s => s.id)])

  const currentStep = currentStepIdx < enabledSteps.length ? enabledSteps[currentStepIdx] : null
  const isSubmit = currentStepIdx >= enabledSteps.length

  // Listen for keydown to trigger pop animation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    const key = e.key
    let matched: string | null = null

    if (currentStep) {
      const render = STEP_RENDER[currentStep.id]
      matched = render.matchKey(key)
    } else if (isSubmit && (key === 'Enter' || key === ' ')) {
      matched = 'Enter'
    }

    if (matched) {
      setPoppedKeys(prev => new Set(prev).add(matched!))
    }
  }, [currentStep, isSubmit])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (overlayOpen) return null
  if (enabledSteps.length === 0 && !isSubmit) return null

  return (
    <>
      <div className={`ghost-hints ghost-hints-${position}`} aria-hidden="true" style={{ '--ghost-opacity': opacity / 100 } as React.CSSProperties}>
        {currentStep && (() => {
          const render = STEP_RENDER[currentStep.id]
          return (
            <div className="ghost-step ghost-step-enter" key={currentStep.id}>
              <span className="ghost-prompt">{render.prompt}</span>
              <div className="ghost-keys">
                {render.keys.map(gk => (
                  <div
                    key={gk.key}
                    className={`ghost-key ${gk.wide ? 'ghost-key-wide' : ''} ${poppedKeys.has(gk.key) ? 'ghost-key-popped' : 'ghost-key-idle'}`}
                    style={{ '--gk-color': gk.color } as React.CSSProperties}
                  >
                    <kbd className="ghost-kbd">{gk.key}</kbd>
                    <span className="ghost-label">{gk.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {isSubmit && (
          <div className="ghost-step ghost-step-enter" key="submit">
            <span className="ghost-prompt">Submit & next</span>
            <div className="ghost-keys">
              <div className={`ghost-key ghost-key-wide ${poppedKeys.has('Enter') ? 'ghost-key-popped' : 'ghost-key-idle'}`}
                   style={{ '--gk-color': '#4cb782' } as React.CSSProperties}>
                <kbd className="ghost-kbd">Enter</kbd>
                <span className="ghost-label">Submit</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{ghostStyles}</style>
    </>
  )
}

const ghostStyles = `
  .ghost-hints {
    pointer-events: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    position: relative;
  }

  /* Position: overlay — absolute over the card */
  .ghost-hints-overlay {
    position: absolute;
    inset: 0;
  }

  /* Position: above — sits above the card with spacing */
  .ghost-hints-above {
    margin-bottom: 20px;
  }

  /* Position: below — sits below the card with spacing */
  .ghost-hints-below {
    margin-top: 20px;
  }

  .ghost-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .ghost-step-enter {
    animation: ghost-step-in 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes ghost-step-in {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .ghost-prompt {
    font-size: 0.82rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    opacity: 0.6;
    animation: ghost-prompt-pulse 3s ease-in-out infinite;
  }

  @keyframes ghost-prompt-pulse {
    0%, 100% { opacity: calc(var(--ghost-opacity, 0.65) * 0.4); }
    50% { opacity: calc(var(--ghost-opacity, 0.65) * 0.75); }
  }

  .ghost-keys {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  /* ── Individual ghost key ────────────────────── */
  .ghost-key {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    transition: transform 150ms, opacity 150ms;
  }

  .ghost-key-idle {
    animation: ghost-breathe 3s ease-in-out infinite;
  }

  .ghost-key-idle:nth-child(2) { animation-delay: 200ms; }
  .ghost-key-idle:nth-child(3) { animation-delay: 400ms; }
  .ghost-key-idle:nth-child(4) { animation-delay: 600ms; }

  @keyframes ghost-breathe {
    0%, 100% {
      transform: translateY(0);
      opacity: calc(var(--ghost-opacity, 0.65) * 0.45);
    }
    50% {
      transform: translateY(-5px);
      opacity: var(--ghost-opacity, 0.65);
    }
  }

  .ghost-kbd {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 600;
    min-width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid color-mix(in srgb, var(--gk-color, var(--border-light)) 50%, transparent);
    color: var(--gk-color, var(--text-secondary));
    box-shadow:
      0 0 14px color-mix(in srgb, var(--gk-color) 12%, transparent),
      0 2px 4px rgba(0, 0, 0, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.03);
    animation: ghost-kbd-pulse 3s ease-in-out infinite;
    text-shadow: 0 0 10px color-mix(in srgb, var(--gk-color) 30%, transparent);
  }

  .ghost-key:nth-child(2) .ghost-kbd { animation-delay: 200ms; }
  .ghost-key:nth-child(3) .ghost-kbd { animation-delay: 400ms; }
  .ghost-key:nth-child(4) .ghost-kbd { animation-delay: 600ms; }

  .ghost-key-wide .ghost-kbd {
    min-width: 100px;
    padding: 0 20px;
  }

  @keyframes ghost-kbd-pulse {
    0%, 100% {
      opacity: calc(var(--ghost-opacity, 0.65) * 0.45);
      box-shadow:
        0 0 14px color-mix(in srgb, var(--gk-color) 10%, transparent),
        0 2px 4px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    50% {
      opacity: var(--ghost-opacity, 0.65);
      box-shadow:
        0 0 22px color-mix(in srgb, var(--gk-color) 20%, transparent),
        0 0 44px color-mix(in srgb, var(--gk-color) 8%, transparent),
        0 2px 4px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
  }

  .ghost-label {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-muted);
    opacity: 0.5;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* ── Pop animation on press ─────────────────── */
  .ghost-key-popped {
    animation: ghost-pop 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  .ghost-key-popped .ghost-kbd {
    animation: ghost-kbd-pop 450ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  @keyframes ghost-pop {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    25% {
      transform: scale(1.35);
      opacity: 1;
    }
    100% {
      transform: scale(1.6);
      opacity: 0;
    }
  }

  @keyframes ghost-kbd-pop {
    0% {
      background: rgba(255, 255, 255, 0.04);
      box-shadow:
        0 0 14px color-mix(in srgb, var(--gk-color) 15%, transparent),
        0 2px 4px rgba(0, 0, 0, 0.2);
    }
    25% {
      background: color-mix(in srgb, var(--gk-color) 35%, transparent);
      box-shadow:
        0 0 50px color-mix(in srgb, var(--gk-color) 55%, transparent),
        0 0 100px color-mix(in srgb, var(--gk-color) 25%, transparent);
      border-color: var(--gk-color);
    }
    100% {
      background: color-mix(in srgb, var(--gk-color) 20%, transparent);
      box-shadow:
        0 0 70px color-mix(in srgb, var(--gk-color) 45%, transparent),
        0 0 140px color-mix(in srgb, var(--gk-color) 18%, transparent);
      border-color: transparent;
    }
  }

  /* ── Light theme overrides ──────────────────── */
  [data-theme="light"] .ghost-kbd {
    background: rgba(0, 0, 0, 0.03);
    box-shadow:
      0 0 14px color-mix(in srgb, var(--gk-color) 10%, transparent),
      0 2px 4px rgba(0, 0, 0, 0.08),
      inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }
`
