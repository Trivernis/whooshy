#!/usr/bin/env bash
npm i
git clone https://github.com/trivernis/reddit-riddle ./scripts/reddit-riddle
pip3 install -r ./scripts/reddit-riddle/requirements.txt
mkdir tmp
