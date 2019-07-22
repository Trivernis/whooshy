"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var createError = require("http-errors");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var compileSass = require("express-compile-sass");
var minify = require("express-minify");
var compression = require("compression");
var uglifyEs = require("uglify-es");
var session = require("express-session");
var ConnectPostgres = require("connect-pg-simple");
var fsx = require("fs-extra");
var graphqlHTTP = require("express-graphql");
var graphql_1 = require("graphql");
var graphql_import_1 = require("graphql-import");
var globals = require("./lib/globals");
var routes_1 = require("./routes");
var express = require("express");
var http = require("http");
var App = /** @class */ (function () {
    function App() {
        this.app = express();
        this.server = new http.Server(this.app);
    }
    App.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    };
    App.prototype.configure = function () {
        var _this = this;
        this.app.set('views', path.join(__dirname, 'views'));
        this.app.set('view engine', 'pug');
        this.app.set('trust proxy', 1);
        this.app.use(compression());
        this.app.use(minify({
            uglifyJsModule: uglifyEs
        }));
        this.app.use(logger('dev'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use('/sass', compileSass({
            root: './public/stylesheets/sass',
            sourceMap: true,
            watchFiles: (process.env.NODE_ENV !== 'development'),
            logToConsole: true
        }));
        this.app.use(express.static(path.join(__dirname, 'public')));
        this.app.use(routes_1.default);
        this.app.use(cookieParser());
        this.app.use(session({
            store: new ConnectPostgres(session)({
                pool: pgPool,
                tableName: 'user_sessions'
            }),
            secret: settings.sessions.secret,
            resave: false,
            saveUninitialized: true,
            cookie: {
                maxAge: 7 * 24 * 60 * 60 * 1000 // maxAge 7 days
            }
        }));
        this.app.use('/graphql', graphqlHTTP(function (request, response) { return __awaiter(_this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = {
                            schema: graphql_1.buildSchema(graphql_import_1.importSchema('./graphql/schema.graphql'))
                        };
                        return [4 /*yield*/, graphqlResolver(request, response)];
                    case 1: return [4 /*yield*/, (_a.rootValue = _b.sent(),
                            _a.context = { session: request.session },
                            _a.graphiql = true,
                            _a)];
                    case 2: return [2 /*return*/, _b.sent()];
                }
            });
        }); }));
        // catch 404 and forward to error handler
        this.app.use(function (req, res, next) {
            next(createError(404));
        });
        // error handler
        this.app.use(function (err, req, res) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};
            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });
    };
    return App;
}());
function init() {
    return __awaiter(this, void 0, void 0, function () {
        var server, io, settings, graphqlResolver, pgPool, bingoIo;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    server = require('http').Server(app);
                    io = require('socket.io')(server);
                    settings = globals.settings;
                    graphqlResolver = function (request, response) { return __awaiter(_this, void 0, void 0, function () {
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _a = {
                                        time: Date.now()
                                    };
                                    return [4 /*yield*/, bingoRouter.graphqlResolver(request, response)];
                                case 1: return [2 /*return*/, (_a.bingo = _b.sent(),
                                        _a.acceptCookies = function () {
                                            request.session.acceptedCookies = true;
                                            return true;
                                        },
                                        _a)];
                            }
                        });
                    }); };
                    pgPool = globals.pgPool;
                    return [4 /*yield*/, pgPool.query(fsx.readFileSync('./sql/init.sql', 'utf-8'))];
                case 1:
                    _a.sent();
                    bingoIo = io.of('/bingo');
                    return [4 /*yield*/, bingoRouter.init(bingoIo, io)];
                case 2:
                    _a.sent();
                    // view engine setup
                    return [2 /*return*/, [app, server]];
            }
        });
    });
}
module.exports = init;
//app.listen(settings.port);
