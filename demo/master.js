'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Master = require('..').Master;
let logger = require('../src/Logger').DefaultLogger;

let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

let master = new Master({ port: masterPort, logger: logger });

master.once('worker_online', (worker) => {
  logger.info('remote worker online:', worker.remoteEndpoint);
});

master.once('worker_offline', (worker) => {
  logger.info('remote worker offline:', worker.remoteEndpoint);
});

setInterval(() => {

  master.workers.forEach((worker) => {

    let t = {
      data: {
        time: +Date.now(),
        request: 'do something'
      },
      onComplete: (t, result) => {
        logger.info('task (%s) completed with:', t.id, result);
      }
    };
    logger.info('dispatch to worker %s, task:', worker.remoteEndpoint, t.data);

    // dispatch task to the worker
    worker.dispatch(t);

  });

}, 5000);

master.listen();
