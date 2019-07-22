#!/usr/bin/env node

import {Server} from 'http';
import * as yaml from 'js-yaml';
import * as fsx from 'fs-extra';

import App from './app';

/**
 * Module dependencies.
 */

const debug = require('debug')('whooshy:server');

let settings: any = {};

try {
    settings = yaml.safeLoad(fsx.readFileSync('default-config.yaml', 'utf-8'));

    if (fsx.existsSync('config.yaml'))
        Object.assign(settings, yaml.safeLoad(fsx.readFileSync('config.yaml', 'utf-8')));
} catch (err) {
    console.error(err);
}

/**
 * Get port from environment and store in Express.
 */

let port = normalizePort(process.env.PORT || settings.port || '3000');
let webApp = new App();

webApp.init().then(() => {
    let app = webApp.app;
    let server = webApp.server;
    app.set('port', port);

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port);
    server.on('error', (error) => onError(error));
    server.on('listening', () => onListening(server));

    /**
     * Normalize a port into a number, string, or false.
     */
}).catch((err) => {
    console.error(err.message);
    console.error(err.stack);
});

function normalizePort(val: string) {
    let port = parseInt(val, 10);

    if (isNaN(port))
    // named pipe
        return val;

    if (port >= 0)
    // port number
        return port;

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: any) {
    if (error.syscall !== 'listen')
        throw error;

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening(server: Server) {
    let addr = server.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
