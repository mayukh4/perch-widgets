import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const WIDGETS_DIR = new URL('../widgets/', import.meta.url).pathname
export const CATEGORIES = ['glance', 'home', 'media', 'productivity', 'data', 'fun']

const PATTERNS = {
  id: /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/,
  author: /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/,
  repo: /^https:\/\/github\.com\/[^/]+\/[^/]+$/,
  perchMinVersion: /^\d+\.\d+\.\d+$/,
}

/** Validate one entry object. Returns a list of problems, empty when clean. */
export function problemsWith(entry, filename) {
  const p = []
  const need = ['id', 'name', 'description', 'author', 'repo', 'tag', 'category', 'perchMinVersion', 'license', 'screenshot']
  for (const k of need) if (!entry[k] || typeof entry[k] !== 'string') p.push(`missing or non-string "${k}"`)
  if (p.length) return p

  const allowed = new Set([...need, 'stale', 'addedAt'])
  for (const k of Object.keys(entry)) if (!allowed.has(k)) p.push(`unknown field "${k}"`)

  if (!PATTERNS.id.test(entry.id)) p.push('id must be lowercase letters, digits and hyphens (3-40 chars)')
  if (filename && filename !== `${entry.id}.json`) p.push(`filename must be ${entry.id}.json`)
  if (entry.description.length < 10 || entry.description.length > 140) p.push('description must be 10-140 chars')
  if (!PATTERNS.author.test(entry.author)) p.push('author must be a GitHub username')
  if (!PATTERNS.repo.test(entry.repo)) p.push('repo must be https://github.com/owner/name')
  if (!CATEGORIES.includes(entry.category)) p.push(`category must be one of: ${CATEGORIES.join(' · ')}`)
  if (!PATTERNS.perchMinVersion.test(entry.perchMinVersion)) p.push('perchMinVersion must be x.y.z')
  if (!entry.screenshot.startsWith('https://')) p.push('screenshot must be an https URL')
  return p
}

export function readEntries() {
  let files = []
  try {
    files = readdirSync(WIDGETS_DIR).filter((f) => f.endsWith('.json'))
  } catch {
    return []
  }
  return files.sort().map((f) => ({
    file: f,
    entry: JSON.parse(readFileSync(join(WIDGETS_DIR, f), 'utf8')),
  }))
}

/** GitHub API GET with the workflow token when present. */
export async function gh(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'perch-widgets-ci',
      ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  })
  return { status: res.status, body: res.ok ? await res.json() : null }
}

export function ownerAndName(repoUrl) {
  const [owner, name] = repoUrl.replace('https://github.com/', '').split('/')
  return { owner, name }
}
