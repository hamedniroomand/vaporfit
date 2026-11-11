import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { availableParallelism } from 'node:os'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'

// Installs and builds each probe, then opens the build in Chrome.
// probe.mjs exports `check` and `expected`. "breaks" passes when the Vapor result and the
// VDOM result are different. "works" passes when they are equal.

const root = join(import.meta.dirname)
// The number of probes that are open in Chrome at the same time.
const PAGES = 6
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function probeNames() {
  return readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && existsSync(join(root, entry.name, 'probe.mjs')))
    .map(entry => entry.name)
    .toSorted()
}

function selectedNames() {
  const available = probeNames()
  const args = process.argv.slice(2)
  if (args.length === 0) return available
  const wanted = [...new Set(args.map(arg => arg.replace(/^repros\//, '')))].toSorted()
  const missing = wanted.filter(name => !available.includes(name))
  if (missing.length > 0) {
    console.error(`missing probe folders: ${missing.join(', ')}`)
    process.exitCode = 1
    return null
  }
  return wanted
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let output = ''
    child.stdout.on('data', chunk => {
      output += chunk
    })
    child.stderr.on('data', chunk => {
      output += chunk
    })
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) resolve(output)
      else reject(new Error(`${command} ${args.join(' ')} failed in ${cwd} (exit ${code})\n${output}`))
    })
  })
}

async function pool(items, limit, worker) {
  const queue = [...items]
  async function next() {
    const item = queue.shift()
    if (item === undefined) return
    await worker(item)
    await next()
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()))
}

const names = selectedNames()
if (names !== null && names.length === 0) {
  console.error('no probe folders')
  process.exitCode = 1
} else if (names !== null) {
  await pool(names, availableParallelism(), async name => {
    const cwd = join(root, name)
    await run('vp', ['install', '--frozen-lockfile'], cwd)
    await run('vp', ['run', 'build'], cwd)
    console.log(`built ${name}`)
  })

  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1')
    const file = join(root, decodeURIComponent(url.pathname))
    if (!existsSync(file) || !file.startsWith(root)) {
      res.writeHead(404)
      res.end()
      return
    }
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  let failed = false
  const reports = new Map()

  // Each probe has its own page, so the probes do not wait for each other.
  await pool(names, PAGES, async name => {
    const probe = await import(pathToFileURL(join(root, name, 'probe.mjs')).href)
    const page = await browser.newPage()
    page.setDefaultTimeout(8000)
    const logs = []
    page.on('console', message => logs.push(`${message.type()}: ${message.text().slice(0, 160)}`))
    page.on('pageerror', error => logs.push(`pageerror: ${error.message.slice(0, 160)}`))
    try {
      if (probe.expected !== 'breaks' && probe.expected !== 'works') {
        throw new Error('expected must be "breaks" or "works"')
      }
      if (typeof probe.check !== 'function') throw new Error('check must be a function')
      await page.goto(`http://127.0.0.1:${port}/${name}/dist/index.html`)
      await page.waitForTimeout(400)
      const vapor = await probe.check(page, 'vapor')
      const vdom = await probe.check(page, 'vdom')
      const same = JSON.stringify(vapor) === JSON.stringify(vdom)
      const pass = probe.expected === 'works' ? same : !same
      if (!pass) failed = true
      const mark = pass
        ? ''
        : probe.expected === 'works'
          ? '  <-- different, expected the same result'
          : '  <-- equal, expected a break'
      reports.set(
        name,
        `${name}${mark}\n  expected: ${probe.expected}\n  vdom : ${JSON.stringify(vdom)}\n  vapor: ${JSON.stringify(vapor)}\n  console: ${logs.length ? logs.join(' | ') : '(empty)'}`,
      )
    } catch (error) {
      failed = true
      reports.set(name, `${name}  <-- error\n  ${error.message}\n  console: ${logs.length ? logs.join(' | ') : '(empty)'}`)
    }
    await page.close()
  })
  for (const name of names) console.log(reports.get(name))

  console.log(`browser: ${browser.version()}`)
  await browser.close()
  server.close()
  if (failed) process.exitCode = 1
}
