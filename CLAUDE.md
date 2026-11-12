# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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