const createError = require('http-errors'),
    path = require('path'),
    express = require('express'),
    cookieParser = require('cookie-parser'),
    logger = require('morgan'),
    compileSass = require('express-compile-sass'),
    session = require('express-session'),
    pgSession = require('connect-pg-simple')(session),
    fsx = require('fs-extra'),
    graphqlHTTP = require('express-graphql'),
    {buildSchema} = require('graphql'),
    {importSchema} = require('graphql-import'),

    globals = require('./lib/globals'),
    settings = globals.settings,

    indexRouter = require('./routes/index'),
    //usersRouter = require('./routes/users'),
    //riddleRouter = require('./routes/riddle'),
    changelogRouter = require('./routes/changelog'),
    bingoRouter = require('./routes/bingo');

let app = require('express')(),
    server = require('http').Server(app),
    io = require('socket.io')(server);

async function init() {
    // grapql default resolver
    let graphqlResolver = async (request, response) => {
        return {
            time: Date.now(),
            bingo: await bingoRouter.graphqlResolver(request, response),
            acceptCookies: () => {
                request.session.acceptedCookies = true;
                return true;
            }
        };
    };
    // database setup
    let pgPool = globals.pgPool;
    await pgPool.query(fsx.readFileSync('./sql/init.sql', 'utf-8'));

    let bingoIo = io.of('/bingo');
    await bingoRouter.init(bingoIo, io);

    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'pug');
    app.set('trust proxy', 1);

    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({extended: false}));
    app.use(cookieParser());
    app.use(session({
        store: new pgSession({
            pool: pgPool,
            tableName: 'user_sessions'
        }),
        secret: settings.sessions.secret,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000  // maxAge 7 days
        }
    }));
    app.use('/sass', compileSass({
        root: './public/stylesheets/sass',
        sourceMap: true,
        watchFiles: (process.env.NODE_ENV !== 'development'),
        logToConsole: true
    }));
    app.use(express.static(path.join(__dirname, 'public')));

    app.use('/', indexRouter);
    //app.use('/users', usersRouter);
    //app.use(/\/riddle(\/.*)?/, riddleRouter);
    app.use('/bingo', bingoRouter);
    app.use('/changelog', changelogRouter);
    app.use('/graphql', graphqlHTTP(async (request, response) => {
        return await {
            schema: buildSchema(importSchema('./graphql/schema.graphql')),
            rootValue: await graphqlResolver(request, response),
            context: {session: request.session},
            graphiql: true
        };
    }));

// catch 404 and forward to error handler
    app.use(function (req, res, next) {
        next(createError(404));
    });

// error handler
    app.use(function (err, req, res) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};

        // render the error page
        res.status(err.status || 500);
        res.render('error');
    });
    return [app, server];
}

module.exports = init;

//app.listen(settings.port);
