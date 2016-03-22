'use strict';

let ProcessStates = require('./Protocols').ProcessStates;

class ProcessState {

  /**
   * @constructor
   * @param s {object}
   * @param s.id {string} process id
   * @param s.state {string} process state
   * @param s.stateType {string} process state type
   * @param [s.progress] {*} process progress data
   * @param [s.error] {*} process error data
   * @param [s.result] {*} process result data
   * @param [s.reason] {string} process cancel reason
   */
  constructor(s) {
    this._stateType = s.stateType || 'ProcessState';
    this.id = s.id;
    this.state = s.state;
    if (s.progress) this.progress = s.progress;
    if (s.error) this.error = s.error;
    if (s.result) this.result = s.result;
    if (s.reason) this.reason = s.reason;
  }

  /**
   * Serialize process state to JSON string.
   * @params s {ProcessState}
   * @returns {string}
   */
  static serialize(s) {

    let state = s.state;
    let sta = { id: s.id, state: s.state };

    switch (state) {
      case ProcessStates.PROGRESS:
        sta.progress = s.progress;
        break;
      case ProcessStates.COMPLETED:
        sta.result = s.result;
        break;
      case ProcessStates.ERROR:
        var err = s.error;
        if (typeof err === 'string') err = { message: err };
        if (err instanceof Error) err = { message: err.message };
        sta.error = err;
        break;
      case ProcessStates.CANCEL:
        sta.reason = s.reason;
        break;
      default:
        break;
    }

    let d = { };
    d[s._stateType] = sta;

    return JSON.stringify(d);
  }

  /**
   * Create progress state of process.
   * @param p {Process}
   * @param progress {*}
   * @returns {ProcessState}
   */
  static createProgressState(p, progress) {
    return new ProcessState({
      stateType: p.className + 'State',
      id: p.id,
      state: ProcessStates.PROGRESS,
      progress: progress
    });
  }

  /**
   * Create complete state of process.
   * @param p {Process}
   * @param result {*}
   * @returns {ProcessState}
   */
  static createCompleteState(p, result) {
    return new ProcessState({
      stateType: p.className + 'State',
      id: p.id,
      state: ProcessStates.COMPLETED,
      result: result
    });
  }

  /**
   * Create error state of process.
   * @param p {Process}
   * @param error {*}
   * @returns {ProcessState}
   */
  static createErrorState(p, error) {
    return new ProcessState({
      stateType: p.className + 'State',
      id: p.id,
      state: ProcessStates.ERROR,
      error: error
    });
  }

  /**
   * Create cancel state of process.
   * @param p {Process}
   * @param reason {string}
   * @returns {ProcessState}
   */
  static createCancelState(p, reason) {
    return new ProcessState({
      stateType: p.className + 'State',
      id: p.id,
      state: ProcessStates.CANCEL,
      reason: reason
    });
  }

  /**
   * Create cancelled state of process.
   * @param p {Process}
   * @returns {ProcessState}
   */
  static createCancelledState(p) {
    return new ProcessState({
      stateType: p.className + 'State',
      id: p.id,
      state: ProcessStates.CANCELLED
    });
  }

}

module.exports = ProcessState;
