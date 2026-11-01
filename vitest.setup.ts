import '@testing-library/jest-dom'

// Polyfill localStorage for Vitest jsdom if missing
const storage: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, value: string) => {
    storage[key] = String(value)
  },
  removeItem: (key: string) => {
    delete storage[key]
  },
  clear: () => {
    Object.keys(storage).forEach((key) => delete storage[key])
  },
  length: 0,
  key: (index: number) => Object.keys(storage)[index] || null,
}

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
})
