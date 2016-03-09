'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Promise = require('bluebird');
let Master = require('..').Master;
let logger = require('../src/Logger').DefaultLogger;

let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

let master = new Master({ port: masterPort, logger: logger });

master.on('client_online', (client) => {
  logger.info('remote client online', client.remoteEndpoint);
});

master.on('client_offline', (client) => {
  logger.info('remote client offline', client.remoteEndpoint);
});

master.on('worker_online', (worker) => {
  logger.info('remote worker online:', worker.remoteEndpoint);
});

master.on('worker_offline', (worker) => {
  logger.info('remote worker offline:', worker.remoteEndpoint);
});

// handle command send by client
master.execute('FOO_COMMAND', (cmd, done, progress, cancel) => {
  Promise
    .map(master.workers, (worker, i) => {
      return new Promise((resolve, reject) => {
        let t = {
          type: 'BAR_TASK',
          data: { result: i + 1 },
          onProgress: (ctx, p) => progress(p),
          onComplete: (ctx, r) => resolve({ task: ctx, result: r }),
          onError: (ctx, e) => reject(e)
        };
        logger.info('dispatch task to worker %s, data:', worker.remoteEndpoint, t.data);
        worker.dispatch(t);
      });
    })
    .then(r => {
      done(null, r.map(s => s.result));
    })
    .catch(err => {
      done(err);
    });
});

master.listen();
