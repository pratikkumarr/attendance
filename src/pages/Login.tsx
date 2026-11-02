import React, { useState } from 'react'
import { useTheme } from '@/ThemeContext'
import { loginApi, verifyOtpApi, login } from '@/lib/api'
import { SamosaIcon } from '@/components/common/SamosaIcon'
import {
  Eye,
  EyeOff,
  User,
  KeyRound,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

interface LoginProps {
  onLoginSuccess: () => void
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const { colors, isDark, isBrutalist } = useTheme()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // OTP Step
  const [isOtpStep, setIsOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [transactionId, setTransactionId] = useState('')

  // Direct Token Tab / Option
  const [showDirectToken, setShowDirectToken] = useState(false)
  const [directToken, setDirectToken] = useState('')

  const handleNativeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setErrorMsg('KIET Unique ID and password are required.')
      return
    }

    setErrorMsg('')
    setIsLoading(true)

    try {
      const res = await loginApi(username.trim(), password.trim())
      if (res.success) {
        if (res.token) {
          onLoginSuccess()
          return
        }
        if (res.requiresOtp && res.transactionId) {
          setTransactionId(res.transactionId)
          setIsOtpStep(true)
          return
        }
      }
      setErrorMsg(res.error || 'Authentication failed. Please check your credentials.')
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error connecting to CyberVidya.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) {
      setErrorMsg('Please enter the OTP sent to your registered KIET student email.')
      return
    }

    setErrorMsg('')
    setIsLoading(true)

    try {
      const res = await verifyOtpApi(transactionId, otp.trim())
      if (res.success && res.token) {
        onLoginSuccess()
        return
      }
      setErrorMsg(res.error || 'Invalid or expired OTP code.')
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDirectTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directToken.trim()) return
    await login(directToken.trim())
    onLoginSuccess()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 transition-colors">
      <div
        className={`w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all ${
          isBrutalist
            ? 'bg-white dark:bg-zinc-950 border-4 border-black dark:border-white shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_#fff]'
            : isDark
            ? 'bg-slate-900/90 border-slate-800 backdrop-blur-xl'
            : 'bg-white/95 border-slate-200 backdrop-blur-xl'
        }`}
      >
        {/* App Logo & Title */}
        <div className="text-center space-y-2 mb-6">
          <div
            className={`w-14 h-14 rounded-3xl mx-auto flex items-center justify-center transition-transform hover:scale-105 ${
              isBrutalist
                ? 'bg-[#FFD166] text-black border-2 border-black shadow-[3px_3px_0px_#000]'
                : isDark
                ? 'bg-amber-950/40 text-amber-300 border border-amber-800/60 shadow-lg shadow-amber-950/30'
                : 'bg-amber-100 text-amber-900 border border-amber-200 shadow-lg shadow-amber-500/10'
            }`}
          >
            <SamosaIcon className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight">Nashta</h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              KIET Group of Institutions • CyberVidya Companion
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!isOtpStep ? (
          /* Step 1: Username & Password Form */
          <form onSubmit={handleNativeLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                KIET Unique ID
              </label>
              <div className="relative mt-1">
                <input
                  type="text"
                  placeholder="e.g. 202401100100188"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <User className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                CyberVidya Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Remember my login
              </label>

              <button
                type="button"
                onClick={() => setShowDirectToken(!showDirectToken)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
              >
                {showDirectToken ? 'Hide Token' : 'Direct Token?'}
              </button>
            </div>

            {/* Direct Token Input if expanded */}
            {showDirectToken && (
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                <label className="text-[11px] font-bold text-slate-500">
                  Paste Authorization JWT Token directly:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="eyJhbGciOi..."
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleDirectTokenLogin}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
                  >
                    Go
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 rounded-2xl text-xs font-black transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                isBrutalist
                  ? 'bg-black text-white dark:bg-white dark:text-black border-2 border-black font-mono uppercase'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/25'
              }`}
            >
              {isLoading ? (
                <span>Connecting to CyberVidya...</span>
              ) : (
                <>
                  <span>Sign In to CyberVidya</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          /* Step 2: OTP Verification Form */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base">Enter Verification OTP</h3>
              <p className="text-xs text-slate-500">
                Please enter the 6-digit code sent to your student email.
              </p>
            </div>

            <div>
              <input
                type="text"
                placeholder="6-Digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 text-center text-lg font-black tracking-widest rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                maxLength={8}
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-2xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-md flex items-center justify-center gap-2"
            >
              {isLoading ? 'Verifying OTP...' : 'Verify and Access Nashta'}
            </button>

            <button
              type="button"
              onClick={() => setIsOtpStep(false)}
              className="w-full text-center text-xs text-slate-500 hover:underline"
            >
              ← Back to KIET Unique ID & Password
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
