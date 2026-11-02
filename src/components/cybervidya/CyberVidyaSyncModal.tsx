import * as React from 'react'
import {
  GraduationCap,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Unplug,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { clientLogin, clientVerifyOtp, clientFetchAttendance } from '@/lib/cybervidya/api'
import { useApplyCyberVidyaSync, useDisconnectCyberVidya } from '@/hooks/useCyberVidyaSync'
import type { SubjectRow, EntryRow, CyberVidyaSyncRow } from '@/lib/supabase'
import type { PortalMode, SyncSummary } from '@/lib/cybervidya/types'

interface CyberVidyaSyncModalProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  existingSubjects: SubjectRow[]
  existingEntries: EntryRow[]
  existingMappings?: Record<string, string>
  syncRecord?: CyberVidyaSyncRow | null
}

type Step = 'credentials' | 'otp' | 'syncing' | 'success'

export function CyberVidyaSyncModal({
  isOpen,
  onClose,
  userName,
  existingSubjects,
  existingEntries,
  existingMappings = {},
  syncRecord,
}: CyberVidyaSyncModalProps) {
  const [step, setStep] = React.useState<Step>('credentials')
  const [rollNumber, setRollNumber] = React.useState(syncRecord?.roll_number || '')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [otp, setOtp] = React.useState('')
  const [transactionId, setTransactionId] = React.useState('')
  const [portalMode, setPortalMode] = React.useState<PortalMode>('live')
  const [customProxyUrl, setCustomProxyUrl] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [loadingMessage, setLoadingMessage] = React.useState('')
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [syncSummary, setSyncSummary] = React.useState<SyncSummary | null>(null)

  const applySyncMutation = useApplyCyberVidyaSync()
  const disconnectMutation = useDisconnectCyberVidya()

  React.useEffect(() => {
    if (isOpen) {
      setStep('credentials')
      setPassword('')
      setOtp('')
      setErrorMessage(null)
      setSyncSummary(null)
      if (syncRecord?.roll_number) {
        setRollNumber(syncRecord.roll_number)
      }
    }
  }, [isOpen, syncRecord])

  if (!isOpen) return null

  // Step 1: Submit Credentials & Request OTP
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)
    setLoadingMessage('Contacting CyberVidya & requesting OTP...')

    try {
      const res = await clientLogin(
        rollNumber,
        password,
        portalMode,
        portalMode === 'proxy' && customProxyUrl ? customProxyUrl : undefined,
      )

      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.')
        setLoading(false)
        return
      }

      // Check if portal provided direct token (rare, bypasses OTP)
      if (res.token) {
        await proceedToFetchAttendance(res.token)
        return
      }

      if (res.transactionId) {
        setTransactionId(res.transactionId)
        setStep('otp')
      } else {
        setErrorMessage('Portal did not return an OTP transaction. Please try again.')
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error connecting to CyberVidya.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Submit OTP & Fetch Attendance
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setLoading(true)
    setLoadingMessage('Verifying OTP code...')

    try {
      const otpRes = await clientVerifyOtp(
        transactionId,
        otp,
        portalMode,
        portalMode === 'proxy' && customProxyUrl ? customProxyUrl : undefined,
      )

      if (!otpRes.success || !otpRes.token) {
        setErrorMessage(otpRes.error || 'Invalid or expired OTP code.')
        setLoading(false)
        return
      }

      await proceedToFetchAttendance(otpRes.token)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to verify OTP.')
      setLoading(false)
    }
  }

  // Step 3: Fetch Attendance and Apply Safe Sync
  const proceedToFetchAttendance = async (token: string) => {
    setStep('syncing')
    setLoading(true)
    setLoadingMessage('Retrieving subjects & attendance records...')

    try {
      const attRes = await clientFetchAttendance(
        token,
        portalMode,
        portalMode === 'proxy' && customProxyUrl ? customProxyUrl : undefined,
      )

      if (!attRes.success || !attRes.data) {
        setErrorMessage(attRes.error || 'Failed to retrieve attendance data.')
        setStep('credentials')
        setLoading(false)
        return
      }

      setLoadingMessage('Merging attendance & preserving Total Classes...')

      // Execute sync and database update
      const summary = await applySyncMutation.mutateAsync({
        userName,
        portalData: attRes.data,
        existingSubjects,
        existingEntries,
        existingMappings,
      })

      setSyncSummary(summary)
      setStep('success')
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to synchronize attendance.')
      setStep('credentials')
    } finally {
      setLoading(false)
    }
  }

  // Handle Disconnect
  const handleDisconnect = async () => {
    if (confirm('Disconnect CyberVidya? Your existing attendance records and manual totals will be preserved.')) {
      setLoading(true)
      try {
        await disconnectMutation.mutateAsync(userName)
        onClose()
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to disconnect')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg rounded-2xl border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                Sync from CyberVidya
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sync live attendance for <strong className="text-foreground">{userName}</strong>
              </p>
            </div>
          </div>

          {/* Connection Mode Toggle */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setPortalMode('live')}
              className={`px-2 py-1 rounded-md transition-all ${
                portalMode === 'live'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Live (Direct KIET)
            </button>
            <button
              type="button"
              onClick={() => setPortalMode('proxy')}
              className={`px-2 py-1 rounded-md transition-all ${
                portalMode === 'proxy'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Proxy Mode
            </button>
          </div>
        </div>

        {/* Custom Proxy Input (if in proxy mode) */}
        {portalMode === 'proxy' && (
          <div className="mb-4 rounded-xl border bg-muted/30 p-3 text-xs flex flex-col gap-1.5">
            <label className="font-semibold text-foreground">
              Custom Proxy / Worker URL (Optional)
            </label>
            <input
              type="url"
              value={customProxyUrl}
              onChange={(e) => setCustomProxyUrl(e.target.value)}
              placeholder="https://cybervidya.amanpal.tech (Leave blank for default)"
              className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[11px] text-muted-foreground">
              If CyberVidya blocks direct connection, specify your own Cloudflare Worker or reverse proxy endpoint.
            </p>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger animate-in slide-in-from-top-1">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">Sync Request Issue</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* STEP 1: Credentials Form */}
        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} className="flex flex-col gap-4">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
              <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>
                Enter your KIET CyberVidya portal credentials to request an OTP. Credentials are sent securely to initiate verification and are <strong>never saved or logged</strong>.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                University Roll Number / Username
              </label>
              <input
                type="text"
                autoFocus
                required
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                placeholder="e.g. 2200290100XXX"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                CyberVidya Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Total Classes Guarantee Notice */}
            <div className="rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-safe shrink-0" />
              <span>
                <strong>Total Classes Protection:</strong> Synchronization only updates classes done & attended. Your manual semester Total Classes will remain 100% unchanged.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t mt-2">
              {syncRecord ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={loading}
                  className="text-xs text-danger hover:bg-danger/10 hover:text-danger gap-1.5"
                >
                  <Unplug className="h-3.5 w-3.5" />
                  Disconnect
                </Button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="gap-1.5 font-semibold"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Requesting OTP...
                    </>
                  ) : (
                    <>
                      Request OTP
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 2: OTP Verification Form */}
        {step === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
            <div className="rounded-xl border border-safe/30 bg-safe/10 p-3.5 text-xs text-foreground flex items-start gap-2.5">
              <ShieldCheck className="h-5 w-5 text-safe shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">OTP Dispatched to Email</p>
                <p className="text-muted-foreground mt-0.5">
                  CyberVidya sent a 6-digit one-time password to your registered @kiet.edu student email. Enter it below:
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground">
                One-Time Password (OTP)
              </label>
              <input
                type="text"
                autoFocus
                required
                inputMode="numeric"
                maxLength={8}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-center text-lg font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-ring font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t mt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('credentials')
                  setErrorMessage(null)
                }}
                disabled={loading}
                className="text-xs"
              >
                Back to Credentials
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading || !otp.trim()}
                  className="gap-1.5 font-semibold"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Verify & Sync
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* STEP 3: Syncing in Progress */}
        {step === 'syncing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <h4 className="text-sm font-bold text-foreground">Synchronizing with CyberVidya</h4>
            <p className="text-xs text-muted-foreground max-w-xs">{loadingMessage}</p>
          </div>
        )}

        {/* STEP 4: Sync Success Summary */}
        {step === 'success' && syncSummary && (
          <div className="flex flex-col gap-4 animate-in fade-in-0">
            <div className="rounded-xl border border-safe/40 bg-safe/10 p-4 text-xs flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-safe shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-safe">Sync Complete!</p>
                <p className="text-foreground font-semibold mt-0.5">
                  {syncSummary.student.fullName} ({syncSummary.student.rollNumber})
                </p>
                <p className="text-muted-foreground text-[11px] mt-0.5">
                  {syncSummary.student.branch && `${syncSummary.student.branch} • `}
                  {syncSummary.student.sectionName && `Section: ${syncSummary.student.sectionName}`}
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border p-3 bg-muted/20">
                <span className="text-muted-foreground">Updated Subjects</span>
                <p className="text-xl font-bold tabular-nums text-foreground mt-0.5">
                  {syncSummary.updatedSubjectsCount}
                </p>
                <span className="text-[10px] text-muted-foreground">Classes done & attended updated</span>
              </div>
              <div className="rounded-lg border p-3 bg-muted/20">
                <span className="text-muted-foreground">New Subjects</span>
                <p className="text-xl font-bold tabular-nums text-primary mt-0.5">
                  {syncSummary.newSubjectsCount}
                </p>
                <span className="text-[10px] text-muted-foreground">Added to your dashboard</span>
              </div>
            </div>

            {/* Total Classes Guarantee Confirmation */}
            <div className="rounded-lg border border-safe/20 bg-muted/30 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4 text-safe shrink-0" />
              <span>
                <strong>Total Classes preserved:</strong> All previously configured semester planned Total Classes were protected and remain intact.
              </span>
            </div>

            {syncSummary.newSubjectsCount > 0 && (
              <div className="rounded-lg border border-attend/30 bg-attend/10 p-2.5 text-xs text-attend flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  {syncSummary.newSubjectsCount} new subject(s) added. Please set your planned semester Total Classes on their subject cards.
                </span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t mt-2">
              <Button type="button" size="sm" onClick={onClose} className="font-semibold">
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
