/**
 * api/cybervidya.ts — Self-contained Vercel Serverless Function for CyberVidya API Integration
 *
 * Designed to execute cleanly in Vercel Serverless Node.js environment without
 * relative module-resolution errors across /api and /src directories.
 */

import crypto from 'node:crypto'

// Force Node.js runtime and Mumbai, India (bom1) region to pass CyberVidya's Indian WAF/geo-block
export const config = {
  runtime: 'nodejs',
  regions: ['bom1'],
}
export const preferredRegion = ['bom1']

// ---------------------------------------------------------------------------
// Constants & Encryption
// ---------------------------------------------------------------------------

const CYBERVIDYA_KEY_BASE64 = 'NPdLWA5w7yFQhPeUuKmO/A=='
const CYBERVIDYA_IV_BASE64 = 'bV5V6nK4phvQG9ZhkAjugQ=='
const KEY_BUFFER = Buffer.from(CYBERVIDYA_KEY_BASE64, 'base64')
const IV_BUFFER = Buffer.from(CYBERVIDYA_IV_BASE64, 'base64')

export const CYBERVIDYA_LIVE_URL = 'https://kiet.cybervidya.net'
export const CYBERVIDYA_PROXY_URL = 'https://proxy.cybervidya.workers.dev'

function encryptCyberVidyaString(plaintext: string): string {
  if (!plaintext) return ''
  const cipher = crypto.createCipheriv('aes-128-cbc', KEY_BUFFER, IV_BUFFER)
  let encrypted = cipher.update(plaintext, 'utf8', 'base64')
  encrypted += cipher.final('base64')
  return encrypted
}

function resolvePortalBaseUrl(portalUrl?: string, mode?: string): string {
  if (portalUrl && portalUrl.trim()) {
    return portalUrl.trim().replace(/\/+$/, '')
  }
  return mode === 'proxy' ? CYBERVIDYA_PROXY_URL : CYBERVIDYA_LIVE_URL
}

function formatAuthHeader(token: string): string {
  if (!token) return ''
  const clean = token
    .replace(/^"|"$/g, '')
    .trim()
    .replace(/^(GlobalEducation\s*)+/i, '')
  return `GlobalEducation ${clean}`
}

function getBrowserHeaders(
  baseUrl: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: CYBERVIDYA_LIVE_URL, // Must match KIET ERP origin to pass Nginx WAF
    Referer: `${CYBERVIDYA_LIVE_URL}/`,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    ...extraHeaders,
  }
}

// ---------------------------------------------------------------------------
// Attendance Normalization
// ---------------------------------------------------------------------------

function formatSuggestedSubjectName(
  courseName: string,
  componentName?: string,
  totalComponents = 1,
): string {
  const cleanCourse = (courseName || 'Subject').trim()
  const cleanComp = (componentName || '').trim()

  if (!cleanComp || totalComponents <= 1) {
    return cleanCourse
  }

  const courseLower = cleanCourse.toLowerCase()
  const compLower = cleanComp.toLowerCase()
  if (courseLower.includes(compLower)) {
    return cleanCourse
  }

  return `${cleanCourse} (${cleanComp})`
}

