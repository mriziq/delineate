import { createContext, useContext, useReducer, type Dispatch } from 'react'
import type {
  LinearUser, Organization, Team, Project, Member, Label, Issue,
  FilterConfig, PendingChange, Screen, Overlay, WorkflowState, Theme
} from '../api/types'

export interface AppState {
  screen: Screen
  viewer: LinearUser | null
  organization: Organization | null
  teams: Team[]
  selectedTeam: Team | null
  availableProjects: Project[]
  availableMembers: Member[]
  availableLabels: Label[]
  availableStates: WorkflowState[]
  filterConfig: FilterConfig
  issues: Issue[]
  currentIndex: number
  pendingChanges: PendingChange[]
  activeOverlay: Overlay
  theme: Theme
  toasts: { id: number; message: string; type: 'info' | 'error' }[]
}

export const initialState: AppState = {
  screen: 'setup',
  viewer: null,
  organization: null,
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  teams: [],
  selectedTeam: null,
  availableProjects: [],
  availableMembers: [],
  availableLabels: [],
  availableStates: [],
  filterConfig: {
    mode: 'my-issues',
    teamId: '',
    projectIds: [],
    assigneeId: null,
    states: ['backlog'],
    unestimatedOnly: false,
  },
  issues: [],
  currentIndex: 0,
  pendingChanges: [],
  activeOverlay: null,
  toasts: [],
}

export type Action =
  | { type: 'SET_SCREEN'; screen: Screen }
  | { type: 'SET_VIEWER'; viewer: LinearUser; organization?: Organization | null }
  | { type: 'SET_TEAMS'; teams: Team[] }
  | { type: 'SET_SELECTED_TEAM'; team: Team }
  | { type: 'SET_TEAM_DATA'; projects: Project[]; members: Member[]; labels: Label[]; states: WorkflowState[] }
  | { type: 'SET_FILTER'; filterConfig: Partial<FilterConfig> }
  | { type: 'SET_ISSUES'; issues: Issue[] }
  | { type: 'APPLY_CHANGE'; issueId: string; field: string; value: unknown }
  | { type: 'UNDO_CHANGE'; issueId: string }
  | { type: 'ADVANCE_CARD' }
  | { type: 'GO_BACK' }
  | { type: 'JUMP_TO_ISSUE'; index: number }
  | { type: 'OPEN_OVERLAY'; overlay: Overlay }
  | { type: 'CLOSE_OVERLAY' }
  | { type: 'REMOVE_PENDING'; issueId: string }
  | { type: 'TOGGLE_PENDING'; issueId: string }
  | { type: 'ADD_TOAST'; message: string; toastType: 'info' | 'error' }
  | { type: 'REMOVE_TOAST'; id: number }
  | { type: 'RESTORE_SESSION'; session: TriageSession }
  | { type: 'TOGGLE_THEME' }
  | { type: 'RESET' }

// Serializable subset of state for localStorage persistence
export interface TriageSession {
  issues: Issue[]
  currentIndex: number
  pendingChanges: PendingChange[]
  filterConfig: FilterConfig
  availableLabels: Label[]
  availableMembers: Member[]
  availableProjects: Project[]
  availableStates: WorkflowState[]
  savedAt: number // timestamp
}

const SESSION_KEY = 'triage_session'

export function saveSession(state: AppState): void {
  const session: TriageSession = {
    issues: state.issues,
    currentIndex: state.currentIndex,
    pendingChanges: state.pendingChanges,
    filterConfig: state.filterConfig,
    availableLabels: state.availableLabels,
    availableMembers: state.availableMembers,
    availableProjects: state.availableProjects,
    availableStates: state.availableStates,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function loadSession(): TriageSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw) as TriageSession
    // Discard sessions older than 24 hours
    if (Date.now() - session.savedAt > 24 * 60 * 60 * 1000) {
      clearSession()
      return null
    }
    // Basic sanity check
    if (!session.issues?.length) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}

