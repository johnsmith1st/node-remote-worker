'use strict';

let EventEmitter = require('events');
let WebSocketServer = require('ws').Server;
let RemoteWorker = require('./RemoteWorker');
let Logger = require('./Logger');

class Master extends EventEmitter {

  constructor(opts) {
    super();
    opts = opts || {};
    this._port = opts.port || 3000;
    this._logger = opts.logger || Logger.NoLogger;
    this._workers = new Set();
    this._wss = null;
    this._init();
  }

  get workers() {
    return Array.from(this._workers);
  }

  _verify(ws) {
    let url = ws.upgradeReq.url;
    return url.startsWith('/remote-worker-protocol');
  }

  _init() {

    let wss = new WebSocketServer({ port: this._port });

    wss.on('connection', (ws) => {

      let verified = this._verify(ws);

      if (!verified) {
        ws.terminate(403);
        return;
      }

      let worker = new RemoteWorker(ws, { logger: this._logger });

      worker.once('error', (err) => {
        this._logger.error(err);
      });

      worker.once('close', () => {
        this._workers.delete(worker);
        this.emit('WorkerOnline', worker);
      });

      this._workers.add(worker);
      this.emit('WorkerOffline', worker);

    });

    this.wss = wss;
    this._logger.info('master online at port:', this._port);
  }

}

module.exports = Master;
