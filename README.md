# whooshy

This repository is the node.js webserver running on `(beta.)trivernis.net`.

## Requirements

- node.js 8 or higher
- npm
- the requirements of [reddit-riddle](https://github.com/trivernis/reddit-riddle)

## Install

After you have cloned the repository you can install it by executing the `install.sh` script.

## Features

Currently the webserver serves very few sites. It is still in an early stage of development. Included are:

### Riddle-Web

A webinterface for the [reddit-riddle](https://github.com/trivernis/reddit-riddle) python script that allows you to download images from reddit. The requested subreddit images will be downloaded to the server and then served to be downloaded by the client.

### Bingo

A simple bingo game where you can provide your own bingo words. You can then play it with your friends. The first one to score a bingo wins.

## Planned

- [ ] logging with `winston.js`
- [ ] login system with a postgres database
- [ ] social bord or blog (`markdown.it` formatted)
- [ ] memepage
