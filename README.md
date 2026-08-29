<video src="/public/og-video.mp4" poster="public/og-image.webp"  width="100%" autoplay loop muted></video>

# Metrónomo

Web metronome without UI dependencies: SVG + Web Audio API (scheduler with _lookahead_) + TypeScript, bundled with Vite.

## Development

```bash
bun install
bun run dev
```

## Production build

```bash
bun run build    # checks types and generates dist/
bun run preview  # serves dist/ locally to check it
```
