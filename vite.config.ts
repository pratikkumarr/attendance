import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import {
  initiateCyberVidyaLogin,
  verifyCyberVidyaOtp,
  fetchCyberVidyaAttendance,
} from './src/server/cybervidyaService'

function cybervidyaDevMiddleware(): Plugin {
  return {
    name: 'cybervidya-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/cybervidya')) {
          return next()
        }

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')

        if (req.method === 'OPTIONS') {
          res.statusCode = 200
          return res.end()
        }

        if (req.method !== 'POST') {
          res.statusCode = 405
          return res.end(JSON.stringify({ success: false, error: 'Method not allowed' }))
        }

        const parsedUrl = new URL(req.url, 'http://localhost')
        const queryAction = parsedUrl.searchParams.get('action')

        let rawBody = ''
        req.on('data', (chunk) => {
          rawBody += chunk
        })

        req.on('end', async () => {
          try {
            const body = rawBody ? JSON.parse(rawBody) : {}
            const action = queryAction || body.action

            let result
            if (action === 'login') {
              result = await initiateCyberVidyaLogin(body.username, body.password, {
                portalUrl: body.portalUrl,
                mode: body.mode,
              })
            } else if (action === 'verify-otp') {
              result = await verifyCyberVidyaOtp(body.transactionId, body.otp, {
                portalUrl: body.portalUrl,
                mode: body.mode,
              })
            } else if (action === 'attendance') {
              result = await fetchCyberVidyaAttendance(body.token, {
                portalUrl: body.portalUrl,
                mode: body.mode,
              })
            } else {
              res.statusCode = 400
              return res.end(
                JSON.stringify({
                  success: false,
                  error: `Invalid action: ${action}. Expected: login, verify-otp, or attendance.`,
                }),
              )
            }

            res.statusCode = result.success ? 200 : 400
            return res.end(JSON.stringify(result))
          } catch (err: any) {
            res.statusCode = 500
            return res.end(
              JSON.stringify({
                success: false,
                error: err?.message || 'Server error processing request',
              }),
            )
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), cybervidyaDevMiddleware()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
