/**
 * Regenerates index.json and the README gallery from widgets/*.json.
 * Run by CI on every merge to main; never edit those outputs by hand.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { readEntries, CATEGORIES } from './lib.mjs'

const today = new Date().toISOString().slice(0, 10)
const entries = readEntries().map(({ entry }) => ({ addedAt: today, ...entry }))

entries.sort((a, b) => a.id.localeCompare(b.id))
writeFileSync(
  new URL('../index.json', import.meta.url),
  JSON.stringify({ generated: today, widgets: entries }, null, 2) + '\n',
)

const label = {
  glance: 'At a glance',
  home: 'Home',
  media: 'Media',
  productivity: 'Productivity',
  data: 'Data',
  fun: 'Fun',
}

let gallery = ''
if (entries.length === 0) {
  gallery =
    '*The shelf is open. The first widgets land here at launch — yours could be\namong them: [submit one](SUBMITTING.md).*'
} else {
  for (const cat of CATEGORIES) {
    const inCat = entries.filter((e) => e.category === cat)
    if (!inCat.length) continue
    gallery += `\n### ${label[cat]}\n\n| | Widget | | \n|---|---|---|\n`
    for (const e of inCat) {
      const staleMark = e.stale ? ' · ⚠ quiet for 18 months' : ''
      gallery += `| <img src="${e.screenshot}" width="160" alt=""> | **[${e.name}](${e.repo})** \`${e.tag}\`<br>${e.description} | by [@${e.author}](https://github.com/${e.author}) · ${e.license}${staleMark} |\n`
    }
  }
  gallery = gallery.trim()
}

const readmePath = new URL('../README.md', import.meta.url)
const readme = readFileSync(readmePath, 'utf8')
const updated = readme.replace(
  /(<!-- GALLERY:START[^>]*-->)[\s\S]*(<!-- GALLERY:END -->)/,
  `$1\n${gallery}\n$2`,
)
writeFileSync(readmePath, updated)
console.log(`index.json + gallery: ${entries.length} widget${entries.length === 1 ? '' : 's'}`)
