import { useState, useEffect } from 'react'

interface Props {
  onComplete: () => void
}

export default function TriageCountdown({ onComplete }: Props) {
  const [value, setValue] = useState(3)

  useEffect(() => {
    if (value === 0) {
      // Show "START!" briefly then complete
      const t = setTimeout(onComplete, 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setValue(v => v - 1), 700)
    return () => clearTimeout(t)
  }, [value, onComplete])

  return (
    <>
      <div className="countdown-overlay">
        <div className="countdown-content" key={value}>
          <span className="countdown-number">
            {value === 0 ? 'START!' : value}
          </span>
        </div>
      </div>
      <style>{styles}</style>
    </>
  )
}

const styles = `
  .countdown-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    animation: countdown-fade-in 200ms ease-out;
  }

  @keyframes countdown-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .countdown-content {
    animation: countdown-pop 600ms cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  @keyframes countdown-pop {
    0% {
      opacity: 0;
      transform: scale(0.4);
    }
    40% {
      opacity: 1;
      transform: scale(1.1);
    }
    70% {
      transform: scale(0.98);
    }
    100% {
      opacity: 1;
      transform: scale(1);
    }
  }

  .countdown-number {
    font-family: var(--font-mono);
    font-size: 6rem;
    font-weight: 700;
    color: #fff;
    text-shadow:
      0 0 40px rgba(94, 106, 210, 0.6),
      0 0 80px rgba(94, 106, 210, 0.3),
      0 2px 4px rgba(0, 0, 0, 0.4);
    letter-spacing: -0.02em;
    user-select: none;
  }

  /* Light theme */
  [data-theme="light"] .countdown-overlay {
    background: rgba(255, 255, 255, 0.7);
  }
  [data-theme="light"] .countdown-number {
    color: var(--accent);
    text-shadow:
      0 0 40px rgba(94, 106, 210, 0.3),
      0 0 80px rgba(94, 106, 210, 0.15),
      0 2px 4px rgba(0, 0, 0, 0.1);
  }
`
