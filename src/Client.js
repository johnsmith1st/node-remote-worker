'use strict';

let EventEmitter = require('events');

let WebSocket = require('ws');

let protocols = require('./protocols'),
    Command = require('./Command'),
    CommandState = require('./CommandState'),
    Notification = require('./Notification'),
    Utils = require('./Utils'),
    Logger = require('./Logger');

let ClientEvents = protocols.ClientEvents,
    ProcessEvents = protocols.ProcessEvents;

/**
 * Client is a ws client that sends commands to master.
 */
class Client extends EventEmitter {

  /**
   * @constructor
   * @param opts {*}
   * @param [opts.logger] logger to write log
   * @param [opts.host] master host
   * @param [opts.port] master port
   */
  constructor(opts) {
    super();
    opts = opts || {};
    this._ws = null;
    this._logger = opts.logger || Logger.NoLogger;
    this._host = opts.host || '127.0.0.1';
    this._port = opts.port || 3000;
    this._em = new EventEmitter();
  }

  /**
   * Connect to master.
   * @param [cb] {function}
   */
  connect(cb) {

    let url = `ws://${this._host}:${this._port}/`;
    let ws = new WebSocket(url, protocols.ClientProtocol);

    /** handle ws open **/
    ws.once('open', () => {
      this.emit(ClientEvents.CONNECTED);
      if (typeof cb === 'function') cb();
    });

    /** handle ws close **/
    ws.once('close', () => {
      this.emit(ClientEvents.DISCONNECTED);
    });

    /** handle ws error **/
    ws.on('error', (err) => {
      this._logger.error(err);
      this.emit(ClientEvents.ERROR, err);
      if (typeof cb === 'function') cb(err);
    });

    /** handle message from ws **/
    ws.on('message', (data, flags) => {
      this._onMessage(data, flags);
    });

    this._ws = ws;
  }

  /**
   * Get worker local endpoint.
   * @returns {string}
   */
  get endpoint() {
    return this._ws && this._ws._socket
      ? Utils.getSocketLocalEndpoint(this._ws._socket)
      : undefined;
  }

  /**
   * Get worker remote endpoint.
   * @returns {string}
   */
  get remoteEndpoint() {
    return this._ws && this._ws._socket
      ? Utils.getSocketRemoteEndpoint(this._ws._socket)
      : undefined;
  }

  /**
   * Publish a command, let the master to execute it.
   * @param c {object}
   * @param c.type {string}
   * @param c.params {object}
   * @param [c.timeout] {number}
   * @param [c.onProgress] {function(command, progress)}
   * @param [c.onCompleted] {function(command, result)}
   * @param [c.onError] {function(command, error)}
   * @param [c.onTimeout] {function(command)}
   * @param [c.onCancelled] {function(command)}
   * @returns {Command}
   */
  publish(c) {

    let command = new Command(c);

    /** on cancel task signal **/
    command.once(ProcessEvents.CANCEL, (reason) => {

      let state = CommandState.createCancelState(command, reason);
      let stateStr = CommandState.serialize(state);

      /** send cancel state to remote master **/
      this._ws.send(stateStr, (err) => {
        if (err) {
          this._logger.error(err);
          command.setCancelled();
        }
      });

    });

    /** handle command state changed **/
    this._em.on(command.id, (cmdState) => {
      command.setState(cmdState);
    });

    /** send command to remote master **/
    this._ws.send(Command.serialize(command), (err) => {
      if (err) {
        this._logger.error(err);
        command.setError(err);
      }
    });

    return command;
  }

  /**
   * Handle incoming message.
   * @param data {string}
   * @param flags {*}
   * @private
   */
  _onMessage(data, flags) {

    /** on non-string data **/
    if (flags.binary) return;

    /** on notification **/
    let e = Notification.deserialize(data);
    if (e) return this._processNotification(e);

    /** on command state **/
    let cmdState = CommandState.deserialize(data);
    if (cmdState) return this._processCommandState(cmdState);
  }

  /**
   * Handle incoming notification.
   * @param n {Notification}
   * @private
   */
  _processNotification(n) {
    this.emit(n.event, n.data);
  }

  /**
   * Handle incoming command state
   * @param state {CommandState}
   * @private
   */
  _processCommandState(state) {
    this._em.emit(state.id, state);
  }

}

module.exports = Client;
