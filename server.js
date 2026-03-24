import crypto from 'crypto'
import express from 'express'
import cookieSession from 'cookie-session'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000
const IS_PROD = process.env.NODE_ENV === 'production'

const CLIENT_ID = process.env.LINEAR_CLIENT_ID
const CLIENT_SECRET = process.env.LINEAR_CLIENT_SECRET
const SESSION_SECRET = process.env.SESSION_SECRET

if (!CLIENT_ID || !CLIENT_SECRET || !SESSION_SECRET) {
  const msg = 'Missing required env vars: LINEAR_CLIENT_ID, LINEAR_CLIENT_SECRET, SESSION_SECRET'
  console.error(msg)
  if (!process.env.VERCEL) process.exit(1)
}

// --- Security middleware ---

// Helmet sets security headers (CSP, X-Frame-Options, X-Content-Type-Options, etc.)
app.use(helmet({
  contentSecurityPolicy: IS_PROD ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'https:', 'data:'],
    },
  } : false, // Disable CSP in dev (Vite uses inline scripts)
}))

// HTTPS redirect in production
if (IS_PROD) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`)
    }
    next()
  })
}

// Session middleware — encrypted cookie, no server-side store needed
app.use(cookieSession({
  name: 'triage_session',
  secret: SESSION_SECRET,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  sameSite: 'strict',
  secure: IS_PROD,
}))

app.use(express.json({ limit: '100kb' }))

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,               // 10 auth attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
})

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,              // 120 GraphQL requests per minute
  standardHeaders: true,
  legacyHeaders: false,
})

// App URL — in dev this is the Vite server, in prod the same origin
const APP_URL = process.env.APP_URL || `http://localhost:${PORT}`

function getRedirectUri() {
  return `${APP_URL}/auth/callback`
}

// --- Auth routes ---

app.get('/auth/login', authLimiter, (req, res) => {
  const redirectUri = getRedirectUri()
  const state = crypto.randomBytes(32).toString('hex')
  req.session.oauthState = state
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'read,write',
    prompt: 'consent',
    state,
  })
  res.redirect(`https://linear.app/oauth/authorize?${params}`)
})

app.get('/auth/callback', authLimiter, async (req, res) => {
  const { code, state } = req.query
  if (!code) {
    return res.status(400).send('Missing authorization code')
  }

  // Validate OAuth state to prevent CSRF
  const expectedState = req.session.oauthState
  req.session.oauthState = null // consume the state
  if (!state || !expectedState || state !== expectedState) {
    return res.status(403).send('Invalid OAuth state — possible CSRF attack')
  }

  try {
    const redirectUri = getRedirectUri()
    const tokenRes = await fetch('https://api.linear.app/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: redirectUri,
        code: String(code),
      }),
    })

    if (!tokenRes.ok) {
      console.error('Token exchange failed:', tokenRes.status)
      return res.status(401).send('OAuth token exchange failed')
    }

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      return res.status(401).send('No access token received')
    }

    // Fetch the user's profile
    const viewerRes = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query: '{ viewer { id name email } organization { id name urlKey } }' }),
    })

    const viewerData = await viewerRes.json()
    const viewer = viewerData?.data?.viewer
    const organization = viewerData?.data?.organization

    // Store in session
    req.session.accessToken = accessToken
    req.session.viewer = viewer || null
    req.session.organization = organization || null

    // Redirect to the app
    res.redirect(APP_URL)
  } catch (err) {
    console.error('OAuth callback error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(500).send('Authentication failed')
  }
})

app.get('/auth/me', apiLimiter, (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  res.json({ viewer: req.session.viewer, organization: req.session.organization })
})

app.post('/auth/logout', (req, res) => {
  req.session = null
  res.json({ ok: true })
})

// --- GraphQL proxy ---

app.post('/api/graphql', apiLimiter, async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const linearRes = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.session.accessToken}`,
      },
      body: JSON.stringify(req.body),
    })

    const data = await linearRes.json()

    if (linearRes.status === 401) {
      req.session = null
      return res.status(401).json({ error: 'Token expired or revoked' })
    }

    res.status(linearRes.status).json(data)
  } catch (err) {
    console.error('GraphQL proxy error:', err instanceof Error ? err.message : 'Unknown error')
    res.status(502).json({ error: 'Failed to reach Linear API' })
  }
})

// --- Static files (production, non-Vercel) ---

if (IS_PROD && !process.env.VERCEL) {
  app.use(express.static(join(__dirname, 'dist')))
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'))
  })
}

// Export for Vercel serverless; start server for local/traditional hosting
export default app

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}
