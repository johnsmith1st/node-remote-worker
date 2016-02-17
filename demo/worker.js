'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Worker = require('..').Worker;
let logger = require('../src/Logger').DefaultLogger;


// get **host** and **port** from argv
let masterHost = argv['host'] || argv['h'] || '127.0.0.1';
let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

// init worker
let worker = new Worker({ host: masterHost, port: masterPort, logger: logger });

worker.on('open', () => {
  logger.info('connected to master: %s:%s', masterHost, masterPort);
});

// do the work dispatched from master
worker.handle('foo', (job, done) => {

  logger.info('get job from master:', job);

  setTimeout(() => {
    done(null, {
      response: 'done with ' + Date.now()
    });
  }, 2000);

});
