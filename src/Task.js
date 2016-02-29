'use strict';

let EventEmitter = require('events');

let uuid = require('uuid');

class Task extends EventEmitter {

  constructor(data) {
    super();
    data = data || {};
    this._id = data['_taskId'] || uuid.v4();
    this._data = data;
  }

  toJSON() {
    var d = Object.assign({}, this._data, { _taskId: this._id });
    return JSON.stringify(d);
  }

}

module.exports = Task;
