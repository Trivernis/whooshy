import {Pool} from "pg";
import {QueryHelper, buildSqlParameters} from '../QueryHelper';

enum MessageType {
    USER = "USER",
    INFO = "INFO",
    ERROR = "ERROR"
}

enum RoundStatus {
    BUILDING = "BUILDING",
    FINISHED = "FINISHED",
    ACTIVE = "ACTIVE"
}

export type PlayerRow = {id: number, username: string, expire: string};
export type LobbyRow = {id: number, admin_id: number, grid_size: number, current_round: number, expire: string};
export type LobbyPlayerRow = {player_id: number, lobby_id: number, score: number};
export type WordRow = {id: number|BigInteger, lobby_id: number, heared: number, content: string};
export type MessageRow = {id: number|BigInteger, content: string, player_id: number, lobby_id: number, type: MessageType, created: string};
export type RoundRow = {id: number, start: string, finish: string, status: RoundStatus, lobby_id: number, winner: number};
export type GridRow = {id: number, player_id: number, lobby_id: number, round_id: number};
export type GridWordRow = {grid_id: number, word_id: number, grid_row: number, grid_column: number, submitted: boolean};

interface BingoDatabaseInterface {
    addPlayer(name: string): Promise<PlayerRow>;
    getPlayer(playerId: number): Promise<PlayerRow>;
    updatePlayerUsername(playerId: number, name: string): Promise<PlayerRow>;
    updatePlayerExpiration(playerId: number): Promise<void>;
    getPlayerWins(playerId: number, lobbyId: number): Promise<number>

    createLobby(playerId: number, gridSize: number): Promise<LobbyRow>;
    setLobbyGridSize(lobbyId: number, gridSize: number): Promise<LobbyRow>;
    setLobbyRound(lobbyId: number, roundId: number): Promise<LobbyRow>;
    addPlayerToLobby(playerId: number, lobbyId: number): Promise<LobbyPlayerRow>;
    removePlayerFromLobby(playerId: number, lobbyId: number): Promise<void>;
    getLobby(lobbyId: number): Promise<LobbyRow>;
    getLobbyIds(): Promise<number[]>;
    checkPlayerInLobby(playerId: number, lobbyId: number): Promise<boolean>;
    getLobbyMembers(lobbyId: number): Promise<LobbyPlayerRow[]>;
    getLobbyMessages(lobbyId: number, limit: number): Promise<MessageRow[]>;
    updateLobbyExpiration(lobbyId: number): Promise<void>;
    clearGrids(lobbyId: number): Promise<void>;
    clearWords(lobbyId: number): Promise<void>;

    addWord(lobbyId: number, word: string): Promise<WordRow>;
    removeWord(lobbyid: number, wordId: number): Promise<void>;
    getWords(lobbyId: number): Promise<WordRow[]>;
    getWord(wordId: number): Promise<WordRow>;

    getRounds(lobbyId: number): Promise<RoundRow[]>;
    getRound(roundId: number): Promise<RoundRow>;
    updateRound(roundId: number, status: RoundStatus): Promise<RoundRow>;
    setRoundFinished(roundId: number): Promise<RoundRow>;
    setRoundWinner(roundId: number, playerId: number): Promise<RoundRow>;

    addGrid(lobbyId: number, playerId: number, roundId: number): Promise<GridRow>;
    addGridWords(words: GridWordRow[]): Promise<GridRow>;
    getGridWords(gridId: number): Promise<(GridWordRow & WordRow)[]>;
    getGridField(gridId: number, row: number, column: number): Promise<(GridWordRow & WordRow)>;

    addPlayerMessage(lobbyId: number, playerId: number, content: string): Promise<MessageRow>;
    addInfoMessage(lobbyId: number, content: string): Promise<MessageRow>;
    editMessage(messageId: number, content: string): Promise<MessageRow>;
    deleteMessage(messageId: number): Promise<void>;
    getMessage(messageId: number): Promise<MessageRow>;
}

export class BingoSql implements BingoDatabaseInterface{

    private queryHelper: QueryHelper;

    constructor(pgPool: Pool) {
        this.queryHelper = new QueryHelper(pgPool);
    }

