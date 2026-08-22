/**
 * PR validation. Called by .github/workflows/validate-pr.yml with:
 *   node scripts/validate.mjs <changed-file...>
 * Env: PR_AUTHOR (the PR's GitHub login), BASE_REF (checkout of the base
 * branch lives at ./base when an update is being checked).
 *
 * Exits non-zero with human sentences on stderr — those land in the check
 * output, and they are written for the submitter, not for the maintainer.
 */
import { readFileSync, existsSync } from 'node:fs'
import { basename, join } from 'node:path'
import { problemsWith, gh, ownerAndName } from './lib.mjs'

const changed = process.argv.slice(2)
const fail = (msg) => {
  console.error(`✗ ${msg}`)
  process.exitCode = 1
}

const widgetFiles = changed.filter((f) => f.startsWith('widgets/') && f.endsWith('.json'))
const otherFiles = changed.filter((f) => !widgetFiles.includes(f))

if (otherFiles.length) fail(`a submission PR changes only its own file under widgets/ — also touched: ${otherFiles.join(', ')}`)
if (widgetFiles.length !== 1) fail(`exactly one widget file per PR — found ${widgetFiles.length}`)

if (process.exitCode) process.exit()

const file = widgetFiles[0]
let entry
try {
  entry = JSON.parse(readFileSync(file, 'utf8'))
} catch (e) {
  fail(`${file} is not valid JSON: ${e.message}`)
  process.exit()
}

for (const p of problemsWith(entry, basename(file))) fail(p)
if (entry.stale !== undefined || entry.addedAt !== undefined) fail('leave "stale" and "addedAt" out — CI owns those fields')
if (process.exitCode) process.exit()

const { owner, name } = ownerAndName(entry.repo)

// You list your own work: the PR author must own the widget repo.
const author = process.env.PR_AUTHOR || ''
if (author.toLowerCase() !== owner.toLowerCase()) {
  fail(`the PR must come from the repo's owner — PR by "${author}", repo owned by "${owner}"`)
}

// The repo: public, alive, issues on, topic set.
const repo = await gh(`/repos/${owner}/${name}`)
if (repo.status !== 200) fail(`cannot see ${entry.repo} — is it public?`)
else {
  if (repo.body.archived) fail('the repo is archived')
  if (!repo.body.has_issues) fail('enable issues on the repo — bug reports for your widget go to you')
  if (repo.body.private) fail('the repo must be public')
  const topics = repo.body.topics ?? []
  if (!topics.includes('perch-widget')) fail('add the "perch-widget" topic to the repo (About → settings gear → Topics)')
}

// The tag: a real release, with the required files present at it.
const rel = await gh(`/repos/${owner}/${name}/releases/tags/${encodeURIComponent(entry.tag)}`)
if (rel.status !== 200) fail(`no GitHub release for tag "${entry.tag}" — create one, installs point at it`)

for (const path of ['widget/widget.json', 'LICENSE']) {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${name}/${encodeURIComponent(entry.tag)}/${path}`,
    { method: 'HEAD' },
  )
  if (!res.ok) fail(`${path} not found at tag ${entry.tag}`)
}

const shot = await fetch(entry.screenshot, { method: 'HEAD' })
if (!shot.ok) fail(`screenshot URL does not resolve (${shot.status})`)

// Manifest id must match the listing id.
try {
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${name}/${encodeURIComponent(entry.tag)}/widget/widget.json`,
  )
  if (res.ok) {
    const manifest = await res.json()
    if (manifest.id !== entry.id) fail(`listing id "${entry.id}" but the widget's manifest says "${manifest.id}"`)
  }
} catch {
  fail('widget/widget.json at the tag is not valid JSON')
}

// Updates only move forward.
const baseFile = join('base', file)
if (existsSync(baseFile)) {
  const before = JSON.parse(readFileSync(baseFile, 'utf8'))
  const norm = (t) => t.replace(/^v/, '')
  const cmp = norm(entry.tag).localeCompare(norm(before.tag), undefined, { numeric: true })
  if (cmp <= 0) fail(`tag must increase: "${before.tag}" is already listed, got "${entry.tag}"`)
}

if (!process.exitCode) console.log(`✓ ${entry.id} — all checks passed`)
