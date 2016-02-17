'use strict';

let EventEmitter = require('events');
let WebSocket = require('ws');
let Logger = require('./Logger');

class Worker extends EventEmitter {

  constructor(opts) {
    super();
    opts = opts || {};
    this._ws = null;
    this._logger = opts.logger || Logger.NoLogger;
    this._host = opts.host || '127.0.0.1';
    this._port = opts.port || 3000;
    this._em = new EventEmitter();
    this._init();
  }

  handle(event, fn) {
    this._em.on(event, (msg, done) => fn(msg, done));
  }

  end() {

  }

  _init() {
    let url = `ws://${this._host}:${this._port}/remote-worker-protocol`;
    let ws = new WebSocket(url);

    ws.on('open', () => {
      this.emit('open');
    });

    ws.on('error', (err) => {
      this._logger.error(err);
    });

    ws.on('close', () => {
      this.emit('close');
    });

    ws.on('message', (data, flags) => {
      this._onReceive(data, flags);
    });

    this._ws = ws;
  }

  _onReceive(data, flags) {
    if (flags.binary) {
      return;
    }
    try {
      let msg = JSON.parse(data);
      this._process(msg);
    }
    catch(err) {
      this._logger.error(err);
    }
  }

  _process(msg) {

    let done = (err, r) => {
      let data = { id: msg.id };
      if (err) data.error = err.message;
      if (r) data.result = r;

      let dataStr = JSON.stringify(data);
      this._ws.send(dataStr);
    };

    this._em.emit(msg.event, msg.message, done);
  }

}

module.exports = Worker;
