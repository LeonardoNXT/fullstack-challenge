# Skill - Frontend React

## Stack

- TanStack Start for the app scaffold whenever feasible.
- React functional components.
- TanStack Query for REST data and mutations.
- Zustand for ephemeral local state such as connection status and UI preferences.
- Tailwind CSS v4 for styling.
- shadcn/ui for accessible component primitives.

Fallback:

- Use Vite only if TanStack Start creates delivery risk.

## Component Rules

- Keep page-level data fetching near page containers.
- Keep reusable UI primitives in `src/components/ui`.
- Keep game-specific components in `src/components/game`.
- Keep API clients in `src/services` or `src/api`.
- Keep auth integration isolated in `src/auth`.

## UX Rules

- The first screen is the game, not a marketing landing page.
- Show loading, empty, error, and disconnected states.
- Do not rely on WebSocket as the only source of state.
