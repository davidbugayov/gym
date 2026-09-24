import { initializeApp, getApps, getApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
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

// Google Health API scopes: this app writes completed exercises and body-weight records only.
export const GOOGLE_HEALTH_SCOPES = [
  'https://www.googleapis.com/auth/googlehealth.activity_and_fitness.writeonly',
  'https://www.googleapis.com/auth/googlehealth.health_metrics_and_measurements.writeonly'
]

// Initialize Firebase App
const isRu = typeof window !== 'undefined' && window.location.hostname.endsWith('.ru')
const dynamicConfig = {
  ...firebaseConfig,
  appId: isRu ? "1:831370287146:web:44f5ce2605b9a25e928b53" : "1:831370287146:web:bbe398a29e56e0cf928b53",
  measurementId: isRu ? "G-PDS9D9J2NT" : "G-E9DMMVFVWY"
}

const app = getApps().length > 0 ? getApp() : initializeApp(dynamicConfig)
export const auth = getAuth(app)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

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
healthProvider.setCustomParameters({ prompt: 'select_account', include_granted_scopes: 'true' })

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
 * @param {boolean} withHealthScopes - whether to request Google Health write scopes
 */
export async function googleSignIn(withHealthScopes = false) {
  try {
    isSigningIn = true
    const targetProvider = withHealthScopes ? healthProvider : basicProvider
    const result = await signInWithPopup(auth, targetProvider)
    const credential = GoogleAuthProvider.credentialFromResult(result)
    const token = credential?.accessToken || null
    if (withHealthScopes && !token) throw new Error('google_health_access_token_missing')
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
      if (withHealthScopes) {
        s.googleHealth.healthGranted = true
      }
    })

    return { user, profile, accessToken: token }
  } catch (error) {
    console.error('Google Sign In Error:', error)
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
