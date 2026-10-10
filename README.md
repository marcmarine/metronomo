![Metronomo](/public/demo.webp)

# Metrónomo

Web metronome without UI dependencies: SVG + Web Audio API (scheduler with _lookahead_) + TypeScript, bundled with Vite.

The HTML pages are generated from [Vento](https://vento.js.org) templates in `templates/pages/*.vto`.

## Development

```bash
bun install
bun run dev
```

`dev` renders templates first (`bun run templates`) and then starts Vite.

## Production build

```bash
bun run build    # renders templates, checks types and generates dist/
bun run preview  # serves dist/ locally to check it
```
