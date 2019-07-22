import {Router} from 'express';
import {Server} from 'socket.io';

/**
 * Abstract Route class to be implemented by each route.
 * This class contains the socket-io Server, router and resolver
 * for each route.
 */
abstract class Route {
    private io?: Server;

    public router?: Router;
    public resolver?: object;

    abstract async init(...params: any): Promise<any>;
    abstract async destroy(...params: any): Promise<any>;
}

export default Route;
