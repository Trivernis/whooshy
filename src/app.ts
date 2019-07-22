import * as path from 'path';
import * as createError from 'http-errors';
import * as cookieParser from 'cookie-parser';
import * as logger from 'morgan';
import * as compression from 'compression';
import * as uglifyEs from 'uglify-es';
import * as session from 'express-session';
import * as sharedsession from 'express-socket.io-session';
import * as connectPgSimple from 'connect-pg-simple';
import * as fsx from 'fs-extra';
import * as graphqlHTTP from 'express-graphql';
import {buildSchema} from 'graphql';
import {importSchema} from 'graphql-import';
import * as express from 'express';
import * as http from 'http';
import * as socketIo from 'socket.io';

import globals from './lib/globals';
import pgPool from './lib/db';
import routes from './routes';

let minify: any = require('express-minify');
let compileSass: any = require('express-compile-sass');

class App {
    public app: express.Application;
    public server: http.Server;
    public io: socketIo.Server;

    /**
     * Creates a new app and http server aswell as a socket.io instance.
     */
    constructor() {
        this.app = express();
        this.server = new http.Server(this.app);
        this.io = socketIo(this.server);
    }

    /**
     * Public access to the configure function
     * @async
     * @return Promise
     */
    public async init() {
        return await this.configure();
    }

    /**
     * Ansynchronously initializes the app.
     * @async
     * @return Promise
     */
    private async configure() {
        let settings = globals.settings;
        await pgPool.query(fsx.readFileSync('./sql/init.sql', 'utf-8'));

        let appSession = session({
            // @ts-ignore
            store: new connectPgSimple(session)({
                pool: pgPool,
                tableName: 'user_sessions'
            }),
            secret: settings.sessions.secret,
            resave: false,
            saveUninitialized: true,
            cookie: {
                maxAge: 7 * 24 * 60 * 60 * 1000  // maxAge 7 days
            }
        });

        this.io.use(sharedsession(appSession, {autoSave: true}));
        routes.ioListeners(this.io);

        let graphqlResolver = async (request: express.Request, response: express.Response) => {
            return {
                ...routes.resolvers(request, response),
                time: Date.now(),
                acceptCookies: () => {
                    request.session.acceptedCookies = true;
                    return true;
                }
            };
        };

        this.app.set('views', path.join(__dirname, 'views'));
        this.app.set('view engine', 'pug');
        this.app.set('trust proxy', 1);

        this.app.use(compression());
        this.app.use(minify({
            // @ts-ignore
            uglifyJsModule: uglifyEs
        }));
        this.app.use(logger('dev'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({extended: false}));

        this.app.use('/sass', compileSass({
            root: './public/stylesheets/sass',
            sourceMap: true,
            watchFiles: (process.env.NODE_ENV !== 'development'),
            logToConsole: true
        }));
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(routes.router);

        this.app.use(cookieParser());
        this.app.use(appSession);

        this.app.use('/graphql', graphqlHTTP(async (request: any, response: any) => {
            return await {
                schema: buildSchema(importSchema('./graphql/schema.graphql')),
                rootValue: await graphqlResolver(request, response),
                context: {session: request.session},
                graphiql: true
            };
        }));

        // catch 404 and forward to error handler
        this.app.use((req, res, next) => {
            next(createError(404));
        });

        // error handler
        this.app.use((err: createError.HttpError, req: any, res: any) => {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });

        return;
    }
}

export default App;
