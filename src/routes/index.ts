import {Router} from 'express';
import {Server} from 'socket.io';

import * as homeRouter from './home';
import * as bingoRouter from './bingo';
import changelogRouter from './changelog';

namespace routes {
    export const router = Router();

    router.use('/', homeRouter);
    router.use('/bingo', bingoRouter);
    router.use('/changelog', changelogRouter);

    export const resolvers = (request: any, response: any):object => {

    };

    export const ioListeners = (io: Server) => {

    };
}

export default routes;
