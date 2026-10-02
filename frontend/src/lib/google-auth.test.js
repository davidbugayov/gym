import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ setUser: vi.fn(), update: vi.fn(), popup: vi.fn() }))
vi.mock('firebase/app', () => ({ initializeApp: () => ({}), getApps: () => [], getApp: () => ({}) }))
vi.mock('firebase/auth', () => {
  class GoogleAuthProvider { addScope() {} setCustomParameters() {} static credentialFromResult() { return { accessToken: 'test-token' } } }
  return { getAuth: () => ({}), GoogleAuthProvider, signInWithPopup: mocks.popup, signOut: vi.fn() }
})
vi.mock('../store/useStore.js', () => ({ useStore: { getState: () => ({ setUser: mocks.setUser, update: mocks.update }) } }))
import { googleSignIn } from './google-auth.js'
describe('separate health consent from profile login', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.popup.mockResolvedValue({ user: { uid: 'google-one', email: 'athlete@example.com', displayName: 'Athlete' } }) })
  it('does not replace the current app profile when connecting Health', async () => {
    expect((await googleSignIn(true)).accessToken).toBe('test-token')
    expect(mocks.setUser).not.toHaveBeenCalled()
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('basic login sets the profile without claiming Health permissions', async () => {
    await googleSignIn()
    expect(mocks.setUser).toHaveBeenCalledWith(expect.objectContaining({ provider: 'google' }))
    const state = {}
    mocks.update.mock.calls[0][0](state)
    expect(state.googleHealth).toBeUndefined()
  })
})
