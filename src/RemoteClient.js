'use strict';

let EventEmitter = require('events');

let protocols = require('./protocols'),
    Command = require('./Command'),
    CommandState = require('./CommandState'),
    Notification = require('./Notification'),
    Utils = require('./Utils'),
    Logger = require('./Logger');

let ClientEvents = protocols.ClientEvents,
    ProcessEvents = protocols.ProcessEvents,
    ProcessStates = protocols.ProcessStates,
    ProcessPhases = protocols.ProcessPhases;

/**
 * Client endpoint host by master server.
 * @extends {EventEmitter}
 */
class RemoteClient extends EventEmitter {

  /**
   * @constructor
   * @param ws {WebSocket}
   * @param master {Master}
   * @param opts {object}
   */
  constructor(ws, master, opts) {
    super();
    opts = opts || {};
    this._ws = ws;
    this._master = master;
    this._em = new EventEmitter();
    this._logger = opts._logger || Logger.NoLogger;
    this._commands = new Map();
    this._init();
  }

  /**
   * Get client local endpoint.
   * @type {string}
   */
  get endpoint() {
    return this._ws && this._ws._socket
      ? Utils.getSocketLocalEndpoint(this._ws._socket)
      : undefined;
  }

  /**
   * Get client remote endpoint.
   * @type {string}
   */
  get remoteEndpoint() {
    return this._ws && this._ws._socket
      ? Utils.getSocketRemoteEndpoint(this._ws._socket)
      : undefined;
  }

  /**
   * Send event to remote client.
   * @param event {string}
   * @param data {*}
   */
  notify(event, data) {
    let e = new Notification(event, data);
    let d = Notification.serialize(e);
    this._ws.send(d, (err) => {
      if (err) {
        this._logger.error(err);
      }
    });
  }

  /**
   * Initialize client socket.
   */
  _init() {
    let ws = this._ws;

    ws.on('error', (err) => {
      this._logger.error(err);
      this.emit(ClientEvents.ERROR, err);
    });

    ws.once('close', () => {
      this.emit(ClientEvents.DISCONNECTED);
    });

    ws.on('message', (data, flags) => this._onMessage(data, flags));
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

    /** on command **/
    let cmd = Command.deserialize(data);
    if (cmd) return this._processCommand(cmd);

    /** on command state **/
    let cmdState = CommandState.deserialize(data);
    if (cmdState) return this._processCommandState(cmdState);
  }

  /**
   * Handle incoming command.
   * @param cmd {Command}
   * @private
   */
  _processCommand(cmd) {

    let done = (err, r) => {
      let state;
      if (err) {
        cmd.setError(err);
        state = CommandState.createErrorState(cmd, err);
      }
      else {
        cmd.setCompleted(r);
        state = CommandState.createCompleteState(cmd, r);
      }
      this._ws.send(CommandState.serialize(state), (err) => {
        if (err) {
          this._logger.error(err);
        }
      });
      this._commands.delete(cmd.id);
    };

    let progress = (p) => {
      cmd.setProgress(p);
      let state = CommandState.createProgressState(cmd, p);
      this._ws.send(CommandState.serialize(state), (err) => {
        if (err) {
          this._logger.error(err);
        }
      });
    };

    let cancel = () => {
      cmd.setCancelled();
      let state = CommandState.createCancelledState(cmd);
      this._ws.send(CommandState.serialize(state), (err) => {
        if (err) {
          this._logger.error(err);
        }
      });
      this._commands.delete(cmd.id);
    };

    this._commands.set(cmd.id, cmd);

    let handler = this._master.handler(cmd.type);
    if (typeof handler === 'function') handler(cmd, done, progress, cancel);
    this.emit(ClientEvents.COMMAND, cmd, done, progress, cancel);
  }

  /**
   * Handle incoming command state.
   * @param cmdState {CommandState}
   * @private
   */
  _processCommandState(cmdState) {

    let id = cmdState.id;
    let cmd = this._commands.get(id);

    if (cmd && cmdState.state === ProcessStates.CANCEL) {
      cmd.emit(ProcessEvents.CANCEL, cmdState.reason);
    }
  }

}

module.exports = RemoteClient;