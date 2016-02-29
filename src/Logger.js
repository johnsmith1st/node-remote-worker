'use strict';

let tracer = require('tracer');

/**
 * logger which do nothing.
 */
module.exports.NoLogger = {
  trace: () => { },
  debug: () => { },
  info:  () => { },
  warn:  () => { },
  error: () => { },
  log:   () => { }
};

module.exports.DefaultLogger = tracer.colorConsole({
  format : '[{{title}}] ({{file}}:{{line}}) {{message}}'
});
