'use strict';

let EventEmitter = require('events');

let Events = require('./Events'),
    States = require('./States'),
    Task = require('./Task'),
    TaskState = require('./TaskState'),
    Utils = require('./Utils'),
    Logger = require('./Logger');

let WorkerEvents = Events.WorkerEvents,
    TaskStates = States.TaskStates;

class RemoteWorker extends EventEmitter {

  constructor(ws, opts) {
    super();
    opts = opts || {};
    this._ws = ws;
    this._em = new EventEmitter();
    this._logger = opts.logger || Logger.NoLogger;
    this._init();
  }

  /**
   * Dispatch a task to remote worker.
   *
   * @param task {*}
   *
   * {
   *   data: {object}
   *   timeout: {number}
   *   onProgress: { function(task, progress) }
   *   onCompleted: { function(task, result) }
   *   onError: { function(task, error) }
   *   onTimeout: { function(task) }
   *   onCancelled: { function(task) }
   * }
   * @returns {Task}
   *
   */
  dispatch(task) {

    let task = new Task(task);

    /** signal cancel task **/
    task.on(TaskStates.CANCEL, (reason) => {

      let state = TaskState.createCancelState(task, reason);
      let stateStr = TaskState.serialize(state);

      /** send cancel state to remote worker **/
      this._ws.send(stateStr, (err) => {
        if (err) {
          this._logger.error(err);
          task.setCancelled();
          return;
        }
      });

    });

    /** handle state changed **/
    this._em.on(task.id, (taskState) => {
      task.updateState(taskState);
    });

    /** send task to remote worker **/
    this._ws.send(Task.serialize(task), (err) => {
      if (err) {
        this._logger.error(err);
        task.setError(err);
      }
    });

    return task;
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

  _init() {

    let ws = this._ws;

    /** handle worker error **/
    ws.on('error', (err) => {
      this._logger.error(err);
      this.emit(WorkerEvents.ERROR, err);
    });

    /** handle worker close **/
    ws.once('close', () => {
      this.emit(WorkerEvents.DISCONNECTED);
    });

    /** handle communication **/
    ws.on('message', (data, flags) => {
      if (flags.binary) {
        return;
      }
      try {
        let taskState = TaskState.deserialize(data);
        if (taskState) this._em.emit(taskState.id, taskState);
      }
      catch(err) {
        this._logger.error(err);
      }
    });
  }

}

module.exports = RemoteWorker;
