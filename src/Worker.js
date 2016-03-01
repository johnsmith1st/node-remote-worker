'use strict';

let EventEmitter = require('events');

let WebSocket = require('ws');

let Task = require('./Task'),
    TaskState = require('./TaskState'),
    Protocols = require('./Protocols'),
    Events = require('./Events'),
    States = require('./States'),
    Utils = require('./Utils'),
    Logger = require('./Logger');

let WorkerEvents = Events.WorkerEvents,
    TaskStates = States.TaskStates;

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
   * @param cb {function}
   */
  connect(cb) {

    let url = `ws://${this._host}:${this._port}/`;
    let ws = new WebSocket(url, Protocols.RemoteWorkerProtocol);

    ws.on('open', () => {
      this.emit(WorkerEvents.CONNECTED);
      if (typeof cb === 'function') cb(null);
    });

    ws.on('error', (err) => {
      this._logger.error(err);
      this.emit(WorkerEvents.ERROR, err);
      if (typeof cb === 'function') cb(err);
    });

    ws.on('close', () => {
      this.emit(WorkerEvents.DISCONNECTED);
    });

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
    return this._ws && this._ws.socket
      ? Utils.getSocketLocalEndpoint(this._ws._socket)
      : undefined;
  }

  /**
   * Get worker remote endpoint.
   * @returns {string}
   */
  get remoteEndpoint() {
    return this._ws && this._ws.socket
      ? Utils.getSocketRemoteEndpoint(this._ws._socket)
      : undefined;
  }

  _onMessage(data, flags) {

    /** on non-string data **/
    if (flags.binary) return;

    /** on task **/
    let task = Task.deserialize(data);
    if (task) return this._processTask(task);

    /** on task state **/
    let taskState = TaskState.deserialize(data);
    if (taskState) return this._processTaskState(taskState);

  }

  _processTask(task) {

    let progress = (prog) => {
      let state = TaskState.createProgressState(task, prog);
      this._ws.send(TaskState.serialize(state));
    };

    let complete = (result) => {
      let state = TaskState.createCompleteState(task, result);
      this._ws.send(TaskState.serialize(state));
    };

    let error = (err) => {
      let state = TaskState.createErrorState(task, err);
      this._ws.send(TaskState.serialize(state));
    };

    let cancelled = () => {
      let state = TaskState.createCancelledState(task);
      this._ws.send(TaskState.serialize(state));
    };

    task.progress = progress;
    task.complete = complete;
    task.error = error;
    task.cancelled = cancelled;

    this._tasks.set(task.id, task);
    this.emit(WorkerEvents.TASK, task);
  }

  _processTaskState(taskState) {

    let taskId = taskState.taskId;
    let task = this._tasks.get(taskId);

    if (taskState === TaskStates.CANCEL) task.cancel();
  }
}

module.exports = Worker;
