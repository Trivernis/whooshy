import * as yaml from 'js-yaml';
import * as fsx from 'fs-extra';

// @ts-ignore
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
export function parseSqlYaml(path: string) {
    let queries = yaml.safeLoad(fsx.readFileSync(`${path}/queries.yaml`, 'utf-8'));

    for (let query of queries.exports)
        if (queries[query].file)
            queries[query].sql = fsx.readFileSync(`${path}/${queries[query].file}`, 'utf-8');

    return queries;
}

/**
 * Reads the default-config.yaml and config.yaml in the path directory.
 * @param path {String} - the directory of the settings files.
 */
export function readSettings(path: string) {
    let settings = yaml.safeLoad(fsx.readFileSync(`${path}/default-config.yaml`, 'utf-8'));

    if (fsx.existsSync('config.yaml'))
        Object.assign(settings, yaml.safeLoad(fsx.readFileSync(`${path}/config.yaml`, 'utf-8')));
    return settings;
}

/**
 * Returns all lines of a file as array
 * @param fname {String} - the name of the file
 * @returns {string[]}
 */
export function getFileLines(fname: string) {
    // @ts-ignore
    return fsx.readFileSync(fname).toString().replaceAll('\r\n', '\n').split('\n');
}
