import {Router} from 'express';
import {Server} from 'socket.io';

import * as homeRouter from './home';
import BingoRoute from './bingo';
import changelogRouter from './changelog';

namespace routes {
    export const router = Router();

    const bingoRoute = new BingoRoute();

    router.use('/', homeRouter);
    router.use('/bingo', bingoRoute.router);
    router.use('/changelog', changelogRouter);

    export const resolvers = async (request: any, response: any): Promise<object> => {
        return await {
            bingo: await bingoRoute.resolver(request, response)
        };
    };

    export const ioListeners = (io: Server) => {

    };
}

export default routes;
