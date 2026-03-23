import type { LinearUser, Organization, Team, Project, Member, Label, Issue, WorkflowState } from './types'

const API_URL = '/api/graphql'

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ query, variables }),
  })

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  const json = await res.json()
  if (json.errors) {
    throw new Error(json.errors[0]?.message || 'GraphQL error')
  }
  return json.data as T
}

export async function checkSession(): Promise<{ viewer: LinearUser; organization: Organization | null } | null> {
  try {
    const res = await fetch('/auth/me', { credentials: 'same-origin' })
    if (!res.ok) return null
    const data = await res.json()
    return { viewer: data.viewer, organization: data.organization ?? null }
  } catch {
    return null
  }
}

export async function logout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' })
}

export async function fetchTeams(): Promise<Team[]> {
  const data = await gql<{ teams: { nodes: Team[] } }>(`
    query Teams { teams { nodes { id name } } }
  `)
  return data.teams.nodes
}

export async function fetchViewer(): Promise<LinearUser> {
  const data = await gql<{ viewer: LinearUser }>(`
    query Viewer { viewer { id name displayName avatarUrl } }
  `)
  return data.viewer
}

export async function fetchTeamDetails(teamId: string): Promise<{
  projects: Project[]
  members: Member[]
  labels: Label[]
  states: WorkflowState[]
}> {
  const data = await gql<{
    team: {
      projects: { nodes: Project[] }
      members: { nodes: Member[] }
      labels: { nodes: Label[] }
      states: { nodes: WorkflowState[] }
    }
  }>(`
    query TeamDetails($teamId: String!) {
      team(id: $teamId) {
        projects { nodes { id name } }
        members { nodes { id name displayName avatarUrl } }
        labels { nodes { id name color } }
        states { nodes { id name color type } }
      }
    }
  `, { teamId })

  return {
    projects: data.team.projects.nodes,
    members: data.team.members.nodes,
    labels: data.team.labels.nodes,
    states: data.team.states.nodes,
  }
}

export async function fetchViewerTeams(): Promise<Team[]> {
  const data = await gql<{
    viewer: { teamMemberships: { nodes: { team: Team }[] } }
  }>(`
    query ViewerTeams {
      viewer {
        teamMemberships {
          nodes {
            team { id name }
          }
        }
      }
    }
  `)
  return data.viewer.teamMemberships.nodes.map(n => n.team)
}

export async function fetchAllTeamsData(teamIds: string[]): Promise<{
  projects: Project[]
  members: Member[]
  labels: Label[]
  states: WorkflowState[]
}> {
  const results = await Promise.all(teamIds.map(id => fetchTeamDetails(id)))

  const seen = { projects: new Set<string>(), members: new Set<string>(), labels: new Set<string>(), states: new Set<string>() }
  const projects: Project[] = []
  const members: Member[] = []
  const labels: Label[] = []
  const states: WorkflowState[] = []

  for (const r of results) {
    for (const p of r.projects) { if (!seen.projects.has(p.id)) { seen.projects.add(p.id); projects.push(p) } }
    for (const m of r.members) { if (!seen.members.has(m.id)) { seen.members.add(m.id); members.push(m) } }
    for (const l of r.labels) { if (!seen.labels.has(l.id)) { seen.labels.add(l.id); labels.push(l) } }
    for (const s of r.states) { if (!seen.states.has(s.id)) { seen.states.add(s.id); states.push(s) } }
  }

  return { projects, members, labels, states }
}

export async function fetchIssues(
  filter: Record<string, unknown>,
  first = 250
): Promise<Issue[]> {
  const data = await gql<{ issues: { nodes: Issue[] } }>(`
    query Issues($filter: IssueFilter!, $first: Int!) {
      issues(filter: $filter, first: $first, orderBy: createdAt) {
        nodes {
          id
          identifier
          title
          description
          priority
          estimate
          state { id name color type }
          assignee { id name displayName avatarUrl }
          project { id name }
          labels { nodes { id name color } }
          url
        }
      }
    }
  `, { filter, first })

  return data.issues.nodes
}

export async function fetchIssueCount(
  filter: Record<string, unknown>,
): Promise<number> {
  const data = await gql<{ issueCount: number }>(`
    query IssueCount($filter: IssueFilter!) {
      issueCount(filter: $filter)
    }
  `, { filter })

  return data.issueCount
}

export async function updateIssue(
  id: string,
  input: Record<string, unknown>
): Promise<{ success: boolean; identifier: string }> {
  const data = await gql<{
    issueUpdate: { success: boolean; issue: { id: string; identifier: string } }
  }>(`
    mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
      issueUpdate(id: $id, input: $input) {
        success
        issue { id identifier }
      }
    }
  `, { id, input })

  return {
    success: data.issueUpdate.success,
    identifier: data.issueUpdate.issue.identifier,
  }
}
