const createError = require('http-errors'),
      express = require('express'),
      path = require('path'),
      cookieParser = require('cookie-parser'),
      logger = require('morgan'),
      compileSass = require('express-compile-sass'),
      session = require('express-session'),
      fsx = require('fs-extra'),
      yaml = require('js-yaml'),
      graphqlHTTP = require('express-graphql'),
      { buildSchema } = require('graphql'),
      { importSchema } = require('graphql-import'),

  indexRouter = require('./routes/index'),
  usersRouter = require('./routes/users'),
  riddleRouter = require('./routes/riddle'),
  bingoRouter = require('./routes/bingo');

let settings = yaml.safeLoad(fsx.readFileSync('default-config.yaml'));

if (fsx.existsSync('config.yaml'))
  Object.assign(settings, yaml.safeLoad(fsx.readFileSync('config.yaml')));

let graphqlResolver = (request, response) => {
  return {
      time: Date.now(),
      bingo:  bingoRouter.graphqlResolver(request, response)
  }
};
let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('trust proxy', 1);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: settings.sessions.secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
    expires: 10000000
  }
}));
app.use('/sass', compileSass({
  root: './public/stylesheets/sass',
  sourceMap: true,
  watchFiles: true,
  logToConsole: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use(/\/riddle(\/.*)?/, riddleRouter);
app.use('/bingo', bingoRouter);
app.use('/graphql', graphqlHTTP((request, response) => {
  return {
    schema: buildSchema(importSchema('./graphql/schema.graphql')),
    rootValue: graphqlResolver(request, response),
    context: {session: request.session},
    graphiql: true
  };
}));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

//app.listen(settings.port);
