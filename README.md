# Movie Reviews API

A REST API for a movie reviews system. Guests can browse and search movies and read reviews. Logged-in users can write reviews with a rating from 1 to 10 and free text. Admins manage the movies. Each movie shows its average rating and number of reviews.

Built with Node.js, Express 5, TypeScript, MongoDB with Mongoose, JWT authentication, Swagger documentation and Jest tests.

## Requirements

- Node.js 20 or newer
- A local MongoDB install, running on your machine (needed for the server and the seed script; the tests use an in-memory MongoDB and don't need it)

## Installation

```bash
npm install
cp .env.example .env
```

Then edit `.env`:

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB connection string, for example `mongodb://localhost:27017/movie-reviews` |
| `JWT_SECRET` | Yes | Secret used to sign the tokens. Use a long random string. |
| `PORT` | No | Server port. Defaults to `3000`. |
| `JWT_EXPIRES_IN` | No | How long a token is valid. Defaults to `1d`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Only for the seed | The admin account the seed script creates. |

## Running

**Server** (restarts automatically on save):

```bash
npm run dev
```

The API runs at `http://localhost:3000`. Check it with `GET /health`.

**Seed script** (sample data):

```bash
npm run seed
```

It **deletes** all users, movies and reviews, then creates an admin, a few sample users, movies and reviews.

- **Admin:** the username and password come from `ADMIN_USERNAME` and `ADMIN_PASSWORD` in `.env`.
- **Sample users:** `dana`, `yossi`, `noa`, `avi`, `maya`, all with the password `password123` (demo accounts only).

It refuses to run when `NODE_ENV=production`, unless you run `npm run seed -- --force`.

**Tests:**

```bash
npm test                          # all tests
npx jest tests/api/movies.test.ts # one file
npx jest -t "health"              # tests whose name matches
```

The first run downloads a MongoDB binary for the in-memory database, so it takes longer.

**API documentation (Swagger):** with the server running, open `http://localhost:3000/api-docs`. To call protected routes, log in with `POST /auth/login`, copy the token, and paste it in the **Authorize** button.

## Architecture

Each request goes through the same layers:

- **Routes** (`src/routes/`): map a URL and method to a controller, and add the auth middleware where needed.
- **Controllers** (`src/controllers/`): read the request, call a service, send the response.
- **Services** (`src/services/`): the business logic and permission checks.
- **Models** (`src/models/`): Mongoose schemas and validation.

Middleware:

- `authenticate` checks the JWT and sets `req.user`. `requireAdmin` allows only admins.
- `errorHandler` is registered last. Services throw errors like `NotFoundError` or `ForbiddenError`, and it turns them into a JSON response with the right status code.

`src/app.ts` builds the Express app and `src/server.ts` connects to MongoDB and starts listening. They are separate so tests can import the app without opening a port.

### Request flow

Example: a user writes a review with `POST /movies/:id/reviews`.

```
request
  │
  ▼
route          review.routes.ts
  │            authenticate → 401 if there's no valid token
  ▼
controller     review.controller.ts → reads movie id, body and req.user
  │
  ▼
service        review.service.ts → checks the movie exists,
  │            saves the review, updates the movie's stats
  ▼
model          Review / Movie → validation, saved in MongoDB
  │
  ▼
response       201 + the new review

Any error thrown along the way → errorHandler → { error, details? }
```

### Folder structure

```
src/
  app.ts            builds the Express app
  server.ts         entry point: connects to MongoDB, starts the server
  config/           environment variables and database connection
  routes/           one router per resource
  controllers/      request and response handling
  services/         business logic
  models/           Mongoose schemas
  middleware/       authentication and error handling
  docs/             OpenAPI (Swagger) spec
  scripts/          seed script
  utils/            error classes
tests/
  unit/             no database
  integration/      services with a database
  api/              HTTP requests with a database
  setup/            in-memory database, env, and auth helpers
docs/
  decisions.md      design decisions
```

## Endpoints

| Method | Path | Description | Who can call it |
|---|---|---|---|
| GET | `/health` | Server status | Everyone |
| POST | `/auth/register` | Create an account | Everyone |
| POST | `/auth/login` | Log in, get a JWT | Everyone |
| GET | `/movies` | List and search movies (`title`, `genre`, `year`, `director`) | Everyone |
| GET | `/movies/:id` | Movie details | Everyone |
| POST | `/movies` | Create a movie | Admin |
| PATCH | `/movies/:id` | Update a movie | Admin |
| DELETE | `/movies/:id` | Delete a movie and its reviews | Admin |
| GET | `/movies/:id/reviews` | List a movie's reviews | Everyone |
| POST | `/movies/:id/reviews` | Write a review | Logged-in user |
| PATCH | `/reviews/:id` | Edit a review | The review's author |
| DELETE | `/reviews/:id` | Delete a review | The review's author or an admin |

Protected routes need the header `Authorization: Bearer <token>`. Full request and response details are in Swagger.

## Main design decisions

- There are two roles, `user` and `admin`. Registration always creates a `user`; the first admin is created by the seed script.
- Movies are updated with `PATCH` (only the sent fields change). Clients can't set `reviewsCount` or `averageRating`.
- One review per user per movie, enforced by a unique index. A second review returns 409.
- The movie stats are updated with one atomic MongoDB update per review change, using a hidden `ratingsSum`. This keeps them correct when several reviews change at the same time.
- Deleting a movie also deletes its reviews.
- A wrong username and a wrong password return the same error, so the API doesn't reveal which usernames exist.

The full list is in [docs/decisions.md](docs/decisions.md).

## Known limitations

- **No transactions for review stats.** Saving a review and updating the movie's stats are two separate operations. If the server crashed exactly between them, the stats would be off by one review. Transactions in MongoDB need a replica set, and we chose to keep a simple local MongoDB setup.
- **A token keeps its old role.** The role is stored inside the JWT, so if a user's role changes, their existing token keeps the old role until it expires (1 day by default).

## How it was built

This project was built with [Claude Code](https://claude.com/claude-code), following a plan-first, TDD workflow: for each feature, a plan was written and approved first, then failing tests were written, then the code to make them pass. Each feature was developed on its own branch and merged with a pull request.

## Demo video

Link will be added.
