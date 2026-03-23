# Triage — Linear Issue Triage Tool

A keyboard-driven app for blazing through your Linear backlog. Swipe through issues, set priority, estimate, labels, assignee, and project — then commit all changes in one batch.

## Setup

### 1. Create a Linear OAuth App

Go to **Linear Settings > API > OAuth Applications > New OAuth Application**.

- **Name**: Triage (or whatever you like)
- **Redirect URI**: `http://localhost:5173/auth/callback` for local dev, `https://yourdomain.com/auth/callback` for production

You'll get a **Client ID** and **Client Secret**.

### 2. Environment Variables

Create a `.env` file in the project root (or set these in your hosting platform):

```
LINEAR_CLIENT_ID=your_client_id
LINEAR_CLIENT_SECRET=your_client_secret
SESSION_SECRET=your_random_secret
APP_URL=http://localhost:5173
```

| Variable | Description |
|---|---|
| `LINEAR_CLIENT_ID` | OAuth Client ID from Linear |
| `LINEAR_CLIENT_SECRET` | OAuth Client Secret from Linear |
| `SESSION_SECRET` | Random string for signing session cookies. Generate with `openssl rand -hex 32` |
| `APP_URL` | Public URL of the app. `http://localhost:5173` for local dev, `https://yourdomain.com` for production |
| `PORT` | (Optional) Port for the Express server. Defaults to `3000` |
| `NODE_ENV` | (Optional) Set to `production` to enable HTTPS redirect, secure cookies, and CSP headers |

### 3. Install and Run

```bash
npm install
npm run dev
```

This starts both the Express backend (port 3000) and Vite frontend (port 5173). Open `http://localhost:5173`.

## Production Deployment

```bash
npm run build
npm start
```

This builds the frontend and serves everything from a single Express process. Set `NODE_ENV=production`, `APP_URL=https://yourdomain.com`, and your OAuth credentials as environment variables in your hosting platform.

Make sure your Linear OAuth app's redirect URI includes `https://yourdomain.com/auth/callback`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both backend and frontend for local development |
| `npm run dev:server` | Start only the Express backend |
| `npm run dev:client` | Start only the Vite frontend |
| `npm run build` | Type-check and build the frontend to `dist/` |
| `npm start` | Start the production server (serves `dist/` + API) |
| `npm run lint` | Run ESLint |
