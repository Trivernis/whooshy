const express = require('express'),
    router = express.Router(),
    cproc = require('child_process'),
    fsx = require('fs-extra'),
    mdEmoji = require('markdown-it-emoji'),
    md = require('markdown-it')().use(mdEmoji);

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
        this.followup = null;
        this.chatMessages = [];
    }

    /**
     * Adds a user to the session
     * @param user
     */
    addUser(user) {
        let id = user.id;
        this.users[id] = user;
        if (user.username !== 'anonymous') {
            this.chatMessages.push(new BingoChatMessage(`**${user.username}** joined.`, "INFO"));
        }
    }

    /**
     * Graphql endpoint
     * @param args {Object} - the arguments passed on the graphql interface
     * @returns {any[]|*}
     */
    players(args) {
        let input = args? args.input : null;
        if (input && input.id)
            return [this.users[input.id]];
        else
            return Object.values(this.users);
    }

    /**
     * Creates a followup BingoSession
     * @returns {BingoSession}
     */
    createFollowup() {
        let followup = new BingoSession(this.words, this.gridSize);
        this.followup = followup.id;
        bingoSessions[followup.id] = followup;
        followup.chatMessages = this.chatMessages;
        followup.chatMessages.push(new BingoChatMessage('**Rematch**', "INFO"));
        return followup;
    }

    /**
     * Graphql endpoint to get the last n messages or messages by id
     * @param args {Object} - arguments passed by graphql
     * @returns {[]}
     */
    getMessages(args) {
        let input = args.input || null;
        if (input && input.id) {
            return this.chatMessages.find(x => (x && x.id === input.id));
        } else if (input && input.last) {
            return this.chatMessages.slice(-input.last);
        } else {
            return this.chatMessages.slice(-10);
        }
    }

    /**
     * Sends the message that a user toggled a word.
     * @param base64Word
     * @param bingoUser
     */
    sendToggleInfo(base64Word, bingoUser) {
        let word = Buffer.from(base64Word, 'base64').toString();
        let toggleMessage = new BingoChatMessage(`**${bingoUser.username}** toggled phrase "${word}".`, "INFO");
        this.chatMessages.push(toggleMessage);
    }
}

class BingoChatMessage {
    /**
     * Chat Message class constructor
     * @param messageContent {String} - the messages contents
     * @param type {String} - the type constant of the message (USER, ERROR, INFO)
     * @param [username] {String} -  the username of the user who send this message
     */
    constructor(messageContent, type="USER", username) {
        this.id = generateBingoId();
        this.content = messageContent;
        this.htmlContent = md.renderInline(messageContent);
        this.datetime = Date.now();
        this.username = username;
        this.type = type;
    }
}

class BingoUser {
    /**
     * Bingo User class to store user information
     */
    constructor() {
        this.id = generateBingoId();
        this.game = null;
        this.username = 'anonymous';
        this.grids = {};
    }
}

class BingoWordField {
    /**
     * Represents a single bingo field with the word an the status.
     * It also holds the base64-encoded word.
     * @param word
     */
    constructor(word) {
        this.word = word;
        this.base64Word = Buffer.from(word).toString('base64');
        this.submitted = false;
    }
}

class BingoGrid {
    /**
     * Represents the bingo grid containing all the words.
     * @param wordGrid
     * @returns {BingoGrid}
     */
    constructor(wordGrid) {
        this.wordGrid = wordGrid;
        this.fieldGrid = wordGrid.map(x => x.map(y => new BingoWordField(y)));
        this.bingo = false;
        return this;
    }
}

/**
 * Replaces tag signs with html-escaped signs.
 * @param htmlString
 * @returns {string}
 */
