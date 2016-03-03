'use strict';

let EventEmitter = require('events');

let uuid = require('uuid');

let Events = require('./Events'),
    States = require('./States');

let TaskEvents = Events.TaskEvents,
    TaskStates = States.TaskStates,
    TaskPhases = States.TaskPhases;

class Task extends EventEmitter {

  /**
   * @constructor
   * @param args {*}
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
   *
   */
  constructor(args) {

    super();
    args = args || {};
    this.id = args.id || 'task:' + uuid.v4();
    this.data = Object.assign({}, args.data || {});
    this.timeout = args.timeout || 0;
    this.onProgress = args.onProgress;
    this.onComplete = args.onComplete;
    this.onError = args.onError;
    this.onTimeout = args.onTimeout;
    this.onCancelled = args.onCancelled;
    this.phase = TaskPhases.INIT;
    this.state = TaskStates.INIT;
    this.result = null;
    this.error = null;
    this.progress = [];
    this.cancellationReason = null;
    this.isCancellationRequested = false;

    if (this.timeout && this.timeout > 0) {
      setTimeout(() => {
        if (this.phase !== TaskPhases.DONE) {
          this.setTimeout();
        }
      }, this.timeout);
    }

  }

  cancel(reason) {
    this.cancellationReason = reason;
    this.isCancellationRequested = true;
    this.emit(TaskEvents.CANCEL, reason);
  }

  setProgress(progress) {
    if (this.phase === TaskPhases.DONE) return;
    this.progress.push(progress);
    this.state = TaskStates.PROGRESS;
    this.phase = TaskPhases.PROCESSING;
    if (typeof this.onProgress === 'function') this.onProgress(this, progress);
  }

  setCompleted(result) {
    if (this.phase === TaskPhases.DONE) return;
    this.result = result;
    this.state = TaskStates.COMPLETED;
    this.phase = TaskPhases.DONE;
    if (typeof this.onComplete === 'function') this.onComplete(this, result);
  }

  setError(err) {
    if (this.phase === TaskPhases.DONE) return;
    this.error = err;
    this.state = TaskStates.ERROR;
    this.phase = TaskPhases.DONE;
    if (typeof this.onError === 'function') this.onError(this, err);
  }

  setCancelled() {
    if (this.phase === TaskPhases.DONE) return;
    this.state = TaskStates.CANCELLED;
    this.phase = TaskPhases.DONE;
    if (typeof this.onCancelled === 'function') this.onCancelled(this, this.cancellationReason);
  }

  setTimeout() {
    if (this.phase === TaskPhases.DONE) return;
    this.state = TaskStates.TIMEOUT;
    this.phase = TaskPhases.DONE;
    if (typeof this.onTimeout === 'function') this.onTimeout(this);
  }

  setState(s) {
    let state = s.state;
    switch (state) {
      case TaskStates.PROGRESS:
        //console.log('on PROGRESS state');
        return this.setProgress(s.progress);
      case TaskStates.ERROR:
        //console.log('on ERROR state');
        return this.setError(s.error || Error('unknown error'));
      case TaskStates.COMPLETED:
        //console.log('on COMPLETED state');
        return this.setCompleted(s.result);
      case TaskStates.CANCELLED:
        //console.log('on CANCELLED state');
        return this.setCancelled();
      default:
        return;
    }
  }

  static serialize(task) {
    let d = {
      task: {
        id: task.id,
        data: task.data,
        state: task.state,
        timeout: task.timeout
      }
    };
    return JSON.stringify(d);
  }

  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj.task) {
        return new Task(obj.task);
      }
    }
    catch(e) { }
    return null;
  }

}

module.exports = Task;
