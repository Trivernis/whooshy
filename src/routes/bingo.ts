import {Router} from 'express';
import {GraphQLError} from "graphql";
import * as markdownIt from 'markdown-it';

import * as utils from '../lib/utils';
import globals from '../lib/globals';
import Route from '../lib/Route';

import * as wrappers from '../lib/bingo-wrappers';

let mdEmoji = require('markdown-it-emoji');
let mdMark = require('markdown-it-mark');
let mdSmartarrows = require('markdown-it-smartarrows');

const pgPool = globals.pgPool;


class BingoRoute extends Route {
    constructor() {
        super();
        this.router = Router();
        this.resolver = this.getResolver();
    }

    /**
     * Inits the Route
     */
    public async init() {

    }

    /**
     * Destroys the Route
     */
    public async destroy() {
        this.router = null;
        this.resolver = null;
    }

    private getResolver(): object {
        return async (req: any, res: any) => {
            let playerId = req.session.bingoPlayerId;
            return {
                player: () => {
                    return playerId;
                }
            };
        };
    }
}

export default BingoRoute;
