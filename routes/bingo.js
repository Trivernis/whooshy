const express = require('express'),
    router = express.Router(),
    cproc = require('child_process'),
    fsx = require('fs-extra');

const rWordOnly = /^\w+$/;

let bingoSessions = {};

class BingoSession {
    /**
     * constructor
     * @param words List<String>
     * @param [size] Number
     */
    constructor(words, size = 3) {
        this.id = generateBingoId();
        this.words = words;
        this.gridSize = size;
        this.users = {};
        this.bingos = [];   // array with the users that already had bingo
        this.finished = false;
    }

    /**
     * Adds a user to the session
     * @param user
     */
    addUser(user) {
        let id = user.id;
        this.users[id] = user;
    }
}

class BingoUser {
    constructor() {
        this.id = generateBingoId();
        this.game = null;
        this.username = 'anonymous';
        this.grids = {};
        this.submittedWords = {};
    }
}

class BingoWordField {
    constructor(word) {
        this.word = word;
        this.submitted = false;
    }
}

class BingoGrid {
    constructor(wordGrid) {
        this.wordGrid = wordGrid;
        this.fieldGrid = wordGrid.map(x => x.map(y => new BingoWordField(y)));
        return this;
    }
}

/**
 * Shuffles the elements in an array
 * @param array  {Array<*>}
 * @returns {Array<*>}
 */
function shuffleArray(array) {
    let counter = array.length;
    while (counter > 0) {
        let index = Math.floor(Math.random() * counter);
        counter--;
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

/**
 * Generates an id for a subreddit download.
 * @returns {string}
 */
function generateBingoId() {
    return Date.now().toString(16);
}

/**
 * Generates a word grid with random word placements in the given dimensions
 * @param dimensions {Array<Number>} - the dimensions of the grid
 * @param words {Array<String>} - the words included in the grid
 * @returns {BingoGrid}
 */
function generateWordGrid(dimensions, words) {
    let shuffledWords = shuffleArray(words);
    let grid = [];
    for (let x = 0; x < dimensions[1]; x++) {
        grid[x] = [];
        for (let y = 0; y < dimensions[0]; y++) {
            grid[x][y] = shuffledWords[(x * dimensions[0]) + y];
        }
    }
    return (new BingoGrid(grid));
}

/**
 * Sets the submitted parameter of the words in the bingo grid that match to true.
 * @param word {String}
 * @param bingoGrid {BingoGrid}
 * @returns {boolean}
 */
function submitWord(word, bingoGrid) {
    let results = bingoGrid.fieldGrid.find(x => x.find(y => (y.word === word))).find(x => x.word === word);

    if (results) {
        (results instanceof Array)? results.forEach(x => {x.submitted = true}): results.submitted = true;
        checkBingo(bingoGrid);
        return true;
    }
    return false;
}

/**
 * Checks if a bingo exists in the bingo grid.
 * @param bingoGrid {BingoGrid}
 * @returns {boolean}
 */
function checkBingo(bingoGrid) {
    let fg = bingoGrid.fieldGrid.map(x => x.map(y => y.submitted));

    let diagonalBingo = true;
    // diagonal check
    for (let i = 0; i < fg.length; i++)
        diagonalBingo = fg[i][i] && diagonalBingo;
    if (diagonalBingo) {
        bingoGrid.bingo = true;
        return true;
    }
    diagonalBingo = true;
    for (let i = 0; i < fg.length; i++)
        diagonalBingo = fg[i][fg.length - i - 1] && diagonalBingo;
    if (diagonalBingo) {
        bingoGrid.bingo = true;
        return true;
    }
    let bingoCheck = true;
    // horizontal check
    for (let row of fg) {
        bingoCheck = true;
        for (let field of row)
            bingoCheck = field && bingoCheck;
        if (bingoCheck)
            break;
    }
    if (bingoCheck) {
        bingoGrid.bingo = true;
        return true;
    }
    bingoCheck = true;
    // vertical check
    for (let i = 0; i < fg.length; i++) {
        bingoCheck = true;
        for (let j = 0; j < fg.length; j++)
            bingoCheck = fg[j][i] && bingoCheck;
        if (bingoCheck)
            break;
    }
    if (bingoCheck) {
        bingoGrid.bingo = true;
        return true;
    }
    return false;
}

// -- Router stuff

router.use((req, res, next) => {
    if (!req.session.bingoUser) {
        req.session.bingoUser = new BingoUser();
    }
    next();
});

router.get('/', (req, res) => {
    let bingoUser = req.session.bingoUser;
    if (req.query.game) {
        let gameId = req.query.game;

        if (bingoSessions[gameId] && !bingoSessions[gameId].finished) {
            bingoUser.game = gameId;
            let bingoSession = bingoSessions[gameId];
            bingoSession.addUser(bingoUser);

            if (!bingoUser.grids[gameId]) {
                bingoUser.grids[gameId] = generateWordGrid([bingoSession.gridSize, bingoSession.gridSize], bingoSession.words);
            }
            res.render('bingo/bingo-game', {grid: bingoUser.grids[gameId].wordGrid, username: bingoUser.username});
        } else {
            res.render('bingo/bingo-submit');
        }
    } else {
        res.render('bingo/bingo-submit');
    }
});

router.post('/', (req, res) => {
    let data = req.body;
    let gameId = req.query.game;
    let bingoUser = req.session.bingoUser;
    let bingoSession = bingoSessions[gameId];

    if (data.bingoWords) {
        let words = data.bingoWords;
        let size = data.size;
        let game = new BingoSession(words, size);

        bingoSessions[game.id] = game;

        setTimeout(() => { // delete the game after one day
            delete bingoSessions[game.id];
        }, 86400000);

        res.send(game);
    } else if (data.username) {
        bingoUser.username = data.username;
        bingoSessions[gameId].addUser(bingoUser);

        res.send(bingoUser);
    } else if (data.game) {
        res.send(bingoSessions[data.game]);
    } else if (data.bingoWord) {
        if (!bingoUser.submittedWords[gameId])
            bingoUser.submittedWords[gameId] = [];
        bingoUser.submittedWords[gameId].push(data.bingoWord);
        console.log(typeof bingoUser.grids[gameId]);
        if (bingoUser.grids[gameId])
            submitWord(data.bingoWord, bingoUser.grids[gameId]);
        res.send(bingoUser.grids[gameId]);
    } else if (data.bingo) {
        if (checkBingo(bingoUser.grids[gameId])) {
            if (!bingoSession.bingos.includes(bingoUser.id))
                bingoSession.bingos.push(bingoUser.id);
            bingoSession.finished = true;
            setTimeout(() => { // delete the finished game after five minutes
                delete bingoSessions[game.id];
            }, 360000);
            res.send(bingoSession);
        } else {
            res.status(400);
            res.send({'error': "this is not a bingo!"})
        }
    } else if (bingoSession) {
        res.send(bingoSession);
    } else {
        res.status(400);
        res.send({
            error: 'invalid request data'
        })
    }
});

module.exports = router;
