import { useState, useEffect, useCallback, useRef } from 'react'
import Markdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import { useApp } from '../store/useAppStore'
import AppHeader from '../components/AppHeader'
import IssueCard from '../components/IssueCard'
import ShortcutBar from '../components/ShortcutBar'
import EstimatePicker from '../components/EstimatePicker'
import LabelPicker from '../components/LabelPicker'
import AssigneePicker from '../components/AssigneePicker'
import ProjectPicker from '../components/ProjectPicker'
import CheatsheetModal from '../components/CheatsheetModal'
import GhostKeyHints from '../components/GhostKeyHints'
import GhostKeyConfigModal from '../components/GhostKeyConfigModal'
import TriageCountdown from '../components/TriageCountdown'
import StateIcon from '../components/StateIcon'
import {
  fetchTeams, fetchTeamDetails, fetchIssues, fetchIssueCount,
  fetchViewerTeams, fetchAllTeamsData, logout,
} from '../api/linear'
import type { FilterConfig, GhostKeyPosition, GhostStepConfig } from '../api/types'
import { DEFAULT_GHOST_STEPS } from '../api/types'

// ── Shared constants ─────────────────────────────────────
const PRIORITY_FLASH_COLORS: Record<number, string> = {
  0: '#6b7280', 1: '#eb5757', 2: '#f2994a', 3: '#f2c94c', 4: '#4cb782',
}
const PRIORITY_LABELS: Record<number, string> = {
  0: 'None', 1: 'Urgent', 2: 'High', 3: 'Medium', 4: 'Low',
}

function buildFilter(config: FilterConfig, stateIds: string[], viewerId?: string) {
  const filter: Record<string, unknown> = {}
  if (config.mode === 'my-issues') {
    if (viewerId) filter.assignee = { id: { eq: viewerId } }
  } else {
    filter.team = { id: { eq: config.teamId } }
    if (config.assigneeId === '__unassigned__') filter.assignee = { null: true }
    else if (config.assigneeId) filter.assignee = { id: { eq: config.assigneeId } }
  }
  if (config.projectIds.length > 0) filter.project = { id: { in: config.projectIds } }
  if (stateIds.length > 0) filter.state = { id: { in: stateIds } }
  if (config.unestimatedOnly) filter.estimate = { null: true }
  return filter
}

// ══════════════════════════════════════════════════════════
// WorkspaceScreen — unified filter sidebar + triage main
// ══════════════════════════════════════════════════════════

