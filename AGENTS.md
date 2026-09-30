# Architecture rules

- Keep server functions and their server-only helpers under `src/backend/`; unlike `src/server/`, this path supports TanStack server-function imports from the client graph.
- Password changes for student accounts revalidate the current password server-side and must not depend solely on the session cookie, because embedded previews may reject cross-site cookies.
- Student workout views use the published `is_global` schedule as the club-wide canonical plan, so every student sees the same week on Home and WOD.
- The shared workout builder lives at `/treinos`; do not restore workout authoring inside an individual student profile.
- Weekly training saves update sessions/blocks in place (never delete-and-reinsert), because `treino_resultados` references block/session IDs and results must never be wiped automatically.