function normalizeCyberVidyaResponse(raw: any) {
  const student = {
    fullName: raw.fullName || 'Student',
    rollNumber: raw.registrationNumber || '',
    sectionName: raw.sectionName,
    branch: raw.branchShortName,
    degree: raw.degreeName,
    semester: raw.semesterName,
  }

  const subjects: any[] = []
  const courseList = raw.attendanceCourseComponentInfoList || []

  for (const course of courseList) {
    const components = course.attendanceCourseComponentNameInfoList || []
    const totalComps = components.length

    for (const comp of components) {
      const externalId = `${course.courseId}_${comp.courseComponentId}`
      const suggestedSubjectName = formatSuggestedSubjectName(
        course.courseName,
        comp.componentName,
        totalComps,
      )

      subjects.push({
        externalId,
        studentId: course.studentId || raw.id || raw.studentId || 1000,
        courseId: course.courseId || 0,
        courseCompId: comp.courseComponentId || 0,
        courseCode: course.courseCode || '',
        courseName: course.courseName || '',
        componentName: comp.componentName || '',
        suggestedSubjectName,
        classesDone: Math.max(0, comp.numberOfPeriods || 0),
        classesAttended: Math.max(
          0,
          (comp.numberOfPresent || 0) + (comp.numberOfExtraAttendance || 0),
        ),
        extraAttendance: comp.numberOfExtraAttendance || 0,
        percentage: comp.presentPercentage ?? null,
      })
    }
  }

  return { student, subjects }
}

// ---------------------------------------------------------------------------
// Step 1: Login / OTP Initiation
// ---------------------------------------------------------------------------

async function handleLogin(body: any) {
  const cleanUser = (body.username || '').trim()
  const cleanPass = (body.password || '').trim()

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      requiresOtp: false,
      error: 'University roll number and password are required.',
    }
  }

  const baseUrl = resolvePortalBaseUrl(body.portalUrl, body.mode)
  const endpoint = `${baseUrl}/api/auth/encrypt/login`

  try {
    const encryptedUser = encryptCyberVidyaString(cleanUser)
    const encryptedPass = encryptCyberVidyaString(cleanPass)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getBrowserHeaders(baseUrl),
      body: JSON.stringify({
        userName: encryptedUser,
        password: encryptedPass,
        device: 'WEB',
        version: null,
        reCaptchaToken: null,
      }),
    })

    const status = response.status
    let rawText = ''
    let json: any = {}
    try {
      rawText = await response.text()
      json = JSON.parse(rawText)
    } catch {
      json = {}
    }

    if (!response.ok) {
      const serverReason =
        json.error?.reason || json.error?.message || json.message || ''

      if (status === 400) {
        return {
          success: false,
          requiresOtp: false,
          error:
            serverReason ||
            'Invalid University roll number or password. Please verify your credentials.',
        }
      }

      if (status === 403) {
        const currentRegion = process.env.VERCEL_REGION || process.env.AWS_REGION || 'local'
        const isNotIndia =
          currentRegion !== 'bom1' &&
          currentRegion !== 'ap-south-1' &&
          currentRegion !== 'local'

        let errorMsg = serverReason || (rawText && rawText.length < 120 ? rawText : '')
        if (!errorMsg || errorMsg === 'Blocked') {
          if (isNotIndia) {
            errorMsg = `Access forbidden by CyberVidya portal (HTTP 403). The Vercel function is currently executing in region "${currentRegion}" (outside India). CyberVidya blocks requests outside India. Even if you updated Vercel Project Settings to Mumbai (bom1), you must trigger a Redeploy in the Vercel Deployments tab for it to take effect.`
          } else {
            errorMsg = `Access forbidden by CyberVidya portal (HTTP 403) [Region: ${currentRegion}]. Server returned: "${rawText || 'Blocked'}". If using Proxy Mode, switch back to "Live (Direct KIET)".`
          }
        }

        return {
          success: false,
          requiresOtp: false,
          error: errorMsg,
        }
      }

      if (status === 429) {
        return {
          success: false,
          requiresOtp: false,
          error:
            'Portal OTP rate limit reached. Please wait a few minutes before trying again.',
        }
      }

      return {
        success: false,
        requiresOtp: false,
        error: serverReason || `Portal login failed with HTTP status ${status}.`,
      }
    }

    // Direct token bypass (rare)
    const directToken = json.token || json.data?.token
    if (directToken) {
      return {
        success: true,
        requiresOtp: false,
        token: directToken,
        studentId: json.data?.id,
        message: 'Authentication successful.',
      }
    }

    // Standard OTP dispatched flow
    const transactionId = json.data?.transactionId
    if (transactionId) {
      return {
        success: true,
        requiresOtp: true,
        transactionId,
        message: 'OTP has been dispatched to your registered student email.',
      }
    }

    return {
      success: false,
      requiresOtp: false,
      error: 'Portal responded without an authentication token or OTP transaction ID.',
    }
  } catch (err: any) {
    return {
      success: false,
      requiresOtp: false,
      error:
        err?.message?.includes('fetch') || err?.code === 'ENOTFOUND'
          ? 'Unable to reach CyberVidya servers. Please verify network access.'
          : err?.message || 'Network error connecting to CyberVidya.',
    }
  }
}

