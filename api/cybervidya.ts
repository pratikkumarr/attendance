/**
 * api/cybervidya.ts — Vercel Serverless Function entry point for CyberVidya requests
 */

import {
  initiateCyberVidyaLogin,
  verifyCyberVidyaOtp,
  fetchCyberVidyaAttendance,
} from '../src/server/cybervidyaService'

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const action = req.query?.action || req.body?.action
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}

    switch (action) {
      case 'login': {
        const { username, password, portalUrl, mode } = body
        const result = await initiateCyberVidyaLogin(username, password, { portalUrl, mode })
        return res.status(result.success ? 200 : 400).json(result)
      }

      case 'verify-otp': {
        const { transactionId, otp, portalUrl, mode } = body
        const result = await verifyCyberVidyaOtp(transactionId, otp, { portalUrl, mode })
        return res.status(result.success ? 200 : 400).json(result)
      }

      case 'attendance': {
        const { token, portalUrl, mode } = body
        const result = await fetchCyberVidyaAttendance(token, { portalUrl, mode })
        return res.status(result.success ? 200 : 400).json(result)
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown action: "${action}". Valid actions: login, verify-otp, attendance`,
        })
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Internal server error processing CyberVidya request.',
    })
  }
}
