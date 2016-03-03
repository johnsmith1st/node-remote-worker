'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Worker = require('..').Worker;
let logger = require('../src/Logger').DefaultLogger;


// get **host** and **port** from argv
let masterHost = argv['host'] || argv['h'] || '127.0.0.1';
let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

// init worker
let worker = new Worker({ host: masterHost, port: masterPort, logger: logger });

worker.on('connected', () => {
  logger.info('connected to master:', worker.remoteEndpoint);
});

worker.on('disconnected', () => {
  logger.info('disconnected from master.');
});

worker.on('error', (err) => {
  logger.error(err);
});

// handle task dispatched from master
worker.on('task', (task) => {

  logger.info('get task from master:', task);

  setTimeout(() => {
    let result = { response: 'done with ' + Date.now() };
    task.complete(result);
  }, 2000);

});

worker.connect();
