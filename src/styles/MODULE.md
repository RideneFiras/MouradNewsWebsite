# src/styles: design tokens and global CSS

The visual direction is `docs/02-design-system.md` (**non-negotiable**): a printed Tunisian
newspaper, not a template. Warm paper, black ink, one press red, hairline rules, no rounded cards,
no shadows, no gradients, no emoji.

| File | What |
|---|---|
| `tokens.css` | CSS variables: colours (`--paper`, `--ink`, `--ink-2`, `--ink-3`, `--rule`, `--accent` press red…), container/gutter/measure, font stacks. **Components use tokens only, never raw hex.** |
| `globals.css` | Tailwind 4 (`@theme inline` maps tokens to utilities), type scale, rules, story units, article body, admin primitives (`.a-panel`, `.a-btn`, `.a-input`…), print stylesheet |

Fonts (`src/app/fonts.ts`, `src/app/fonts/`): Aref Ruqaa (nameplate), Markazi Text (headlines),
Noto Naskh Arabic (body), IBM Plex Sans Arabic (UI), with Source Serif 4 and IBM Plex Sans for
Latin text. The Arabic faces are self-hosted subsets (`scripts/fonts/subset-arabic-fonts.sh`)
with `display: optional` (no layout shift); the Arabic face comes first in every stack
(DECISIONS.md, Phase 5 "Fonts, measured").

Rules: logical properties only (`ms-*`, `pe-*`, `start-*`, `margin-inline-start`…), never
`left`/`right` for layout; contrast ≥ 4.5:1 for small text (`--ink-3` was darkened for this);
check every change in Arabic (RTL) first, then French, at 375 px and 1280 px.
