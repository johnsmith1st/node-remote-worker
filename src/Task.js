'use strict';

let Process = require('./Process');

/**
 * Task is an async process, send by master, and execute by worker.
 * @extends {Process}
 */
class Task extends Process {

  /**
   * @constructor
   * @param args {object}
   * @param [args.data] {object} task data
   * @param [args.timeout] {object} set task timeout
   * @param [args.onProgress] {function(task, progress)} task progress callback
   * @param [args.onComplete] {function(task, result)} task complete callback
   * @param [args.onError] {function(task, error)} task error callback
   * @param [args.onTimeout] {function(task)} task timeout callback
   * @param [args.onCancelled] {function(task)} task cancelled callback
   */
  constructor(args) {
    args = args || {};
    super(args);
    this.data = Object.assign({}, args.data || {});
  }

  /**
   * Serialize task to JSON string.
   * @param task {Task}
   * @returns {string}
   */
  static serialize(task) {
    let d = {
      Task: {
        id: task.id,
        data: task.data,
        state: task.state,
        timeout: task.timeout
      }
    };
    return JSON.stringify(d);
  }

  /**
   * Deserialize task from JSON string.
   * @param s {string}
   * @returns {Task|null}
   */
  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj.Task) {
        return new Task(obj.Task);
      }
    }
    catch(e) { }
    return null;
  }

  /**
   * @type {string}
   * @override
   */
  get className() {
    return Task.name;
  }

}

module.exports = Task;
