const yaml = require('js-yaml'),
    fsx = require('fs-extra');

String.prototype.replaceAll = function(search, replacement) {
    let target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

/**
 * Parses the `queries.yaml` file in the path. queries.yaml-format:
 * exports: {List} - query keys to export
 *
 * queryKey:
 *  file: {String} name of sql-file if the sql is stored in a file.
 *  sql: {String} pure sql if it is not stored in a file. Will be replaced by file contents if a file was given.
 * @param path {String} - the path where the queries.yaml file is stored
 */
function parseSqlYaml(path) {
    let queries = yaml.safeLoad(fsx.readFileSync(`${path}/queries.yaml`));

    for (let query of queries.exports)
        if (queries[query].file)
            queries[query].sql = fsx.readFileSync(`${path}/${queries[query].file}`, 'utf-8');

    return queries;
}

/**
 * Reads the default-config.yaml and config.yaml in the path directory.
 * @param path {String} - the directory of the settings files.
 */
function readSettings(path) {
    let settings = yaml.safeLoad(fsx.readFileSync(`${path}/default-config.yaml`));

    if (fsx.existsSync('config.yaml'))
        Object.assign(settings, yaml.safeLoad(fsx.readFileSync(`${path}/config.yaml`)));
    return settings;
}

/**
 * Returns all lines of a file as array
 * @param fname {String} - the name of the file
 * @returns {string[]}
 */
function getFileLines(fname) {
    return fsx.readFileSync(fname).toString().replaceAll('\r\n', '\n').split('\n');
}

Object.assign(exports, {
    parseSqlYaml: parseSqlYaml,
    readSettings: readSettings,
    getFileLines: getFileLines
});
