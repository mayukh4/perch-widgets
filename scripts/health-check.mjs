/**
 * Weekly freshness sweep — the MagicMirror lesson: a list nobody prunes is
 * a list nobody can trust. Repos that vanished or archived move to
 * removed.json (the workflow turns that into a PR); repos quiet for 18
 * months get "stale": true so the gallery can say so.
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { readEntries, gh, ownerAndName, WIDGETS_DIR } from './lib.mjs'

const EIGHTEEN_MONTHS = 548 * 24 * 3600 * 1000
const removedPath = new URL('../removed.json', import.meta.url)
let removed = []
try {
  removed = JSON.parse(readFileSync(removedPath, 'utf8'))
} catch {
  removed = []
}

let changes = 0
for (const { file, entry } of readEntries()) {
  const { owner, name } = ownerAndName(entry.repo)
  const repo = await gh(`/repos/${owner}/${name}`)

  if (repo.status === 404 || repo.body?.archived) {
    removed.push({
      id: entry.id,
      repo: entry.repo,
      reason: repo.status === 404 ? 'repository gone' : 'repository archived',
      removedAt: new Date().toISOString().slice(0, 10),
    })
    unlinkSync(join(WIDGETS_DIR, file))
    console.log(`removed ${entry.id}: ${repo.status === 404 ? 'gone' : 'archived'}`)
    changes++
    continue
  }
  if (repo.status !== 200) {
    console.log(`skip ${entry.id}: API said ${repo.status}, not touching it`)
    continue
  }

  const quiet = Date.now() - new Date(repo.body.pushed_at).getTime() > EIGHTEEN_MONTHS
  if (quiet !== Boolean(entry.stale)) {
    const next = { ...entry }
    if (quiet) next.stale = true
    else delete next.stale
    writeFileSync(join(WIDGETS_DIR, file), JSON.stringify(next, null, 2) + '\n')
    console.log(`${entry.id}: stale → ${quiet}`)
    changes++
  }
}

writeFileSync(removedPath, JSON.stringify(removed, null, 2) + '\n')
console.log(changes ? `${changes} change(s) — the workflow opens a PR` : 'all listings healthy')
