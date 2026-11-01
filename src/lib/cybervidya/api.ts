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

/**
 * Initiates authentication with CyberVidya and requests an OTP to the student's email.
 */
export async function clientLogin(
  username: string,
  password: string,
  mode: PortalMode = 'live',
): Promise<LoginResponseBody> {
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

  const json = (await response.json().catch(() => ({}))) as LoginResponseBody
  if (!response.ok && !json.error) {
    throw new Error(`Authentication request failed with status ${response.status}`)
  }
  return json
}

/**
 * Submits the user-entered OTP to verify authentication and retrieve a session token.
 */
export async function clientVerifyOtp(
  transactionId: string,
  otp: string,
  mode: PortalMode = 'live',
): Promise<VerifyOtpResponseBody> {
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

  const json = (await response.json().catch(() => ({}))) as VerifyOtpResponseBody
  if (!response.ok && !json.error) {
    throw new Error(`OTP verification failed with status ${response.status}`)
  }
  return json
}

/**
 * Fetches attendance data for all enrolled subjects using the authenticated session token.
 */
export async function clientFetchAttendance(
  token: string,
  mode: PortalMode = 'live',
): Promise<FetchAttendanceResponseBody> {
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

  const json = (await response.json().catch(() => ({}))) as FetchAttendanceResponseBody
  if (!response.ok && !json.error) {
    throw new Error(`Attendance retrieval failed with status ${response.status}`)
  }
  return json
}
