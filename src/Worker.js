'use strict';

let EventEmitter = require('events');

let WebSocket = require('ws');

let protocols = require('./protocols'),
    Task = require('./Task'),
    TaskState = require('./TaskState'),
    Utils = require('./Utils'),
    Logger = require('./Logger');

let WorkerEvents = protocols.WorkerEvents,
    ProcessStates = protocols.ProcessStates;

/**
 * Worker is a ws client that process task assign by master.
 */
class Worker extends EventEmitter {

  /**
   * @constructor
   * @param opts
   */
  constructor(opts) {
    super();
    opts = opts || {};
    this._ws = null;
    this._logger = opts.logger || Logger.NoLogger;
    this._host = opts.host || '127.0.0.1';
    this._port = opts.port || 3000;
    this._em = new EventEmitter();
    this._tasks = new Map();
  }

  /**
   * Connect to master.
   * @param [cb] {function}
   */
  connect(cb) {

    let url = `ws://${this._host}:${this._port}/`;
    let ws = new WebSocket(url, protocols.WorkerProtocol);

    /** handle ws open **/
    ws.once('open', () => {
      this.emit(WorkerEvents.CONNECTED);
      if (typeof cb === 'function') cb();
    });

    /** handle ws close **/
    ws.once('close', () => {
      this.emit(WorkerEvents.DISCONNECTED);
    });

    /** handle ws error **/
    ws.on('error', (err) => {
      this._logger.error(err);
      this.emit(WorkerEvents.ERROR, err);
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
   * Handle incoming message.
   * @param data {string}
   * @param flags {*}
   * @private
   */
  _onMessage(data, flags) {

    /** on non-string data **/
    if (flags.binary) return;

    /** on task **/
    let task = Task.deserialize(data);
    if (task) {
      task.isFromMaster = true;
      return this._processTask(task);
    }

    /** on task state **/
    let taskState = TaskState.deserialize(data);
    if (taskState) return this._processTaskState(taskState);
  }

  /**
   * Handle incoming task.
   * @param task {Task}
   * @private
   */
  _processTask(task) {

    let done = (err, r) => {
      let state;
      if (err) {
        task.setError(err);
        state = TaskState.createErrorState(task, err);
      }
      else {
        task.setCompleted(r);
        state = TaskState.createCompleteState(task, r);
      }
      this._ws.send(TaskState.serialize(state), (err) => {
        if (err) {
          this._logger.error(err);
        }
      });
    };

    let progress = (p) => {
      task.setProgress(p);
      let state = TaskState.createProgressState(task, p);
      this._ws.send(TaskState.serialize(state), (err) => {
        if (err) {
          this._logger.error(err);
        }
      });
    };

    let cancel = () => {
      task.setCancelled();
      let state = TaskState.createCancelledState(task);
      this._ws.send(TaskState.serialize(state), (err) => {
        if (err) {
          this._logger.error(err);
        }
      });
    };

    this._tasks.set(task.id, task);
    this.emit(WorkerEvents.TASK, task, done, progress, cancel);
  }

  /**
   * Handle incoming task state.
   * @param taskState {TaskState}
   * @private
   */
  _processTaskState(taskState) {

    let id = taskState.id;
    let task = this._tasks.get(id);

    if (task && taskState.state === ProcessStates.CANCEL) {
      task.emit(ProcessStates.CANCEL, taskState.reason);
    }
  }

}

module.exports = Worker;
