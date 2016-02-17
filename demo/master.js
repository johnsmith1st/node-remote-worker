'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Master = require('..').Master;
let logger = require('../src/Logger').DefaultLogger;


// get **port** from argv
let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

// init master
let master = new Master({ port: masterPort, logger: logger });

master.on('WorkerOnline', (worker) => {
  logger.info('remote worker online:', worker.endpoint);
});

master.on('WorkerOffline', (worker) => {
  logger.info('remote worker offline:', worker.endpoint);
});

setInterval(() => {

  master.workers.forEach((worker) => {

    let job = { time: +Date.now(), request: 'do something' };
    logger.info('dispatch to worker %s, job:', worker.endpoint, job);

    // dispatch work to the worker
    worker
      .dispatch('foo', job)
      .then(result => {
        logger.info('job done at worker %s, result:', worker.endpoint, result);
      })
      .catch(err => {
        logger.error(err);
      });
  });

}, 5000);
