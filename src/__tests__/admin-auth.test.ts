import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { verifyAdminPasscode } from '@/lib/api'

describe('Admin Security Key Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects empty passcodes immediately', async () => {
    const res = await verifyAdminPasscode('')
    expect(res.success).toBe(false)
    expect(res.error).toBeDefined()
  })

  it('verifies correct passcode via fallback matching VITE_ADMIN_KEY', async () => {
    // When fetch fails or is mocked to reject
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const configuredKey = (import.meta.env.VITE_ADMIN_KEY || 'kiet@admin2026').trim()
    const res = await verifyAdminPasscode(configuredKey)
    expect(res.success).toBe(true)
  })

  it('rejects incorrect passcode', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    const res = await verifyAdminPasscode('wrong-passcode-999')
    expect(res.success).toBe(false)
  })

  it('accepts successful server response when API is available', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, message: 'Admin verified successfully.' }),
    } as any)

    const res = await verifyAdminPasscode('my-custom-server-key')
    expect(res.success).toBe(true)
  })
})
