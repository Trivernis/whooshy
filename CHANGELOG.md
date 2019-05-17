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
- table creation script for bingo
- sql scripts for bingo
- data management class for bingo
- libs with utils and global variables
- css for startpage (wip)
- file for css animations
- pug file for startpage
- bingo lobbys
- kick function for bingo
- grid size input
- bingo status bar
- bingo chat commands

## Changed

- changed export of `app.js` to the asynchronous init function that returns the app object
- `bin/www` now calls the init function of `app.js`
- graphql bingo api
- bingo frontend
- moved some bingo pug files to ./bingo/includes/

### Removed

- sqlite3 sesssion storage
- old frontend
- old bingo pug files

### Fixed

- mobile layout
- code style issues
- Bingo button not shown on refresh
- bingo chat style (images too large)
