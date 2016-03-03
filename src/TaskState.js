'use strict';

let TaskStates = require('./States').TaskStates;

class TaskState {

  /**
   * @constructor
   * @param s {object}
   */
  constructor(s) {
    this.taskId = s.taskId;
    this.state = s.state;
    this.progress = s.progress;
    this.error = s.error;
    this.result = s.result;
    this.reason = s.reason;
  }

  /**
   * Serialize task state object to string.
   * @params s {TaskState}
   * @returns {string}
   */
  static serialize(s) {

    let state = s.state;
    let ts = { taskId: s.taskId, state: s.state };

    switch (state) {
      case TaskStates.PROGRESS:
        ts.progress = s.progress;
        break;
      case TaskStates.COMPLETED:
        ts.result = s.result;
        break;
      case TaskStates.ERROR:
        var err = s.error;
        if (typeof err === 'string') err = { message: err };
        if (err instanceof Error) err = { message: err.message };
        ts.error = err;
        break;
      case TaskStates.CANCEL:
        ts.reason = s.reason;
        break;
      default:
        break;
    }

    let d = { taskState: ts };

    return JSON.stringify(d);
  }

  /**
   * Deserialize string to task state object.
   * @param s {string}
   * @return {TaskState}
   */
  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj.taskState) {
        return new TaskState(obj.taskState);
      }
    }
    catch(e) { }
    return null;
  }

  static createProgressState(task, progress) {
    return new TaskState({ taskId: task.id, state: TaskStates.PROGRESS, progress: progress });
  }

  static createCompleteState(task, result) {
    return new TaskState({ taskId: task.id, state: TaskStates.COMPLETED, result: result });
  }

  static createErrorState(task, error) {
    return new TaskState({ taskId: task.id, state: TaskStates.ERROR, error: error });
  }

  static createCancelState(task, reason) {
    return new TaskState({ taskId: task.id, state: TaskStates.CANCEL, reason: reason });
  }

  static createCancelledState(task) {
    return new TaskState({ taskId: task.id, state: TaskStates.CANCELLED });
  }

}

module.exports = TaskState;