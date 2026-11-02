import React, { useState, useEffect } from 'react'
import { useTheme } from '@/ThemeContext'
import {
  getSubjectMappings,
  updateSubjectTotalClasses,
  acknowledgeSubjectMapping,
  setSubjectMapping,
  removeSubjectMapping,
  isAdminAuthenticated,
  setAdminAuthenticated,
  normalizeSubjectCode,
  fetchSubjectMappingsFromSupabase,
  saveAllSubjectMappingsToSupabase,
  saveSubjectMappingToSupabase,
  removeSubjectMappingFromSupabase,
} from '@/lib/subjectMappingStore'
import { verifyAdminPasscode } from '@/lib/api'
import { SubjectClassMapping } from '@/types/bunkbook'
import {
  X,
  Shield,
  Key,
  Save,
  Plus,
  Check,
  Lock,
  Unlock,
  AlertCircle,
  Layers,
  Sparkles,
  Search,
  Loader2,
  Trash2,
} from 'lucide-react'

interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  highlightCourseCode?: string
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  highlightCourseCode,
}) => {
  const { colors, isDark, isBrutalist } = useTheme()

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(isAdminAuthenticated())
  const [passcode, setPasscode] = useState<string>('')
  const [passcodeError, setPasscodeError] = useState<string>('')
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  // Mapping state
  const [mappings, setMappings] = useState<Record<string, SubjectClassMapping>>({})
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [isSaving, setIsSaving] = useState<boolean>(false)

  // New subject form state
  const [showAddForm, setShowAddForm] = useState<boolean>(false)
  const [newCode, setNewCode] = useState<string>('')
  const [newName, setNewName] = useState<string>('')
  const [newTotal, setNewTotal] = useState<number>(40)

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticated(isAdminAuthenticated())
      setMappings(getSubjectMappings())
      setPasscodeError('')
      setSaveSuccessMsg('')
      // Asynchronously fetch latest static totals from Supabase Cloud DB
      fetchSubjectMappingsFromSupabase().then((latest) => {
        setMappings(latest)
      })
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    const clean = passcode.trim()
    if (!clean) {
      setPasscodeError('Please enter your Admin Key.')
      return
    }

    setIsVerifying(true)
    setPasscodeError('')

    const result = await verifyAdminPasscode(clean)
    setIsVerifying(false)

    if (result.success) {
      setAdminAuthenticated(true)
      setIsAuthenticated(true)
      setPasscode('')
    } else {
      setPasscodeError(result.error || 'Invalid Admin Key.')
    }
  }

  const handleLock = () => {
    setAdminAuthenticated(false)
    setIsAuthenticated(false)
    setPasscode('')
  }

  const handleTotalClassesChange = (code: string, deltaOrVal: number | string) => {
    setMappings((prev) => {
      const existing = prev[code]
      if (!existing) return prev

      let updatedVal: number
      if (typeof deltaOrVal === 'string') {
        const parsed = parseInt(deltaOrVal, 10)
        updatedVal = isNaN(parsed) ? 1 : Math.max(1, parsed)
      } else {
        updatedVal = Math.max(1, existing.totalClasses + deltaOrVal)
      }

      return {
        ...prev,
        [code]: {
          ...existing,
          totalClasses: updatedVal,
        },
      }
    })
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const result = await saveAllSubjectMappingsToSupabase(mappings, 'Admin Dashboard')
      setSaveSuccessMsg(
        `Static total classes for all ${result.count} subjects saved permanently to Supabase cloud database!`,
      )
    } catch (err: any) {
      setSaveSuccessMsg('Saved locally, but failed to sync to cloud: ' + (err?.message || 'Error'))
    } finally {
      setIsSaving(false)
      setTimeout(() => setSaveSuccessMsg(''), 5000)
    }
  }

  const handleAcknowledge = (code: string) => {
    acknowledgeSubjectMapping(code)
    setMappings(getSubjectMappings())
  }

  const handleAddNewSubject = async (e: React.FormEvent) => {
    e.preventDefault()
    const norm = normalizeSubjectCode(newCode)
    if (!norm) {
      alert('Please enter a valid subject code (e.g. KCS501)')
      return
    }

    const mapping: SubjectClassMapping = {
      subjectCode: norm,
      subjectName: newName.trim() || norm,
      totalClasses: Math.max(1, newTotal),
      lastUpdated: new Date().toISOString(),
      updatedBy: 'Admin Added',
      isNewlyDiscovered: false,
    }

    await saveSubjectMappingToSupabase(mapping, 'Admin Added')
    setMappings(getSubjectMappings())
    setShowAddForm(false)
    setNewCode('')
    setNewName('')
    setNewTotal(40)
    setSaveSuccessMsg(`Added subject ${norm} with ${mapping.totalClasses} total fixed classes (saved to Supabase)!`)
    setTimeout(() => setSaveSuccessMsg(''), 4000)
  }

  const handleRemoveSubject = async (code: string, name: string) => {
    if (confirm(`Are you sure you want to remove "${code} - ${name}" from the subject list?`)) {
      await removeSubjectMappingFromSupabase(code)
      setMappings(getSubjectMappings())
      setSaveSuccessMsg(`Removed subject ${code} from the list and database.`)
      setTimeout(() => setSaveSuccessMsg(''), 4000)
    }
  }

  const filteredMappings = Object.values(mappings).filter((item) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      item.subjectCode.toLowerCase().includes(q) ||
      item.subjectName.toLowerCase().includes(q)
    )
  })

  const newDiscoveredCount = Object.values(mappings).filter((m) => m.isNewlyDiscovered).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-sm overflow-y-auto animate-fade-in">
      <div
        className={`w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl overflow-hidden border shadow-2xl ${
          isBrutalist
            ? 'bg-white dark:bg-zinc-950 border-4 border-black dark:border-white shadow-[8px_8px_0px_#000] dark:shadow-[8px_8px_0px_#fff]'
            : isDark
            ? 'bg-slate-900 border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between border-b ${
            isBrutalist
              ? 'bg-[#FFD166] text-black border-b-4 border-black dark:border-white'
              : isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-indigo-50 border-indigo-100 text-indigo-950'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black leading-tight flex items-center gap-2">
                Admin Dashboard: Total Classes Control
                {newDiscoveredCount > 0 && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-black bg-amber-400 text-black border border-black animate-pulse flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {newDiscoveredCount} New from Login
                  </span>
                )}
              </h2>
              <p className="text-xs opacity-75 mt-0.5">
                Total classes set here are <strong>fixed for all students</strong>. Remaining classes adjust dynamically per student.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {!isAuthenticated ? (
            /* Passcode Unlock Screen */
            <div className="max-w-md mx-auto py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto border border-indigo-500/20">
                <Lock className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black">Admin Access Required</h3>
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400">
                  Editing fixed total classes for subjects requires admin authentication.
                </p>
              </div>

              <form onSubmit={handleUnlock} className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter Secret Admin Key"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  disabled={isVerifying}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-center font-bold text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                  autoFocus
                />

                {passcodeError && (
                  <div className="text-xs font-semibold text-rose-600 flex items-center justify-center gap-1">
                    <AlertCircle className="w-4 h-4" /> {passcodeError}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                      isBrutalist ? 'border-2 border-black font-black uppercase' : ''
                    }`}
                  >
                    {isVerifying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying Key...
                      </>
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" /> Unlock Admin Dashboard
                      </>
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                  Secret key is defined securely in <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.env.local</code> (<span className="font-mono">ADMIN_KEY</span>)
                </p>
              </form>
            </div>
          ) : (
            /* Admin Management View */
            <div className="space-y-4">
              {saveSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {saveSuccessMsg}
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex items-center justify-between flex-wrap gap-2.5 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Subject
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveAll}
                    disabled={isSaving}
                    className={`px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm transition-transform active:scale-95 ${
                      isSaving ? 'opacity-70 cursor-not-allowed' : ''
                    } ${
                      isBrutalist ? 'border-2 border-black font-black uppercase' : ''
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving to Cloud...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" /> Save All Changes
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLock}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" /> Lock
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter subjects by code (e.g. KCS501) or subject name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Add New Subject Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddNewSubject}
                  className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-3"
                >
                  <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    Add New Subject Mapping
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Subject Code (e.g. KCS601)
                      </label>
                      <input
                        type="text"
                        placeholder="KCS601"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-lg border bg-white dark:bg-slate-900 uppercase font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        placeholder="Software Engineering"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full mt-1 px-3 py-1.5 text-xs font-semibold rounded-lg border bg-white dark:bg-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                        Fixed Total Classes (All Students)
                      </label>
                      <input
                        type="number"
                        value={newTotal}
                        onChange={(e) => setNewTotal(parseInt(e.target.value, 10))}
                        className="w-full mt-1 px-3 py-1.5 text-xs font-bold rounded-lg border bg-white dark:bg-slate-900 text-center"
                        min={1}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Add Subject
                    </button>
                  </div>
                </form>
              )}

              {/* Subject Cards List */}
              <div className="space-y-2.5">
                {filteredMappings.map((item) => {
                  const isHighlighted =
                    highlightCourseCode &&
                    normalizeSubjectCode(highlightCourseCode) === normalizeSubjectCode(item.subjectCode)

                  return (
                    <div
                      key={item.subjectCode}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isHighlighted
                          ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300'
                          : isDark
                          ? 'bg-slate-800/60 border-slate-700/60'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        {/* Subject info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                              {item.subjectCode}
                            </span>
                            <span className="font-bold text-sm sm:text-base leading-tight truncate">
                              {item.subjectName}
                            </span>

                            {item.isNewlyDiscovered && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black border border-black font-mono">
                                <Sparkles className="w-3 h-3" /> NEW FROM USER LOGIN
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                            <span>Status: {item.updatedBy || 'System'}</span>
                            {item.isNewlyDiscovered && (
                              <button
                                onClick={() => handleAcknowledge(item.subjectCode)}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold text-[10px]"
                              >
                                Mark Reviewed
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Fixed Total Classes Stepper & Remove Button */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                              Fixed Total Classes
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <button
                                type="button"
                                onClick={() => handleTotalClassesChange(item.subjectCode, -1)}
                                className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-300 active:scale-95"
                                title="Decrease total classes"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                value={item.totalClasses}
                                onChange={(e) => handleTotalClassesChange(item.subjectCode, e.target.value)}
                                className="w-16 px-2 py-1 text-center font-black text-base rounded-xl border-2 border-indigo-500 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                                min={1}
                              />
                              <button
                                type="button"
                                onClick={() => handleTotalClassesChange(item.subjectCode, 1)}
                                className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 font-black text-sm flex items-center justify-center hover:bg-slate-300 active:scale-95"
                                title="Increase total classes"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Delete/Remove subject option */}
                          <div className="pt-4">
                            <button
                              type="button"
                              onClick={() => handleRemoveSubject(item.subjectCode, item.subjectName)}
                              className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-100/70 dark:hover:bg-rose-950/60 border border-transparent hover:border-rose-300 dark:hover:border-rose-800 transition-colors"
                              title={`Remove ${item.subjectCode} from list`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-3 sm:p-4 border-t flex items-center justify-between ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-xs font-semibold text-slate-500">
            Total Mapped Subjects: {Object.keys(mappings).length}
          </span>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-xs font-bold ${
              isBrutalist
                ? 'bg-black text-white dark:bg-white dark:text-black border-2 border-black'
                : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200'
            }`}
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
