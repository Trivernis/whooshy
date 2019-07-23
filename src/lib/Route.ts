import {Router} from 'express';
import {Namespace, Server} from 'socket.io';

/**
 * Abstract Route class to be implemented by each route.
 * This class contains the socket-io Server, router and resolver
 * for each route.
 */
abstract class Route {
    protected io?: Server;
    protected ions?: Namespace;

    public router?: Router;

    abstract async init(...params: any): Promise<any>;
    abstract async destroy(...params: any): Promise<any>;
    abstract async resolver(request: any, response: any): Promise<object>;
}

export default Route;
