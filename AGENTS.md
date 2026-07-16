# AGENTS.md

## Cursor Cloud specific instructions

This repo is a **frontend-only** project (no backend, no database, no auth). It contains two independent Vue single-page apps scaffolded with Vue CLI 5, managed with **Yarn** (Yarn 1.x). Node 22 is available.

There are three separate `package.json`/`yarn.lock` roots, each needing its own install: `/workspace` (root, provides `@vue/cli`), `/workspace/vue2web`, and `/workspace/vue3web`. The update script installs all three.

### Services

| Service | Path | Deployed? | Run (dev) | Lint | Build |
| --- | --- | --- | --- | --- | --- |
| `vue2web` (Vue 2, pkg `hh`) | `vue2web/` | Yes (CI builds this → GitHub Pages) | `cd vue2web && yarn serve` | `yarn lint` | `yarn build` |
| `vue3web` (Vue 3) | `vue3web/` | No (experimental) | `cd vue3web && yarn serve` | `yarn lint` | `yarn build` |

### Non-obvious caveats

- **Both apps default to port 9988** (set in each `vue.config.js`). They cannot run at the same time without overriding one, e.g. `yarn serve --port 9989`.
- `vue.config.js` sets `devServer.open: true`, which tries to launch a system browser. That is harmless headless, but you can pass `--open false` to `yarn serve` to suppress it.
- The dev server binds only to localhost ("Network: unavailable" in logs is expected). Verify it with `curl http://localhost:9988/`.
- `.yarnrc` pins the registry to `https://registry.npmmirror.com` (China mirror). It works from this environment but the first `vue2web` install can take ~2 minutes.
- The page `<title>` is generated at build time as `LastUpdated <date>` — this is expected, not a bug.
- The "login" form on the About page (`vue2web/src/views/AboutView.vue`) is a pure client-side UI demo (toggles Username/Email); there is no real authentication.
- No test framework is configured; validate changes via `yarn lint`, `yarn build`, and manually in the browser.
