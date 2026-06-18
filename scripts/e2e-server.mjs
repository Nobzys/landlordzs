// Builds and serves a production bundle against the local Supabase CLI stack
// instead of the hosted project, so the Playwright suite never touches
// production auth/email. A production build avoids `next dev`'s per-route
// on-demand compilation, which is unreliably slow on this machine's
// filesystem and was causing intermittent e2e timeouts.
import { readFileSync } from 'node:fs'
import { spawnSync, spawn } from 'node:child_process'

const envText = readFileSync('.env.test.local', 'utf8')
const env = { ...process.env }
for (const line of envText.split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const build = spawnSync('npx', ['next', 'build'], { env, stdio: 'inherit', shell: true })
if (build.status !== 0) process.exit(build.status ?? 1)

const child = spawn('npx', ['next', 'start', '-p', '3000'], {
  env,
  stdio: 'inherit',
  shell: true,
})

child.on('exit', (code) => process.exit(code ?? 0))
