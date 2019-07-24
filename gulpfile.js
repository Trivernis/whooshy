const {src, dest, watch, series, task} = require('gulp');
const sass = require('gulp-sass');
const ts = require('gulp-typescript');
const minify = require('gulp-minify');
const del = require('delete');


function clearDist(cb) {
    del('dist/*', cb);
}

function compileTypescript() {
    let tsProject = ts.createProject('tsconfig.json');
    let tsResult = tsProject.src().pipe(tsProject());
    return tsResult
        //.pipe(minify())
        .pipe(dest('dist'));
}

function minifyJs() {
    return src('src/public/javascripts/**/*.js')
        .pipe(minify({
            ext: {
                src: '-debug.js',
                min: '.js'
            }
        }))
        .pipe(dest('dist/public/javascripts'));
}

function compileSass() {
    return src('src/public/stylesheets/sass/**/style.sass')
        .pipe(sass().on('error', sass.logError))
        .pipe(dest('dist/public/stylesheets'));
}

function moveRemaining() {
    return src(['src/**/*', '!src/**/*.ts', '!src/**/*.sass', '!src/**/*.js'])
        .pipe(dest('dist'));
}

task('default', series(clearDist, compileTypescript, minifyJs, compileSass, moveRemaining));
task('watch', () => {
    watch('src/public/stylesheets/sass/**/*.sass', compileSass);
    watch('**/*.js', minifyJs);
    watch('**/*.ts', compileTypescript);
    watch(['src/**/*', '!src/**/*.ts', '!src/**/*.sass', '!src/**/*.js'], moveRemaining);
});