function replaceTagSigns(htmlString) {
    return htmlString.replace(/</g, '&#60;').replace(/>/g, '&#62;');
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
 * Inflates an array to a minimum Size
 * @param array {Array} - the array to inflate
 * @param minSize {Number} - the minimum size that the array needs to have
 * @returns {Array}
 */
function inflateArray(array, minSize) {
    let resultArray = array;
    let iterations = Math.ceil(minSize/array.length)-1;
    for (let i = 0; i < iterations; i++)
        resultArray = [...resultArray, ...resultArray];
    return resultArray
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
    let shuffledWords = shuffleArray(inflateArray(words, dimensions[0]*dimensions[1]));
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
 * @param base64Word {String} - base64 encoded bingo word
 * @param bingoGrid {BingoGrid} - the grid where the words are stored
 * @returns {boolean}
 */
function toggleHeared(base64Word, bingoGrid) {
    for (let row of bingoGrid.fieldGrid)
        for (let field of row)
            if (base64Word === field.base64Word)
                field.submitted = !field.submitted;
    checkBingo(bingoGrid);
    return true;
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
        if (bingoCheck) {
            bingoGrid.bingo = true;
            return true;
        }
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
        if (bingoCheck) {
            bingoGrid.bingo = true;
            return true;
        }
    }
    if (bingoCheck) {
        bingoGrid.bingo = true;
        return true;
    }
    bingoGrid.bingo = false;
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
        let gameId = req.query.game || bingoUser.game;

        if (bingoSessions[gameId] && !bingoSessions[gameId].finished) {
            bingoUser.game = gameId;
            let bingoSession = bingoSessions[gameId];
            bingoSession.addUser(bingoUser);

            if (!bingoUser.grids[gameId]) {
                bingoUser.grids[gameId] = generateWordGrid([bingoSession.gridSize, bingoSession.gridSize], bingoSession.words);
            }
            res.render('bingo/bingo-game', {
                grid: bingoUser.grids[gameId].fieldGrid,
                username: bingoUser.username,
                players: bingoSession.players()
            });
        } else {
            res.render('bingo/bingo-submit');
        }
    } else {
        res.render('bingo/bingo-submit');
    }
});

router.graphqlResolver = (req, res) => {
    let bingoUser = req.session.bingoUser || new BingoUser();
    let gameId = req.query.game || bingoUser.game || null;
    let bingoSession = bingoSessions[gameId];
    return {
        // queries
        gameInfo: ({input}) => {
            if (input && input.id)
                return bingoSessions[input.id];
            else
                return bingoSession;
        },
        checkBingo: () => {
            return checkBingo(bingoUser.grids[gameId])
        },
        activeGrid: () => {
            return bingoUser.grids[gameId];
        },
        // mutation
        createGame: ({input}) => {
            let words = input.words.filter((el) => { // remove empty strings and non-types from word array
                return (!!el && el.length > 0)
            });
            let size = input.size;
            if (words.length > 0 && size < 10 && size > 0) {
                words = words.slice(0, 10000);      // only allow up to 10000 words in the bingo
                let game = new BingoSession(words, size);

                bingoSessions[game.id] = game;

                setTimeout(() => { // delete the game after one day
                    delete bingoSessions[game.id];
                }, 86400000);
                return game;
            } else {
                res.status(400);
                return null;
            }
        },
        submitBingo: () => {
            if (checkBingo(bingoUser.grids[gameId])) {
                if (!bingoSession.bingos.includes(bingoUser.id))
                    bingoSession.bingos.push(bingoUser.id);
                bingoSession.finished = true;
                setTimeout(() => { // delete the finished game after five minutes
                    delete bingoSessions[gameId];
                }, 300000);
                return bingoSession;
            } else {
                return bingoSession;
            }
        },
        toggleWord: ({input}) => {
            if (input.word || input.base64Word) {
                input.base64Word = input.base64Word || Buffer.from(input.word).toString('base-64');
                if (bingoUser.grids[gameId]) {
                    toggleHeared(input.base64Word, bingoUser.grids[gameId]);
                    bingoSession.sendToggleInfo(input.base64Word, bingoUser);
                    return bingoUser.grids[gameId];
                } else {
                    res.status(400);
                }
            } else {
                res.status(400);
            }
        },
        setUsername: ({input}) => {
            if (input.username) {
                bingoUser.username = input.username.substring(0, 30); // only allow 30 characters

                if (bingoSession)
                    bingoSession.addUser(bingoUser);

                return bingoUser;
            }
        },
        createFollowupGame: () => {
            if (bingoSession) {
                if (!bingoSession.followup)
                    return bingoSession.createFollowup();
                else
                    return bingoSessions[bingoSession.followup];
            } else {
                res.status(400);
            }
        },
        sendChatMessage: ({input}) => {
            input.message = replaceTagSigns(input.message).substring(0, 250);
            if (bingoSession && input.message) {
                let userMessage = new BingoChatMessage(input.message, 'USER', bingoUser.username);
                bingoSession.chatMessages.push(userMessage);
                return userMessage;
            } else {
                res.status(400);
            }
        }
    };
};

module.exports = router;
