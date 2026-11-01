/**
 * cybervidyaService.ts — Server-side CyberVidya Portal Integration Service
 *
 * Handles encrypted login, OTP verification, and attendance fetching.
 * Strictly avoids logging sensitive user credentials, OTPs, or auth tokens.
 */

import { encryptCyberVidyaString } from '../lib/cybervidya/crypto'
import { normalizeCyberVidyaResponse } from '../lib/cybervidya/sync'
import type {
  CyberVidyaEncryptLoginResponse,
  CyberVidyaOtpResponse,
  CyberVidyaAttendanceApiResponse,
  LoginResponseBody,
  VerifyOtpResponseBody,
  FetchAttendanceResponseBody,
  PortalMode,
} from '../lib/cybervidya/types'

export const CYBERVIDYA_LIVE_URL = 'https://kiet.cybervidya.net'
export const CYBERVIDYA_PROXY_URL = 'https://proxy.cybervidya.workers.dev'

export function resolvePortalBaseUrl(portalUrl?: string, mode?: PortalMode): string {
  if (portalUrl && portalUrl.trim()) {
    return portalUrl.trim().replace(/\/+$/, '')
  }
  return mode === 'proxy' ? CYBERVIDYA_PROXY_URL : CYBERVIDYA_LIVE_URL
}

/**
 * Clean and format the JWT into CyberVidya's required Authorization header:
 * 'GlobalEducation <token>'
 */
export function formatAuthHeader(token: string): string {
  if (!token) return ''
  const clean = token
    .replace(/^"|"$/g, '')
    .trim()
    .replace(/^(GlobalEducation\s*)+/i, '')
  return `GlobalEducation ${clean}`
}

/**
 * Builds standard browser headers required by CyberVidya's Nginx reverse proxy.
 * Nginx enforces Origin & Referer checks on all /api/* requests; omitting them
 * triggers an immediate HTTP 403 'Blocked' error.
 */
function getBrowserHeaders(
  baseUrl: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> {
  const origin = baseUrl.startsWith('http')
    ? new URL(baseUrl).origin
    : CYBERVIDYA_LIVE_URL

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    Origin: CYBERVIDYA_LIVE_URL, // Always present KIET ERP origin to pass Nginx WAF
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

/**
 * Step 1: Encrypted Login / OTP Initiation
 */
export async function initiateCyberVidyaLogin(
  username: string,
  password: string,
  options?: { portalUrl?: string; mode?: PortalMode },
): Promise<LoginResponseBody> {
  const cleanUser = username?.trim()
  const cleanPass = password?.trim()

  if (!cleanUser || !cleanPass) {
    return {
      success: false,
      requiresOtp: false,
      error: 'University roll number and password are required.',
    }
  }

  const baseUrl = resolvePortalBaseUrl(options?.portalUrl, options?.mode)
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
    const json = (await response.json().catch(() => ({}))) as CyberVidyaEncryptLoginResponse

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
        return {
          success: false,
          requiresOtp: false,
          error:
            serverReason ||
            'Access forbidden by CyberVidya. Please check your credentials or network connection.',
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

    // Check if token was returned directly (some accounts bypass OTP)
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

    // Check for transactionId for OTP step
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

/**
 * Step 2: OTP Verification
 */
export async function verifyCyberVidyaOtp(
  transactionId: string,
  otp: string,
  options?: { portalUrl?: string; mode?: PortalMode },
): Promise<VerifyOtpResponseBody> {
  const cleanTx = transactionId?.trim()
  const cleanOtp = otp?.trim()

  if (!cleanTx || !cleanOtp) {
    return {
      success: false,
      error: 'Transaction ID and OTP code are required.',
    }
  }

  const baseUrl = resolvePortalBaseUrl(options?.portalUrl, options?.mode)
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
    const json = (await response.json().catch(() => ({}))) as CyberVidyaOtpResponse

    if (!response.ok) {
      const serverReason =
        json.error?.reason || json.error?.message || json.message || ''

      if (status === 400 || status === 403) {
        return {
          success: false,
          error:
            serverReason ||
            'Invalid or expired OTP. Please check the code in your email or request a new one.',
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

/**
 * Step 3: Fetch Student Attendance Data
 */
export async function fetchCyberVidyaAttendance(
  token: string,
  options?: { portalUrl?: string; mode?: PortalMode },
): Promise<FetchAttendanceResponseBody> {
  const cleanToken = token?.trim()
  if (!cleanToken) {
    return {
      success: false,
      error: 'Missing authentication session token.',
    }
  }

  const baseUrl = resolvePortalBaseUrl(options?.portalUrl, options?.mode)
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

    const json = (await response.json()) as CyberVidyaAttendanceApiResponse
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
