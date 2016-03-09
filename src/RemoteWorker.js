'use strict';

let EventEmitter = require('events');

let protocols = require('./protocols'),
    Task = require('./Task'),
    TaskState = require('./TaskState'),
    Utils = require('./Utils'),
    Logger = require('./Logger');

let WorkerEvents = protocols.WorkerEvents,
    ProcessEvents = protocols.ProcessEvents;

/**
 * Worker endpoint host by master server.
 * @extends {EventEmitter}
 */
class RemoteWorker extends EventEmitter {

  /**
   * @constructor
   * @param ws {*} ws.WebSocket
   * @param opts {*}
   * @param [opts.logger] logger to write log
   */
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
   * @param t {object}
   * @param t.data {object}
   * @param [t.timeout] {number}
   * @param [t.onProgress] {function(task, progress)}
   * @param [t.onCompleted] {function(task, result)}
   * @param [t.onError] {function(task, error)}
   * @param [t.onTimeout] {function(task)}
   * @param [t.onCancelled] {function(task)}
   * @returns {Task}
   */
  dispatch(t) {

    let task = new Task(t);
    task._pubState = 1;

    /** signal cancel task **/
    task.once(ProcessEvents.CANCEL, (reason) => {

      let state = TaskState.createCancelState(task, reason);
      let stateStr = TaskState.serialize(state);

      /** send cancel state to remote worker **/
      this._ws.send(stateStr, (err) => {
        if (err) {
          this._logger.error(err);
          task.setCancelled();
        }
      });

    });

    /** handle state changed **/
    this._em.on(task.id, (taskState) => {
      task.setState(taskState);
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
   * @type {string}
   */
  get endpoint() {
    return this._ws && this._ws._socket
      ? Utils.getSocketLocalEndpoint(this._ws._socket)
      : undefined;
  }

  /**
   * Get worker remote endpoint.
   * @type {string}
   */
  get remoteEndpoint() {
    return this._ws && this._ws._socket
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
      if (flags.binary) return;
      let taskState = TaskState.deserialize(data);
      if (taskState) this._em.emit(taskState.id, taskState);
    });
  }

}

module.exports = RemoteWorker;
