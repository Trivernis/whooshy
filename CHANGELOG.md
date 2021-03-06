# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2019-05-23

### Added

- socket.io for real time communication
- compression and minify
- auto replacing image links with images in the chat
- auto replacing urls to urls with link in the chat
- message editing and deleting *(undo your mistakes)*
- changelog to `bingo-create`

### Changed

- frontend to use socket.io instead of graphql for refreshing
- use of socket.io for toggeling binogo fields
- button behaviour on `bingo-create` to respond to the situation *(whatever that means)*

### Removed

- graphql frontend functions to send messages and refresh

### Fixed

- error message when loading `bingo-create`
- chat doesn't scroll down when an image is send *(r/mildlyinfuriating)*
- some style issues

## [0.1.1] - 2019-05-21

### Fixed
- preloaded info messages can't be hidden (#18)
- no special character allowed in username (#19)

## [0.1.0] - 2019-05-19

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
- cookie info dialog
- chat and round notifications

### Changed

- changed export of `app.js` to the asynchronous init function that returns the app object
- `bin/www` now calls the init function of `app.js`
- graphql bingo api
- bingo frontend
- moved some bingo pug files to ./bingo/includes/
- style of `code`
- font to Ubuntu and Ubuntu Monospace
- grid size limit to 5
- improved sql grid word insertion query

### Removed

- sqlite3 sesssion storage
- old frontend
- old bingo pug files
- riddle and users (currently deactivated)

### Fixed

- mobile layout
- code style issues
- Bingo button not shown on refresh
- bingo chat style (images too large)
- backend now returns precise error messages
- setting words won't result in deleting all of them and resaving
- words can now only be set when no round is active
- username allowing emojis
- username can have a length of 0 (now at least 1 character)
- mozilla didn't have a fancy scrollbar (no webkit browser)
- kicked users can join lobby on active round
- users can't join lobby on active round
- server crash on too big phrases
