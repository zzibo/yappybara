# yappybara 🦫

Speech pronunciation practice. MonkeyType for speaking.

## Stack
- Next.js 16 (App Router), React 19, TypeScript strict
- Tailwind CSS v4 + shadcn/ui
- Azure Speech SDK (pronunciation assessment)
- Zustand, Web Audio API
- Vercel

## Commands
- `npm run dev` — dev server
- `npm run build` — production build
- `npm run typecheck` — TypeScript check
- `npm test` — unit tests (vitest)

## Conventions
- Single page app — everything on /
- Functional components, named exports
- Colocate tests: `foo.tsx` → `foo.test.tsx`
- Azure SDK lazy-loaded, never in initial bundle
- Sounds via Web Audio API synthesis or preloaded MP3s
- Keyboard-first: Space, R, Escape
- Dark theme always — bg #1a1a2e
- JetBrains Mono for paragraph text, Inter for UI

## Key Architecture
- `src/app/page.tsx` — the entire app, state machine: idle → recording → processing → results
- `src/hooks/use-speech-recorder.ts` — Azure Speech SDK wrapper
- `src/lib/azure/token.ts` — client-side token manager
- `src/app/api/speech/token/route.ts` — server-side Azure token proxy
- `src/data/paragraphs.ts` — hardcoded paragraph content
- `src/stores/practice.ts` — Zustand store for practice state
