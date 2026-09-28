# Architecture rules

- Keep client-imported `createServerFn` modules outside `src/backend/`; that directory is blocked from client import graphs.
