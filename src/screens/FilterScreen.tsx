import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../store/useAppStore'
import {
  fetchTeams, fetchTeamDetails, fetchIssues, fetchIssueCount,
  fetchViewerTeams, fetchAllTeamsData, logout,
} from '../api/linear'
import type { FilterConfig } from '../api/types'

function buildFilter(config: FilterConfig, stateIds: string[], viewerId?: string) {
  const filter: Record<string, unknown> = {}

  if (config.mode === 'my-issues') {
    if (viewerId) {
      filter.assignee = { id: { eq: viewerId } }
    }
  } else {
    filter.team = { id: { eq: config.teamId } }
    if (config.assigneeId === '__unassigned__') {
      filter.assignee = { null: true }
    } else if (config.assigneeId) {
      filter.assignee = { id: { eq: config.assigneeId } }
    }
  }

  if (config.projectIds.length > 0) {
    filter.project = { id: { in: config.projectIds } }
  }
  if (stateIds.length > 0) {
    filter.state = { id: { in: stateIds } }
  }
  if (config.unestimatedOnly) {
    filter.estimate = { null: true }
  }

  return filter
}

export default function FilterScreen() {
  const { state, dispatch } = useApp()
  const [loading, setLoading] = useState(true)
  const [loadingTeam, setLoadingTeam] = useState(false)
  const [issueCount, setIssueCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const [loadingIssues, setLoadingIssues] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')

  const mode = state.filterConfig.mode

  useEffect(() => {
    async function boot() {
      try {
        const teams = await fetchTeams()
        dispatch({ type: 'SET_TEAMS', teams })
      } catch (err) {
        if (err instanceof Error && err.message === 'UNAUTHORIZED') {
          dispatch({ type: 'SET_SCREEN', screen: 'setup' })
        }
      } finally {
        setLoading(false)
      }
    }
    boot()
  }, [dispatch])

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
      } catch (err) {
        console.error(err)
      } finally {
        if (!cancelled) setLoadingTeam(false)
      }
    }
    loadMyData()
    return () => { cancelled = true }
  }, [mode, dispatch])

  async function handleTeamSelect(teamId: string) {
    const team = state.teams.find(t => t.id === teamId)
    if (!team) return
    dispatch({ type: 'SET_SELECTED_TEAM', team })
    setLoadingTeam(true)
    try {
      const details = await fetchTeamDetails(teamId)
      dispatch({ type: 'SET_TEAM_DATA', ...details })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingTeam(false)
    }
  }

  const getSelectedStateIds = useCallback(() => {
    return state.availableStates
      .filter(s => state.filterConfig.states.includes(s.type.toLowerCase()))
      .map(s => s.id)
  }, [state.availableStates, state.filterConfig.states])

  const canQuery = mode === 'my-issues' ? !loadingTeam : !!state.filterConfig.teamId

  useEffect(() => {
    if (!canQuery) return
    setCountLoading(true)
    const stateIds = getSelectedStateIds()
    const filter = buildFilter(state.filterConfig, stateIds, state.viewer?.id)
    const timer = setTimeout(async () => {
      try {
        const count = await fetchIssueCount(filter)
        setIssueCount(count)
      } catch {
        setIssueCount(null)
      } finally {
        setCountLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [state.filterConfig, state.viewer?.id, getSelectedStateIds, canQuery])

  async function handleLoadIssues() {
    setLoadingIssues(true)
    const stateIds = getSelectedStateIds()
    const filter = buildFilter(state.filterConfig, stateIds, state.viewer?.id)
    try {
      const issues = await fetchIssues(filter)
      dispatch({ type: 'SET_ISSUES', issues })
      dispatch({ type: 'SET_SCREEN', screen: 'triage' })
    } catch (err) {
      dispatch({ type: 'ADD_TOAST', message: 'Failed to load issues', toastType: 'error' })
      console.error(err)
    } finally {
      setLoadingIssues(false)
    }
  }

  const toggleState = (stateType: string) => {
    const current = state.filterConfig.states
    const next = current.includes(stateType)
      ? current.filter(s => s !== stateType)
      : [...current, stateType]
    dispatch({ type: 'SET_FILTER', filterConfig: { states: next } })
  }

  const toggleProject = (projectId: string) => {
    const current = state.filterConfig.projectIds
    const next = current.includes(projectId)
      ? current.filter(id => id !== projectId)
      : [...current, projectId]
    dispatch({ type: 'SET_FILTER', filterConfig: { projectIds: next } })
  }

  function setMode(newMode: 'my-issues' | 'team') {
    dispatch({
      type: 'SET_FILTER',
      filterConfig: { mode: newMode, projectIds: [], assigneeId: null },
    })
    setIssueCount(null)
  }

  function resetFilters() {
    dispatch({
      type: 'SET_FILTER',
      filterConfig: { projectIds: [], assigneeId: null, states: ['backlog'], unestimatedOnly: false },
    })
  }

  // Summary tags
  const summaryTags: string[] = []
  if (mode === 'my-issues') {
    summaryTags.push('Assigned to me')
  } else if (state.selectedTeam) {
    summaryTags.push(state.selectedTeam.name)
    if (state.filterConfig.assigneeId === '__unassigned__') summaryTags.push('Unassigned')
    else if (state.filterConfig.assigneeId === state.viewer?.id) summaryTags.push('Just me')
    else if (state.filterConfig.assigneeId) {
      const m = state.availableMembers.find(m => m.id === state.filterConfig.assigneeId)
      if (m) summaryTags.push(m.displayName || m.name)
    }
  }
  state.filterConfig.states.forEach(s => summaryTags.push(s.charAt(0).toUpperCase() + s.slice(1)))
  if (state.filterConfig.projectIds.length > 0) {
    const names = state.filterConfig.projectIds
      .map(id => state.availableProjects.find(p => p.id === id)?.name)
      .filter(Boolean)
    summaryTags.push(...names as string[])
  }
  if (state.filterConfig.unestimatedOnly) summaryTags.push('Unestimated')

  const hasCustomFilters = state.filterConfig.projectIds.length > 0 ||
    state.filterConfig.assigneeId !== null ||
    state.filterConfig.unestimatedOnly ||
    state.filterConfig.states.join(',') !== 'backlog'

  if (loading) {
    return <div className="filter-screen"><p className="filter-loading">Loading workspace...</p></div>
  }

  const showFilters = mode === 'my-issues' ? !loadingTeam : !!state.selectedTeam && !loadingTeam

  const filteredProjects = state.availableProjects.filter(p =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  )
  const showProjectSearch = state.availableProjects.length > 8

  return (
    <div className="filter-screen">
      {/* Top bar */}
      <div className="filter-topbar">
        <div className="filter-topbar-left">
          <p className="filter-mode-label">Filter Mode</p>
          <div className="filter-title-row">
            <h1 className="filter-title">
              {state.viewer?.name ? `Hey ${state.viewer.name.split(' ')[0]}` : 'Scope your triage'}
            </h1>
            {state.organization && (
              <span className="workspace-badge">{state.organization.name}</span>
            )}
          </div>
        </div>
        <div className="filter-topbar-right">
          {/* Summary */}
          {summaryTags.length > 0 && showFilters && (
            <div className="filter-summary">
              {summaryTags.map((tag, i) => (
                <span key={i} className="filter-summary-tag">{tag}</span>
              ))}
              {hasCustomFilters && (
                <button className="filter-reset-btn" onClick={resetFilters}>Clear</button>
              )}
            </div>
          )}
          <button
            className="btn-primary filter-load-btn-top"
            onClick={handleLoadIssues}
            disabled={loadingIssues || issueCount === 0 || !showFilters}
          >
            {loadingIssues
              ? 'Loading...'
              : countLoading
                ? 'Counting...'
                : issueCount === 0
                  ? 'No issues match'
                  : issueCount !== null
                    ? `Triage ${issueCount} issue${issueCount !== 1 ? 's' : ''} \u2192`
                    : 'Triage \u2192'}
          </button>
          <button
            className="btn-secondary filter-logout"
            onClick={async () => {
              await logout()
              dispatch({ type: 'SET_SCREEN', screen: 'setup' })
            }}
          >
            Disconnect
          </button>
        </div>
      </div>

      {loadingTeam && <p className="filter-loading-small">Loading{mode === 'my-issues' ? ' your teams' : ' team data'}...</p>}

      {/* Columns */}
      <div className="filter-columns">
        {/* Column 1: Mode + Team */}
        <div className="filter-col filter-col-mode">
          <label className="filter-col-title">Source</label>
          <div className="mode-list">
            <button
              className={`mode-row ${mode === 'my-issues' ? 'mode-row-active' : ''}`}
              onClick={() => setMode('my-issues')}
            >
              <span className={`chip-radio ${mode === 'my-issues' ? 'chip-radio-checked' : ''}`} />
              <div className="mode-row-text">
                <span className="mode-row-label">My Issues</span>
                <span className="mode-row-desc">Across all teams</span>
              </div>
            </button>
            <button
              className={`mode-row ${mode === 'team' ? 'mode-row-active' : ''}`}
              onClick={() => setMode('team')}
            >
              <span className={`chip-radio ${mode === 'team' ? 'chip-radio-checked' : ''}`} />
              <div className="mode-row-text">
                <span className="mode-row-label">By Team</span>
                <span className="mode-row-desc">Specific team</span>
              </div>
            </button>
          </div>

          {mode === 'team' && (
            <>
              <label className="filter-col-title" style={{ marginTop: 'var(--sp-4)' }}>Team</label>
              <div className="team-list">
                {state.teams.map(t => (
                  <button
                    key={t.id}
                    className={`team-item ${state.filterConfig.teamId === t.id ? 'team-item-active' : ''}`}
                    onClick={() => handleTeamSelect(t.id)}
                  >
                    <span className={`chip-radio ${state.filterConfig.teamId === t.id ? 'chip-radio-checked' : ''}`} />
                    <span className="team-item-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {mode === 'team' && state.selectedTeam && !loadingTeam && (
            <>
              <label className="filter-col-title" style={{ marginTop: 'var(--sp-4)' }}>
                Assignee <span className="filter-label-hint">one</span>
              </label>
              <div className="team-list">
                {[
                  { id: '__anyone__', label: 'Anyone' },
                  { id: '__me__', label: 'Just me' },
                  { id: '__unassigned__', label: 'Unassigned' },
                  ...state.availableMembers.filter(m => m.id !== state.viewer?.id).map(m => ({
                    id: m.id,
                    label: m.displayName || m.name,
                  })),
                ].map(opt => {
                  const resolvedId = opt.id === '__anyone__' ? null
                    : opt.id === '__me__' ? (state.viewer?.id ?? null)
                    : opt.id
                  const isActive = state.filterConfig.assigneeId === resolvedId
                  return (
                    <button
                      key={opt.id}
                      className={`team-item ${isActive ? 'team-item-active' : ''}`}
                      onClick={() => dispatch({ type: 'SET_FILTER', filterConfig: { assigneeId: resolvedId } })}
                    >
                      <span className={`chip-radio ${isActive ? 'chip-radio-checked' : ''}`} />
                      <span className="team-item-name">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Column 2: Projects */}
        {showFilters && state.availableProjects.length > 0 && (
          <div className="filter-col filter-col-projects">
            <label className="filter-col-title">
              Projects <span className="filter-label-hint">{state.filterConfig.projectIds.length === 0 ? 'all' : `${state.filterConfig.projectIds.length} selected`}</span>
            </label>
            {showProjectSearch && (
              <input
                className="input filter-project-search"
                placeholder="Search..."
                value={projectSearch}
                onChange={e => setProjectSearch(e.target.value)}
              />
            )}
            <div className="project-list">
              {filteredProjects.map(p => {
                const isActive = state.filterConfig.projectIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    className={`team-item ${isActive ? 'team-item-active' : ''}`}
                    onClick={() => toggleProject(p.id)}
                  >
                    <span className={`chip-checkbox ${isActive ? 'chip-checkbox-checked' : ''}`}>
                      {isActive && <span className="chip-check-icon">&#10003;</span>}
                    </span>
                    <span className="team-item-name">{p.name}</span>
                  </button>
                )
              })}
              {filteredProjects.length === 0 && projectSearch && (
                <p className="filter-col-empty">No match</p>
              )}
            </div>
          </div>
        )}

        {/* Column 3: State + Estimate */}
        {showFilters && (
          <div className="filter-col filter-col-filters">
            <label className="filter-col-title">
              Workflow State <span className="filter-label-hint">multiple</span>
            </label>
            <div className="team-list">
              {['backlog', 'unstarted', 'started'].map(s => {
                const isActive = state.filterConfig.states.includes(s)
                return (
                  <button
                    key={s}
                    className={`team-item ${isActive ? 'team-item-active' : ''}`}
                    onClick={() => toggleState(s)}
                  >
                    <span className={`chip-checkbox ${isActive ? 'chip-checkbox-checked' : ''}`}>
                      {isActive && <span className="chip-check-icon">&#10003;</span>}
                    </span>
                    <span className="team-item-name">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                  </button>
                )
              })}
            </div>

            <label className="filter-col-title" style={{ marginTop: 'var(--sp-4)' }}>
              Has Estimate? <span className="filter-label-hint">one</span>
            </label>
            <div className="team-list">
              <button
                className={`team-item ${!state.filterConfig.unestimatedOnly ? 'team-item-active' : ''}`}
                onClick={() => dispatch({ type: 'SET_FILTER', filterConfig: { unestimatedOnly: false } })}
              >
                <span className={`chip-radio ${!state.filterConfig.unestimatedOnly ? 'chip-radio-checked' : ''}`} />
                <span className="team-item-name">Any</span>
              </button>
              <button
                className={`team-item ${state.filterConfig.unestimatedOnly ? 'team-item-active' : ''}`}
                onClick={() => dispatch({ type: 'SET_FILTER', filterConfig: { unestimatedOnly: true } })}
              >
                <span className={`chip-radio ${state.filterConfig.unestimatedOnly ? 'chip-radio-checked' : ''}`} />
                <span className="team-item-name">Missing only</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .filter-screen {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Top bar */
        .filter-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--sp-3) var(--sp-5);
          border-bottom: 1px solid var(--border-subtle);
          flex-shrink: 0;
          gap: var(--sp-4);
        }
        .filter-topbar-left {
          flex-shrink: 0;
        }
        .filter-mode-label {
          font-size: 0.6rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--accent);
          font-weight: 600;
          margin-bottom: 1px;
        }
        .filter-title-row {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
        }
        .filter-title {
          font-size: 1rem;
          font-weight: 600;
        }
        .workspace-badge {
          font-size: 0.65rem;
          padding: 2px 7px;
          border-radius: 10px;
          background: var(--chip-bg);
          border: 1px solid var(--border-light);
          color: var(--text-secondary);
          white-space: nowrap;
          font-weight: 500;
        }
        .filter-topbar-right {
          display: flex;
          align-items: center;
          gap: var(--sp-3);
        }
        .filter-summary {
          display: flex;
          align-items: center;
          gap: var(--sp-1);
          flex-wrap: wrap;
        }
        .filter-summary-tag {
          font-size: 0.65rem;
          padding: 1px 6px;
          border-radius: 3px;
          background: rgba(94, 106, 210, 0.12);
          color: var(--accent);
          white-space: nowrap;
        }
        .filter-reset-btn {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-decoration: underline;
          padding: 0;
          cursor: pointer;
          margin-left: var(--sp-1);
        }
        .filter-reset-btn:hover {
          color: var(--text-secondary);
        }
        .filter-load-btn-top {
          padding: var(--sp-2) var(--sp-4);
          white-space: nowrap;
          flex-shrink: 0;
        }
        .filter-logout {
          font-size: 0.72rem;
          padding: var(--sp-1) var(--sp-3);
          color: var(--text-muted);
          flex-shrink: 0;
        }
        .filter-loading-small {
          color: var(--text-muted);
          font-size: 0.8rem;
          text-align: center;
          padding: var(--sp-4);
          flex-shrink: 0;
        }

        /* Column layout */
        .filter-columns {
          flex: 1;
          display: flex;
          overflow: hidden;
        }
        .filter-col {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-subtle);
          padding: var(--sp-4);
          overflow-y: auto;
          min-width: 0;
        }
        .filter-col:last-child {
          border-right: none;
        }
        .filter-col-mode {
          width: 240px;
          flex-shrink: 0;
        }
        .filter-col-projects {
          flex: 1;
          min-width: 200px;
        }
        .filter-col-filters {
          width: 220px;
          flex-shrink: 0;
        }
        .filter-col-title {
          display: flex;
          align-items: baseline;
          gap: var(--sp-2);
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          margin-bottom: var(--sp-2);
          flex-shrink: 0;
        }
        .filter-label-hint {
          font-size: 0.6rem;
          text-transform: none;
          letter-spacing: 0;
          color: var(--text-muted);
          opacity: 0.6;
        }
        .filter-col-empty {
          font-size: 0.75rem;
          color: var(--text-muted);
          padding: var(--sp-2) var(--sp-3);
        }

        /* Mode list */
        .mode-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .mode-row {
          display: flex;
          align-items: flex-start;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--radius-sm);
          text-align: left;
          cursor: pointer;
          transition: background 100ms;
        }
        .mode-row:hover {
          background: var(--hover-bg);
        }
        .mode-row-active {
          background: rgba(94, 106, 210, 0.08);
        }
        .mode-row .chip-radio {
          margin-top: 3px;
        }
        .mode-row-text {
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .mode-row-label {
          font-size: 0.85rem;
          font-weight: 500;
        }
        .mode-row-active .mode-row-label {
          color: var(--accent);
        }
        .mode-row-desc {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        /* Shared list styles */
        .team-list, .project-list {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .team-item {
          display: flex;
          align-items: center;
          gap: var(--sp-2);
          padding: var(--sp-2) var(--sp-3);
          border-radius: var(--radius-sm);
          text-align: left;
          cursor: pointer;
          transition: background 100ms;
        }
        .team-item:hover {
          background: var(--hover-bg);
        }
        .team-item-active {
          background: rgba(94, 106, 210, 0.08);
        }
        .team-item-name {
          font-size: 0.82rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* Radio / checkbox indicators */
        .chip-radio {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1.5px solid var(--border-medium);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 150ms;
        }
        .chip-radio-checked {
          border-color: var(--accent);
          background: var(--accent);
          box-shadow: inset 0 0 0 2px var(--bg-surface);
        }
        .chip-checkbox {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1.5px solid var(--border-medium);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: all 150ms;
        }
        .chip-checkbox-checked {
          background: var(--accent);
          border-color: var(--accent);
        }
        .chip-check-icon {
          font-size: 0.5rem;
          color: white;
          line-height: 1;
        }

        .filter-project-search {
          margin-bottom: var(--sp-2);
          padding: var(--sp-1) var(--sp-2);
          font-size: 0.78rem;
          flex-shrink: 0;
        }

        .filter-loading {
          color: var(--text-secondary);
          text-align: center;
          margin-top: 40vh;
        }

        @media (max-width: 700px) {
          .filter-columns {
            flex-direction: column;
            overflow-y: auto;
          }
          .filter-col {
            border-right: none;
            border-bottom: 1px solid var(--border-subtle);
            width: 100% !important;
          }
          .filter-col:last-child {
            border-bottom: none;
          }
        }
      `}</style>
    </div>
  )
}
