'use strict';

let EventEmitter = require('events');

let WebSocketServer = require('ws').Server;

let RemoteClient = require('./RemoteClient');
let RemoteWorker = require('./RemoteWorker');
let Logger = require('./Logger');
let protocols = require('./protocols');

let acceptProtocols = new Set();
acceptProtocols.add(protocols.ClientProtocol);
acceptProtocols.add(protocols.WorkerProtocol);

let MasterEvents = protocols.MasterEvents,
    ClientEvents = protocols.ClientEvents,
    WorkerEvents = protocols.WorkerEvents;

/**
 * Master is a ws server which host many clients and workers (ws clients).
 * It receives commands from clients, dispatches tasks to workers, and controls the lifecycle of the tasks.
 * @extends {EventEmitter}
 */
class Master extends EventEmitter {

  /**
   * @constructor
   * @param opts {object}
   * @param [opts.port] {number} port to run the server
   * @param [opts.server] {http.Server} server to host the master
   * @param [opts.logger] {*} something that can write log
   */
  constructor(opts) {
    super();
    opts = opts || {};
    this._opts = opts;
    this._port = opts.port;
    this._server = opts.server;
    this._logger = opts.logger || Logger.NoLogger;

    // clients and workers are store in a set
    this._clients = new Set();
    this._workers = new Set();

    // the ws server
    this._wss = null;
    this._commandHandlers = new Map();
  }

  /**
   * Get all clients as an array.
   * @type {Array<RemoteClient>}
   */
  get clients() {
    return Array.from(this._clients);
  }

  /**
   * Get all workers as an array.
   * @type {Array<RemoteWorker>}
   */
  get workers() {
    return Array.from(this._workers);
  }

  /**
   * Start the server.
   * @param [cb] {function}
   */
  listen(cb) {

    /** setup protocol handler **/
    this._opts.handleProtocols = (protocols, cb) => {
      this._handleProtocols(protocols, cb);
    };

    /** setup ws server **/
    this._wss = new WebSocketServer(this._opts, cb);
    this._wss.on('connection', (ws) => this._handleConnection(ws));

    /** log ws server online **/
    this._logger.info(
      'master online at port:',
      this._port || (this._server && this._server.address().port));
  }

  /**
   * Dispatch a task to remote worker.
   * @param remoteWorker
   * @param task
   */
  dispatch(remoteWorker, task) {
    remoteWorker.dispatch(task);
  }

  /**
   * Register command handler.
   * @param cmd {string}
   * @param handler {function(command, done, progress, cancel)}
   */
  execute(cmd, handler) {
    if (typeof handler !== 'function') return;
    this._commandHandlers.set(cmd, handler);
  }

  /**
   * Get command handlers.
   * @param cmd {string}
   */
  handler(cmd) {
    return this._commandHandlers.get(cmd);
  }

  /**
   * handle client protocol.
   * @param protocols {Array} strings of protocols that client provides.
   * @param cb {function} handle result callback.
   * @private
   */
  _handleProtocols(protocols, cb) {
    protocols = protocols || [];
    for (let pro of protocols) {
      if (acceptProtocols.has(pro)) {
        return cb(true, pro);
      }
    }
    return cb(false);
  }

  /**
   * handle client connection.
   * @param ws {WebSocket}
   * @private
   */
  _handleConnection(ws) {

    /** handle ws that connected with client protocol **/
    if (ws.protocol === protocols.ClientProtocol) {
      let client = new RemoteClient(ws, this, { logger: this._logger });
      this._addClient(client);
      return;
    }

    /** handle ws that connected with worker protocol **/
    if (ws.protocol === protocols.WorkerProtocol) {
      let worker = new RemoteWorker(ws, { logger: this._logger });
      this._addWorker(worker);
      return;
    }

    /** without accepted protocol, the client will be terminated **/
    ws.close(403);
  }

  /**
   * @param remoteClient
   * @private
   */
  _addClient(remoteClient) {

    /** handle client error **/
    remoteClient.on(ClientEvents.ERROR, (err) => {
      this._logger.error(err);
    });

    /** handle client disconnected **/
    remoteClient.once(ClientEvents.DISCONNECTED, () => {

      this._clients.delete(remoteClient);

      /** notify client offline **/
      this.emit(MasterEvents.CLIENT_OFFLINE, remoteClient);
    });

    this._clients.add(remoteClient);

    /** notify client online **/
    this.emit(MasterEvents.CLIENT_ONLINE, remoteClient);
  }

  /**
   * @param remoteWorker
   * @private
   */
  _addWorker(remoteWorker) {

    /** handle worker error **/
    remoteWorker.on(WorkerEvents.ERROR, (err) => {
      this._logger.error(err);
    });

    /** handle worker disconnected **/
    remoteWorker.once(WorkerEvents.DISCONNECTED, () => {

      this._workers.delete(remoteWorker);

      /** notify worker offline **/
      this.emit(MasterEvents.WORKER_OFFLINE, remoteWorker);
    });

    this._workers.add(remoteWorker);

    /** notify worker online **/
    this.emit(MasterEvents.WORKER_ONLINE, remoteWorker);
  }

}

module.exports = Master;
