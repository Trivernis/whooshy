const express = require('express'),
    router = express.Router(),
    mdEmoji = require('markdown-it-emoji'),
    mdMark = require('markdown-it-mark'),
    mdSmartarrows = require('markdown-it-smartarrows'),
    md = require('markdown-it')()
        .use(mdEmoji)
        .use(mdMark)
        .use(mdSmartarrows),
    utils = require('../lib/utils'),
    globals = require('../lib/globals');

let pgPool = globals.pgPool;
let bingoSessions = {};

/**
 * Class to manage the bingo data in the database.
 */
class BingoDataManager {
    /**
     * constructor functino
     * @param postgresPool {pg.Pool} - the postgres pool
     */
    constructor(postgresPool) {
        this.pgPool = postgresPool;
        this.queries = utils.parseSqlYaml('./sql/bingo')
    }

    async init() {
        await this.pgPool.query(this.queries.createTables.sql);
        setInterval(async () => await this._databaseCleanup(), 5*60*1000);  // database cleanup every 5 minutes
    }

    /**
     * Try-catch wrapper around the pgPool.query.
     * @param query {String} - the sql query
     * @param [values] {Array} - an array of values
     * @returns {Promise<*>}
     */
    async _queryDatabase(query, values) {
        try {
            return await this.pgPool.query(query, values);
        } catch (err) {
            console.error(`Error on query "${query}" with values ${JSON.stringify(values)}.`);
            console.error(err);
            console.error(err.stack);
            return {
                rows: null
            };
        }
    }

    /**
     * Queries the database and returns all resulting rows
     * @param query {String} - the sql query
     * @param values {Array} - an array of parameters needed in the query
     * @returns {Promise<*>}
     * @private
     */
    async _queryAllResults(query, values) {
        let result = await this._queryDatabase(query, values);
        return result.rows;
    }

    /**
     * Query the database and return the first result or null
     * @param query {String} - the sql query
     * @param values {Array} - an array of parameters needed in the query
     * @returns {Promise<*>}
     */
    async _queryFirstResult(query, values) {
        let result = await this._queryDatabase(query, values);
        if (result.rows.length > 0)
            return result.rows[0];
    }

    /**
     * Clears expired values from the database.
     */
    async _databaseCleanup() {
        await this._queryDatabase(this.queries.cleanup.sql);
    }

    /**
     * Add a player to the players table
     * @param username {String} - the username of the player
     * @returns {Promise<*>}
     */
    async addPlayer(username) {
        let result = await this._queryFirstResult(this.queries.addPlayer.sql, [username]);
        if (result)
            return result;
        else
            return {};  // makes things easier
    }

    /**
     * Updates the username of a player
     * @param playerId {Number} - the id of the player
     * @param username {String} - the new username
     * @returns {Promise<void>}
     */
    async updatePlayerUsername(playerId, username) {
        return await this._queryFirstResult(this.queries.updatePlayerUsername, [username, playerId]);
    }

    /**
     * Returns the username for a player-id
     * @param playerId {Number} - the id of the player
     * @returns {Promise<*>}
     */
    async getPlayerUsername(playerId) {
        let result = await this._queryFirstResult(this.queries.getPlayerUsername, [playerId]);
        if (result)
            return result.username;
    }

    /**
     * Updates the expiration date of a player
     * @param playerId {Request} - thie id of the player
     * @returns {Promise<void>}
     */
    async updatePlayerExpiration(playerId) {
        await this._queryDatabase(this.queries.updatePlayerExpire.sql, [playerId]);
    }

    /**
     * Creates a bingo lobby.
     * @param playerId
     * @param gridSize
     * @returns {Promise<*>}
     */
    async createLobby(playerId, gridSize) {
        return await this._queryFirstResult(this.queries.addLobby.sql, [playerId, gridSize]);
    }

