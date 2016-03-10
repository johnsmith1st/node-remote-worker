'use strict';

let uuid = require('uuid');

/**
 * A simple event emitter, hosts one handler for one event.
 */
class SimpleEventEmitter {

  constructor() {
    this._handlers = {};
  }

  on(event, handler) {
    if (typeof handler !== 'function') return;
    this._handlers[event] = handler;
  }

  off(event) {
    delete this._handlers[event];
  }

  emit(event) {
    let a = Array.prototype.slice.call(arguments, 1);
    let h = this._handlers[event];
    if (typeof h === 'function') h.apply(h, a);
  }

}

/**
 * A client for web use.
 */
class WebClient {

  /**
   * @constructor
   * @param opts {*}
   * @param [opts.host] {string} master host
   * @param [opts.port] {string} master port
   */
  constructor(opts) {
    opts = opts || {};
    this._ws = null;
    this._host = opts.host || '127.0.0.1';
    this._port = opts.port || 3000;
    this._em = new SimpleEventEmitter();
    this.onConnected = null;
    this.onDisconnected = null;
    this.onError = null;
    this.onNotification = null;
  }

  /**
   * Connect to master.
   * @param [cb] {function}
   */
  connect(cb) {
    let url = `ws://${this._host}:${this._port}/`;
    let ws = new WebSocket(url, 'client-protocol');

    /** handle ws open **/
    ws.onopen = () => {
      if (typeof this.onConnected === 'function') this.onConnected();
      if (typeof cb === 'function') cb();
    };

    /** handle ws close **/
    ws.onclose = () => {
      if (typeof this.onDisconnected === 'function') this.onDisconnected();
    };

    /** handle ws error **/
    ws.onerror = (err) => {
      console.error(err);
      if (typeof this.onError === 'function') this.onError(err);
      if (typeof cb === 'function') cb(err);
    };

    /** handle message from ws **/
    ws.onmessage = (e) => {
      this._onMessage(e.data);
    };

    this._ws = ws;
  }

  /**
   * Close client.
   */
  close() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
  }

  /**
   * Publish a command, let the master to execute it.
   * @param c {object}
   * @param c.type {string}
   * @param c.params {object}
   * @param [c.timeout] {number}
   * @param [c.onProgress] {function(progress)}
   * @param [c.onComplete] {function(result)}
   * @param [c.onError] {function(error)}
   * @param [c.onTimeout] {function}
   * @param [c.onCancelled] {function}
   */
  publish(c) {

    let id = 'Command:' + uuid.v4();
    let hTimeout, hStates;

    let onFinalize = () => {
      this._em.off(id);
      if (hTimeout) clearTimeout(hTimeout);
    };

    let onError = (err) => {
      onFinalize();
      c['state'] = 'error';
      if (typeof c.onError === 'function') c.onError(err);
    };

    let onTimeout = () => {
      onFinalize();
      c['state'] = 'timeout';
      if (typeof c.onTimeout === 'function') c.onTimeout();
    };

    let onProgress = (p) => {
      c['state'] = 'progress';
      if (typeof c.onProgress === 'function') c.onProgress(p);
    };

    let onComplete = (r) => {
      onFinalize();
      c['state'] = 'complete';
      if (typeof c.onComplete === 'function') c.onComplete(r);
    };

    let onCancelled = () => {
      onFinalize();
      c['state'] = 'cancelled';
      if (typeof c.onCancelled === 'function') c.onCancelled();
    };

    c['state'] = 'processing';

    /** set timeout **/
    if (c.timeout && c.timeout > 0) {
      hTimeout = setTimeout(onTimeout, c.timeout);
    }

    /** handle state changed **/
    hStates = function(cmdState) {
      let state = cmdState.state;
      switch (state) {
        case 'progress':
          return onProgress(cmdState.progress);
        case 'error':
          return onError(cmdState.error || 'unknown error');
        case 'completed':
          return onComplete(cmdState.result);
        case 'cancelled':
          return onCancelled();
        default:
          return;
      }
    };
    this._em.on(id, hStates);

    /** send command **/
    let data = {
      Command: {
        id: id,
        type: c.type,
        params: c.params,
        state: c.state,
        timeout: c.timeout
      }
    };
    let dataStr = JSON.stringify(data);
    this._ws.send(dataStr);
  }

  /**
   * Handle incoming message.
   * @param data {string}
   * @param flags {*}
   * @private
   */
  _onMessage(data) {

    /** on notification **/
    let n = WebClient._parseNotification(data);
    if (n) return this._processNotification(n);

    /** on command state **/
    let cs = WebClient._parseCommandState(data);
    if (cs) return this._processCommandState(cs);
  }

  /**
   * Handle incoming notification.
   * @param n {object}
   * @private
   */
  _processNotification(n) {
    if (typeof this.onNotification === 'function') {
      this.onNotification(n.event, n.data);
    }
  }

  /**
   * Handle incoming command state
   * @param state {object}
   * @private
   */
  _processCommandState(state) {
    this._em.emit(state.id, state);
  }

  static _parseNotification(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj['Notification']) {
        return obj['Notification'];
      }
    }
    catch(e) { }
    return null;
  }

  static _parseCommandState(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj['CommandState']) {
        return obj['CommandState'];
      }
    }
    catch(e) { }
    return null;
  }

}

module.exports = WebClient;
