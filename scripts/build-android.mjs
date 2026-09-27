#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const buildScript = resolve(__dirname, 'build.mjs')

const args = ['--android', ...process.argv.slice(2)]
const proc = spawn(process.execPath, [buildScript, ...args], {
  stdio: 'inherit'
})

proc.on('close', code => {
  process.exit(code || 0)
})