let toastId = 0

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SCREEN':
      return { ...state, screen: action.screen }

    case 'SET_VIEWER':
      return { ...state, viewer: action.viewer, organization: action.organization ?? state.organization }

    case 'SET_TEAMS':
      return { ...state, teams: action.teams }

    case 'SET_SELECTED_TEAM':
      return {
        ...state,
        selectedTeam: action.team,
        filterConfig: { ...state.filterConfig, teamId: action.team.id },
      }

    case 'SET_TEAM_DATA':
      return {
        ...state,
        availableProjects: action.projects,
        availableMembers: action.members,
        availableLabels: action.labels,
        availableStates: action.states,
      }

    case 'SET_FILTER':
      return {
        ...state,
        filterConfig: { ...state.filterConfig, ...action.filterConfig },
      }

    case 'SET_ISSUES':
      return {
        ...state,
        issues: action.issues,
        currentIndex: 0,
        pendingChanges: [],
      }

    case 'APPLY_CHANGE': {
      const issue = state.issues[state.currentIndex]
      if (!issue) return state

      const existing = state.pendingChanges.find(p => p.issueId === action.issueId)
      const originalValues = existing?.originalValues ?? {
        priority: issue.priority,
        estimate: issue.estimate ?? null,
        labelIds: issue.labels.nodes.map(l => l.id),
        assigneeId: issue.assignee?.id ?? null,
        projectId: issue.project?.id ?? null,
      }

      const changes = existing?.changes ?? {}
      const updated: PendingChange = {
        issueId: action.issueId,
        identifier: issue.identifier,
        title: issue.title,
        changes: { ...changes, [action.field]: action.value },
        originalValues,
      }

      const filtered = state.pendingChanges.filter(p => p.issueId !== action.issueId)
      return { ...state, pendingChanges: [...filtered, updated] }
    }

    case 'UNDO_CHANGE': {
      return {
        ...state,
        pendingChanges: state.pendingChanges.filter(p => p.issueId !== action.issueId),
      }
    }

    case 'ADVANCE_CARD': {
      const nextIndex = state.currentIndex + 1
      if (nextIndex >= state.issues.length) {
        return { ...state, screen: 'review', activeOverlay: null }
      }
      return { ...state, currentIndex: nextIndex, activeOverlay: null }
    }

    case 'GO_BACK': {
      if (state.currentIndex <= 0) return state
      return { ...state, currentIndex: state.currentIndex - 1, activeOverlay: null }
    }

    case 'JUMP_TO_ISSUE': {
      if (action.index < 0 || action.index >= state.issues.length) return state
      return { ...state, currentIndex: action.index, activeOverlay: null }
    }

    case 'OPEN_OVERLAY':
      return { ...state, activeOverlay: action.overlay }

    case 'CLOSE_OVERLAY':
      return { ...state, activeOverlay: null }

    case 'REMOVE_PENDING':
      return {
        ...state,
        pendingChanges: state.pendingChanges.filter(p => p.issueId !== action.issueId),
      }

    case 'TOGGLE_PENDING': {
      const pc = state.pendingChanges.find(p => p.issueId === action.issueId)
      if (!pc) return state
      const updated = state.pendingChanges.map(p =>
        p.issueId === action.issueId
          ? { ...p, _excluded: !(p as PendingChange & { _excluded?: boolean })._excluded }
          : p
      )
      return { ...state, pendingChanges: updated as PendingChange[] }
    }

    case 'ADD_TOAST': {
      const id = ++toastId
      return {
        ...state,
        toasts: [...state.toasts, { id, message: action.message, type: action.toastType }],
      }
    }

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter(t => t.id !== action.id),
      }

    case 'RESTORE_SESSION': {
      const s = action.session
      return {
        ...state,
        screen: 'workspace',
        issues: s.issues,
        currentIndex: s.currentIndex,
        pendingChanges: s.pendingChanges,
        filterConfig: s.filterConfig,
        availableLabels: s.availableLabels,
        availableMembers: s.availableMembers,
        availableProjects: s.availableProjects,
        availableStates: s.availableStates,
        activeOverlay: null,
      }
    }

    case 'TOGGLE_THEME': {
      const next = state.theme === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return { ...state, theme: next as Theme }
    }

    case 'RESET':
      return { ...initialState, viewer: state.viewer, theme: state.theme }

    default:
      return state
  }
}

export const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
  state: initialState,
  dispatch: () => {},
})

export function useApp() {
  return useContext(AppContext)
}

export { useReducer }
