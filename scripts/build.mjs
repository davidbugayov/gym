#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, chmodSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = resolve(__dirname, '..')
const ANDROID_DIR = resolve(ROOT_DIR, 'android')
const DIST_DIR = resolve(ROOT_DIR, 'dist')
const ANDROID_ASSETS_DIR = resolve(ANDROID_DIR, 'app', 'src', 'main', 'assets', 'public')

const args = process.argv.slice(2)
const isWebOnly = args.includes('--web')
const isAndroidOnly = args.includes('--android')
const isRelease = args.includes('--release') || process.env.BUILD_MODE === 'release'
const shouldBuildWeb = !isAndroidOnly
const shouldBuildAndroid = !isWebOnly

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m'
}

function log(prefix, color, message) {
  const tag = `${color}[${prefix}]${colors.reset}`
  console.log(`${tag} ${message}`)
}

function runCommand(command, args, options = {}, prefix = '', color = colors.cyan) {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: ['inherit', 'pipe', 'pipe'],
      env: { ...process.env, ...options.env },
      ...options
    })

    let stdout = ''
    let stderr = ''

    if (proc.stdout) {
      proc.stdout.on('data', data => {
        const text = data.toString()
        stdout += text
        text.split('\n').filter(Boolean).forEach(line => {
          log(prefix, color, line)
        })
      })
    }

    if (proc.stderr) {
      proc.stderr.on('data', data => {
        const text = data.toString()
        stderr += text
        text.split('\n').filter(Boolean).forEach(line => {
          log(prefix, color, line)
        })
      })
    }

    proc.on('close', code => {
      if (code === 0) {
        resolvePromise({ stdout, stderr, code })
      } else {
        const err = new Error(`Command "${command} ${args.join(' ')}" failed with code ${code}`)
        err.code = code
        err.stdout = stdout
        err.stderr = stderr
        rejectPromise(err)
      }
    })

    proc.on('error', err => {
      rejectPromise(err)
    })
  })
}

async function checkJavaAvailable() {
  try {
    await runCommand('java', ['-version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function buildWeb() {
  const start = Date.now()
  log('web', colors.cyan, '⚡ Starting Web build (Vite)...')

  try {
    await runCommand('npm', ['run', 'build', '--workspace=frontend'], {}, 'web', colors.cyan)
    const duration = ((Date.now() - start) / 1000).toFixed(2)
    log('web', colors.green, `✅ Web build finished successfully in ${duration}s`)
    return { success: true, duration }
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(2)
    log('web', colors.red, `❌ Web build failed after ${duration}s: ${err.message}`)
    throw err
  }
}

async function buildAndroid(webBuildPromise) {
  const start = Date.now()
  log('android', colors.green, '📱 Starting Android build process...')

  try {
    // 1. Ensure android assets directories exist
    if (!existsSync(ANDROID_ASSETS_DIR)) {
      mkdirSync(ANDROID_ASSETS_DIR, { recursive: true })
    }

    // 2. Ensure gradlew is executable if present
    const gradlewPath = resolve(ANDROID_DIR, 'gradlew')
    if (existsSync(gradlewPath)) {
      try {
        chmodSync(gradlewPath, 0o755)
      } catch {
        // ignore chmod errors on platforms where unsupported
      }
    }

    // 3. If Web build is running simultaneously, wait for web assets to be ready before sync
    if (webBuildPromise) {
      log('android', colors.green, '⏳ Syncing with Web assets build...')
      await webBuildPromise
    }

    // 4. Run Capacitor Android sync
    log('android', colors.green, '🔄 Running Capacitor sync for Android...')
    await runCommand('npx', ['cap', 'sync', 'android'], {}, 'android', colors.green)

    // 5. Check if Java & Gradle are available for APK compilation
    const hasJava = await checkJavaAvailable()
    let apkBuilt = false

    if (hasJava && existsSync(gradlewPath)) {
      const gradleTask = isRelease ? 'assembleRelease' : 'assembleDebug'
      log('android', colors.green, `🔨 Java detected. Compiling Android APK with ./gradlew ${gradleTask}...`)

      await runCommand('./gradlew', [gradleTask], { cwd: ANDROID_DIR }, 'android', colors.green)
      apkBuilt = true
      log('android', colors.green, `✅ Android APK compiled (${gradleTask})!`)
    } else {
      log(
        'android',
        colors.yellow,
        'ℹ️  Java/Android SDK not detected in environment. Capacitor assets and plugins successfully prepared for Android Studio / Gradle.'
      )
    }

    const duration = ((Date.now() - start) / 1000).toFixed(2)
    log('android', colors.green, `✅ Android build task completed in ${duration}s${apkBuilt ? ' (APK generated)' : ''}`)
    return { success: true, duration, apkBuilt }
  } catch (err) {
    const duration = ((Date.now() - start) / 1000).toFixed(2)
    log('android', colors.red, `❌ Android build task failed after ${duration}s: ${err.message}`)
    throw err
  }
}

async function main() {
  const overallStart = Date.now()

  console.log(`\n${colors.bold}${colors.magenta}====================================================${colors.reset}`)
  console.log(`${colors.bold}${colors.magenta}🚀 OpenGym Unified Build System${colors.reset}`)
  console.log(`${colors.gray}Target platforms:${colors.reset} ${shouldBuildWeb ? 'Web ' : ''}${shouldBuildAndroid ? 'Android' : ''}`)
  console.log(`${colors.bold}${colors.magenta}====================================================${colors.reset}\n`)

  let webPromise = null
  let androidPromise = null

  // Launch Web and Android builds concurrently / simultaneously
  if (shouldBuildWeb) {
    webPromise = buildWeb()
  }

  if (shouldBuildAndroid) {
    androidPromise = buildAndroid(webPromise)
  }

  try {
    const results = await Promise.all([
      webPromise,
      androidPromise
    ])

    const totalDuration = ((Date.now() - overallStart) / 1000).toFixed(2)
    const webResult = results[0]
    const androidResult = results[1]

    console.log(`\n${colors.bold}${colors.green}====================================================${colors.reset}`)
    console.log(`${colors.bold}${colors.green}✨ Unified Build Finished Successfully!${colors.reset}`)
    if (webResult) {
      console.log(`  ${colors.bold}• Web:${colors.reset}     ${colors.green}✅ Built in ${webResult.duration}s${colors.reset} (dist/)`)
    }
    if (androidResult) {
      console.log(
        `  ${colors.bold}• Android:${colors.reset} ${colors.green}✅ Built in ${androidResult.duration}s${colors.reset} (android/${androidResult.apkBuilt ? ' - APK generated' : ' - assets synced'})`
      )
    }
    console.log(`  ${colors.bold}• Total:${colors.reset}   ${totalDuration}s elapsed`)
    console.log(`${colors.bold}${colors.green}====================================================${colors.reset}\n`)
    process.exit(0)
  } catch (error) {
    const totalDuration = ((Date.now() - overallStart) / 1000).toFixed(2)
    console.error(`\n${colors.bold}${colors.red}====================================================${colors.reset}`)
    console.error(`${colors.bold}${colors.red}❌ Unified Build Failed after ${totalDuration}s${colors.reset}`)
    console.error(`${colors.red}${error.message}${colors.reset}`)
    console.error(`${colors.bold}${colors.red}====================================================${colors.reset}\n`)
    process.exit(1)
  }
}

main()