// ---------------------------------------------------------------------------
// Step 2: OTP Verification
// ---------------------------------------------------------------------------

async function handleVerifyOtp(body: any) {
  const cleanTx = (body.transactionId || '').trim()
  const cleanOtp = (body.otp || '').trim()

  if (!cleanTx || !cleanOtp) {
    return {
      success: false,
      error: 'Transaction ID and OTP code are required.',
    }
  }

  const baseUrl = resolvePortalBaseUrl(body.portalUrl, body.mode)
  const endpoint = `${baseUrl}/api/auth/verify/otp`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getBrowserHeaders(baseUrl),
      body: JSON.stringify({
        otp: cleanOtp,
        transactionId: cleanTx,
        device: 'WEB',
        version: null,
      }),
    })

    const status = response.status
    let rawText = ''
    let json: any = {}
    try {
      rawText = await response.text()
      json = JSON.parse(rawText)
    } catch {
      json = {}
    }

    if (!response.ok) {
      const serverReason =
        json.error?.reason || json.error?.message || json.message || ''

      if (status === 400 || status === 403) {
        const currentRegion = process.env.VERCEL_REGION || process.env.AWS_REGION || 'local'
        return {
          success: false,
          error:
            serverReason ||
            (status === 403
              ? `Access forbidden by CyberVidya (HTTP 403) [Region: ${currentRegion}]. Ensure Mumbai (bom1) is active and project is redeployed on Vercel.`
              : 'Invalid or expired OTP. Please check the code in your email or request a new one.'),
        }
      }

      if (status === 429) {
        return {
          success: false,
          error: 'Rate limit reached. Please wait before attempting OTP verification.',
        }
      }

      return {
        success: false,
        error: serverReason || `OTP verification failed with HTTP status ${status}.`,
      }
    }

    const token = json.token || json.data?.token
    if (!token) {
      return {
        success: false,
        error: 'OTP verified, but the server failed to provide an authorization token.',
      }
    }

    return {
      success: true,
      token,
      studentId: json.data?.id,
      message: 'OTP verified successfully.',
    }
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message?.includes('fetch') || err?.code === 'ENOTFOUND'
          ? 'Network error reaching CyberVidya during OTP verification.'
          : err?.message || 'Failed to verify OTP.',
    }
  }
}

// ---------------------------------------------------------------------------
// Step 3: Fetch Attendance Data
// ---------------------------------------------------------------------------

