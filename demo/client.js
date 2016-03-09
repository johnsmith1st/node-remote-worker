'use strict';

let argv = require('minimist')(process.argv.slice(2));
let Client = require('..').Client;
let logger = require('../src/Logger').DefaultLogger;

// get **host** and **port** from argv
let masterHost = argv['host'] || argv['h'] || '127.0.0.1';
let masterPort = Number.parseInt(argv['port'] || argv['p'] || '3000');

// init worker
let client = new Client({ host: masterHost, port: masterPort, logger: logger });

client.once('connected', () => {
  logger.info('client connected to master:', client.remoteEndpoint);
});

client.once('disconnected', () => {
  logger.info('client disconnected from master.');
});

client.on('error', (err) => {
  logger.error(err);
  if (err.message.match(/not open/)) {
    process.exit(0);
  }
});

client.connect();

setInterval(() => {

  let c = {
    type: 'FOO_COMMAND',
    onProgress: (ctx, p) => {
      logger.info('command (%s) progress:', ctx.id, p);
    },
    onComplete: (ctx, r) => {
      logger.info('command (%s) completed with result:', ctx.id, r);
    },
    onError: (ctx, e) => {
      logger.info('command (%s) err:', ctx.id, e);
      if (e.message.match(/not open/)) {
        process.exit(0);
      }
    }
  };
  client.publish(c);

}, 5000);
