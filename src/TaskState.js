'use strict';

let ProcessState = require('./ProcessState');

/**
 * @extends {ProcessState}
 */
class TaskState extends ProcessState {

  /**
   * @constructor
   * @param s {object}
   * @param s.id {string} task id
   * @param s.state {string} task state
   * @param [s.progress] {*} task progress data
   * @param [s.error] {*} task error data
   * @param [s.result] {*} task result data
   * @param [s.reason] {string} task cancel reason
   */
  constructor(s) {
    super(s);
    this._stateType = 'TaskState';
  }

  /**
   * Deserialize string to task state object.
   * @param s {string}
   * @return {TaskState}
   */
  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj[TaskState.name]) {
        return new TaskState(obj[TaskState.name]);
      }
    }
    catch(e) { }
    return null;
  }

}

module.exports = TaskState;
