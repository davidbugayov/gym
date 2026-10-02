import { initializeApp, getApps, getApp } from 'firebase/app'
import {
  getAuth,
  signInWithPopup,
  signOut as firebaseSignOut,
  GoogleAuthProvider
} from 'firebase/auth'
import firebaseConfig from '../../../firebase-applet-config.json'
import { useStore } from '../store/useStore.js'

// Google Health API scopes: sync workouts and body weight in both directions.
export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly',
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.readonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.writeonly'
]

// The .online deployment is canonical; .ru redirects before the app is served.
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
export const auth = getAuth(app)

// Basic provider for smooth sign-in without 403 access_denied
const basicProvider = new GoogleAuthProvider()
basicProvider.addScope('email')
basicProvider.addScope('profile')
basicProvider.setCustomParameters({ prompt: 'select_account' })

// Google Health consent is requested only when a user connects the health integration.
const healthProvider = new GoogleAuthProvider()
healthProvider.addScope('email')
healthProvider.addScope('profile')
GOOGLE_HEALTH_SCOPES.forEach(scope => healthProvider.addScope(scope))
// Consent is needed when we add or repair a Health API scope on an already-connected account.
healthProvider.setCustomParameters({ prompt: 'consent select_account', include_granted_scopes: 'true' })

// In-memory access token cache (CRITICAL: never in localStorage)
let cachedAccessToken = null

export function getCachedToken() {
  return cachedAccessToken
}

export function setCachedToken(token) {
  cachedAccessToken = token
}

/**
 * Sign in using Google OAuth Popup.
 * @param {boolean} withHealthScopes - whether to request Google Health write scopes
 */
export async function googleSignIn(withHealthScopes = false) {
  try {
    const targetProvider = withHealthScopes ? healthProvider : basicProvider
    const result = await signInWithPopup(auth, targetProvider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential?.accessToken || null
    if (withHealthScopes && !token) throw new Error('google_health_access_token_missing')
    if (withHealthScopes) cachedAccessToken = token

    const user = result.user
    const profile = {
      id: user.uid,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      photo: user.photoURL,
      provider: 'google'
    }

    if (!withHealthScopes) {
      useStore.getState().setUser(profile)
      useStore.getState().update(s => {
        if (s.googleHealth?.email && s.googleHealth.email !== user.email) {
          s.googleHealth.connected = false
          cachedAccessToken = null
        }
      })
    }

    return { user, profile, accessToken: token }
  } catch (error) {
    console.error('Google Sign In Error:', error)
    throw error
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
