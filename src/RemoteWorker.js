'use strict';

let EventEmitter = require('events');
let Promise = require('bluebird');
let uuid = require('uuid');
let Logger = require('./Logger');

class RemoteWorker extends EventEmitter {

  constructor(ws, opts) {
    super();
    opts = opts || {};
    this._ws = ws;
    this._em = new EventEmitter();
    this._logger = opts.logger || Logger.NoLogger;
    this._init();
  }

  dispatch(event, message, timeout) {


    let pro = new Promise((resolve, reject) => {

      let eventId = 'event:' + uuid.v4();

      this._em.once(eventId, (msg) => {
        return (msg.error) ? reject(Error(msg.error)) : resolve(msg.result);
      });

      let data = { id: eventId, event: event, message: message };
      let dataStr = JSON.stringify(data);

      this._ws.send(dataStr, (err) => {
        if (err) {
          this._logger.error(err);
          return reject(err);
        }
      });

    });

    if (timeout && timeout > 0) {
      pro = pro.timeout(timeout);
    }

    return pro;
  }

  get endpoint() {
    return `${this._ws._socket.remoteAddress}:${this._ws._socket.remotePort}`;
  }

  _init() {

    let ws = this._ws;

    ws.on('error', (err) => {
      this._logger.error(err);
      this.emit('error', err);
    });

    ws.on('close', () => {
      this.emit('close');
    });

    ws.on('message', (data, flags) => {
      this._onReceive(data, flags);
    });

  }

  _onReceive(data, flags) {

    if (flags.binary) {
      return;
    }

    try {
      let msg = JSON.parse(data);
      this._em.emit(msg.id, msg);
    }
    catch(err) {
      this._logger.error(err);
    }

  }

}

module.exports = RemoteWorker;
