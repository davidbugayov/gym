import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth'
import firebaseConfig from '../../../firebase-applet-config.json'
import { useStore } from '../store/useStore.js'
import { t } from './i18n.js'

// Standard scopes for basic Google Account sign-in (never blocked by 403 access_denied)
export const BASIC_SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
]

// Extended scopes for Google Fitness REST API (restricted by Google in development/testing mode)
export const FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.write',
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.write',
  'https://www.googleapis.com/auth/fitness.body.read'
]

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Basic provider for smooth sign-in without 403 access_denied
const basicProvider = new GoogleAuthProvider()
basicProvider.addScope('email')
basicProvider.addScope('profile')
basicProvider.setCustomParameters({ prompt: 'select_account' })

// Extended provider for Google Fit
const fitProvider = new GoogleAuthProvider()
fitProvider.addScope('email')
fitProvider.addScope('profile')
FIT_SCOPES.forEach(scope => fitProvider.addScope(scope))
fitProvider.setCustomParameters({ prompt: 'select_account' })

// In-memory access token cache (CRITICAL: never in localStorage)
let cachedAccessToken = null
let isSigningIn = false

export function getCachedToken() {
  return cachedAccessToken
}

export function setCachedToken(token) {
  cachedAccessToken = token
}

/**
 * Initialize auth listener.
 */
export function initGoogleAuth(callback) {
  return onAuthStateChanged(auth, user => {
    if (!user) {
      cachedAccessToken = null
    }
    if (callback) callback(user, cachedAccessToken)
  })
}

/**
 * Sign in using Google OAuth Popup.
 * @param {boolean} withFitScopes - whether to request restricted Google Fit scopes
 */
export async function googleSignIn(withFitScopes = false) {
  try {
    isSigningIn = true
    const targetProvider = withFitScopes ? fitProvider : basicProvider
    const result = await signInWithPopup(auth, targetProvider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential?.accessToken || null
    cachedAccessToken = token

    const user = result.user
    const profile = {
      id: user.uid,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      photo: user.photoURL,
      provider: 'google'
    }

    // Update global store
    useStore.getState().setUser(profile)
    useStore.getState().update(s => {
      s.googleHealth = s.googleHealth || {}
      s.googleHealth.connected = true
      s.googleHealth.email = user.email
      s.googleHealth.name = user.displayName
      if (withFitScopes) {
        s.googleHealth.fitGranted = true
      }
    })

    return { user, profile, accessToken: token }
  } catch (error) {
    console.error('Google Sign In Error:', error)
    // If fit scopes were requested and rejected by Google 403/access_denied, fallback to basic sign-in
    if (withFitScopes && (error.code === 'auth/access-denied' || error.message?.includes('access_denied') || error.code === 'auth/popup-closed-by-user')) {
      // Fallback
    }
    throw error
  } finally {
    isSigningIn = false
  }
}

/**
 * Sign out from Google Account.
 */
export async function googleSignOut() {
  try {
    await firebaseSignOut(auth)
    cachedAccessToken = null
    useStore.getState().setUser(null)
    useStore.getState().update(s => {
      if (s.googleHealth) {
        s.googleHealth.connected = false
      }
    })
  } catch (error) {
    console.error('Google Sign Out Error:', error)
    throw error
  }
}