    async addPlayer(name: string): Promise<PlayerRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.players (username) VALUES ($1) RETURNING *;",
            values: [name]
        });
    }

    async getPlayer(playerId: number): Promise<PlayerRow> {
        return await this.queryHelper.first({
            text: "SELECT * FROM bingo.players WHERE id = $1;",
            values: [playerId]
        });
    }

    async updatePlayerUsername(playerId: number, name: string): Promise<PlayerRow> {
        return await this.queryHelper.first({
            text: "UPDATE bingo.players SET username = $1 WHERE id = $2 RETURNING *;",
            values: [name, playerId]
        });
    }

    async updatePlayerExpiration(playerId: number): Promise<void> {
        await this.queryHelper.all({
            name: 'update-player-expire',
            text: "UPDATE bingo.players SET expire = (NOW() + interval '24 hours') WHERE id = $1;",
            values: [playerId]
        });
    }
    async getPlayerWins(playerId: number, lobbyId: number): Promise<number> {
        return (await this.queryHelper.first({
            name: "select-player-wins",
            text: " SELECT COUNT(*) wins FROM bingo.rounds WHERE rounds.lobby_id = $1 AND rounds.winner = $2;",
            values: [lobbyId, playerId]
        })).wins;
    }

    async createLobby(playerId: number, gridSize: number=3): Promise<LobbyRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.lobbys (admin_id, grid_size) VALUES ($1, $2) RETURNING *;",
            values: [playerId, gridSize]
        });
    }

    async setLobbyGridSize(lobbyId: number, gridSize: number): Promise<LobbyRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.lobbys (admin_id, grid_size) VALUES ($1, $2) RETURNING *;",
            values: [lobbyId, gridSize]
        });
    }

    async setLobbyRound(lobbyId: number, roundId: number): Promise<LobbyRow> {
        return await this.queryHelper.first({
            text: "UPDATE bingo.lobbys SET current_round = $2 WHERE id = $1 RETURNING *;",
            values: [lobbyId, roundId]
        });
    }

    async addPlayerToLobby(playerId: number, lobbyId: number): Promise<LobbyPlayerRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.lobby_players (player_id, lobby_id) VALUES ($1, $2) RETURNING *;",
            values: [playerId, lobbyId]
        });
    }

    async removePlayerFromLobby(playerId: number, lobbyId: number): Promise<void> {
        await this.queryHelper.all({
            text: "DELETE FROM bingo.lobby_players WHERE player_id = $1 AND lobby_id = $2;",
            values: [playerId, lobbyId]
        });
    }

    async getLobby(lobbyId: number): Promise<LobbyRow> {
        return await this.queryHelper.first({
            text: "SELECT * FROM bingo.lobbys WHERE lobbys.id = $1;",
            values: [lobbyId]
        });
    }

    async getLobbyIds(): Promise<number[]> {
        return (await this.queryHelper.all({
            text: "SELECT lobbys.id FROM bingo.lobbys;"
        })).map(x => x.id);
    }

    async checkPlayerInLobby(playerId: number, lobbyId: number): Promise<boolean> {
        return !!await this.queryHelper.first({
            text: "SELECT * FROM bingo.lobby_players lp WHERE lp.player_id = $1 AND lp.lobby_id = $2;",
            values: [playerId, lobbyId]
        });
    }

    async getLobbyMembers(lobbyId: number): Promise<LobbyPlayerRow[]> {
        return await this.queryHelper.all({
            text: "SELECT * FROM bingo.lobby_players WHERE lobby_players.lobby_id = $1;",
            values: [lobbyId]
        });
    }

    async getLobbyMessages(lobbyId: number, limit: number = 20): Promise<MessageRow[]> {
        return await this.queryHelper.all({
            text: "SELECT * FROM bingo.messages WHERE messages.lobby_id = $1 ORDER BY messages.created DESC LIMIT $2;",
            values: [lobbyId, limit]
        });
    }

    async updateLobbyExpiration(lobbyId: number): Promise<void> {
        await this.queryHelper.all({
            text: "UPDATE bingo.lobbys SET expire = (NOW() + interval '4 hours') WHERE id = $1 RETURNING *;",
            values: [lobbyId]
        });
    }

    async clearGrids(lobbyId: number): Promise<void> {
        await this.queryHelper.all({
            text: "DELETE FROM bingo.grids WHERE lobby_id = $1;",
            values: [lobbyId]
        });
    }

    async clearWords(lobbyId: number): Promise<void> {
        await this.queryHelper.all({
            text: "DELETE FROM bingo.words WHERE lobby_id = $1;",
            values: [lobbyId]
        });
    }

    async addWord(lobbyId: number, word: string): Promise<WordRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.words (lobby_id, content) VALUES ($1, $2) RETURNING *;",
            values: [lobbyId, word]
        });
    }

    async removeWord(lobbyid: number, wordId: number): Promise<void> {
        await this.queryHelper.all({
            text: "DELETE FROM bingo.words WHERE lobby_id = $1 AND id = $2;",
            values: [lobbyid, wordId]
        });
    }

    async getWords(lobbyId: number): Promise<WordRow[]> {
        return await this.queryHelper.all({
            text: "SELECT * FROM bingo.words WHERE words.lobby_id = $1;",
            values: [lobbyId]
        });
    }

    async getWord(wordId: number): Promise<WordRow> {
        return await this.queryHelper.first({
            text: "SELECT * FROM bingo.words WHERE words.id = $1;",
            values: [wordId]
        });
    }

    async getRounds(lobbyId: number): Promise<RoundRow[]> {
        return await this.queryHelper.all({
            text: "SELECT * FROM bingo.rounds WHERE rounds.lobby_id = $1;",
            values: [lobbyId]
        });
    }

    async getRound(roundId: number): Promise<RoundRow> {
        return await this.queryHelper.first({
            text: "SELECT * FROM bingo.rounds WHERE rounds.id = $1;",
            values: [roundId]
        });
    }

    async updateRound(roundId: number, status: RoundStatus): Promise<RoundRow> {
        return await this.queryHelper.first({
            text: "UPDATE bingo.rounds SET status = $2 WHERE id = $1 RETURNING *;",
            values: [roundId, status]
        });
    }

    async setRoundFinished(roundId: number): Promise<RoundRow> {
        return await this.queryHelper.first({
            text: "UPDATE bingo.rounds SET status = 'FINISHED', finish = NOW() WHERE id = $1 RETURNING *;",
            values: [roundId]
        });
    }

    async setRoundWinner(roundId: number, playerId: number): Promise<RoundRow> {
        return await this.queryHelper.first({
            text: "UPDATE bingo.rounds SET winner = $2 WHERE id = $1 RETURNING *;",
            values: [roundId, playerId]
        });
    }

    async addGrid(lobbyId: number, playerId: number, roundId: number): Promise<GridRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.grids (player_id, lobby_id, round_id) VALUES ($1, $2, $3) RETURNING *;",
            values: [playerId, lobbyId, roundId]
        });
    }

    async addGridWords(words: GridWordRow[]): Promise<GridRow> {
        let valueSql = buildSqlParameters(4, words.length, 0);
        let values = [];
        for (let word of words) {
            values.push(word.grid_id);
            values.push(word.word_id);
            values.push(word.grid_row);
            values.push(word.grid_column);
        }
        return await this.queryHelper.first({
            text: `INSERT INTO bingo.grid_words (grid_id, word_id, grid_row, grid_column) VALUES ${valueSql} RETURNING *;`,
            values: values
        });
    }

    async getGridWords(gridId: number): Promise<(GridWordRow & WordRow)[]> {
        return await this.queryHelper.all({
            text: "SELECT * FROM bingo.grid_words, bingo.words WHERE grid_words.grid_id = $1 AND words.id = grid_words.word_id;",
            values: [gridId]
        });
    }

    async getGridField(gridId: number, row: number, column: number): Promise<GridWordRow & WordRow> {
        return await this.queryHelper.first({
            text: "SELECT * FROM bingo.grid_words WHERE grid_words.grid_id = $1 AND grid_words.grid_row = $2 and grid_words.grid_column = $3;",
            values: [gridId, row, column]
        })
    }

    async addPlayerMessage(lobbyId: number, playerId: number, content: string): Promise<MessageRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.messages (player_id, lobby_id, content) VALUES ($1, $2, $3) RETURNING *;",
            values: [playerId, lobbyId, content]
        });
    }

    async addInfoMessage(lobbyId: number, content: string): Promise<MessageRow> {
        return await this.queryHelper.first({
            text: "INSERT INTO bingo.messages (type, lobby_id, content) VALUES ('INFO', $1, $2) RETURNING *;",
            values: [lobbyId, content]
        });
    }

    async editMessage(messageId: number, content: string): Promise<MessageRow> {
        return await this.queryHelper.first({
            text: "UPDATE bingo.messages SET content = $2 WHERE id = $1 RETURNING *;",
            values: [messageId, content]
        });
    }

    async deleteMessage(messageId: number): Promise<void> {
        await this.queryHelper.all({
            text: "DELETE FROM bingo.messages WHERE id = $1;",
            values: [messageId]
        });
    }

    async getMessage(messageId: number): Promise<MessageRow> {
        return await this.queryHelper.first({
            text: "SELECT * from bingo.messages WHERE id = $1;",
            values: [messageId]
        });
    }
}