async function handleAttendance(body: any) {
  const cleanToken = (body.token || '').trim()
  if (!cleanToken) {
    return {
      success: false,
      error: 'Missing authentication session token.',
    }
  }

  const baseUrl = resolvePortalBaseUrl(body.portalUrl, body.mode)
  const endpoint = `${baseUrl}/api/attendance/course/component/student`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBrowserHeaders(baseUrl, {
        Authorization: formatAuthHeader(cleanToken),
      }),
    })

    const status = response.status
    if (status === 401) {
      return {
        success: false,
        error: 'Session expired. Please reconnect to CyberVidya with a fresh OTP.',
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: `Failed to fetch attendance data (HTTP ${status}).`,
      }
    }

    const json = (await response.json()) as any
    if (!json.data || !json.data.attendanceCourseComponentInfoList) {
      return {
        success: false,
        error: 'Portal returned an empty or malformed attendance response.',
      }
    }

    const normalized = normalizeCyberVidyaResponse(json.data)
    return {
      success: true,
      data: normalized,
      message: `Retrieved attendance for ${normalized.subjects.length} subjects.`,
    }
  } catch (err: any) {
    return {
      success: false,
      error:
        err?.message?.includes('fetch') || err?.code === 'ENOTFOUND'
          ? 'Network error reaching CyberVidya attendance endpoint.'
          : err?.message || 'Failed to fetch attendance.',
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: Lecture Wise Attendance
// ---------------------------------------------------------------------------

async function handleLectureAttendance(body: any) {
  const cleanToken = (body.token || '').trim()
  if (!cleanToken) {
    return { success: false, error: 'Missing token' }
  }

  const baseUrl = resolvePortalBaseUrl(body.portalUrl, body.mode)
  const endpoint = `${baseUrl}/api/attendance/schedule/student/course/attendance/percentage`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getBrowserHeaders(baseUrl, {
        Authorization: formatAuthHeader(cleanToken),
      }),
      body: JSON.stringify({
        studentId: body.studentId || 1000,
        courseId: body.courseId,
        courseCompId: body.courseCompId,
      }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, data: [] }
    }

    const json = (await response.json().catch(() => ({}))) as any
    const list = json?.data?.[0]?.lectureList || []
    return { success: true, data: list }
  } catch (err: any) {
    return { success: false, error: err?.message, data: [] }
  }
}

async function handleSchedule(body: any) {
  const cleanToken = (body.token || '').trim()
  if (!cleanToken) {
    return { success: false, error: 'Missing token', data: [] }
  }

  const baseUrl = resolvePortalBaseUrl(body.portalUrl, body.mode)
  const now = new Date()
  const startDateObj = new Date(now)
  startDateObj.setDate(now.getDate() - 7)
  const endDateObj = new Date(now)
  endDateObj.setDate(now.getDate() + 14)

  const formatD = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const weekStartDate = formatD(startDateObj)
  const weekEndDate = formatD(endDateObj)
  const endpoint = `${baseUrl}/api/student/schedule/class?weekEndDate=${weekEndDate}&weekStartDate=${weekStartDate}`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBrowserHeaders(baseUrl, {
        Authorization: formatAuthHeader(cleanToken),
      }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, data: [] }
    }

    const json = (await response.json().catch(() => ({}))) as any
    const list = json?.data || []
    return { success: true, data: list }
  } catch (err: any) {
    return { success: false, error: err?.message, data: [] }
  }
}

