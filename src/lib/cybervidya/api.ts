/**
 * api.ts — Frontend client for CyberVidya synchronization endpoints
 */

import type {
  LoginResponseBody,
  VerifyOtpResponseBody,
  FetchAttendanceResponseBody,
  PortalMode,
} from './types'

const API_BASE = '/api/cybervidya'

async function safeExtractResponse(response: Response, defaultAction: string) {
  let json: any = null
  let rawText = ''

  try {
    rawText = await response.text()
    json = JSON.parse(rawText)
  } catch {
    json = null
  }

  if (!response.ok) {
    const errorMsg =
      json?.error ||
      json?.message ||
      json?.error?.reason ||
      (rawText && rawText.length < 150 ? rawText : null) ||
      `${defaultAction} failed with HTTP status ${response.status}.`

    return {
      success: false,
      error: errorMsg,
      isHttpError: true,
      status: response.status,
    }
  }

  return json || { success: true }
}

/**
 * Initiates authentication with CyberVidya and requests an OTP to the student's email.
 */
export async function clientLogin(
  username: string,
  password: string,
  mode: PortalMode = 'live',
): Promise<LoginResponseBody> {
  try {
    const response = await fetch(`${API_BASE}?action=login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: username.trim(),
        password: password.trim(),
        mode,
      }),
    })

    const data = await safeExtractResponse(response, 'Authentication')
    if (data.isHttpError) {
      return {
        success: false,
        requiresOtp: false,
        error: data.error,
      }
    }
    return data as LoginResponseBody
  } catch (err: any) {
    return {
      success: false,
      requiresOtp: false,
      error:
        err?.message?.includes('fetch') || err?.code === 'ENOTFOUND'
          ? 'Network error: Could not connect to API server.'
          : err?.message || 'Authentication request failed.',
    }
  }
}

/**
 * Submits the user-entered OTP to verify authentication and retrieve a session token.
 */
export async function clientVerifyOtp(
  transactionId: string,
  otp: string,
  mode: PortalMode = 'live',
): Promise<VerifyOtpResponseBody> {
  try {
    const response = await fetch(`${API_BASE}?action=verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionId: transactionId.trim(),
        otp: otp.trim(),
        mode,
      }),
    })

    const data = await safeExtractResponse(response, 'OTP verification')
    if (data.isHttpError) {
      return {
        success: false,
        error: data.error,
      }
    }
    return data as VerifyOtpResponseBody
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to verify OTP due to network error.',
    }
  }
}

/**
 * Fetches attendance data for all enrolled subjects using the authenticated session token.
 */
export async function clientFetchAttendance(
  token: string,
  mode: PortalMode = 'live',
): Promise<FetchAttendanceResponseBody> {
  try {
    const response = await fetch(`${API_BASE}?action=attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token.trim(),
        mode,
      }),
    })

    const data = await safeExtractResponse(response, 'Attendance retrieval')
    if (data.isHttpError) {
      return {
        success: false,
        error: data.error,
      }
    }
    return data as FetchAttendanceResponseBody
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to retrieve attendance due to network error.',
    }
  }
}
