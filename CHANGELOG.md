# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]


### Added

- CHANGELOG.md Changelog
- content to the README.md
- Chat to the bingo game (renderd with markdown-it)
- Postgres session storage
- sql-file directory `sql`
- LICENSE.md (GPL v3)
- eslint to dev dependencys

## Changed

- changed export of `app.js` to the asynchronous init function that returns the app object
- `bin/www` now calls the init function of `app.js`

### Removed

- sqlite3 sesssion storage

### Fixed

- mobile layout
- code style issues
- Bingo button not shown on refresh
