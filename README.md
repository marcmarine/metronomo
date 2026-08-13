# Metronomo Online

Metronomo online built with Vite, React 19, TypeScript and Tailwind CSS v4.

## Requirements

- [Bun](https://bun.sh) (package manager)
- Node.js 20+ (required by Vite)

## Getting started

```sh
bun install
bun run dev
```

Open http://localhost:5173 to view the app.

## Scripts

| Script              | Description                          |
| ------------------- | ------------------------------------ |
| `bun run dev`       | Start the Vite dev server            |
| `bun run build`     | Production build to `dist/`          |
| `bun run preview`   | Preview the production build locally |
| `bun run typecheck` | Run `tsc --noEmit`                   |

## Deployment

The site is published to GitHub Pages by the workflow in
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). On every push to
`master` it installs dependencies, builds the app and deploys `dist/`.

GitHub Pages must be configured in the repo's **Settings → Pages → Build and
deployment → Source: GitHub Actions**.

Because the site is served from the `/metronomo-online/` subpath, Vite's `base`
is set to `/metronomo-online/` during CI builds (driven by the `GITHUB_ACTIONS`
env var) and to `/` for local development.
