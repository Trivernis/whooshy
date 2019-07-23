import {BingoSql, LobbyRow} from "../db/BingoSql";
import {Room} from 'socket.io';

export class BingoLobby {
    public readonly room: Room;

    private lobbyId: number;
    private adminId: number;
    private gridSize: number;
    private currentRoundId: number;
    private initialized: boolean = false;

    constructor(private bingoSql: BingoSql, adminId: number, room: Room, id?: number) {
        this.adminId = adminId;
        this.lobbyId = id;
        this.room = room;
    }

    /**
     * Readonly for others to avoid complications
     */
    public get id() {
        return this.lobbyId;
    }

    /**
     * Initializes the lobby. Creates one if no id is assigned.
     */
    public async init() {
        let data: LobbyRow;
        if (!this.id) {
            data = await this.bingoSql.createLobby(this.adminId);
        } else {
            data = await this.bingoSql.getLobby(this.id);
        }
        this.assignData(data);
        this.initialized = true;
    }

    /**
     * Reloads the lobby data if neccessary or forced.
     * @param force
     */
    private async loadData(force: boolean) {
        if(!this.initialized || force)
            await this.init();
    }

    /**
     * Loads the data from the row into the parameters.
     * @param row
     */
    private assignData(row: LobbyRow) {
        this.lobbyId = row.id;
        this.adminId = row.admin_id;
        this.gridSize = row.grid_size;
        this.currentRoundId = row.current_round;
    }
}
