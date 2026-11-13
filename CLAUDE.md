# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project goal

A REST API for a movie reviews system. The system manages:

- Movies: create, update, delete, search and view details. 
- Reviews: create, update, delete and view, with a numeric rating and free text. 
- Ratings: each movie shows its average rating and number of reviews. 
- Users: registration, login and permissions. 

Required technologies (set by the assignment):

- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Architecture: separation of concerns (routes, controllers, services, models)
- API documentation: Swagger
- Authentication: JWT
- Testing: unit, integration and API tests, following TDD
- Version control: Git and GitHub

Design decisions are documented in 'docs/decisions.md' . Read it before working on movies, reviews or users. 


## Project state

The project skeleton is in place: TypeScript, an Express server with `GET /health`, a MongoDB connection through Mongoose, and Jest tests. Movies are done (CRUD + search; writes are admin only). Users and JWT authentication are done (register, login, `authenticate`/`requireAdmin` middleware). Reviews aren't built yet. Swagger, the seed script and linting aren't set up yet.

- The code is TypeScript, written with `import`/`export` and compiled as CommonJS (`"type": "commonjs"`, `module: commonjs` in `tsconfig.json`).
- TypeScript is pinned to `^6`. TypeScript 7 (the native compiler) doesn't expose the JS compiler API that `ts-jest` needs, so don't upgrade it until `ts-jest` supports it.
- There's no build or start script yet. `npm run dev` runs the TypeScript directly with `tsx`.
- `.env` is gitignored. Copy `.env.example` to `.env`. `MONGODB_URI` and `JWT_SECRET` are required, `PORT` defaults to 3000 and `JWT_EXPIRES_IN` to `1d`.

## Commands

- `npm install`: install dependencies
- `cp .env.example .env`: create the local env file (needs a running MongoDB)
- `npm run dev`: start the server with auto-restart on save (`tsx watch src/server.ts`)
- `npm test`: run all Jest tests
- `npx jest tests/health.test.ts`: run a single test file
- `npx jest -t "health"`: run tests whose name matches a pattern
- `npx tsc --noEmit`: type-check without emitting files

## Architecture

- **`src/app.ts` vs `src/server.ts`:** `app.ts` only builds the Express app (middleware + routes) and exports it. `server.ts` is the entry point: it connects to MongoDB and only then calls `app.listen`. If the connection fails, it logs the error and exits with code 1. Tests import `app` directly, so they need no port and no database.
- **Layers:** each request goes route → controller → service → model.
  - `src/routes/`: one router file per resource (`*.routes.ts`), all mounted in `src/routes/index.ts`.
  - `src/controllers/`: read the request, call a service, send the response.
  - `src/services/`: business logic.
  - `src/models/`: Mongoose schemas.
  - Health has no logic, so it stops at the controller.
- **Errors:** services throw `AppError` subclasses from `src/utils/errors.ts` (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`). `src/middleware/errorHandler.ts` is registered last in `app.ts` and turns them, plus Mongoose `ValidationError`/`CastError`, MongoDB duplicate key errors (409) and invalid JSON, into `{ error, details? }` responses. Express 5 forwards rejected promises there, so controllers have no try/catch.
- **Auth:** `POST /auth/register` and `POST /auth/login` (`auth.service.ts`). The User model hashes the password in a `pre('save')` hook and hides it with `select: false`. `src/middleware/auth.middleware.ts` has `authenticate` (verifies the Bearer JWT, sets `req.user = { id, role }`, else 401) and `requireAdmin` (403 unless admin, use after `authenticate`). Admins are never created through the API.
- **Movies:** update is `PATCH /movies/:id` (partial), not PUT. The service copies only the editable fields, so clients can't set `reviewsCount`/`averageRating`/`createdBy`. `createdBy` comes from `req.user`. Cascade delete of reviews comes with the reviews task.
- **Config:** `src/config/env.ts` loads `.env` with dotenv and throws at import time if `MONGODB_URI` or `JWT_SECRET` is missing. `src/config/db.ts` exports `connectDB(uri)`.
- **Tests:** they live in `tests/` (`jest.config.js` sets `roots` to it) and run through `ts-jest`. API tests use `supertest` against the exported `app`.
  - `tests/unit/` (no DB), `tests/integration/` (services + DB), `tests/api/` (HTTP + DB).
  - Tests that need a DB call `useTestDatabase()` from `tests/setup/db.ts`. It starts an in-memory MongoDB (`mongodb-memory-server`), clears collections after each test, and never touches the `.env` database. The first run downloads the mongod binary.
  - `tests/setup/env.ts` runs before every test file (`setupFiles`) and sets `JWT_SECRET` (and a dummy `MONGODB_URI`), so tests don't need a `.env`.
  - `tests/setup/auth.ts`: `createUser(role)` creates a user directly in the DB (the only way to get an admin), `getToken(role)` creates one and logs in through the API.
  - That helper passes `runtimeAdapters: { os }` to `mongoose.connect`. Without it, MongoDB driver 7 fails inside Jest ("Missing required sub-document 'driver'"), because it loads `os` with a dynamic `import()` that Jest's sandbox doesn't support. Keep it in any new connection made in tests.

## Work rules

- Before every task, present a plan and wait for my approval. 
- Before any commit, ask for my approval. 
- Start each new task on a new branch. 
- After each change, explain simply what you did and why. I am a student and I want to understand the code.
- Don't add anything I didn't ask for. 