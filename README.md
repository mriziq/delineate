<p align="center">
  <img src="public/favicon/icon-512.png" alt="Delineate logo" width="128" height="128" />
</p>

<h1 align="center">Delineate</h1>

<p align="center">
  <strong>Tinder meets Superhuman — for your Linear backlog.</strong><br />
  Swipe through issues, triage with your keyboard, commit changes in a single batch.<br />
  Inbox zero for your backlog in minutes, not hours.
</p>

<p align="center">
  <a href="https://delineate.mriziq.com"><strong>Try the Live App</strong></a> &nbsp;&middot;&nbsp;
  <a href="#quick-start">Self-Host</a> &nbsp;&middot;&nbsp;
  <a href="#features">Features</a> &nbsp;&middot;&nbsp;
  <a href="https://github.com/mriziq/delineate/issues">Report a Bug</a>
</p>

<p align="center">
  <a href="https://github.com/mriziq/delineate/stargazers"><img src="https://img.shields.io/github/stars/mriziq/delineate?style=flat-square&color=f2c94c" alt="Stars" /></a>
  <a href="https://github.com/mriziq/delineate/blob/main/LICENSE"><img src="https://img.shields.io/github/license/mriziq/delineate?style=flat-square" alt="License" /></a>
  <a href="https://github.com/mriziq/delineate/issues"><img src="https://img.shields.io/github/issues/mriziq/delineate?style=flat-square" alt="Issues" /></a>
  <a href="https://github.com/mriziq/delineate/pulls"><img src="https://img.shields.io/github/issues-pr/mriziq/delineate?style=flat-square" alt="Pull Requests" /></a>
  <a href="https://github.com/mriziq/delineate"><img src="https://img.shields.io/github/last-commit/mriziq/delineate?style=flat-square" alt="Last Commit" /></a>
  <a href="https://github.com/mriziq/delineate"><img src="https://img.shields.io/github/repo-size/mriziq/delineate?style=flat-square" alt="Repo Size" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/react-19-58c4dc?style=flat-square&logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/typescript-5.9-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5.9" />
  <img src="https://img.shields.io/badge/vite-8-646cff?style=flat-square&logo=vite&logoColor=white" alt="Vite 8" />
  <img src="https://img.shields.io/badge/express-5-000000?style=flat-square&logo=express&logoColor=white" alt="Express 5" />
  <img src="https://img.shields.io/badge/PRs-welcome-4cb782?style=flat-square" alt="PRs Welcome" />
</p>

<br />

<p align="center">
  <img src="public/marketing/og-image.png" alt="Delineate screenshot — triage your Linear backlog at the speed of thought" width="720" />
</p>

---

## The Problem

Linear is fantastic for project management. But triaging a large backlog in it? Not so much.

- Keyboard shortcuts conflict or misfire (try pressing <kbd>G</kbd> then <kbd>S</kbd> to go to settings mid-triage)
- Bulk editing is clunky — context-switching between issues kills your flow
- There's no dedicated "work through the pile" mode

If you've ever stared at 200+ untriaged issues and thought *"there has to be a better way"* — this is it.

## The Solution

**Delineate** presents your untriaged issues one at a time as cards. Assign priority, estimate, labels, project, and assignee using only your keyboard. When you're done, batch-commit every change to Linear at once.

No mouse. No context-switching. No mercy for your backlog.

## Features

### Card-Based Triage
Every issue appears as a focused card — title, description, status, and all metadata at a glance. No list fatigue, no decision paralysis. Just one issue, one decision, move on.

### Keyboard-First Everything
Every action has a keybinding. Set priority with <kbd>1</kbd>-<kbd>4</kbd>, open the estimate picker with <kbd>E</kbd>, assign labels with <kbd>L</kbd>, navigate with <kbd>Space</kbd> and <kbd>←</kbd>. Your hands never leave the keyboard.

<details>
<summary><strong>Full keyboard shortcut reference</strong></summary>

