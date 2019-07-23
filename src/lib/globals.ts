import * as utils from './utils';
import * as fsx from 'fs-extra';
import * as winston from 'winston';

/**
 * Defines global variables to be used.
 */
namespace globals {
    export const settings = utils.readSettings('.');
    export const changelog: string = fsx.readFileSync('CHANGELOG.md', 'utf-8');
    export const cookieInfo = {
        headline: 'This website uses cookies',
        content: "This website uses cookies to store your session data. No data is permanently stored.",
        onclick: 'acceptCookies()',
        id: 'cookie-container',
        button: 'All right!'
    };
    export const logger = winston.createLogger({
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.colorize(),
                    winston.format.printf(({ level, message, label, timestamp }) => {
                        return `${timestamp} [${label}] ${level}: ${message}`;
                    })
                )
            })
        ]
    });
}

export default globals;