async function handleRegisteredCourses(body: any) {
  const cleanToken = (body.token || '').trim()
  if (!cleanToken) {
    return { success: false, error: 'Missing token', data: [] }
  }

  const baseUrl = resolvePortalBaseUrl(body.portalUrl, body.mode)
  const endpoint = `${baseUrl}/api/student/dashboard/registered-courses`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: getBrowserHeaders(baseUrl, {
        Authorization: formatAuthHeader(cleanToken),
      }),
    })

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}`, data: [] }
    }

    const json = (await response.json().catch(() => ({}))) as any
    const list = json?.data || []
    return { success: true, data: list }
  } catch (err: any) {
    return { success: false, error: err?.message, data: [] }
  }
}

function handleVerifyAdmin(body: any) {
  const expectedKey = (process.env.ADMIN_KEY || process.env.VITE_ADMIN_KEY || 'kiet@admin2026').trim()
  const provided = (body.passcode || body.key || '').trim()

  if (!provided) {
    return { success: false, error: 'Passcode is required.' }
  }

  if (provided === expectedKey) {
    return { success: true, message: 'Admin authenticated successfully.' }
  }

  return { success: false, error: 'Invalid Admin Passcode.' }
}

// ---------------------------------------------------------------------------
// Request Helpers
// ---------------------------------------------------------------------------

async function parseBody(req: any): Promise<Record<string, any>> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body)
      } catch {
        return {}
      }
    }
    if (typeof req.body === 'object') {
      return req.body
    }
  }

  return new Promise((resolve) => {
    let raw = ''
    req.on?.('data', (chunk: any) => {
      raw += chunk
    })
    req.on?.('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
    req.on?.('error', () => resolve({}))
  })
}

function sendJson(res: any, status: number, data: any) {
  const currentRegion = process.env.VERCEL_REGION || process.env.AWS_REGION || 'local'
  res.setHeader?.('Access-Control-Allow-Credentials', 'true')
  res.setHeader?.('Access-Control-Allow-Origin', '*')
  res.setHeader?.('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader?.(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
  )
  res.setHeader?.('Content-Type', 'application/json')
  res.setHeader?.('X-Vercel-Region', currentRegion)

  if (typeof res.status === 'function') {
    if (typeof res.json === 'function') {
      return res.status(status).json(data)
    }
    res.statusCode = status
    return res.end(JSON.stringify(data))
  }

  if ('statusCode' in res) {
    res.statusCode = status
    return res.end(JSON.stringify(data))
  }

  if (typeof res.writeHead === 'function') {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(data))
  }
}

// ---------------------------------------------------------------------------
// Vercel Serverless Function Handler
// ---------------------------------------------------------------------------

export default async function handler(req: any, res: any) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.setHeader?.('Access-Control-Allow-Credentials', 'true')
    res.setHeader?.('Access-Control-Allow-Origin', '*')
    res.setHeader?.('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    res.setHeader?.(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization',
    )
    if (typeof res.status === 'function') {
      return res.status(200).end()
    }
    res.statusCode = 200
    return res.end()
  }

  // Diagnostic & Health Check GET endpoint to easily verify active deployment region
  if (req.method === 'GET') {
    const region = process.env.VERCEL_REGION || process.env.AWS_REGION || 'local'
    return sendJson(res, 200, {
      status: 'ok',
      service: 'CyberVidya Serverless Proxy',
      region,
      isMumbai: region === 'bom1' || region === 'ap-south-1',
      nodeVersion: process.version,
    })
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { success: false, error: 'Method not allowed' })
  }

  try {
    const body = await parseBody(req)

    const queryAction =
      req.query?.action ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('action') : null)
    const action = queryAction || body.action

    switch (action) {
      case 'login': {
        const result = await handleLogin(body)
        return sendJson(res, result.success ? 200 : 400, result)
      }

      case 'verify-otp': {
        const result = await handleVerifyOtp(body)
        return sendJson(res, result.success ? 200 : 400, result)
      }

      case 'attendance': {
        const result = await handleAttendance(body)
        return sendJson(res, result.success ? 200 : 400, result)
      }

      case 'lecture-attendance': {
        const result = await handleLectureAttendance(body)
        return sendJson(res, result.success ? 200 : 400, result)
      }

      case 'schedule': {
        const result = await handleSchedule(body)
        return sendJson(res, result.success ? 200 : 400, result)
      }

      case 'registered-courses': {
        const result = await handleRegisteredCourses(body)
        return sendJson(res, result.success ? 200 : 400, result)
      }

      case 'verify-admin': {
        const result = handleVerifyAdmin(body)
        return sendJson(res, result.success ? 200 : 401, result)
      }

      default:
        return sendJson(res, 400, {
          success: false,
          error: `Unknown action: "${action}". Valid actions: login, verify-otp, attendance, lecture-attendance, schedule, registered-courses, verify-admin`,
        })
    }
  } catch (err: any) {
    console.error('CyberVidya API Server Error:', err)
    return sendJson(res, 500, {
      success: false,
      error: err?.message || 'Internal server error processing CyberVidya request.',
    })
  }
}
