'use strict';

let EventEmitter = require('events');

let WebSocketServer = require('ws').Server;

let RemoteWorker = require('./RemoteWorker');
let Events = require('./Events');
let Protocols = require('./Protocols');
let Logger = require('./Logger');

let acceptProtocols = new Set();
acceptProtocols.add(Protocols.RemoteWorkerProtocol);

let MasterEvents = Events.MasterEvents,
    WorkerEvents = Events.WorkerEvents;

/**
 * Master is a ws server which host many workers (ws client).
 * It dispatches tasks to workers, and controls the lifecycle of tasks.
 */
class Master extends EventEmitter {

  /**
   * @constructor
   * @param opts
   */
  constructor(opts) {
    super();
    opts = opts || {};
    this._opts = opts;
    this._port = opts.port;
    this._server = opts.server;
    this._logger = opts.logger || Logger.NoLogger;

    // workers (clients) are store in a set
    this._workers = new Set();

    // the ws server
    this._wss = null;

  }

  /**
   * Get workers as array.
   * @returns {Array}
   */
  get workers() {
    return Array.from(this._workers);
  }

  /**
   * Start the server.
   */
  listen() {

    /** setup protocol handler **/
    this._opts.handleProtocols = (protocols, cb) => {
      this._handleProtocols(protocols, cb);
    };

    /** setup ws server **/
    this._wss = new WebSocketServer(this._opts);
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

    /** handle client that connected with remote-worker-protocol **/
    if (ws.protocol === Protocols.RemoteWorkerProtocol) {
      let worker = new RemoteWorker(ws, { logger: this._logger });
      this._addWorker(worker);
      return;
    }

    /** without accepted protocol, the client will be terminated **/
    ws.close(403);
  }

  /**
   *
   * @param remoteWorker
   * @private
   */
  _addWorker(remoteWorker) {

    /** handle worker error **/
    remoteWorker.once(WorkerEvents.ERROR, (err) => {
      this._logger.error(err);
    });

    /** handle worker disconnected **/
    remoteWorker.once(WorkerEvents.DISCONNECTED, () => {
      this._workers.delete(remoteWorker);
      this.emit(MasterEvents.WORKER_OFFLINE, remoteWorker);
    });

    this._workers.add(remoteWorker);
    this.emit(MasterEvents.WORKER_ONLINE, remoteWorker);
  }

}

module.exports = Master;
