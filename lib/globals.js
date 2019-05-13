const utils = require('./utils'),
    pg = require('pg');

const settings = utils.readSettings('.');

Object.assign(exports, {
    settings: settings,
    pgPool: new pg.Pool({
        host: settings.postgres.host,
        port: settings.postgres.port,
        user: settings.postgres.user,
        password: settings.postgres.password,
        database: settings.postgres.database
    })
});