export default function WorkspaceScreen() {
  const { state, dispatch } = useApp()
  const { issues, currentIndex, pendingChanges, activeOverlay, availableLabels, availableMembers, availableProjects, filterConfig, selectedTeam } = state

  // ── Filter state ───────────────────────────────────────
  const [booting, setBooting] = useState(true)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [issueCount, setIssueCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')

  // ── Layout state ───────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filtersLocked, setFiltersLocked] = useState(issues.length > 0)
  const [issuesLoaded, setIssuesLoaded] = useState(issues.length > 0)
  type CascadePhase = 'idle' | 'loading' | 'cascading' | 'countdown' | 'active'
  const [cascadePhase, setCascadePhase] = useState<CascadePhase>(issues.length > 0 ? 'active' : 'idle')

  // ── Triage card state ──────────────────────────────────
  const currentIssue = issues[currentIndex]
  const currentPending = pendingChanges.find(p => p.issueId === currentIssue?.id)

  const [enterFrom, setEnterFrom] = useState<'right' | 'left'>('right')
  const [exiting, setExiting] = useState<'right' | 'left' | 'submit' | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [cardKey, setCardKey] = useState(0)

  const [flash, setFlash] = useState<{ color: string; key: number } | null>(null)
  const flashCounter = useRef(0)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [ghostKeyPosition, setGhostKeyPosition] = useState<GhostKeyPosition>(
    () => (localStorage.getItem('ghostKeyPosition') as GhostKeyPosition) || 'overlay'
  )
  const [ghostSteps, setGhostSteps] = useState<GhostStepConfig[]>(() => {
    try {
      const saved = localStorage.getItem('ghostSteps')
      return saved ? JSON.parse(saved) : DEFAULT_GHOST_STEPS
    } catch { return DEFAULT_GHOST_STEPS }
  })
  const [ghostOpacity, setGhostOpacity] = useState<number>(
    () => Number(localStorage.getItem('ghostOpacity')) || 65
  )
  const [reviewBounce, setReviewBounce] = useState(0)
  const prevPendingCount = useRef(pendingChanges.length)

  const mode = filterConfig.mode

  // ── Boot: fetch teams ──────────────────────────────────
  useEffect(() => {
    async function boot() {
      try {
        const teams = await fetchTeams()
        dispatch({ type: 'SET_TEAMS', teams })
      } catch (err) {
        if (err instanceof Error && err.message === 'UNAUTHORIZED')
          dispatch({ type: 'SET_SCREEN', screen: 'setup' })
      } finally {
        setBooting(false)
      }
    }
    boot()
  }, [dispatch])

  // ── Load team data for my-issues mode ──────────────────
  useEffect(() => {
    if (mode !== 'my-issues') return
    let cancelled = false
    setLoadingTeam(true)
    async function loadMyData() {
      try {
        const viewerTeams = await fetchViewerTeams()
        if (cancelled) return
        const data = await fetchAllTeamsData(viewerTeams.map(t => t.id))
        if (cancelled) return
        dispatch({ type: 'SET_TEAM_DATA', ...data })
      } catch (err) { console.error(err) }
      finally { if (!cancelled) setLoadingTeam(false) }
    }
    loadMyData()
    return () => { cancelled = true }
  }, [mode, dispatch])

  // ── Team select ────────────────────────────────────────
  async function handleTeamSelect(teamId: string) {
    const team = state.teams.find(t => t.id === teamId)
    if (!team) return
    dispatch({ type: 'SET_SELECTED_TEAM', team })
    setLoadingTeam(true)
    try {
      const details = await fetchTeamDetails(teamId)
      dispatch({ type: 'SET_TEAM_DATA', ...details })
    } catch (err) { console.error(err) }
    finally { setLoadingTeam(false) }
  }

  // ── Issue count (debounced) ────────────────────────────
  const getSelectedStateIds = useCallback(() => {
    return state.availableStates
      .filter(s => filterConfig.states.includes(s.type.toLowerCase()))
      .map(s => s.id)
  }, [state.availableStates, filterConfig.states])

  const canQuery = mode === 'my-issues' ? !loadingTeam : !!filterConfig.teamId

  useEffect(() => {
    if (!canQuery || filtersLocked) return
    setCountLoading(true)
    const stateIds = getSelectedStateIds()
    const filter = buildFilter(filterConfig, stateIds, state.viewer?.id)
    const timer = setTimeout(async () => {
      try { setIssueCount(await fetchIssueCount(filter)) }
      catch { setIssueCount(null) }
      finally { setCountLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [filterConfig, state.viewer?.id, getSelectedStateIds, canQuery, filtersLocked])

  // ── Load issues + cascade ──────────────────────────────
  async function handleLoadIssues() {
    setCascadePhase('loading')
    const stateIds = getSelectedStateIds()
    const filter = buildFilter(filterConfig, stateIds, state.viewer?.id)
    try {
      const fetched = await fetchIssues(filter)
      dispatch({ type: 'SET_ISSUES', issues: fetched })
      setIssuesLoaded(true)
      setFiltersLocked(true)
      if (fetched.length > 0) {
        setCascadePhase('cascading')
        setTimeout(() => setCascadePhase('countdown'), 700)
      } else {
        setCascadePhase('active')
      }
    } catch (err) {
      dispatch({ type: 'ADD_TOAST', message: 'Failed to load issues', toastType: 'error' })
      console.error(err)
      setCascadePhase('idle')
    }
  }

  // ── Re-scope (unlock filters) ──────────────────────────
  function handleUnlockFilters() {
    const hasChanges = pendingChanges.some(pc => Object.keys(pc.changes).length > 0)
    if (hasChanges && !window.confirm('You have pending changes that will be lost. Re-scope?')) return
    setFiltersLocked(false)
    setIssuesLoaded(false)
    setCascadePhase('idle')
    setSidebarOpen(true)
    dispatch({ type: 'SET_ISSUES', issues: [] })
    setIssueCount(null)
  }

  // ── Filter helpers ─────────────────────────────────────
  const toggleState = (stateType: string) => {
    const current = filterConfig.states
    const next = current.includes(stateType) ? current.filter(s => s !== stateType) : [...current, stateType]
    dispatch({ type: 'SET_FILTER', filterConfig: { states: next } })
  }
  const toggleProject = (projectId: string) => {
    const current = filterConfig.projectIds
    const next = current.includes(projectId) ? current.filter(id => id !== projectId) : [...current, projectId]
    dispatch({ type: 'SET_FILTER', filterConfig: { projectIds: next } })
  }
  function setMode(newMode: 'my-issues' | 'team') {
    dispatch({ type: 'SET_FILTER', filterConfig: { mode: newMode, projectIds: [], assigneeId: null } })
    setIssueCount(null)
  }

  const showFilters = mode === 'my-issues' ? !loadingTeam : !!selectedTeam && !loadingTeam
  const filteredProjects = availableProjects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
  const showProjectSearch = availableProjects.length > 8

  // ── Triage: card key tracking ──────────────────────────
  const prevIndex = useRef(currentIndex)
  useEffect(() => {
    if (currentIndex !== prevIndex.current) { setCardKey(k => k + 1); prevIndex.current = currentIndex }
  }, [currentIndex])

  // ── Triage: review badge bounce ────────────────────────
  useEffect(() => {
    if (pendingChanges.length > prevPendingCount.current) setReviewBounce(n => n + 1)
    prevPendingCount.current = pendingChanges.length
  }, [pendingChanges.length])

  function triggerFlash(priority: number) {
    flashCounter.current++
    setFlash({ color: PRIORITY_FLASH_COLORS[priority], key: flashCounter.current })
    setTimeout(() => setFlash(null), 400)
  }

  const getCurrentLabelIds = useCallback(() => {
    if (!currentIssue) return []
    return currentPending?.changes.labelIds ?? currentIssue.labels.nodes.map(l => l.id)
  }, [currentIssue, currentPending])

  const getCurrentAssigneeId = useCallback(() => {
    if (!currentIssue) return null
    return currentPending?.changes.assigneeId !== undefined ? currentPending.changes.assigneeId : currentIssue.assignee?.id ?? null
  }, [currentIssue, currentPending])

  const getCurrentProjectId = useCallback(() => {
    if (!currentIssue) return null
    return currentPending?.changes.projectId !== undefined ? currentPending.changes.projectId : currentIssue.project?.id ?? null
  }, [currentIssue, currentPending])

  const getCurrentEstimate = useCallback(() => {
    if (!currentIssue) return null
    return currentPending?.changes.estimate !== undefined ? currentPending.changes.estimate : currentIssue.estimate ?? null
  }, [currentIssue, currentPending])

  // ── Triage: keyboard handler ───────────────────────────
  const triageActive = issuesLoaded && issues.length > 0 && cascadePhase === 'active' && !!currentIssue

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!triageActive) return
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

    if (drawerOpen && e.key === 'Escape') { setDrawerOpen(false); return }
    if (activeOverlay === 'detail' && e.key === 'Escape') { dispatch({ type: 'CLOSE_OVERLAY' }); return }
    if (activeOverlay && activeOverlay !== 'cheatsheet' && activeOverlay !== 'detail') return

    const key = e.key
    if (key === 'r' || key === 'R') { setDrawerOpen(o => !o); return }
    if (key === ' ' || key === 'Enter') {
      e.preventDefault(); if (exiting) return
      setEnterFrom('right'); setExiting('submit')
      if (exitTimer.current) clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => { setExiting(null); dispatch({ type: 'ADVANCE_CARD' }) }, 350)
      return
    }
    if (key === 'ArrowRight') {
      e.preventDefault(); if (exiting) return
      setEnterFrom('right'); setExiting('right')
      if (exitTimer.current) clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => { setExiting(null); dispatch({ type: 'ADVANCE_CARD' }) }, 280)
      return
    }
    if (key === 'ArrowLeft') {
      e.preventDefault(); if (exiting) return
      setEnterFrom('left'); setExiting('left')
      if (exitTimer.current) clearTimeout(exitTimer.current)
      exitTimer.current = setTimeout(() => { setExiting(null); dispatch({ type: 'GO_BACK' }) }, 280)
      return
    }
    if (key === 'o' || key === 'O') {
      if (activeOverlay === 'detail') dispatch({ type: 'CLOSE_OVERLAY' })
      else dispatch({ type: 'OPEN_OVERLAY', overlay: 'detail' })
      return
    }
    if (key >= '1' && key <= '4') {
      const value = parseInt(key)
      dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue!.id, field: 'priority', value })
      triggerFlash(value); return
    }
    if (key === 'e' || key === 'E') { dispatch({ type: 'OPEN_OVERLAY', overlay: 'estimate' }); return }
    if (key === 'l' || key === 'L') { dispatch({ type: 'OPEN_OVERLAY', overlay: 'label' }); return }
    if (key === 'a' || key === 'A') { dispatch({ type: 'OPEN_OVERLAY', overlay: 'assignee' }); return }
    if (key === 'p' || key === 'P') { dispatch({ type: 'OPEN_OVERLAY', overlay: 'project' }); return }
    if (key === 'z' || key === 'Z') { dispatch({ type: 'UNDO_CHANGE', issueId: currentIssue!.id }); return }
    if (key === '?') {
      if (activeOverlay === 'cheatsheet') dispatch({ type: 'CLOSE_OVERLAY' })
      else dispatch({ type: 'OPEN_OVERLAY', overlay: 'cheatsheet' })
      return
    }
    if (key === 'Escape') { dispatch({ type: 'CLOSE_OVERLAY' }); return }
  }, [triageActive, currentIssue, activeOverlay, dispatch, exiting, drawerOpen])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [handleKey])

  // ── Sidebar collapse shortcut [ ────────────────────────
  useEffect(() => {
    function handleSidebarKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === '[' && filtersLocked && !triageActive) setSidebarOpen(o => !o)
    }
    document.addEventListener('keydown', handleSidebarKey)
    return () => document.removeEventListener('keydown', handleSidebarKey)
  }, [filtersLocked])

  // ── End-of-deck detection ──────────────────────────────
  if (issuesLoaded && issues.length > 0 && !currentIssue) {
    dispatch({ type: 'SET_SCREEN', screen: 'review' })
    return null
  }

  // ── Derived ────────────────────────────────────────────
  const changesWithContent = pendingChanges.filter(pc => Object.keys(pc.changes).length > 0)
  const scopeLabel = filterConfig.mode === 'my-issues' ? 'My Issues' : selectedTeam ? selectedTeam.name : 'Team'
  const stateLabels = filterConfig.states.map(s => s === 'unstarted' ? 'Not Started' : s.charAt(0).toUpperCase() + s.slice(1))
  const nextIssue = issues[currentIndex + 1]
  const nextNextIssue = issues[currentIndex + 2]

  // ── Button label ───────────────────────────────────────
  const triageBtnLabel = cascadePhase === 'loading'
    ? 'Loading...'
    : countLoading ? 'Counting...'
    : issueCount === 0 ? 'No issues match'
    : issueCount !== null ? `Triage ${issueCount} issue${issueCount !== 1 ? 's' : ''} \u2192`
    : 'Triage \u2192'

  if (booting) return <div className="ws"><p className="ws-loading">Loading workspace...</p></div>

  // ═══════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════
  return (
    <div className="ws">
      {/* Priority flash */}
      {flash && <div key={flash.key} className="priority-flash" style={{ '--flash-color': flash.color } as React.CSSProperties} />}

      {/* ── Header ──────────────────────────────────────── */}
      <div className="ws-header">
        <div className="ws-header-left">
          <AppHeader />
          {state.viewer?.name && <span className="ws-greeting">Hey {state.viewer.name.split(' ')[0]}</span>}
          {triageActive && (
            <button className="btn-secondary ws-change-filters-btn" onClick={handleUnlockFilters}>Change Filters</button>
          )}
        </div>
        <div className="ws-header-center">
          {triageActive && (
            <div className="ws-scope-chips">
              <span className="scope-chip scope-chip-primary">{scopeLabel}</span>
              {stateLabels.map(s => <span key={s} className="scope-chip">{s}</span>)}
              {filterConfig.unestimatedOnly && <span className="scope-chip">Unestimated</span>}
            </div>
          )}
        </div>
        <div className="ws-header-right">
          {triageActive && (
            <>
              <div className="ws-progress">
                <div className="ws-progress-bar">
                  <div className="ws-progress-fill" style={{ width: `${((currentIndex + 1) / issues.length) * 100}%` }} />
                </div>
                <span className="ws-progress-label">{currentIndex + 1}/{issues.length}</span>
              </div>
              <button
                className={`btn-secondary ws-review-btn ${drawerOpen ? 'ws-review-btn-active' : ''}`}
                onClick={() => setDrawerOpen(o => !o)}
              >
                Review
                {changesWithContent.length > 0 && (
                  <span key={reviewBounce} className="ws-review-badge">{changesWithContent.length}</span>
                )}
              </button>
            </>
          )}
          {triageActive && (
            <button className="btn-secondary ws-ghost-config" onClick={() => dispatch({ type: 'OPEN_OVERLAY', overlay: 'ghost-config' })} title="Ghost key settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          )}
          <button className="btn-secondary ws-logout" onClick={async () => { await logout(); dispatch({ type: 'SET_SCREEN', screen: 'setup' }) }}>
            Disconnect
          </button>
        </div>
      </div>

      {/* ── Body: sidebar + main ────────────────────────── */}
      <div className="ws-body">
        {/* Sidebar — hidden during triage */}
        <div className={`ws-sidebar ${triageActive ? 'ws-sidebar-collapsed' : sidebarOpen ? '' : 'ws-sidebar-collapsed'} ${filtersLocked ? 'ws-sidebar-locked' : ''}`}>
          <div className="ws-sidebar-content">
            {loadingTeam && <p className="ws-sidebar-loading">Loading{mode === 'my-issues' ? ' teams' : ' team'}...</p>}

            {/* Source */}
            <label className="sb-title">Source</label>
            <div className="sb-list">
              <button className={`sb-row ${mode === 'my-issues' ? 'sb-row-active' : ''}`} onClick={() => !filtersLocked && setMode('my-issues')}>
                <span className={`chip-radio ${mode === 'my-issues' ? 'chip-radio-checked' : ''}`} />
                <div className="sb-row-text">
                  <span className="sb-row-label">My Issues</span>
                  <span className="sb-row-desc">Across all teams</span>
                </div>
              </button>
              <button className={`sb-row ${mode === 'team' ? 'sb-row-active' : ''}`} onClick={() => !filtersLocked && setMode('team')}>
                <span className={`chip-radio ${mode === 'team' ? 'chip-radio-checked' : ''}`} />
                <div className="sb-row-text">
                  <span className="sb-row-label">By Team</span>
                  <span className="sb-row-desc">Specific team</span>
                </div>
              </button>
            </div>

            {mode === 'team' && (
              <>
                <label className="sb-title" style={{ marginTop: 'var(--sp-4)' }}>Team</label>
                <div className="sb-list">
                  {state.teams.map(t => (
                    <button key={t.id} className={`sb-item ${filterConfig.teamId === t.id ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && handleTeamSelect(t.id)}>
                      <span className={`chip-radio ${filterConfig.teamId === t.id ? 'chip-radio-checked' : ''}`} />
                      <span className="sb-item-name">{t.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {mode === 'team' && selectedTeam && !loadingTeam && (
              <>
                <label className="sb-title" style={{ marginTop: 'var(--sp-4)' }}>Assignee</label>
                <div className="sb-list">
                  {[
                    { id: '__anyone__', label: 'Anyone' },
                    { id: '__me__', label: 'Just me' },
                    { id: '__unassigned__', label: 'Unassigned' },
                    ...availableMembers.filter(m => m.id !== state.viewer?.id).map(m => ({ id: m.id, label: m.displayName || m.name })),
                  ].map(opt => {
                    const resolvedId = opt.id === '__anyone__' ? null : opt.id === '__me__' ? (state.viewer?.id ?? null) : opt.id
                    const isActive = filterConfig.assigneeId === resolvedId
                    return (
                      <button key={opt.id} className={`sb-item ${isActive ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && dispatch({ type: 'SET_FILTER', filterConfig: { assigneeId: resolvedId } })}>
                        <span className={`chip-radio ${isActive ? 'chip-radio-checked' : ''}`} />
                        <span className="sb-item-name">{opt.label}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Workflow State */}
            {showFilters && (
              <>
                <label className="sb-title" style={{ marginTop: 'var(--sp-4)' }}>Workflow State</label>
                <div className="sb-list">
                  {['backlog', 'unstarted', 'started'].map(s => {
                    const isActive = filterConfig.states.includes(s)
                    return (
                      <button key={s} className={`sb-item ${isActive ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && toggleState(s)}>
                        <span className={`chip-checkbox ${isActive ? 'chip-checkbox-checked' : ''}`}>{isActive && <span className="chip-check-icon">&#10003;</span>}</span>
                        <span className="sb-item-name">{s === 'unstarted' ? 'Not Started' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
                      </button>
                    )
                  })}
                </div>

                <label className="sb-title" style={{ marginTop: 'var(--sp-4)' }}>Has Estimate?</label>
                <div className="sb-list">
                  <button className={`sb-item ${!filterConfig.unestimatedOnly ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && dispatch({ type: 'SET_FILTER', filterConfig: { unestimatedOnly: false } })}>
                    <span className={`chip-radio ${!filterConfig.unestimatedOnly ? 'chip-radio-checked' : ''}`} />
                    <span className="sb-item-name">Any</span>
                  </button>
                  <button className={`sb-item ${filterConfig.unestimatedOnly ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && dispatch({ type: 'SET_FILTER', filterConfig: { unestimatedOnly: true } })}>
                    <span className={`chip-radio ${filterConfig.unestimatedOnly ? 'chip-radio-checked' : ''}`} />
                    <span className="sb-item-name">Missing only</span>
                  </button>
                </div>
              </>
            )}

            {/* Projects */}
            {showFilters && availableProjects.length > 0 && (
              <>
                <label className="sb-title" style={{ marginTop: 'var(--sp-4)' }}>
                  Projects <span className="sb-hint">{filterConfig.projectIds.length === 0 ? `all ${availableProjects.length}` : `${filterConfig.projectIds.length} of ${availableProjects.length}`}</span>
                </label>
                {showProjectSearch && (
                  <input className="input sb-search" placeholder="Search..." value={projectSearch} onChange={e => setProjectSearch(e.target.value)} disabled={filtersLocked} />
                )}
                <div className="sb-list">
                  <button className={`sb-item ${filterConfig.projectIds.length === 0 ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && dispatch({ type: 'SET_FILTER', filterConfig: { projectIds: [] } })}>
                    <span className={`chip-radio ${filterConfig.projectIds.length === 0 ? 'chip-radio-checked' : ''}`} />
                    <span className="sb-item-name">All projects</span>
                  </button>
                  <div className="sb-divider" />
                  {filteredProjects.map(p => {
                    const isActive = filterConfig.projectIds.includes(p.id)
                    return (
                      <button key={p.id} className={`sb-item ${isActive ? 'sb-item-active' : ''}`} onClick={() => !filtersLocked && toggleProject(p.id)}>
                        <span className={`chip-checkbox ${isActive ? 'chip-checkbox-checked' : ''}`}>{isActive && <span className="chip-check-icon">&#10003;</span>}</span>
                        <span className="sb-item-name">{p.name}</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Sidebar footer */}
          <div className="ws-sidebar-footer">
            {filtersLocked ? (
              <button className="btn-secondary ws-sidebar-btn" onClick={handleUnlockFilters}>Change filters</button>
            ) : (
              <button
                className="btn-primary ws-sidebar-btn"
                onClick={handleLoadIssues}
                disabled={cascadePhase === 'loading' || issueCount === 0 || !showFilters}
              >
                {triageBtnLabel}
              </button>
            )}
          </div>
        </div>

        {/* Sidebar collapse tab (visible when collapsed, hidden during triage) */}
        {!triageActive && !sidebarOpen && filtersLocked && (
          <button className="ws-sidebar-tab" onClick={() => setSidebarOpen(true)} aria-label="Show filters">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 4l4 4-4 4"/></svg>
          </button>
        )}

        {/* ── Main area ─────────────────────────────────── */}
        <div className="ws-main">
          {/* Before issues loaded: gamified prompt */}
          {!issuesLoaded && cascadePhase !== 'loading' && (
            <div className="ws-prompt">
              <div className="ws-prompt-radar">
                <div className="radar-ring radar-ring-1" />
                <div className="radar-ring radar-ring-2" />
                <div className="radar-ring radar-ring-3" />
                <div className="radar-sweep" />
                <div className="radar-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
              </div>
              <h2 className="ws-prompt-title">Waiting for your signal</h2>
              <p className="ws-prompt-desc">
                Pick your filters to lock on — issues are out there waiting to be triaged.
              </p>
              <div className="ws-prompt-hints">
                <span className="ws-hint ws-hint-1">
                  <span className="ws-hint-dot" />Team
                </span>
                <span className="ws-hint-arrow">→</span>
                <span className="ws-hint ws-hint-2">
                  <span className="ws-hint-dot" />State
                </span>
                <span className="ws-hint-arrow">→</span>
                <span className="ws-hint ws-hint-3">
                  <span className="ws-hint-dot" />Go
                </span>
              </div>
            </div>
          )}

          {/* Loading shimmer */}
          {cascadePhase === 'loading' && (
            <div className="ws-shimmer-wrap">
              <div className="ws-shimmer-card" />
            </div>
          )}

          {/* Inbox zero */}
          {issuesLoaded && issues.length === 0 && cascadePhase === 'active' && (
            <>
              <div className="empty-confetti" aria-hidden="true">
                {Array.from({ length: 40 }, (_, i) => (
                  <div key={i} className="empty-confetti-piece" style={{
                    '--x': `${Math.random() * 100}%`, '--delay': `${Math.random() * 600}ms`,
                    '--duration': `${1200 + Math.random() * 800}ms`,
                    '--color': ['#5e6ad2','#4cb782','#f2c94c','#a78bfa','#f472b6','#f2994a'][i % 6],
                    '--rotation': `${Math.random() * 360}deg`, '--size': `${4 + Math.random() * 5}px`,
                    '--drift': `${-25 + Math.random() * 50}px`,
                  } as React.CSSProperties} />
                ))}
              </div>
              <div className="triage-empty">
                <div className="empty-icon">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="empty-checkmark">
                    <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="2" className="empty-circle" />
                    <path d="M18 29l7 7 13-15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="empty-check" />
                  </svg>
                </div>
                <h2 className="empty-title">You're all caught up</h2>
                <p className="empty-subtitle">No issues match your current filters — inbox zero!</p>
                <div className="empty-actions">
                  <button className="btn-primary" onClick={handleUnlockFilters}>Adjust filters</button>
                  <a href="https://linear.app" target="_blank" rel="noopener noreferrer" className="btn-secondary">Open Linear &rarr;</a>
                </div>
              </div>
            </>
          )}

          {/* Card stack (triage mode) */}
          {issuesLoaded && issues.length > 0 && currentIssue && (
            <div className={`ws-card-area ${drawerOpen ? 'ws-card-area-shifted' : ''} ${cascadePhase === 'cascading' ? 'ws-card-area-entering' : ''}`}>
              <div className="card-column">
                {triageActive && ghostKeyPosition === 'above' && (
                  <GhostKeyHints
                    pending={{
                      priority: currentPending?.changes.priority !== undefined,
                      estimate: currentPending?.changes.estimate !== undefined,
                      labelIds: currentPending?.changes.labelIds !== undefined,
                      assigneeId: currentPending?.changes.assigneeId !== undefined,
                      projectId: currentPending?.changes.projectId !== undefined,
                    }}
                    overlayOpen={activeOverlay !== null}
                    cardKey={cardKey}
                    position={ghostKeyPosition}
                    steps={ghostSteps}
                    opacity={ghostOpacity}
                  />
                )}
                <div className="card-stack" style={{ position: 'relative' }}>
                  {triageActive && ghostKeyPosition === 'overlay' && (
                    <GhostKeyHints
                      pending={{
                        priority: currentPending?.changes.priority !== undefined,
                        estimate: currentPending?.changes.estimate !== undefined,
                        labelIds: currentPending?.changes.labelIds !== undefined,
                        assigneeId: currentPending?.changes.assigneeId !== undefined,
                        projectId: currentPending?.changes.projectId !== undefined,
                      }}
                      overlayOpen={activeOverlay !== null}
                      cardKey={cardKey}
                      position={ghostKeyPosition}
                      steps={ghostSteps}
                    />
                  )}
                  {nextNextIssue && <div className={`stack-card stack-card-2 ${cascadePhase === 'cascading' ? 'cascade-2' : ''}`} />}
                  {nextIssue && <div className={`stack-card stack-card-1 ${cascadePhase === 'cascading' ? 'cascade-1' : ''}`} />}
                  <div
                    key={cardKey}
                    className={`triage-card-wrapper ${
                      cascadePhase === 'cascading' ? 'cascade-top' :
                      exiting === 'right' ? 'card-exit-right' :
                      exiting === 'left' ? 'card-exit-left' :
                      exiting === 'submit' ? 'card-submit-glow' :
                      enterFrom === 'right' ? 'card-enter-right' : 'card-enter-left'
                    }`}
                  >
                    <IssueCard issue={currentIssue} pending={currentPending} availableLabels={availableLabels} onClick={() => dispatch({ type: 'OPEN_OVERLAY', overlay: 'detail' })} />
                  </div>
                </div>
                {triageActive && ghostKeyPosition === 'below' && (
                  <GhostKeyHints
                    pending={{
                      priority: currentPending?.changes.priority !== undefined,
                      estimate: currentPending?.changes.estimate !== undefined,
                      labelIds: currentPending?.changes.labelIds !== undefined,
                      assigneeId: currentPending?.changes.assigneeId !== undefined,
                      projectId: currentPending?.changes.projectId !== undefined,
                    }}
                    overlayOpen={activeOverlay !== null}
                    cardKey={cardKey}
                    position={ghostKeyPosition}
                    steps={ghostSteps}
                    opacity={ghostOpacity}
                  />
                )}
              </div>
            </div>
          )}

          {/* Review drawer */}
          {triageActive && (
            <div className={`review-drawer ${drawerOpen ? 'review-drawer-open' : ''}`}>
              <div className="drawer-header">
                <h3 className="drawer-title">Pending Changes</h3>
                <button className="btn-secondary drawer-review-all" onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'review' })}>Review Mode &rarr;</button>
              </div>
              {changesWithContent.length === 0 ? (
                <p className="drawer-empty">No changes yet. Edit fields on cards and they'll appear here.</p>
              ) : (
                <div className="drawer-list">
                  {changesWithContent.map(pc => {
                    const issueIdx = issues.findIndex(i => i.id === pc.issueId)
                    return (
                      <button key={pc.issueId} className={`drawer-row ${issueIdx === currentIndex ? 'drawer-row-active' : ''}`}
                        onClick={() => { if (issueIdx >= 0) { setEnterFrom(issueIdx > currentIndex ? 'right' : 'left'); dispatch({ type: 'JUMP_TO_ISSUE', index: issueIdx }) } }}>
                        <span className="drawer-row-id">{pc.identifier}</span>
                        <span className="drawer-row-title">{pc.title}</span>
                        <div className="drawer-row-changes">
                          {Object.keys(pc.changes).map(f => (
                            <span key={f} className="drawer-change-chip">
                              {f === 'priority' ? PRIORITY_LABELS[pc.changes.priority!] : f === 'estimate' ? `${pc.changes.estimate ?? '—'}pt` : f === 'labelIds' ? 'Labels' : f === 'assigneeId' ? 'Assignee' : f === 'projectId' ? 'Project' : f}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Countdown overlay ─────────────────────────── */}
      {cascadePhase === 'countdown' && (
        <TriageCountdown onComplete={() => setCascadePhase('active')} />
      )}

      {/* ── Overlays ────────────────────────────────────── */}
      {triageActive && activeOverlay === 'detail' && (
        <div className="overlay-backdrop" onClick={() => dispatch({ type: 'CLOSE_OVERLAY' })}>
          <div className="detail-panel" onClick={e => e.stopPropagation()}>
            <div className="detail-header">
              <div>
                <span className="card-identifier">{currentIssue!.identifier}</span>
                {currentIssue!.project && <span className="chip" style={{ marginLeft: 8 }}>{currentIssue!.project.name}</span>}
                <span className="chip state-pill" style={{ marginLeft: 4, borderColor: currentIssue!.state.color }}><StateIcon type={currentIssue!.state.type} color={currentIssue!.state.color} size={12} />{currentIssue!.state.name}</span>
              </div>
              <button className="btn-secondary detail-close" onClick={() => dispatch({ type: 'CLOSE_OVERLAY' })}>Esc</button>
            </div>
            <h2 className="detail-title">{currentIssue!.title}</h2>
            {currentIssue!.description && <div className="detail-description"><Markdown rehypePlugins={[rehypeSanitize]}>{currentIssue!.description}</Markdown></div>}
            <div className="card-divider" style={{ margin: '16px 0' }} />
            <div className="card-fields">
              <div className={`card-field ${currentPending?.changes.priority !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Priority</span>
                <span className="chip" style={{ borderColor: `var(--priority-${['none','urgent','high','medium','low'][currentPending?.changes.priority ?? currentIssue!.priority]})`, color: `var(--priority-${['none','urgent','high','medium','low'][currentPending?.changes.priority ?? currentIssue!.priority]})` }}>
                  {['No priority','Urgent','High','Medium','Low'][currentPending?.changes.priority ?? currentIssue!.priority]}
                </span>
              </div>
              <div className={`card-field ${currentPending?.changes.estimate !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Estimate</span>
                <span className="chip">{(currentPending?.changes.estimate !== undefined ? currentPending.changes.estimate : currentIssue!.estimate) ?? '—'}</span>
              </div>
              <div className={`card-field ${currentPending?.changes.labelIds !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Labels</span>
                <div className="card-labels">
                  {(currentPending?.changes.labelIds ?? currentIssue!.labels.nodes.map(l => l.id))
                    .map(id => availableLabels.find(l => l.id === id) || currentIssue!.labels.nodes.find(l => l.id === id))
                    .filter(Boolean)
                    .map(l => l && <span key={l.id} className="chip label-chip" style={{ background: `${l.color}1f`, borderColor: `${l.color}40`, color: l.color }}><span className="dot" style={{ background: l.color }} />{l.name}</span>)}
                </div>
              </div>
              <div className={`card-field ${currentPending?.changes.assigneeId !== undefined ? 'field-changed' : ''}`}>
                <span className="field-label">Assignee</span>
                <span className="chip">{currentIssue!.assignee?.displayName || currentIssue!.assignee?.name || 'Unassigned'}</span>
              </div>
            </div>
            <div className="detail-footer"><a href={currentIssue!.url} target="_blank" rel="noopener noreferrer" className="btn-secondary">Open in Linear &rarr;</a></div>
          </div>
        </div>
      )}

      {triageActive && activeOverlay === 'estimate' && (
        <EstimatePicker currentEstimate={getCurrentEstimate()} onSelect={v => { dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue!.id, field: 'estimate', value: v }); dispatch({ type: 'CLOSE_OVERLAY' }) }} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      )}
      {triageActive && activeOverlay === 'label' && (
        <LabelPicker labels={availableLabels} selectedIds={getCurrentLabelIds()} onToggle={labelId => { const cur = getCurrentLabelIds(); dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue!.id, field: 'labelIds', value: cur.includes(labelId) ? cur.filter(id => id !== labelId) : [...cur, labelId] }) }} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      )}
      {triageActive && activeOverlay === 'assignee' && (
        <AssigneePicker members={availableMembers} currentAssigneeId={getCurrentAssigneeId()} onSelect={id => { dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue!.id, field: 'assigneeId', value: id }); dispatch({ type: 'CLOSE_OVERLAY' }) }} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      )}
      {triageActive && activeOverlay === 'project' && (
        <ProjectPicker projects={availableProjects} currentProjectId={getCurrentProjectId()} onSelect={id => { dispatch({ type: 'APPLY_CHANGE', issueId: currentIssue!.id, field: 'projectId', value: id }); dispatch({ type: 'CLOSE_OVERLAY' }) }} onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />
      )}
      {triageActive && activeOverlay === 'cheatsheet' && <CheatsheetModal onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })} />}
      {triageActive && activeOverlay === 'ghost-config' && (
        <GhostKeyConfigModal
          position={ghostKeyPosition}
          steps={ghostSteps}
          opacity={ghostOpacity}
          onPositionChange={pos => { setGhostKeyPosition(pos); localStorage.setItem('ghostKeyPosition', pos) }}
          onStepsChange={s => { setGhostSteps(s); localStorage.setItem('ghostSteps', JSON.stringify(s)) }}
          onOpacityChange={v => { setGhostOpacity(v); localStorage.setItem('ghostOpacity', String(v)) }}
          onClose={() => dispatch({ type: 'CLOSE_OVERLAY' })}
        />
      )}
      {triageActive && <ShortcutBar activeOverlay={activeOverlay} />}

      <style>{workspaceStyles}</style>
    </div>
  )
}

// ══════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════

const workspaceStyles = `
  .ws {
    height: 100%;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  .ws-loading {
    color: var(--text-secondary);
    text-align: center;
    margin-top: 40vh;
  }

  /* ── Header ─────────────────────────────────────── */
  .ws-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
    gap: var(--sp-3);
    z-index: 2;
  }
  .ws-header-left {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-shrink: 0;
  }
  .ws-greeting {
    font-size: 0.875rem;
    font-weight: 400;
    color: var(--text-secondary);
  }
  .ws-change-filters-btn {
    font-size: 0.75rem;
    padding: 4px 12px;
  }
  .ws-header-center {
    flex: 1;
    display: flex;
    justify-content: center;
    min-width: 0;
  }
  .ws-scope-chips {
    display: flex;
    align-items: center;
    gap: var(--sp-1);
    flex-wrap: wrap;
    justify-content: center;
  }
  .scope-chip {
    font-size: 0.72rem;
    padding: 2px 7px;
    border-radius: var(--radius-sm);
    background: var(--chip-bg);
    border: 1px solid var(--border-subtle);
    color: var(--text-muted);
    white-space: nowrap;
    font-weight: 400;
  }
  .scope-chip-primary {
    color: var(--text-primary);
  }
  .ws-header-right {
    display: flex;
    align-items: center;
    gap: var(--sp-3);
    flex-shrink: 0;
  }
  .ws-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ws-progress-bar {
    width: 120px;
    height: 6px;
    background: var(--border-light);
    border-radius: 3px;
    overflow: hidden;
  }
  .ws-progress-fill {
    height: 100%;
    background: #4cb782;
    border-radius: 3px;
    transition: width 300ms ease;
  }
  .ws-progress-label {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .ws-review-btn {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
  }
  .ws-review-btn-active {
    background: rgba(94, 106, 210, 0.15) !important;
    border-color: var(--accent) !important;
    color: var(--accent);
  }
  .ws-review-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent);
    color: white;
    font-size: 0.72rem;
    font-weight: 500;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    padding: 0 5px;
    animation: badge-bounce 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes badge-bounce {
    0% { transform: scale(1); }
    40% { transform: scale(1.3); }
    100% { transform: scale(1); }
  }
  .ws-ghost-config {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-1);
    color: var(--text-muted);
    transition: color 150ms;
  }
  .ws-ghost-config:hover {
    color: var(--text-primary);
  }

  .ws-logout {
    font-size: 0.75rem;
    padding: var(--sp-1) var(--sp-3);
    color: var(--text-muted);
  }

  /* ── Body ───────────────────────────────────────── */
  .ws-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  /* ── Sidebar ────────────────────────────────────── */
  .ws-sidebar {
    width: 260px;
    flex-shrink: 0;
    border-right: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: width 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms;
  }
  .ws-sidebar-collapsed {
    width: 0;
    border-right: none;
  }
  .ws-sidebar-locked .ws-sidebar-content {
    opacity: 0.45;
    pointer-events: none;
  }
  .ws-sidebar-locked {
    border-right-color: var(--accent);
    animation: sidebar-lock-pulse 600ms ease-out;
  }
  @keyframes sidebar-lock-pulse {
    0% { border-right-color: var(--border-subtle); }
    50% { border-right-color: var(--accent); box-shadow: inset -1px 0 12px rgba(94, 106, 210, 0.15); }
    100% { border-right-color: var(--accent); box-shadow: none; }
  }
  .ws-sidebar-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--sp-4);
    transition: opacity 300ms;
  }
  .ws-sidebar-loading {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-bottom: var(--sp-3);
  }
  .ws-sidebar-footer {
    padding: var(--sp-3) var(--sp-4);
    border-top: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }
  .ws-sidebar-btn {
    width: 100%;
    padding: var(--sp-2) var(--sp-3);
    font-size: 0.875rem;
  }
  .ws-sidebar-tab {
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 3;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-left: none;
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    padding: var(--sp-2) var(--sp-1);
    color: var(--text-muted);
    cursor: pointer;
    transition: color 150ms;
  }
  .ws-sidebar-tab:hover { color: var(--text-primary); }

  /* ── Sidebar filter items ───────────────────────── */
  .sb-title {
    display: flex;
    align-items: baseline;
    gap: var(--sp-2);
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 500;
    margin-bottom: var(--sp-2);
  }
  .sb-hint {
    font-size: 0.72rem;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 400;
    opacity: 0.6;
  }
  .sb-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .sb-row {
    display: flex;
    align-items: flex-start;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    text-align: left;
    cursor: pointer;
    transition: background 100ms;
  }
  .sb-row:hover { background: var(--hover-bg); }
  .sb-row-active { background: rgba(94, 106, 210, 0.08); }
  .sb-row .chip-radio { margin-top: 3px; }
  .sb-row-text { display: flex; flex-direction: column; }
  .sb-row-label { font-size: 0.875rem; font-weight: 400; }
  .sb-row-active .sb-row-label { color: var(--accent); }
  .sb-row-desc { font-size: 0.72rem; color: var(--text-muted); }
  .sb-item {
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    text-align: left;
    cursor: pointer;
    transition: background 100ms;
  }
  .sb-item:hover { background: var(--hover-bg); }
  .sb-item-active { background: rgba(94, 106, 210, 0.08); }
  .sb-item-name {
    font-size: 0.875rem;
    font-weight: 400;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .sb-search {
    margin-bottom: var(--sp-2);
    padding: var(--sp-1) var(--sp-2);
    font-size: 0.78rem;
  }
  .sb-divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--sp-1) var(--sp-3);
  }

  /* Radio / checkbox (shared) */
  .chip-radio {
    width: 12px; height: 12px; border-radius: 50%;
    border: 1.5px solid var(--border-medium);
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 150ms;
  }
  .chip-radio-checked {
    border-color: var(--accent); background: var(--accent);
    box-shadow: inset 0 0 0 2px var(--bg-surface);
  }
  .chip-checkbox {
    width: 12px; height: 12px; border-radius: 2px;
    border: 1.5px solid var(--border-medium);
    display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: all 150ms;
  }
  .chip-checkbox-checked { background: var(--accent); border-color: var(--accent); }
  .chip-check-icon { font-size: 0.5rem; color: white; line-height: 1; }

  /* ── Main area ──────────────────────────────────── */
  .ws-main {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
  }

  /* Prompt (no issues loaded) — gamified */
  .ws-prompt {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: var(--sp-8);
    gap: 6px;
  }

  /* Radar animation */
  .ws-prompt-radar {
    position: relative;
    width: 120px;
    height: 120px;
    margin-bottom: 12px;
  }
  .radar-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid var(--accent);
  }
  .radar-ring-1 {
    opacity: 0.08;
    animation: radar-pulse 3s ease-out infinite;
  }
  .radar-ring-2 {
    opacity: 0.06;
    animation: radar-pulse 3s ease-out 1s infinite;
    inset: 15px;
  }
  .radar-ring-3 {
    opacity: 0.04;
    animation: radar-pulse 3s ease-out 2s infinite;
    inset: 30px;
  }
  @keyframes radar-pulse {
    0%   { transform: scale(0.85); opacity: 0.25; }
    100% { transform: scale(1.3); opacity: 0; }
  }
  .radar-sweep {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: conic-gradient(
      from 0deg,
      transparent 0deg,
      transparent 300deg,
      var(--accent) 355deg,
      transparent 360deg
    );
    opacity: 0.12;
    animation: radar-spin 4s linear infinite;
  }
  @keyframes radar-spin {
    to { transform: rotate(360deg); }
  }
  .radar-center {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    opacity: 0.5;
    animation: center-breathe 3s ease-in-out infinite;
  }
  @keyframes center-breathe {
    0%, 100% { opacity: 0.35; }
    50%      { opacity: 0.7; }
  }

  .ws-prompt-title {
    font-size: 1.25rem;
    font-weight: 300;
    letter-spacing: -0.01em;
    animation: prompt-fade-up 0.6s ease-out both;
  }
  .ws-prompt-desc {
    font-size: 0.85rem;
    color: var(--text-muted);
    max-width: 340px;
    line-height: 1.5;
    animation: prompt-fade-up 0.6s ease-out 0.15s both;
  }

  /* Step hints */
  .ws-prompt-hints {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 10px;
    animation: prompt-fade-up 0.6s ease-out 0.3s both;
  }
  .ws-hint {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.7rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--bg-elevated);
    border: 1px solid rgba(94, 106, 210, 0.15);
    transition: border-color 0.3s, color 0.3s;
  }
  .ws-hint-1 { animation: hint-pop 0.4s ease-out 0.6s both; }
  .ws-hint-2 { animation: hint-pop 0.4s ease-out 0.8s both; }
  .ws-hint-3 { animation: hint-pop 0.4s ease-out 1.0s both; }
  @keyframes hint-pop {
    0%   { transform: scale(0.7); opacity: 0; }
    70%  { transform: scale(1.05); }
    100% { transform: scale(1); opacity: 1; }
  }
  .ws-hint-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    opacity: 0.6;
  }
  .ws-hint-arrow {
    color: var(--text-muted);
    opacity: 0.3;
    font-size: 0.75rem;
    animation: prompt-fade-up 0.4s ease-out 0.7s both;
  }

  @keyframes prompt-fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Loading shimmer */
  .ws-shimmer-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ws-shimmer-card {
    width: 640px;
    max-width: 92vw;
    height: 380px;
    border-radius: var(--radius-lg);
    background: linear-gradient(90deg, var(--bg-surface) 25%, var(--bg-elevated) 50%, var(--bg-surface) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border: 1px solid var(--border-subtle);
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Card area */
  .ws-card-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--sp-4);
    padding-bottom: 44px;
    position: relative;
    perspective: 1200px;
    transition: margin-right 250ms cubic-bezier(0.22, 1, 0.36, 1);
    background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.15) 100%);
  }
  [data-theme="light"] .ws-card-area {
    background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.04) 100%);
  }
  .ws-card-area-shifted { margin-right: 0; }
  .ws-card-area-entering {
    animation: vignette-fade-in 500ms ease-out both;
  }
  @keyframes vignette-fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  /* ── Card column (wraps ghost hints + card stack) ── */
  .card-column {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  /* ── Card stack ─────────────────────────────────── */
  .card-stack {
    position: relative;
    transform-style: preserve-3d;
  }
  .stack-card {
    position: absolute;
    width: 640px;
    max-width: 92vw;
    height: 100%;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    transform-style: preserve-3d;
    backface-visibility: hidden;
  }
  .stack-card-1 {
    transform: translateZ(-30px) translateY(5px) scale(0.97);
    opacity: 0.45;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  }
  .stack-card-2 {
    transform: translateZ(-60px) translateY(10px) scale(0.94);
    opacity: 0.2;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
  }

  /* ── Cascade animations ─────────────────────────── */
  .cascade-2 {
    animation: cascade-in 420ms cubic-bezier(0.22, 1, 0.36, 1) 0ms both;
    --cascade-end-z: -60px;
    --cascade-end-y: 10px;
    --cascade-end-scale: 0.94;
    --cascade-end-opacity: 0.2;
  }
  .cascade-1 {
    animation: cascade-in 420ms cubic-bezier(0.22, 1, 0.36, 1) 80ms both;
    --cascade-end-z: -30px;
    --cascade-end-y: 5px;
    --cascade-end-scale: 0.97;
    --cascade-end-opacity: 0.45;
  }
  .cascade-top {
    animation: cascade-top-in 480ms cubic-bezier(0.34, 1.56, 0.64, 1) 160ms both;
  }
  @keyframes cascade-in {
    0% {
      opacity: 0;
      transform: translateZ(-100px) translateY(50px) scale(0.8);
    }
    100% {
      opacity: var(--cascade-end-opacity);
      transform: translateZ(var(--cascade-end-z)) translateY(var(--cascade-end-y)) scale(var(--cascade-end-scale));
    }
  }
  @keyframes cascade-top-in {
    0% {
      opacity: 0;
      transform: translateZ(-80px) translateY(40px) scale(0.85) rotateX(6deg);
    }
    60% {
      opacity: 1;
      transform: translateZ(5px) translateY(-2px) scale(1.01) rotateX(-0.5deg);
    }
    100% {
      opacity: 1;
      transform: translateZ(0) translateY(0) scale(1) rotateX(0deg);
    }
  }

  /* ── Card navigation animations ─────────────────── */
  .triage-card-wrapper {
    will-change: transform, opacity;
    position: relative;
    z-index: 1;
    transform-style: preserve-3d;
  }
  .card-enter-right, .card-enter-left {
    animation: card-lift-from-stack 320ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  @keyframes card-lift-from-stack {
    0% { opacity: 0.4; transform: translateZ(-30px) translateY(5px) scale(0.97) rotateX(2deg); }
    100% { opacity: 1; transform: translateZ(0) translateY(0) scale(1) rotateX(0deg); }
  }
  .card-exit-right { animation: card-to-back-right 300ms cubic-bezier(0.4, 0, 0.6, 1) forwards; }
  @keyframes card-to-back-right {
    0% { opacity: 1; transform: translateZ(0) translateX(0) translateY(0) rotateY(0deg) rotateX(0deg) scale(1); }
    40% { opacity: 0.7; transform: translateZ(-10px) translateX(30px) translateY(0) rotateY(-8deg) rotateX(1deg) scale(0.98); }
    100% { opacity: 0; transform: translateZ(-60px) translateX(10px) translateY(10px) rotateY(-3deg) rotateX(2deg) scale(0.92); }
  }
  .card-exit-left { animation: card-to-back-left 300ms cubic-bezier(0.4, 0, 0.6, 1) forwards; }
  @keyframes card-to-back-left {
    0% { opacity: 1; transform: translateZ(0) translateX(0) translateY(0) rotateY(0deg) rotateX(0deg) scale(1); }
    40% { opacity: 0.7; transform: translateZ(-10px) translateX(-30px) translateY(0) rotateY(8deg) rotateX(1deg) scale(0.98); }
    100% { opacity: 0; transform: translateZ(-60px) translateX(-10px) translateY(10px) rotateY(3deg) rotateX(2deg) scale(0.92); }
  }
  .card-submit-glow { animation: submit-bounce-to-back 380ms cubic-bezier(0.34, 1.2, 0.64, 1) forwards; }
  .card-submit-glow .issue-card { animation: submit-glow-ring 380ms ease-out; }
  @keyframes submit-bounce-to-back {
    0% { opacity: 1; transform: translateZ(0) translateY(0) rotateX(0deg) scale(1); }
    25% { opacity: 1; transform: translateZ(20px) translateY(-6px) rotateX(-1deg) scale(1.02); }
    50% { opacity: 1; transform: translateZ(0) translateY(0) rotateX(0deg) scale(1); }
    100% { opacity: 0; transform: translateZ(-50px) translateY(8px) rotateX(3deg) scale(0.93); }
  }
  @keyframes submit-glow-ring {
    0% { box-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 0 0 0 rgba(76, 183, 130, 0.5); border-color: var(--priority-low); }
    35% { box-shadow: 0 8px 24px rgba(0,0,0,0.15), 0 0 24px 6px rgba(76, 183, 130, 0.3); border-color: var(--priority-low); }
    100% { box-shadow: var(--shadow-card); border-color: var(--border-subtle); }
  }

  /* ── Priority flash ─────────────────────────────── */
  .priority-flash {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    animation: priority-flash-anim 400ms ease-out forwards;
    background: radial-gradient(ellipse at center, var(--flash-color) 0%, transparent 70%);
  }
  @keyframes priority-flash-anim {
    0% { opacity: 0.18; }
    100% { opacity: 0; }
  }

  /* ── Review drawer ──────────────────────────────── */
  .review-drawer {
    width: 340px;
    flex-shrink: 0;
    border-left: 1px solid var(--border-subtle);
    background: var(--bg-surface);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    margin-right: -340px;
    transition: margin-right 250ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .review-drawer-open { margin-right: 0; }
  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--sp-3) var(--sp-4);
    border-bottom: 1px solid var(--border-subtle);
    flex-shrink: 0;
  }
  .drawer-title { font-size: 0.875rem; font-weight: 500; }
  .drawer-review-all { font-size: 0.72rem; padding: var(--sp-1) var(--sp-2); }
  .drawer-empty {
    padding: var(--sp-6) var(--sp-4);
    text-align: center;
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .drawer-list { flex: 1; overflow-y: auto; padding: var(--sp-2); }
  .drawer-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--sp-2) var(--sp-3);
    border-radius: var(--radius-sm);
    cursor: pointer;
    text-align: left;
    transition: background 100ms;
    width: 100%;
  }
  .drawer-row:hover { background: var(--hover-bg); }
  .drawer-row-active {
    background: rgba(94, 106, 210, 0.08);
    border-left: 2px solid var(--accent);
  }
  .drawer-row-id {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .drawer-row-title {
    font-size: 0.875rem;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .drawer-row-changes { display: flex; gap: var(--sp-1); flex-wrap: wrap; margin-top: 2px; }
  .drawer-change-chip {
    font-size: 0.72rem;
    padding: 1px 5px;
    border-radius: var(--radius-sm);
    background: rgba(94, 106, 210, 0.10);
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* ── Empty / inbox-zero ─────────────────────────── */
  .triage-empty {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--sp-3);
    z-index: 1;
  }
  .empty-icon { color: var(--priority-low); animation: empty-icon-enter 500ms cubic-bezier(0.34, 1.56, 0.64, 1); }
  @keyframes empty-icon-enter { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
  .empty-checkmark .empty-circle { stroke-dasharray: 165; stroke-dashoffset: 165; animation: draw-stroke 600ms ease-out 100ms forwards; }
  .empty-checkmark .empty-check { stroke-dasharray: 44; stroke-dashoffset: 44; animation: draw-stroke 400ms ease-out 500ms forwards; }
  @keyframes draw-stroke { to { stroke-dashoffset: 0; } }
  .empty-title { font-size: 1.5rem; font-weight: 300; letter-spacing: -0.02em; animation: empty-fade-up 400ms ease-out 300ms both; }
  .empty-subtitle { font-size: 0.875rem; color: var(--text-muted); animation: empty-fade-up 400ms ease-out 450ms both; }
  .empty-actions { display: flex; gap: var(--sp-3); margin-top: var(--sp-2); animation: empty-fade-up 400ms ease-out 600ms both; }
  .empty-actions a { text-decoration: none; }
  @keyframes empty-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  .empty-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
  .empty-confetti-piece {
    position: absolute; top: -10px; left: var(--x);
    width: var(--size); height: var(--size); background: var(--color); border-radius: 1px;
    animation: confetti-fall var(--duration) cubic-bezier(0.25, 0.46, 0.45, 0.94) var(--delay) forwards;
    transform: rotate(var(--rotation));
  }
  @keyframes confetti-fall {
    0% { opacity: 1; transform: translateY(0) translateX(0) rotate(var(--rotation)) scale(1); }
    75% { opacity: 1; }
    100% { opacity: 0; transform: translateY(100vh) translateX(var(--drift)) rotate(calc(var(--rotation) + 720deg)) scale(0.5); }
  }

  /* ── Detail panel ───────────────────────────────── */
  .detail-panel {
    background: var(--bg-elevated);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-lg);
    padding: var(--sp-6);
    max-width: 700px;
    width: 90vw;
    max-height: 85vh;
    overflow-y: auto;
    animation: scale-in 150ms ease-out;
  }
  .detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--sp-4); }
  .detail-close { font-family: var(--font-mono); font-size: 0.75rem; padding: var(--sp-1) var(--sp-2); }
  .detail-title { font-size: 1.25rem; font-weight: 400; line-height: 1.4; letter-spacing: -0.01em; margin-bottom: var(--sp-4); }
  .detail-description { color: var(--text-secondary); font-size: 0.875rem; line-height: 1.6; word-break: break-word; }
  .detail-description p { margin: 0 0 0.6em; }
  .detail-description p:last-child { margin-bottom: 0; }
  .detail-description h1, .detail-description h2 { font-size: 1rem; font-weight: 500; color: var(--text-primary); margin: 1em 0 0.4em; }
  .detail-description h3, .detail-description h4 { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); margin: 0.8em 0 0.3em; }
  .detail-description h1:first-child, .detail-description h2:first-child, .detail-description h3:first-child { margin-top: 0; }
  .detail-description ul, .detail-description ol { padding-left: 1.4em; margin: 0 0 0.6em; }
  .detail-description li { margin-bottom: 0.2em; }
  .detail-description code { font-family: var(--font-mono); font-size: 0.85em; background: var(--chip-bg); padding: 2px 5px; border-radius: var(--radius-sm); }
  .detail-description pre { background: var(--chip-bg); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: var(--sp-3); overflow-x: auto; margin: 0.6em 0; }
  .detail-description pre code { background: none; padding: 0; font-size: 0.8rem; }
  .detail-description blockquote { border-left: 3px solid var(--border-medium); padding-left: var(--sp-3); margin: 0.6em 0; color: var(--text-muted); }
  .detail-description a { color: var(--accent); }
  .detail-description img { max-width: 100%; border-radius: var(--radius-md); margin: 0.4em 0; }
  .detail-description hr { border: none; border-top: 1px solid var(--border-subtle); margin: 0.8em 0; }
  .detail-description table { border-collapse: collapse; width: 100%; margin: 0.6em 0; font-size: 0.85rem; }
  .detail-description th, .detail-description td { border: 1px solid var(--border-subtle); padding: var(--sp-1) var(--sp-2); text-align: left; }
  .detail-description th { background: var(--chip-bg); font-weight: 500; }
  .detail-footer { margin-top: var(--sp-5); display: flex; justify-content: flex-end; }
  .detail-footer a { text-decoration: none; }

  @media (max-width: 900px) {
    .ws-sidebar { width: 220px; }
    .review-drawer { width: 280px; margin-right: -280px; }
  }
`