| Key | Action |
|-----|--------|
| <kbd>Space</kbd> / <kbd>→</kbd> / <kbd>Enter</kbd> | Next card |
| <kbd>←</kbd> | Previous card |
| <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> <kbd>4</kbd> | Set priority (Urgent / High / Medium / Low) |
| <kbd>E</kbd> | Estimate picker (Fibonacci: 1 / 2 / 3 / 5 / 8 / 13 / 21) |
| <kbd>L</kbd> | Label picker (multi-select with search) |
| <kbd>A</kbd> | Assignee picker (search by name) |
| <kbd>P</kbd> | Project picker (search by name) |
| <kbd>O</kbd> | Expand issue detail overlay |
| <kbd>R</kbd> | Toggle review drawer |
| <kbd>Z</kbd> | Undo all changes on current card |
| <kbd>T</kbd> | Toggle light/dark theme |
| <kbd>?</kbd> | Open cheatsheet |
| <kbd>/</kbd> | Toggle shortcuts bar |
| <kbd>Esc</kbd> | Close any overlay |

</details>

### Ghost Keys
Configurable, context-aware keyboard hints that float around each card, guiding you through the triage workflow step by step. They breathe, glow, and pop when you press them. Configure their position (above, on, or below the card), opacity, and which steps to show. Drag to reorder your triage flow.

### Batch Commit
Stage changes across dozens of issues, review them all in a summary screen (with confetti), then push everything to Linear in one shot. No half-triaged backlogs.

### Smart Filters
Filter by team, project, assignee, workflow state, or just "my issues." See an issue count before loading so you know what you're getting into.

### Session Persistence
Close the tab mid-triage? No problem. Your progress auto-saves to localStorage with a 24-hour TTL. Pick up right where you left off.

### Dark & Light Themes
Toggle with <kbd>T</kbd>. Both themes are carefully designed with Linear-inspired colors and proper contrast.

## Quick Start

### Option 1: Use the hosted version

Head to **[delineate.mriziq.com](https://delineate.mriziq.com)**, sign in with Linear, and start triaging. That's it.

### Option 2: Self-host

#### 1. Create a Linear OAuth App

Go to **Linear Settings → API → OAuth Applications → New OAuth Application**.

| Field | Value |
|-------|-------|
| **Name** | Delineate (or anything you like) |
| **Redirect URI** | `http://localhost:5173/auth/callback` (dev) or `https://yourdomain.com/auth/callback` (prod) |

Save the **Client ID** and **Client Secret**.

#### 2. Configure environment

```bash
cp .env.example .env  # or create manually
```

```env
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_random_secret    # generate: openssl rand -hex 32
APP_URL=http://localhost:5173
```

<details>
<summary>All environment variables</summary>

| Variable | Required | Description |
|----------|----------|-------------|
| `LINEAR_CLIENT_ID` | Yes | OAuth Client ID from Linear |
| `LINEAR_CLIENT_SECRET` | Yes | OAuth Client Secret from Linear |
| `SESSION_SECRET` | Yes | Random string for signing session cookies |
| `APP_URL` | Yes | Public URL (`http://localhost:5173` for dev) |
| `PORT` | No | Express server port (default: `3000`) |
| `NODE_ENV` | No | Set `production` for HTTPS redirect, secure cookies, CSP |

</details>

#### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Express backend runs on port 3000, Vite on 5173.

## Production Deployment

```bash
npm run build
NODE_ENV=production npm start
```

Builds the frontend and serves everything from a single Express process. Make sure your Linear OAuth app's redirect URI includes your production callback URL.

**Vercel-ready** — includes `vercel.json` with proper routing. Just set the env vars and deploy.

## Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | React 19, TypeScript 5.9, Vite 8 |
| **Backend** | Express 5, cookie-session |
| **Auth** | Linear OAuth 2.0 |
| **Security** | Helmet CSP, rate limiting (10 req/min auth, 120 req/min API), httpOnly secure cookies |
| **Styling** | CSS custom properties, Inter + JetBrains Mono |

Zero external UI libraries. No Redux. No Tailwind. Just React, CSS, and vibes.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend for local development |
| `npm run dev:server` | Start only the Express backend |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run build` | Type-check and build the frontend |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## Author

Created by [@mriziq](https://github.com/mriziq).

## License

MIT
