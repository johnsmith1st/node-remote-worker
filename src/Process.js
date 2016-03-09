'use strict';

let EventEmitter = require('events');
let uuid = require('uuid');
let protocols = require('./protocols');

let ProcessEvents = protocols.ProcessEvents,
    ProcessStates = protocols.ProcessStates,
    ProcessPhases = protocols.ProcessPhases;

/**
 * @extends {EventEmitter}
 */
class Process extends EventEmitter {

  /**
   * @constructor
   * @param args {*}
   * @param [args.id] {string} id of process
   * @param [args.timeout] {number} set process timeout in milliseconds
   * @param [args.onProgress] {function(process, progress)} process progress callback
   * @param [args.onComplete] {function(process, result)} process complete callback
   * @param [args.onError] {function(process, error)} process error callback
   * @param [args.onTimeout] {function(process)} process timeout callback
   * @param [args.onCancelled] {function(process)} process cancelled callback
   */
  constructor(args) {
    super();
    args = args || {};
    this.id = args.id || this._genId();
    this.timeout = args.timeout || 0;
    this.phase = ProcessPhases.INIT;
    this.state = ProcessStates.INIT;
    this.result = null;
    this.error = null;
    this.progress = [];
    this.cancellationReason = null;
    this.isCancellationRequested = false;
    this._pubState = 0;

    /** set callback handlers **/
    this.onProgress = args.onProgress;
    this.onComplete = args.onComplete;
    this.onError = args.onError;
    this.onTimeout = args.onTimeout;
    this.onCancelled = args.onCancelled;

    /** set timeout **/
    if (this.timeout && this.timeout > 0) {
      setTimeout(() => {
        if (this.phase !== ProcessPhases.DONE) {
          this.setTimeout();
        }
      }, this.timeout);
    }
  }

  /**
   * Cancel the process.
   * @param reason {string}
   */
  cancel(reason) {
    this.cancellationReason = reason;
    this.isCancellationRequested = true;
    this.emit(ProcessEvents.CANCEL, reason);
  }

  /**
   * Set process to progress state.
   * @param progress {*}
   */
  setProgress(progress) {
    if (this.phase === ProcessPhases.DONE) return;
    this.progress.push(progress);
    this.state = ProcessStates.PROGRESS;
    this.phase = ProcessPhases.PROCESSING;

    /** emit progress event **/
    if (typeof this.onProgress === 'function') this.onProgress(this, progress);
    else this.emit(ProcessEvents.PROGRESS, progress);
  }

  /**
   * Set process to complete state.
   * @param result {*}
   */
  setCompleted(result) {
    if (this.phase === ProcessPhases.DONE) return;
    this.result = result;
    this.state = ProcessStates.COMPLETED;
    this.phase = ProcessPhases.DONE;

    /** emit completed event **/
    if (typeof this.onComplete === 'function') this.onComplete(this, result);
    else this.emit(ProcessEvents.TEST_COMPLETE, result);
  }

  /**
   * Set process to error state.
   * @param err {*}
   */
  setError(err) {
    if (this.phase === ProcessPhases.DONE) return;
    this.error = err;
    this.state = ProcessStates.ERROR;
    this.phase = ProcessPhases.DONE;

    /** emit error event **/
    if (typeof this.onError === 'function') {
      return this.onError(this, err);
    }
    if (this._pubState === 1) {
      return this.emit(ProcessEvents.ERROR, err);
    }
  }

  /**
   * Set process to cancelled state.
   */
  setCancelled() {
    if (this.phase === ProcessPhases.DONE) return;
    this.state = ProcessStates.CANCELLED;
    this.phase = ProcessPhases.DONE;

    /** emit cancelled event **/
    if (typeof this.onCancelled === 'function') this.onCancelled(this, this.cancellationReason);
    else this.emit(ProcessEvents.CANCELLED, this.cancellationReason);
  }

  /**
   * Set process to timeout state.
   */
  setTimeout() {
    if (this.phase === ProcessPhases.DONE) return;
    this.state = ProcessStates.TIMEOUT;
    this.phase = ProcessPhases.DONE;
    if (typeof this.onTimeout === 'function') this.onTimeout(this);
    else this.emit(ProcessEvents.TIMEOUT);
  }

  /**
   * Update process state.
   * @param s {object}
   */
  setState(s) {
    let state = s.state;
    switch (state) {
      case ProcessStates.PROGRESS:
        //console.log('set async process state: PROGRESS');
        return this.setProgress(s.progress);
      case ProcessStates.ERROR:
        //console.log('set async process state: ERROR');
        return this.setError(s.error || Error('unknown error'));
      case ProcessStates.COMPLETED:
        //console.log('set async process state: COMPLETED');
        return this.setCompleted(s.result);
      case ProcessStates.CANCELLED:
        //console.log('set async process state: CANCELLED');
        return this.setCancelled();
      default:
        return;
    }
  }

  /**
   * @type {string}
   */
  get className() {
    return Process.name;
  }

  /**
   * @returns {string}
   * @private
   */
  _genId() {
    return `${this.className}:${uuid.v4()}`;
  }

}

module.exports = Process;