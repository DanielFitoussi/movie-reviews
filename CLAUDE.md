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

This is a freshly initialized Node.js project (`movie-reviews`) for a course assignment (Advanced Topics in AI Systems and Web Application Development). Right now it contains only `package.json` and `.gitignore`. There is no source code, dependency list, build step, linter or test framework yet.

- Module system: CommonJS (`"type": "commonjs"` in `package.json`), so use `require`/`module.exports` unless the project is switched to ESM.
- Declared entry point: `index.js` (doesn't exist yet).
- `npm test` is the npm placeholder and always exits with an error.
- `.env` is gitignored. Keep secrets such as API keys or DB URLs there.

## Commands

- `npm install`: install dependencies

Add the run, lint and test commands (including how to run a single test) here once they are set up in `package.json`.

## Architecture

Not established yet. Update this section once the app structure (server, routes, data layer, frontend) exists.

## Work rules

- Before every task, present a plan and wait for my approval. 
- Before any commit, ask for my approval. 
- Start each new task on a new branch. 
- After each change, explain simply what you did and why. I am a student and I want to understand the code.
- Don't add anything I didn't ask for. 