# Architecture rules

- Keep client-imported `createServerFn` modules outside `src/server/`; that directory is blocked from client import graphs.
