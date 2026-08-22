# Submitting a widget

Total cost: one JSON file. The checks are automated; a human looks at the
diff for about a minute at the end.

## Before the PR — your repo

Start from the
[widget template](https://github.com/mayukh4/perch-widget-template) or bring
your own repo shaped like it:

1. **Public repo, issues enabled**, with the `perch-widget` topic set.
2. The widget itself in a `widget/` folder — `widget.json`, `Widget.tsx`,
   optional `server.ts` — exactly as
   [docs/WIDGETS.md](https://github.com/mayukh4/perch/blob/main/docs/WIDGETS.md)
   specifies. It must pass `npm run registry && npm run typecheck` when
   copied into a Perch checkout.
3. A **screenshot of it on a panel** (or the dev kiosk) committed to the repo.
4. A **LICENSE** file (any OSI license).
5. A **tagged GitHub release** — installs point at the tag, not at main.

## The PR — this repo

Add exactly one file, `widgets/<your-id>.json`:

```json
{
  "id": "moon",
  "name": "Moon",
  "description": "Tonight's moon: phase, illumination, and the next full one.",
  "author": "yourgithubname",
  "repo": "https://github.com/yourgithubname/perch-widget-moon",
  "tag": "v1.0.0",
  "category": "glance",
  "perchMinVersion": "0.1.0",
  "license": "MIT",
  "screenshot": "https://raw.githubusercontent.com/yourgithubname/perch-widget-moon/v1.0.0/screenshot.png"
}
```

- `id` matches the filename and your widget folder's id: lowercase,
  digits, hyphens.
- `category` is one of: `glance` · `home` · `media` · `productivity` ·
  `data` · `fun`.
- The PR must come from the account that owns the repo — you list your own
  work, nobody else's.

CI checks the schema, that the repo and tag exist, that the manifest,
LICENSE and screenshot resolve at that tag, and that the topic and issues
are in place. Green checks plus a sane one-file diff gets merged.

## Updating

Bump `tag` (and anything else that changed) in your file, one-line PR. The
version must go up — CI rejects a tag that goes backwards, so a listing can
never silently point at something older than what people already have.

## Being removed

Repos that 404 or archive get moved to `removed.json` by the weekly check,
with a reason, so Perch users can be warned rather than stranded. If that
was a mistake, a PR restoring your file with a working repo is all it takes.
