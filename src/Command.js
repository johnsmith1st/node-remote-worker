'use strict';

let Process = require('./Process');

/**
 * Command is an async process, send by client, and execute by master.
 * @extends {Process}
 */
class Command extends Process {

  /**
   * @constructor
   * @param args {object}
   * @param args.type {string} command type
   * @param [args.params] {*} command params
   * @param [args.onProgress] {function(command, progress)} command progress callback
   * @param [args.onComplete] {function(command, result)} command complete callback
   * @param [args.onError] {function(command, error)} command error callback
   * @param [args.onTimeout] {function(command)} command timeout callback
   * @param [args.onCancelled] {function(command)} command cancelled callback
   */
  constructor(args) {
    super(args);
    args = args || {};
    this.type = args.type;
    this.params = Object.assign({}, args.params || {});
  }

  /**
   * Serialize command to JSON string.
   * @param command {Command}
   * @returns {string}
   */
  static serialize(command) {
    let d = {
      Command: {
        id: command.id,
        type: command.type,
        params: command.params,
        state: command.state,
        timeout: command.timeout
      }
    };
    return JSON.stringify(d);
  }

  /**
   * Deserialize command from JSON string.
   * @param s {string}
   * @returns {Command|null}
   */
  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj.Command) {
        return new Command(obj.Command);
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
    return Command.name;
  }

}

module.exports = Command;