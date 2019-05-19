const express = require('express'),
    router = express.Router(),
    { GraphQLError } = require('graphql'),
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
        this.queries = utils.parseSqlYaml('./sql/bingo');
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
        return result.rows || [];
    }

    /**
     * Query the database and return the first result or null
     * @param query {String} - the sql query
     * @param values {Array} - an array of parameters needed in the query
     * @returns {Promise<*>}
     */
    async _queryFirstResult(query, values) {
        let result = await this._queryDatabase(query, values);
        if (result.rows && result.rows.length > 0)
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
        return await this._queryFirstResult(this.queries.updatePlayerUsername.sql, [username, playerId]);
    }

    /**
     * Returns the username for a player-id
     * @param playerId {Number} - the id of the player
     * @returns {Promise<*>}
     */
    async getPlayerInfo(playerId) {
        return await this._queryFirstResult(this.queries.getPlayerInfo.sql, [playerId]);
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
     * Returns the row of the lobby.
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async getLobbyInfo(lobbyId) {
        return await this._queryFirstResult(this.queries.getLobbyInfo.sql, [lobbyId]);
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
     * Returns all players in a lobby.
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async getLobbyPlayers(lobbyId) {
        return await this._queryAllResults(this.queries.getLobbyPlayers.sql, [lobbyId]);
    }

    /**
     * Returns the last messages in a lobby with a limit
     * @param lobbyId {Number} - the id of the lobby
     * @param [limit] {Number} - the maximum of messages to fetch
     * @returns {Promise<*>}
     */
    async getLobbyMessages(lobbyId, limit=20) {
        return await this._queryAllResults(this.queries.getLobbyMessages.sql, [lobbyId, limit]);
    }

    /**
     * Adds a player to a lobby.
     * @param playerId {Number} - the id of the player
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async addPlayerToLobby(playerId, lobbyId) {
        let entry = await this.getPlayerInLobby(playerId, lobbyId);
        if (entry) {
            entry.lobby_id = entry.id;
            return entry;
        } else {
            return await this._queryFirstResult(this.queries.addPlayerToLobby.sql, [playerId, lobbyId]);
        }
    }

    /**
     * Sets the current round property of the lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param roundId {Number} - the id of the round
     * @returns {Promise<*>}
     */
    async setLobbyCurrentRound(lobbyId, roundId) {
        return await this._queryFirstResult(this.queries.setLobbyCurrentRound.sql, [lobbyId, roundId]);
    }

    /**
     * Updates the grid size of a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param gridSize {Number} - the new grid size
     * @returns {Promise<*>}
     */
    async setLobbyGridSize(lobbyId, gridSize) {
        return await this._queryFirstResult(this.queries.setLobbyGridSize.sql, [lobbyId, gridSize]);
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
     * Removes a word from the lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param wordId {Number} - the id of the word
     * @returns {Promise<*>}
     */
    async removeWordFromLobby(lobbyId, wordId) {
        return await this._queryFirstResult(this.queries.removeLobbyWord.sql, [lobbyId, wordId]);
    }

    /**
     * Returns all words used in a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<void>}
     */
    async getWordsForLobby(lobbyId) {
        return await this._queryAllResults(this.queries.getWordsForLobby.sql, [lobbyId]);
    }

    /**
     * Returns information about a word
     * @param wordId {Number} - the id of the word
     * @returns {Promise<*>}
     */
    async getWordInfo(wordId) {
        return await this._queryFirstResult(this.queries.getWordInfo.sql, [wordId]);
    }

    /**
     * Returns all rounds of a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async getLobbyRounds(lobbyId) {
        return await this._queryAllResults(this.queries.getLobbyRounds.sql, [lobbyId]);
    }

    /**
     * Returns the round row of a round
     * @param roundId {Number} - the id of the round
     * @returns {Promise<*>}
     */
    async getRoundInfo(roundId) {
        return await this._queryFirstResult(this.queries.getRoundInfo.sql, [roundId]);
    }

    /**
     * Updates the status of a round
     * @param roundId {Number} - the id of the round
     * @param status {String<8>} - the new status
     * @returns {Promise<*>}
     */
    async updateRoundStatus(roundId, status) {
        return await this._queryFirstResult(this.queries.updateRoundStatus.sql, [roundId, status]);
    }

    /**
     * Returns the number of wins the player had in a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param playerId {Number} - the id of the player
     * @returns {Promise<*>}
     */
    async getLobbyPlayerWins(lobbyId, playerId) {
        return await this._queryFirstResult(this.queries.getLobbyPlayerWins.sql, [lobbyId, playerId]);
    }

    /**
     * Adds a grid for a user to a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param playerId {Number} - the id of the user
     * @param roundId {Number} - the id of the round
     * @returns {Promise<*>}
     */
    async addGrid(lobbyId, playerId, roundId) {
        return await this._queryFirstResult(this.queries.addGrid.sql, [playerId, lobbyId, roundId]);
    }

    /**
     * Clears all grids for a lobby.
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async clearGrids(lobbyId) {
        return await this._queryFirstResult(this.queries.clearLobbyGrids.sql, [lobbyId]);
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
     * Adds words to the grid
     * @param gridId {Number} - the id of the grid
     * @param words {Array<{wordId: Number, row: Number, column:Number}>}
     * @returns {Promise<void>}
     */
    async addWordsToGrid(gridId, words) {
        let valueSql = buildSqlParameters(4, words.length, 0);
        let values = [];
        for (let word of words) {
            values.push(gridId);
            values.push(word.wordId);
            values.push(word.row);
            values.push(word.column);
        }
        return await this._queryFirstResult(
            this.queries.addWordToGridStrip.sql + valueSql + ' RETURNING *', values);
    }

    /**
     * Returns all words in the grid with location
     * @param gridId {Number} - the id of the grid
     * @returns {Promise<*>}
     */
    async getWordsInGrid(gridId) {
        return await this._queryAllResults(this.queries.getWordsForGridId.sql, [gridId]);
    }

    /**
     * Returns the grid row for a player and lobby id
     * @param lobbyId {Number} - the id of the lobby
     * @param playerId {Number} - the id of the player
     * @param roundId {Number} - the id of the round
     * @returns {Promise<*>}
     */
    async getGridForPlayerLobbyRound(lobbyId, playerId, roundId) {
        return await this._queryFirstResult(this.queries.getGridByPlayerLobbyRound.sql, [playerId, lobbyId, roundId]);
    }

    /**
     * Returns the grid row for a grid id
     * @param gridId {Number} - the id of the grid
     * @returns {Promise<*>}
     */
    async getGridInfo(gridId) {
        return await this._queryFirstResult(this.queries.getGridInfo.sql, [gridId]);
    }

    /**
     * Sets a field of the grid to submitted/unsubmitted depending on the previous value
     * @param gridId {Number} - the id of the grid
     * @param fieldRow {Number} - the row of the field
     * @param fieldColumn {Number} - the column of the field
     * @returns {Promise<*>}
     */
    async toggleGridFieldSubmitted(gridId, fieldRow, fieldColumn) {
        return await this._queryFirstResult(this.queries.toggleGridFieldSubmitted.sql, [gridId, fieldRow, fieldColumn]);
    }

    /**
     * Adds a round for a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async addRound(lobbyId) {
        return await this._queryFirstResult(this.queries.addRound.sql, [lobbyId]);
    }

    /**
     * Updates a round to the "FINISHED" status and sets the finish time
     * @param roundId {Number}
     * @returns {Promise<*>}
     */
    async setRoundFinished(roundId) {
        return await this._queryFirstResult(this.queries.setRoundFinished.sql, [roundId]);
    }

    /**
     * Updates the rounds winner
     * @param roundId {Number} - the id of the round
     * @param winnerId {Number} - the id of the winner
     * @returns {Promise<*>}
     */
    async setRoundWinner(roundId, winnerId) {
        return await this._queryFirstResult(this.queries.setRoundWinner.sql, [roundId, winnerId]);
    }

    /**
     * Inserts a message of type "USER" into the database
     * @param lobbyId {Number} - the id of the lobby
     * @param playerId {Number} - the id of the author (player)
     * @param messageContent {String} - the content of the message
     * @returns {Promise<*>}
     */
    async addUserMessage(lobbyId, playerId, messageContent) {
        return await this._queryFirstResult(this.queries.addUserMessage.sql, [playerId, lobbyId, messageContent]);
    }

    /**
     * Adds a message of type "INFO" to the lobby
     * @param lobbyId {Number} - the id of the lobby
     * @param messageContent {String} - the content of the info message
     * @returns {Promise<*>}
     */
    async addInfoMessage(lobbyId, messageContent) {
        return await this._queryFirstResult(this.queries.addInfoMessage.sql, [lobbyId, messageContent]);
    }

    /**
     * Removes all words of a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<*>}
     */
    async clearLobbyWords(lobbyId) {
        return await this._queryFirstResult(this.queries.clearLobbyWords.sql, [lobbyId]);
    }

    /**
     * Returns a single entry from grid_words
     * @param gridId {Number} - the id of the grid
     * @param row {Number} - the row of the field
     * @param column {Number} - the column of the row
     * @returns {Promise<*>}
     */
    async getGridField(gridId, row, column) {
        return await this._queryFirstResult(this.queries.getGriedField.sql, [gridId, row, column]);
    }
}

class WordWrapper {
    /**
     * constructor
     * @param id {Number} - the id of the word
     * @param [row] {Object} - the database row of the word
     */
    constructor(id, row) {
        this.id = id;
        this._infoLoaded = false;
        if (row)
            this._assignProperties(row);
    }

    /**
     * Loads the word information from the database
     * @returns {Promise<void>}
     * @private
     */
    async _loadWordInfo() {
        if (!this._infoLoaded) {
            let row = await bdm.getWordInfo(this.id);
            if (row)
                this._assignProperties(row);
        }
    }

    /**
     * Assign the row as properties
     * @param row {Object} - the word row
     * @private
     */
    _assignProperties(row) {
        this._content = row.content;
        this._heared = row.heared;
        this._lobbyId = row.lobbyId;
        this._infoLoaded = this._content && this._heared && this._lobbyId;
    }

    /**
     * Returns a new lobby wrapper for the words lobby
     * @returns {Promise<LobbyWrapper>}
     */
    async lobby() {
        await this._loadWordInfo();
        return new LobbyWrapper(this._lobbyId);
    }

    /**
     * Returns the word iteself
     * @returns {Promise<Object.content|*>}
     */
    async content() {
        await this._loadWordInfo();
        return this._content;
    }

    /**
     * Returns the number of people that heared the word
     * @returns {Promise<Object.heared|(function())>}
     */
    async heared() {
        await  this._loadWordInfo();
        return this._heared;
    }

    /**
     * Returns if the word was confirmed heared
     * @returns {Promise<boolean>}
     */
    async confirmed() {
        await this._loadWordInfo();
        return true; // TODO confirmation logic
    }
}

class GridFieldWrapper {
    /**
     * constructor
     * @param row {Object} - the resulting row
     */
    constructor(row) {
        this.row = row.grid_row;
        this.column = row.grid_column;
        this.submitted = row.submitted;
        this.word = new WordWrapper(row.word_id, row);
        this.grid = new GridWrapper(row.grid_id);
    }
}

class GridWrapper {
    constructor(id) {
        this.id = id;
        this._infoLoaded = false;
    }

    /**
     * Loads all direct grid information
     * @returns {Promise<void>}
     * @private
     */
    async _loadGridInfo() {
        if (!this._infoLoaded) {
            let result = await bdm.getGridInfo(this.id);
            if (result) {
                this.playerId = result.player_id;
                this.lobbyId = result.lobby_id;
                this.size = result.grid_size;
            }
        }
    }

    /**
     * Gets a matrix of the submitted-values of each grid field
     * @returns {Promise<Array[[boolean]]>}
     * @private
     */
    async _getSubmittedMatrix() {
        await this._loadGridInfo();
        let rows = await bdm.getWordsInGrid(this.id);
        let matrix = [];
        for (let i = 0; i < this.size; i++) {
            matrix[i] = [];
            for (let j = 0; j < this.size; j++)
                matrix[i][j] = rows.find(x => (x.grid_row === i && x.grid_column === j)).submitted;
        }
        return matrix;
    }

    /**
     * Returns all fields in the grid
     * @returns {Promise<Array>}
     */
    async fields() {
        let rows = await bdm.getWordsInGrid(this.id);
        let fields = [];
        for (let row of rows)
            fields.push(new GridFieldWrapper(row));
        return fields;
    }

    /**
     * Returns a field with the current row and column
     * @param row {Number} - the fields row
     * @param column {Number} - the fields column
     * @returns {Promise<GridFieldWrapper>}
     */
    async field({row, column}) {
        let result = await bdm.getGridField(this.id, row, column);
        return new GridFieldWrapper(result);
    }

    /**
     * Returns if a bingo is possible
     * @returns {Promise<boolean>}
     */
    async bingo() {
        let subMatrix = await this._getSubmittedMatrix();
        return checkBingo(subMatrix);
    }

    /**
     * Returns the lobby of the grid
     * @returns {Promise<LobbyWrapper>}
     */
    async lobby() {
        await this._loadGridInfo();
        return new LobbyWrapper(this.lobbyId);
    }

    /**
     * Returns the player of the grid
     * @returns {Promise<PlayerWrapper>}
     */
    async player() {
        await this._loadGridInfo();
        return new PlayerWrapper(this.playerId);
    }

    /**
     * Toggles submitted of a grid field
     * @param row {Number} - the row of the field
     * @param column {Number} - the column of the field
     * @returns {Promise<GridFieldWrapper>}
     */
    async toggleField(row, column) {
        let result = await bdm.toggleGridFieldSubmitted(this.id, row, column);
        let gridField = new GridFieldWrapper(result);
        let username = await (await this.player()).username();
        let word = await gridField.word.content();
        if (gridField.submitted)
            await bdm.addInfoMessage(this.lobbyId,
                `${username} toggled "${word}"`);
        else
            await bdm.addInfoMessage(this.lobbyId,
                `${username} untoggled "${word}"`);
        return gridField;
    }
}

class MessageWrapper {
    /**
     * constructor
     * @param row {Object} - the database row of the message
     */
    constructor(row) {
        this.id = row.id;
        this.content = row.content;
        this.htmlContent = md.renderInline(this.content);
        this.author = new PlayerWrapper(row.player_id);
        this.lobby = new LobbyWrapper(row.lobby_id);
        this.type = row.type;
        this.created = row.created;
    }
}

class PlayerWrapper {
    /**
     * constructor
     * @param id {Number} - the id of the player
     */
    constructor(id) {
        this.id = id;
        this._infoLoaded = false;
    }

    /**
     * Loads all player information
     * @returns {Promise<Boolean>}
     * @private
     */
    async _loadPlayerInfo() {
        if (!this._infoLoaded) {
            let result = await bdm.getPlayerInfo(this.id);
            if (result) {
                this._uname = result.username;
                this.expire = result.expire;
                this._infoLoaded = true;
                return true;
            } else {
                return false;
            }
        }
    }

    /**
     * Returns if the player exists
     * @returns {Promise<Boolean>}
     */
    async exists() {
        return await this._loadPlayerInfo();
    }

    /**
     * Returns the grid for a specific lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<GridWrapper>}
     */
    async grid({lobbyId}) {
        let currentRound = (await new LobbyWrapper(lobbyId).currentRound()).id;
        let result = await bdm.getGridForPlayerLobbyRound(lobbyId, this.id, currentRound);
        if (result)
            return new GridWrapper(result.id);
    }

    /**
     * Returns if the user has a valid grid.
     * @param lobbyId
     * @returns {Promise<boolean>}
     */
    async hasGrid(lobbyId) {
        let grid = await this.grid({lobbyId: lobbyId});
        if (grid) {
            let fields = await grid.fields();
            let lobbyWrapper = new LobbyWrapper(lobbyId);
            return fields.length === (await lobbyWrapper.gridSize()) ** 2;
        } else {
            return false;
        }
    }

    /**
     * Returns the username of the player
     * @returns {Promise<String|null>}
     */
    async username() {
        await this._loadPlayerInfo();
        return this._uname;
    }

    /**
     * Returns the number of wins of a player in a lobby
     * @param lobbyId {Number} - the id of the lobby
     * @returns {Promise<null|PlayerWrapper.wins>}
     */
    async wins({lobbyId}) {
        let result = await bdm.getLobbyPlayerWins(lobbyId, this.id);
        if (result && result.wins)
            return result.wins;
        else
            return null;
    }
}

class RoundWrapper {
    /**
     * constructor
     * @param id {Number} - the id of the round
     * @param [row] {Object} - already queried row of the row
     */
    constructor(id, row) {
        this.id = id;
        this._infoLoaded = false;
        if (row)
            this._assignProperties(row);
    }

    /**
     * Adds data to the round wrapper
     * @param row
     * @private
     */
    _assignProperties(row) {
        this._start = row.start;
        this._finish = row.finish;
        this._status = row.status;
        this._lobbyId = row.lobby_id;
        this._winnerId = row.winner;
        this._infoLoaded = true;
    }

    /**
     * Loads the round info from the database
     * @returns {Promise<void>}
     * @private
     */
    async _loadRoundInfo() {
        if (!this._infoLoaded) {
            let row = await bdm.getRoundInfo(this.id);
            if (row)
                this._assignProperties(row);
        }
    }

    /**
     * Returns the winner of the bingo round (if exists)
     * @returns {Promise<PlayerWrapper>}
     */
    async winner() {
        await this._loadRoundInfo();
        if (this._winnerId)
            return new PlayerWrapper(this._winnerId);
    }

    /**
     * Returns the start timestamp of the round
     * @returns {Promise<String>}
     */
    async start() {
        await this._loadRoundInfo();
        return this._start;
    }

    /**
     * Returns the finish timestamp of the round if it exists
     * @returns {Promise<String|null>}
     */
    async finish() {
        await this._loadRoundInfo();
        return this._finish;
    }

    /**
     * Returns the status of a round
     * @returns {Promise<String>}
     */
    async status() {
        await this._loadRoundInfo();
        return this._status;
    }

    /**
     * Returns the lobby the round is belonging to
     * @returns {Promise<LobbyWrapper>}
     */
    async lobby() {
        await this._loadRoundInfo();
        return new LobbyWrapper(this._lobbyId);
    }

    /**
     * Updates the status of the round to a new one
     * @param status {String<8>} - the new status
     * @returns {Promise<void>}
     */
    async updateStatus(status) {
        let updateResult = await bdm.updateRoundStatus(this.id, status);
        if (updateResult)
            this._assignProperties(updateResult);
    }

    /**
     * Sets the round to finished
     * @returns {Promise<void>}
     */
    async setFinished() {
        let updateResult = await bdm.setRoundFinished(this.id);
        if (updateResult)
            this._assignProperties(updateResult);
    }

    /**
     * Sets the winner of the round
     * @param winnerId {Number} - the id of the winner
     */
    async setWinner(winnerId) {
        let status = await this.status();
        if (status !== "FINISHED") {
            let updateResult = await bdm.setRoundWinner(this.id, winnerId);
            if (updateResult)
                await this.setFinished();
            return true;
        }
    }
}

class LobbyWrapper {
    /**
     * constructor
     * @param id {Number} - the id of the lobby
     * @param [row] {Object} - the optional row object of the lobby to load info from
     */
    constructor(id, row) {
        this.id = id;
        this._infoLoaded = false;
        if (row)
            this._assignProperties(row);
    }

    /**
     * Loads information about the lobby if it hasn't been loaded yet
     * @param [force] {Boolean} - forces a data reload
     * @returns {Promise<void>}
     * @private
     */
    async _loadLobbyInfo(force) {
        if (!this._infoLoaded && !force) {
            let row = await bdm.getLobbyInfo(this.id);
            this._assignProperties(row);
        }
    }

    /**
     * Assigns properties to the lobby wrapper
     * @param row {Object} - the row to assign properties from
     * @private
     */
    _assignProperties(row) {
        if (row) {
            this.admin_id = row.admin_id;
            this.grid_size = row.grid_size;
            this.expire = row.expire;
            this.current_round = row.current_round;
            this.last_round = row.last_round;
            this._infoLoaded = true;
        }
    }

    /**
     * Returns if the lobby exists (based on one loaded attribute)
     * @returns {Promise<boolean>}
     */
    async exists() {
        await this._loadLobbyInfo();
        return !!this.expire;
    }

    /**
     * returns the players in the lobby
     * @returns {Promise<Array>}
     */
    async players() {
        let rows = await bdm.getLobbyPlayers(this.id);
        let players = [];
        for (let row of rows)
            players.push(new PlayerWrapper(row.player_id));
        return players;
    }

    /**
     * Returns the admin of the lobby
     * @returns {Promise<PlayerWrapper>}
     */
    async admin() {
        await this._loadLobbyInfo();
        return new PlayerWrapper(this.admin_id);
    }

    /**
     * Returns the active round of the lobby
     * @returns {Promise<RoundWrapper>}
     */
    async currentRound() {
        await this._loadLobbyInfo();
        if (this.current_round)
            return new RoundWrapper(this.current_round);
    }

    /**
     * Returns all round of a lobby
     * @returns {Promise<Array>}
     */
    async rounds() {
        let rows = await bdm.getLobbyRounds(this.id);
        let rounds = [];
        for (let row of rows)
            rounds.push(new RoundWrapper(row.id, row));
        return rounds;
    }

    /**
     * Returns the grid-size of the lobby
     * @returns {Promise<void>}
     */
    async gridSize() {
        await this._loadLobbyInfo();
        return this.grid_size;
    }

    /**
     * Returns a number of messages send in the lobby
     * @param limit
     * @returns {Promise<Array>}
     */
    async messages({limit}) {
        let rows = await bdm.getLobbyMessages(this.id, limit);
        let messages = [];
        for (let row of rows)
            messages.push(new MessageWrapper(row));
        return messages.reverse();
    }

    /**
     * Returns all words in a lobby
     * @returns {Promise<Array>}
     */
    async words() {
        let rows = await bdm.getWordsForLobby(this.id);
        let words = [];
        for (let row of rows)
            words.push(new WordWrapper(row.id, row));
        return words;
    }

    /**
     * Creates a new round
     * @returns {Promise<*>}
     */
    async _createRound() {
        let result = await bdm.addRound(this.id);
        if (result && result.id) {
            let updateResult = await bdm.setLobbyCurrentRound(this.id, result.id);
            this._assignProperties(updateResult);
            return result.id;
        }
    }

    /**
     * Creates a grid for each player
     * @returns {Promise<void>}
     */
    async _createGrids() {
        let words = await this.words();
        let players = await this.players();
        let currentRound = this.current_round;
        for (let player of players) {
            // eslint-disable-next-line no-await-in-loop
            let gridId = (await bdm.addGrid(this.id, player.id, currentRound)).id;
            let gridContent = generateWordGrid(this.grid_size, words);

            let gridWords = [];
            for (let i = 0; i < gridContent.length; i++)
                for (let j = 0; j < gridContent[i].length; j++)
                    gridWords.push({wordId: gridContent[i][j].id, row: i, column: j});
            await bdm.addWordsToGrid(gridId, gridWords);
        }
    }

    /**
     * Creates a new round and new grids for each player
     * @returns {Promise<void>}
     */
    async startNewRound() {
        let words = await this.words();
        if (words && words.length > 0) {
            let currentRound = await this.currentRound();
            if (currentRound)
                await currentRound.setFinished();
            await this._createRound();
            await this._createGrids();
            await this.setRoundStatus('ACTIVE');
        }
    }

    /**
     * Sets the grid size of the lobby
     * @param gridSize {Number} - the new grid size
     * @returns {Promise<void>}
     */
    async setGridSize(gridSize) {
        let updateResult = await bdm.setLobbyGridSize(this.id, gridSize);
        this._assignProperties(updateResult);
    }

    /**
     * Returns if the specific player exists in the lobby
     * @param playerId
     * @returns {Promise<*>}
     */
    async hasPlayer(playerId) {
        let result = (await bdm.getPlayerInLobby(playerId, this.id));
        return (result && result.player_id);
    }

    /**
     * Adds a word to the lobby
     * @param word
     * @returns {Promise<void>}
     */
    async addWord(word) {
        await bdm.addWordToLobby(this.id, word);
    }

    /**
     * Removes a word from the lobby
     * @param wordId
     * @returns {Promise<void>}
     */
    async removeWord(wordId) {
        await bdm.removeWordFromLobby(this.id, wordId);
    }

    /**
     * Sets the words of the lobby
     * @param words
     * @returns {Promise<void>}
     */
    async setWords(words) {
        if (words.length > 0 && !await this.roundActive()) {
            words = words.map(x => x.substring(0, 200));
            let {newWords, removedWords} = await this._filterWords(words);
            for (let word of newWords)
                await this.addWord(word);
            for (let word of removedWords)
                 await this.removeWord(word.id);
        }
    }

    /**
     * Filters the bingo words
     * @param words
     * @returns {Promise<{removedWords: *[], newWords: *[]}>}
     * @private
     */
    async _filterWords(words) {
        let curWords = await this.words();
        let currentWords = [];
        let currentWordContent = [];
        for (let word of curWords) {
            currentWordContent.push(await word.content());
            currentWords.push({
                id: word.id,
                content: (await word.content())
            });
        }
        let newWords = words.filter(x => (!currentWordContent.includes(x)));
        let removedWords = currentWords.filter(x => !words.includes(x.content));

        return {
            newWords: newWords,
            removedWords: removedWords
        };
    }

    /**
     * Adds a player to the lobby.
     * @param playerId
     * @returns {Promise<void>}
     */
    async addPlayer(playerId) {
        await bdm.addPlayerToLobby(playerId, this.id);
        let username = await new PlayerWrapper(playerId).username();
        await bdm.addInfoMessage(this.id, `${username} joined.`);
        await this._loadLobbyInfo(true);
    }

    /**
     * Removes a player from the lobby
     * @param playerId
     * @returns {Promise<void>}
     */
    async removePlayer(playerId) {
        await bdm.removePlayerFromLobby(playerId, this.id);
        let username = await new PlayerWrapper(playerId).username();
        await bdm.addInfoMessage(this.id, `${username} left.`);
        await this._loadLobbyInfo(true);
    }

    /**
     * Returns if the lobby is in an active round
     * @returns {Promise<boolean>}
     */
    async roundActive() {
        let currentRound = await this.currentRound();
        return currentRound && (await currentRound.status()) === 'ACTIVE';
    }

    /**
     * Sets the status of the current round
     * @param status {String} - the status
     * @returns {Promise<RoundWrapper>}
     */
    async setRoundStatus(status) {
        let currentRound = await this.currentRound();
        await currentRound.updateStatus(status);
        await bdm.addInfoMessage(this.id, `Admin set round status to ${status}`);

        if (status === 'FINISHED')
            await bdm.clearGrids(this.id);
        return currentRound;
    }
}

/**
 * Returns the parameterized value sql for inserting.
 * @param columnCount
 * @param rowCount
 * @param [offset]
 * @returns {string}
 */
function buildSqlParameters(columnCount, rowCount, offset) {
    let sql = '';
    for (let i = 0; i < rowCount; i++) {
        sql += '(';
        for (let j = 0; j < columnCount; j++)
            sql += `$${(i*columnCount)+j+1+offset},`;
        sql = sql.replace(/,$/, '') + '),';
    }
    return sql.replace(/,$/, '');
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
 * Generates a word grid with random word placements in the given dimensions
 * @param size {Array<Number>} - the dimensions of the grid
 * @param words {Array<*>} - the words included in the grid
 * @returns {Array}
 */
function generateWordGrid(size, words) {
    let shuffledWords = shuffleArray(inflateArray(words, size**2));
    let grid = [];
    for (let x = 0; x < size; x++) {
        grid[x] = [];
        for (let y = 0; y < size; y++)
            grid[x][y] = shuffledWords[(x * size) + y];
    }
    return grid;
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
 * @param fg {Array<[Boolean]>}
 * @returns {boolean}
 */
function checkBingo(fg) {
    let diagonalBingo = checkBingoDiagnoal(fg);
    let verticalCheck = checkBingoVertical(fg);
    let horizontalCheck = checkBingoHorizontal(fg);
    return diagonalBingo || verticalCheck || horizontalCheck;
}

/**
 * Gets player data for a lobby
 * @param lobbyWrapper
 * @returns {Promise<Array>}
 */
async function getPlayerData(lobbyWrapper) {
    let playerData = [];
    let adminId = (await lobbyWrapper.admin()).id;

    for (let player of await lobbyWrapper.players())
        playerData.push({
            id: player.id,
            wins: await player.wins({lobbyId: lobbyWrapper.id}),
            username: await player.username(),
            isAdmin: (player.id === adminId)
        });
    playerData.sort((a, b) => (a.isAdmin? -1 : (b.wins - a.wins) || a.id));
    return playerData;
}

/**
 * Gets data for all words of a lobby
 * @param lobbyWrapper
 * @returns {Promise<Array>}
 */
async function getWordsData(lobbyWrapper) {
    let wordList = [];

    for (let word of await lobbyWrapper.words())
        wordList.push(await word.content());
    return wordList;
}

/**
 * Returns a completely resolved grid
 * @param lobbyId
 * @param playerId
 * @returns {Promise<{bingo: boolean, fields: Array}>}
 */
async function getGridData(lobbyId, playerId) {
    let playerWrapper = new PlayerWrapper(playerId);
    let lobbyWrapper = new LobbyWrapper(lobbyId);
    let grid = await playerWrapper.grid({lobbyId: lobbyId});
    let fields = await grid.fields();
    let fieldGrid = [];

    for (let i = 0; i < await lobbyWrapper.gridSize(); i++) {
        fieldGrid[i] = [];
        for (let j = 0; j < await lobbyWrapper.gridSize(); j++) {
            let field = fields.find(x => (x.row === i && x.column === j));
            fieldGrid[i][j] = {
                row: field.row,
                column: field.column,
                word: await field.word.content(),
                submitted: field.submitted
            };
        }
    }

    return {fields: fieldGrid, bingo: await grid.bingo()};
}

/**
 * Returns resolved message data.
 * @param lobbyId
 * @returns {Promise<Array>}
 */
async function getMessageData(lobbyId) {
    let lobbyWrapper = new LobbyWrapper(lobbyId);
    let messages = await lobbyWrapper.messages({limit: 20});
    let msgReturn = [];
    for (let message of messages)
        msgReturn.push(Object.assign(message, {username: await message.author.username()}));
    return msgReturn;
}

// -- Router stuff


let bdm = new BingoDataManager(pgPool);

router.init = async () => {
    await bdm.init();
};

router.use(async (req, res, next) => {
    if (req.session.bingoPlayerId)
        await bdm.updatePlayerExpiration(req.session.bingoPlayerId);
    next();
});

router.get('/', async (req, res) => {
    let playerId = req.session.bingoPlayerId;
    let info = req.session.acceptedCookies? null: globals.cookieInfo;
    let lobbyWrapper = new LobbyWrapper(req.query.g);
    let playerWrapper = new PlayerWrapper(playerId);

    if (playerId && await playerWrapper.exists() && req.query.g && await lobbyWrapper.exists()) {
        let lobbyId = req.query.g;

        if (!(await lobbyWrapper.roundActive() && await playerWrapper.hasGrid(lobbyId))) {
            if (!await lobbyWrapper.hasPlayer(playerId))
                await lobbyWrapper.addPlayer(playerId);
            let playerData = await getPlayerData(lobbyWrapper);
            let words = await getWordsData(lobbyWrapper);
            let admin = await lobbyWrapper.admin();
            res.render('bingo/bingo-lobby', {
                players: playerData,
                isAdmin: (playerId === admin.id),
                adminId: admin.id,
                words: words,
                wordString: words.join('\n'),
                gridSize: await lobbyWrapper.gridSize(),
                info: info,
                messages: await getMessageData(lobbyId)
            });
        } else {
            if (await lobbyWrapper.hasPlayer(playerId) && await playerWrapper.hasGrid(lobbyId)) {
                let playerData = await getPlayerData(lobbyWrapper);
                let grid = await getGridData(lobbyId, playerId);
                let admin = await lobbyWrapper.admin();
                res.render('bingo/bingo-round', {
                    players: playerData,
                    grid: grid,
                    isAdmin: (playerId === admin.id),
                    adminId: admin.id,
                    info: info,
                    messages: await getMessageData(lobbyId)
                });
            } else {
                res.redirect('/bingo');
            }
        }
    } else {
        res.render('bingo/bingo-create', {
            info: info,
            username: await playerWrapper.username()
        });
    }
});

router.graphqlResolver = async (req, res) => {
    let playerId = req.session.bingoPlayerId;
    if (playerId)
        await bdm.updatePlayerExpiration(playerId);

    return {
        // queries
        lobby: async ({id}) => {
            await bdm.updateLobbyExpiration(id);
            return new LobbyWrapper(id);
        },
        player: ({id}) => {
            if (id)
                return new PlayerWrapper(id);
            else
                if (playerId)
                    return new PlayerWrapper(playerId);
                else
                    res.status(400);
        },
        // mutations
        setUsername: async ({username}) => {
            username = replaceTagSigns(username.substring(0, 30)).replace(/[^\w- ;[\]]/g, ''); // only allow 30 characters
            if (username.length > 0) {
                let playerWrapper = new PlayerWrapper(playerId);

                if (!playerId || !(await playerWrapper.exists())) {
                    req.session.bingoPlayerId = (await bdm.addPlayer(username)).id;
                    playerId = req.session.bingoPlayerId;
                } else {
                    let oldName = await playerWrapper.username();
                    await bdm.updatePlayerUsername(playerId, username);
                    if (req.query.g)
                        await bdm.addInfoMessage(req.query.g, `${oldName} changed username to ${username}`);
                }
                return new PlayerWrapper(playerId);
            } else {
                res.status(400);
                return new GraphQLError('Username too short!');
            }
        },
        createLobby: async({gridSize}) => {
            if (playerId)
                if (gridSize > 0 && gridSize < 10) {
                    let result = await bdm.createLobby(playerId, gridSize);
                    return new LobbyWrapper(result.id);
                } else {
                    res.status(413);
                }
            res.status(400);
        },
        mutateLobby: async ({id}) => {
            let lobbyId = id;
            await bdm.updateLobbyExpiration(lobbyId);
            let lobbyWrapper = new LobbyWrapper(lobbyId);
            return {
                join: async () => {
                    if (playerId) {
                        await lobbyWrapper.addPlayer(playerId);
                        return lobbyWrapper;
                    } else {
                        res.status(400);
                    }
                },
                leave: async () => {
                    if (playerId) {
                        await lobbyWrapper.removePlayer(playerId);
                        return true;
                    } else {
                        res.status(400);
                    }
                },
                kickPlayer: async ({pid}) => {
                    let admin = await lobbyWrapper.admin();
                    if (admin.id === playerId) {
                        await lobbyWrapper.removePlayer(pid);
                        return new PlayerWrapper(pid);
                    } else {
                        res.status(403);
                        return new GraphQLError('You are not an admin');
                    }
                },
                startRound: async () => {
                    let admin = await lobbyWrapper.admin();
                    if (admin.id === playerId) {
                        await lobbyWrapper.startNewRound();
                        return lobbyWrapper.currentRound();
                    } else {
                        res.status(403);
                        return new GraphQLError('You are not an admin');
                    }
                },
                setRoundStatus: async ({status}) => {
                    let admin = await lobbyWrapper.admin();
                    if (admin.id === playerId) {
                        return await lobbyWrapper.setRoundStatus(status);
                    } else {
                        res.status(403);
                        return new GraphQLError('You are not an admin');
                    }
                },
                setGridSize: async ({gridSize}) => {
                    if (gridSize > 0 && gridSize < 6) {
                        let admin = await lobbyWrapper.admin();
                        if (admin.id === playerId) {
                            await lobbyWrapper.setGridSize(gridSize);
                            return lobbyWrapper;
                        } else {
                            res.status(403);
                            return new GraphQLError('You are not an admin');
                        }
                    } else {
                        res.status(400);
                        return new GraphQLError('Grid size too big!');
                    }
                },
                setWords: async({words}) => {
                    let admin = await lobbyWrapper.admin();
                    if (admin.id === playerId)
                        if (words.length < 10000) {
                            await lobbyWrapper.setWords(words);
                            return lobbyWrapper;
                        } else {
                            res.status(413);    // request entity too large
                            return new GraphQLError('Too many words');
                        }
                    else
                        res.status(403);        // forbidden

                },
                sendMessage: async ({message}) => {
                    if (await lobbyWrapper.hasPlayer(playerId)) {
                        let result = await bdm.addUserMessage(lobbyId, playerId, message);
                        return new MessageWrapper(result);
                    } else {
                        res.status(401);        // unautorized
                        return new GraphQLError('You are not in the lobby');
                    }
                },
                submitBingo: async () => {
                    let isBingo = await (await (new PlayerWrapper(playerId)).grid({lobbyId: lobbyId})).bingo();
                    let currentRound = await lobbyWrapper.currentRound();
                    if (isBingo && await lobbyWrapper.hasPlayer(playerId)) {
                        let result = await currentRound.setWinner(playerId);
                        let username = await new PlayerWrapper(playerId).username();
                        if (result) {
                            await bdm.addInfoMessage(lobbyId, `**${username}** won!`);
                            await bdm.clearGrids(lobbyId);
                            return currentRound;
                        } else {
                            res.status(500);
                        }
                    } else {
                        res.status(400);
                        return new GraphQLError('Bingo check failed. This is not a bingo!');
                    }
                },
                toggleGridField: async ({location}) => {
                    let {row, column} = location;
                    return await (await (new PlayerWrapper(playerId)).grid({lobbyId: lobbyId}))
                        .toggleField(row, column);
                }
            };
        }
    };
};

module.exports = router;