    /**
     * Updates the expiration date of a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async updateLobbyExpiration(lobbyId) {
        return await this._queryDatabase(this.queries.updateLobbyExpire.sql, [lobbyId]);
    }

    /**
     * Checks if a player is in a lobby.
     * @param playerId {Number} - the id of the player
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async getPlayerInLobby(playerId, lobbyId) {
        return (await this._queryFirstResult(this.queries.getPlayerInLobby.sql, [playerId, lobbyId]));
    }

    /**
     * Adds a player to a lobby.
     * @param playerId {Number} - the id of the player
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async addPlayerToLobby(playerId, lobbyId) {
        let entry = await this.getPlayerInLobby(playerId, lobbyId);
        if (entry)
            return entry;
        else
            return await this._queryFirstResult(this.queries.addPlayerToLobby.sql, [playerId, lobbyId]);
    }

    /**
     * Removes a player from a lobbby
     * @param playerId {Number} - the id of the player
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async removePlayerFromLobby(playerId, lobbyId) {
        return await this._queryFirstResult(this.queries.removePlayerFromLobby.sql, [playerId, lobbyId]);
    }

    /**
     * Adds a word to a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param word {Number} - the id of the word
     * @returns {Promise<void>}
     */
    async addWordToLobby(lobbyId, word) {
        return await this._queryFirstResult(this.queries.addWord.sql, [lobbyId, word]);
    }

    /**
     * Returns all words used in a lobby
     * @param lobbyId
     * @returns {Promise<void>}
     */
    async getWordsForLobby(lobbyId) {
        return await this._queryAllResults(this.queries.getWordsForLobby.sql, [lobbyId]);
    }

    /**
     * Adds a grid for a user to a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param playerId {Number} - the id of the user
     * @returns {Promise<void>}
     */
    async addGrid(lobbyId, playerId) {
        return await this._queryFirstResult(this.queries.addGrid.sql, [playerId, lobbyId]);
    }

    /**
     * Adds a word to a grid with specific location
     * @param gridId {Number} - the id of the gird
     * @param wordId {Number} - the id of the word
     * @param row {Number} - the number of the row
     * @param column {Number} - the number of the column
     */
    async addWordToGrid(gridId, wordId, row, column) {
        return await this._queryFirstResult(this.queries.addWordToGrid.sql, [gridId, wordId, row, column]);
    }

