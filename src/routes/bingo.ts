import {Router} from 'express';
import {Namespace} from 'socket.io';
import {GraphQLError} from "graphql";
import * as markdownIt from 'markdown-it';

import * as utils from '../lib/utils';
import globals from '../lib/globals';
import Route from '../lib/Route';

import * as wrappers from '../lib/bingo/bingo-wrappers';
import {BingoSql} from "../lib/db/BingoSql";
import {pgPool} from "../lib/db";

let mdEmoji = require('markdown-it-emoji');
let mdMark = require('markdown-it-mark');
let mdSmartarrows = require('markdown-it-smartarrows');

class BingoRoute extends Route {
    bingoSql: BingoSql;

    constructor() {
        super();
        this.router = Router();
        this.bingoSql = new BingoSql(pgPool);
    }

    /**
     * Inits the Route
     */
    public async init(ioNamespace: Namespace) {
        this.ions = ioNamespace;
        this.ions.on('connection', (socket) => {
            socket.on('joinChat', (lobbyId: number) => {
                socket.join(`lobby-${lobbyId}`);
            });
        });
    }

    /**
     * Destroys the Route
     */
    public async destroy() {
        this.router = null;
        this.resolver = null;
    }

    /**
     * Graphql resolver function
     * @param req
     * @param res
     */
    public async resolver(req: any, res: any): Promise<object> {
        let playerId = req.session.bingoPlayerId;

        return await {
            player: () => {
                return playerId;
            }
        };
    }
}

export default BingoRoute;
