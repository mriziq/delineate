import { useReducer, useEffect, useState, useRef } from 'react'
import { AppContext, appReducer, initialState, saveSession, loadSession, clearSession } from './store/useAppStore'
import type { TriageSession } from './store/useAppStore'
import { checkSession } from './api/linear'
import SetupScreen from './screens/SetupScreen'
import FilterScreen from './screens/FilterScreen'
import TriageScreen from './screens/TriageScreen'
import ReviewScreen from './screens/ReviewScreen'

function ResumePrompt({
  session,
  onResume,
  onDiscard,
}: {
  session: TriageSession
  onResume: () => void
  onDiscard: () => void
}) {
  const changesWithContent = session.pendingChanges.filter(
    pc => Object.keys(pc.changes).length > 0
  )
  const ago = getTimeAgo(session.savedAt)

  return (
    <div className="overlay-backdrop">
      <div className="overlay-panel resume-panel">
        <h3 className="resume-title">Resume triage session?</h3>
        <p className="resume-desc">
          You have an unfinished session from {ago}.
        </p>
        <div className="resume-stats">
          <div className="resume-stat">
            <span className="resume-stat-value">{session.currentIndex}</span>
            <span className="resume-stat-label">of {session.issues.length} reviewed</span>
          </div>
          <div className="resume-stat">
            <span className="resume-stat-value">{changesWithContent.length}</span>
            <span className="resume-stat-label">pending changes</span>
          </div>
        </div>
        <div className="resume-actions">
          <button className="btn-primary" onClick={onResume}>
            Resume
          </button>
          <button className="btn-secondary" onClick={onDiscard}>
            Discard
          </button>
        </div>
      </div>
      <style>{`
        .resume-panel {
          max-width: 400px;
          text-align: center;
        }
        .resume-title {
          font-size: 1.125rem;
          font-weight: 300;
          letter-spacing: -0.01em;
          margin-bottom: var(--sp-2);
        }
        .resume-desc {
          font-size: 0.875rem;
          font-weight: 400;
          color: var(--text-secondary);
          margin-bottom: var(--sp-4);
        }
        .resume-stats {
          display: flex;
          justify-content: center;
          gap: var(--sp-6);
          margin-bottom: var(--sp-5);
        }
        .resume-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .resume-stat-value {
          font-size: 1.5rem;
          font-weight: 300;
          font-variant-numeric: tabular-nums;
        }
        .resume-stat-label {
          font-size: 0.72rem;
          font-weight: 400;
          color: var(--text-muted);
        }
        .resume-actions {
          display: flex;
          gap: var(--sp-3);
          justify-content: center;
        }
        .resume-actions .btn-primary,
        .resume-actions .btn-secondary {
          min-width: 100px;
        }
      `}</style>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return 'over a day ago'
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const [pendingSession, setPendingSession] = useState<TriageSession | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const stateRef = useRef(state)
  stateRef.current = state

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
  }, [state.theme])

  // Check session on mount (cookie-based auth)
  useEffect(() => {
    checkSession()
      .then(result => {
        if (result) {
          dispatch({ type: 'SET_VIEWER', viewer: result.viewer, organization: result.organization })

          const session = loadSession()
          if (session) {
            setPendingSession(session)
          } else {
            dispatch({ type: 'SET_SCREEN', screen: 'filter' })
          }
        }
        setAuthReady(true)
      })
      .catch(() => {
        setAuthReady(true)
      })
  }, [])

  // Auto-save session
  useEffect(() => {
    if (state.screen !== 'triage' && state.screen !== 'review') return
    if (state.issues.length === 0) return
    saveSession(state)
  }, [state.issues, state.currentIndex, state.pendingChanges, state.screen])

  // beforeunload warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      const s = stateRef.current
      if (
        (s.screen === 'triage' || s.screen === 'review') &&
        s.pendingChanges.some(pc => Object.keys(pc.changes).length > 0)
      ) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  // Global theme toggle (T key)
  useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if ((e.key === 't' || e.key === 'T') && !e.ctrlKey && !e.metaKey) {
        dispatch({ type: 'TOGGLE_THEME' })
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  // Toast auto-dismiss
  useEffect(() => {
    if (state.toasts.length === 0) return
    const latest = state.toasts[state.toasts.length - 1]
    const timer = setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', id: latest.id })
    }, 4000)
    return () => clearTimeout(timer)
  }, [state.toasts])

  function handleResume() {
    if (pendingSession) {
      dispatch({ type: 'RESTORE_SESSION', session: pendingSession })
    }
    setPendingSession(null)
  }

  function handleDiscard() {
    clearSession()
    setPendingSession(null)
    dispatch({ type: 'SET_SCREEN', screen: 'filter' })
  }

  function renderScreen() {
    switch (state.screen) {
      case 'setup': return <SetupScreen />
      case 'filter': return <FilterScreen />
      case 'triage': return <TriageScreen />
      case 'review': return <ReviewScreen />
    }
  }

  if (!authReady) return null

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {renderScreen()}

      {pendingSession && (
        <ResumePrompt
          session={pendingSession}
          onResume={handleResume}
          onDiscard={handleDiscard}
        />
      )}

      {state.toasts.length > 0 && (
        <div className="toast-container">
          {state.toasts.map(t => (
            <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
          ))}
        </div>
      )}
    </AppContext.Provider>
  )
}
