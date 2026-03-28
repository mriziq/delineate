export interface LinearUser {
  id: string
  name: string
  email?: string
  displayName?: string
  avatarUrl?: string
}

export interface Organization {
  id: string
  name: string
  urlKey: string
}

export interface Team {
  id: string
  name: string
}

export interface Project {
  id: string
  name: string
}

export interface Label {
  id: string
  name: string
  color: string
}

export interface WorkflowState {
  id: string
  name: string
  color: string
  type: string
}

export interface Member {
  id: string
  name: string
  displayName: string
  avatarUrl?: string
}

export interface Issue {
  id: string
  identifier: string
  title: string
  description?: string
  priority: number
  estimate?: number | null
  state: WorkflowState
  assignee?: Member | null
  project?: Project | null
  labels: { nodes: Label[] }
  url: string
}

export type FilterMode = 'my-issues' | 'team'

export interface FilterConfig {
  mode: FilterMode
  teamId: string
  projectIds: string[]
  assigneeId: string | null
  states: string[]
  unestimatedOnly: boolean
}

export interface PendingChange {
  issueId: string
  identifier: string
  title: string
  changes: {
    priority?: number
    estimate?: number | null
    labelIds?: string[]
    assigneeId?: string | null
    projectId?: string | null
  }
  originalValues: {
    priority: number
    estimate: number | null
    labelIds: string[]
    assigneeId: string | null
    projectId: string | null
  }
}

export type Screen = 'setup' | 'workspace' | 'review'
export type Overlay = 'estimate' | 'label' | 'assignee' | 'project' | 'cheatsheet' | 'detail' | 'ghost-config' | null
export type GhostKeyPosition = 'above' | 'overlay' | 'below'
export type GhostStepId = 'priority' | 'estimate' | 'label' | 'assignee' | 'project'

export interface GhostStepConfig {
  id: GhostStepId
  enabled: boolean
}

export const DEFAULT_GHOST_STEPS: GhostStepConfig[] = [
  { id: 'priority', enabled: true },
  { id: 'estimate', enabled: true },
  { id: 'label', enabled: false },
  { id: 'assignee', enabled: false },
  { id: 'project', enabled: false },
]

export type Theme = 'dark' | 'light'
