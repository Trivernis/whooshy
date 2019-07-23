import * as pg from "pg";
import globals from '../globals';
import {BingoSql} from './BingoSql';

const settings = globals.settings;

export let pgPool = new pg.Pool({
    host: settings.postgres.host,
    port: settings.postgres.port,
    user: settings.postgres.user,
    password: settings.postgres.password,
    database: settings.postgres.database
});

namespace queries {
    export const bingoSql = new BingoSql(pgPool);
}

export default pgPool;
