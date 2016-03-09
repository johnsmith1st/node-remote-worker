'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Worker = require('..').Worker;
let logger = require('../src/Logger').DefaultLogger;

// get **host** and **port** from argv
let masterHost = argv['host'] || argv['h'] || '127.0.0.1';
let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

// init worker
let worker = new Worker({ host: masterHost, port: masterPort, logger: logger });

worker.once('connected', () => {
  logger.info('worker connected to master:', worker.remoteEndpoint);
});

worker.once('disconnected', () => {
  logger.info('worker disconnected from master.');
});

worker.on('error', (err) => {
  logger.error(err);
  if (err.message.match(/not open/)) {
    process.exit(0);
  }
});

// handle task dispatched from master
worker.handle('BAR_TASK', (task, done, progress, cancel) => {

  let id = task['id'], d = task['data'], p = 0, hInterval;

  logger.info('get task (%s) from master, data:', id, d);

  hInterval = setInterval(() => {
    p += 25;
    progress(`task ${id} progress ${p}% from worker ${worker.endpoint}`);
    if (p == 100) {
      done(null, d.result);
      clearInterval(hInterval);
    }
  }, 500);

});

worker.connect();