    /**
     * Returns all words in the grid with location
     * @param gridId {Number} - the id of the grid
     * @returns {Promise<*>}
     */
    async getWordsInGrid(gridId) {
        return await this._queryAllResults(this.queries.getWordsInGrid.sql, [gridId]);
    }
}

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
        if (user.username !== 'anonymous')
            this.chatMessages.push(new BingoChatMessage(`**${user.username}** joined.`, "INFO"));

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
        followup.chatMessages.push(new BingoChatMessage('==**Rematch**==', "INFO"));
        return followup;
    }

    /**
     * Graphql endpoint to get the last n messages or messages by id
     * @param args {Object} - arguments passed by graphql
     * @returns {[]}
     */
    getMessages(args) {
        let input = args.input || null;
        if (input && input.id)
            return this.chatMessages.find(x => (x && x.id === input.id));
         else if (input && input.last)
            return this.chatMessages.slice(-input.last);
         else
            return this.chatMessages.slice(-10);

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
    return resultArray;
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
        for (let y = 0; y < dimensions[0]; y++)
            grid[x][y] = shuffledWords[(x * dimensions[0]) + y];

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
 * Checks if a diagonal bingo is possible
 * @param fg {Array<Array<boolean>>} - the grid with the checked (submitted) values
 * @returns {boolean|boolean|*}
 */
function checkBingoDiagnoal(fg) {
    let bingoCheck = true;
    // diagonal check
    for (let i = 0; i < fg.length; i++)
        bingoCheck = fg[i][i] && bingoCheck;
    if (bingoCheck)
        return true;
    bingoCheck = true;
    for (let i = 0; i < fg.length; i++)
        bingoCheck = fg[i][fg.length - i - 1] && bingoCheck;
    return bingoCheck;
}

/**
 * Checks if a vertical bingo is possible
 * @param fg {Array<Array<boolean>>} - the grid with the checked (submitted) values
 * @returns {boolean|boolean|*}
 */
function checkBingoVertical(fg) {
    let bingoCheck = true;
    for (let row of fg) {
        bingoCheck = true;
        for (let field of row)
            bingoCheck = field && bingoCheck;
        if (bingoCheck)
            return true;
    }
    return bingoCheck;
}

/**
 * Checks if a horizontal bingo is possible
 * @param fg {Array<Array<boolean>>} - the grid with the checked (submitted) values
 * @returns {boolean|boolean|*}
 */
function checkBingoHorizontal(fg) {
    let bingoCheck = true;
    // vertical check
    for (let i = 0; i < fg.length; i++) {
        bingoCheck = true;
        for (let j = 0; j < fg.length; j++)
            bingoCheck = fg[j][i] && bingoCheck;
        if (bingoCheck)
            return true;
    }
    return bingoCheck;
}

/**
 * Checks if a bingo exists in the bingo grid.
 * @param bingoGrid {BingoGrid}
 * @returns {boolean}
 */
function checkBingo(bingoGrid) {
    let fg = bingoGrid.fieldGrid.map(x => x.map(y => y.submitted));
    let diagonalBingo = checkBingoDiagnoal(fg);
    if (diagonalBingo) {
        bingoGrid.bingo = true;
        return true;
    }
    let verticalCheck = checkBingoVertical(fg);

    if (verticalCheck) {
        bingoGrid.bingo = true;
        return true;
    }
    let horizontalCheck = checkBingoHorizontal(fg);

    if (horizontalCheck) {
        bingoGrid.bingo = true;
        return true;
    }
    bingoGrid.bingo = false;
    return false;
}


// -- Router stuff


let bdm = new BingoDataManager(pgPool);

router.init = async () => {
    await bdm.init();
};

router.use(async (req, res, next) => {
    if (!req.session.bingoUser)
        req.session.bingoUser = new BingoUser();
    if (req.session.bingoPlayerId)
        await bdm.updatePlayerExpiration(req.session.bingoPlayerId);
    next();
});

router.get('/', (req, res) => {
    let bingoUser = req.session.bingoUser;
    if (req.query.game) {
        let gameId = req.query.game || bingoUser.game;

        if (bingoSessions[gameId] && !bingoSessions[gameId].finished) {
            bingoUser.game = gameId;
            let bingoSession = bingoSessions[gameId];
            if (!bingoSession.users[bingoUser.id])
                bingoSession.addUser(bingoUser);

            if (!bingoUser.grids[gameId])
                bingoUser.grids[gameId] = generateWordGrid([bingoSession.gridSize, bingoSession.gridSize], bingoSession.words);

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

router.graphqlResolver = async (req, res) => {
    if (req.session.bingoPlayerId)
        await bdm.updatePlayerExpiration(req.session.bingoPlayerId);
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
            return checkBingo(bingoUser.grids[gameId]);
        },
        activeGrid: () => {
            return bingoUser.grids[gameId];
        },
        // mutation
        createLobby: async ({input}) => {
            let gridSize = (input && input.gridSize)? input.gridSize : 3;
            let lobby = await bdm.createLobby(req.session.bingoPlayerId, gridSize);
            if (lobby && lobby.id)
                return lobby.id;
            else
                res.status(500);
        },
        joinLobby: async ({input}) => {
            if (input.lobbyId) {
                let entry = await bdm.addPlayerToLobby(req.session.bingoPlayerId, input.lobbyId);
                if (entry && entry.lobby_id && entry.player_id)
                    return {
                        lobbyId: entry.lobby_id,
                        playerId: entry.player_id
                    };
                else
                    res.status(500);
            } else {
                res.status(400);
            }
        },
        createGame: ({input}) => {
            let words = input.words.filter((el) => { // remove empty strings and non-types from word array
                return (!!el && el.length > 0);
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
        setUsername: async ({input}) => {
            if (input.username) {
                bingoUser.username = input.username.substring(0, 30); // only allow 30 characters

                if (!req.session.bingoPlayerId)
                    req.session.bingoPlayerId = (await bdm.addPlayer(input.username)).id;
                else
                    await bdm.updatePlayerUsername(req.session.bingoPlayerId, input.username);
                if (bingoSession)
                    bingoSession.addUser(bingoUser);

                return bingoUser;
            }
        },
        createFollowupGame: () => {
            if (bingoSession)
                if (!bingoSession.followup)
                    return bingoSession.createFollowup();
                else
                    return bingoSessions[bingoSession.followup];
             else
                res.status(400);

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
