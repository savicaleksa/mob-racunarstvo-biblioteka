# NestJS for the backend

The assignment allows "Express or Nest." We chose **NestJS** because the requirements read like its feature list: JWT auth (`@nestjs/jwt` + Passport), role-based access control via Guards and decorators, and DTO validation via `class-validator`. The layered module/controller/service structure is handed to us rather than hand-rolled as Express middleware, which both reduces boilerplate risk and reads well against a "clean architecture" grading rubric.

## Considered Options

- **Express** — smaller and unopinionated, but we would hand-build routing, auth middleware, RBAC, and structure ourselves. Chosen against because Nest gives those as idiomatic, documented patterns.
