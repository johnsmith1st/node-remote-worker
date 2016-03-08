'use strict';

let ProcessState = require('./ProcessState');

/**
 * @extends {ProcessState}
 */
class CommandState extends ProcessState {

  /**
   * @constructor
   * @param s {object}
   * @param s.id {string} command id
   * @param s.state {string} command state
   * @param [s.progress] {*} command progress data
   * @param [s.error] {*} command error data
   * @param [s.result] {*} command result data
   * @param [s.reason] {string} command cancel reason
   */
  constructor(s) {
    super(s);
    this._stateType = 'CommandState';
  }

  /**
   * Deserialize string to command state object.
   * @param s {string}
   * @return {CommandState}
   */
  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj[CommandState.name]) {
        return new CommandState(obj[CommandState.name]);
      }
    }
    catch(e) { }
    return null;
  }

}

module.exports = CommandState;
