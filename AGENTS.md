# Architecture rules

- Keep server functions and their server-only helpers under `src/backend/`; unlike `src/server/`, this path supports TanStack server-function imports from the client graph.
- Password changes for student accounts revalidate the current password server-side and must not depend solely on the session cookie, because embedded previews may reject cross-site cookies.
