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
    this.phase = TaskPhases.INIT;
    this.state = TaskStates.INIT;
    this.result = null;
    this.progress = null;
    this.cancellationReason = null;
    this.isCancellationRequested = false;

    let onProgress = args['onProgress'],
        onComplete = args['onComplete'],
        onError = args['onError'],
        onTimeout = args['onTimeout'],
        onCancelled = args['onCancelled'];

    if (typeof onProgress === 'function') {
      this.on(TaskEvents.PROGRESS, progress => onProgress(this, progress));
    }

    if (typeof onComplete === 'function') {
      this.on(TaskEvents.COMPLETE, result => onComplete(this, result));
    }

    if (typeof onError === 'function') {
      this.on(TaskEvents.ERROR, err => onError(this, err));
    }

    if (typeof onTimeout === 'function') {
      this.on(TaskEvents.TIMEOUT, () => onTimeout(this));
    }

    if (typeof onCancelled === 'function') {
      this.on(TaskEvents.CANCELLED, () => onCancelled(this));
    }

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
    this.progress = progress;
    this.state = TaskStates.PROGRESS;
    this.phase = TaskPhases.PROCESSING;
    this.emit(TaskEvents.PROGRESS, progress);
  }

  setCompleted(result) {
    this.result = result;
    this.state = TaskStates.COMPLETED;
    this.phase = TaskPhases.DONE;
    this.emit(TaskEvents.COMPLETED, result);
  }

  setError(err) {
    this.error = err;
    this.state = TaskStates.ERROR;
    this.phase = TaskPhases.DONE;
    this.emit(TaskEvents.ERROR, err);
  }

  setTimeout() {
    this.state = TaskStates.TIMEOUT;
    this.phase = TaskPhases.DONE;
    this.emit(TaskEvents.TIMEOUT);
  }

  setCancelled() {
    this.state = TaskStates.CANCELLED;
    this.phase = TaskPhases.DONE;
    this.emit(TaskEvents.CANCEL);
  }

  updateState(s) {
    let state = s.state;
    switch (state) {
      case TaskStates.PROGRESS:
        return this.setProgress(s.progress);
      case TaskStates.ERROR:
        return this.setError(Error(s.error || 'unknown error'));
      case TaskStates.COMPLETED:
        return this.setCompleted(s.result);
      case TaskStates.CANCELLED:
        return this.setCancelled();
      default:
        return;
    }
  }

  static serialize(task) {
    let d = {
      task: {
        taskId: task.id,
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
