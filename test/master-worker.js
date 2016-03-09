'use strict';

let chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

let should = chai.should();
let Promise = require('bluebird');

let Master = require('..').Master;
let Worker = require('..').Worker;

describe('master-worker', function() {

  let master, worker;

  before(function(done) {

    this.timeout(10 * 1000);

    /** start up master **/
    master = new Master({ port: 3000 });
    master.listen(() => {

      console.log('master startup');

      /** start up worker **/
      worker = new Worker({ port: 3000 });
      worker.connect(() => {

        console.log('worker startup');
        done();
      });

    });

  });

  beforeEach(function() {
    worker.removeAllListeners('task');
  });

  it('should work like a charm', function(done) {
    done();
  });

  it('should be ok and completed', function() {

    this.timeout(10 * 1000);

    /** setup task handler for worker **/
    worker.on('task', (task, done) => {

      let d = task.data;

      setTimeout(() => done(null, d.result), d.delay || 0);

    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        data: { result: 'foo', delay: 1000 },
        onComplete: (t, result) => {
          resolve({ task: t, result: result });
        },
        onError: (t, err) => {
          reject(err);
        }
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(r => {
        r.result.should.equal('foo');
        r.task.result.should.equal('foo');
        r.task.state.should.equal('completed');
        r.task.phase.should.equal(2);
      });

  });

  it('should be ok and completed with progress', function() {

    this.timeout(10 * 1000);

    let px = [];

    /** setup task handler for worker **/
    worker.on('task', (task, done, progress) => {

      let d = task.data, prog = 0, hInterval;

      hInterval = setInterval(() => {
        prog += 25;
        progress(prog + '%');

        if (prog == 100) {
          done(null, d.result);
          clearInterval(hInterval);
        }
      }, 500);

    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        data: { result: 'foo' },
        onComplete: (t, result) => {
          resolve({ task: t, result: result });
        },
        onProgress: (t, p) => {
          px.push(p);
        },
        onError: (t, err) => {
          reject(err);
        }
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(r => {
        r.result.should.equal('foo');
        r.task.result.should.equal('foo');
        r.task.state.should.equal('completed');
        r.task.phase.should.equal(2);
        r.task.progress.should.deep.equal([ '25%', '50%', '75%', '100%' ]);
        px.should.deep.equal([ '25%', '50%', '75%', '100%' ]);
      })

  });

  it('should end with error', function() {

    this.timeout(10 * 1000);

    /** setup task handler for worker **/
    worker.on('task', (task, done) => {

      let d = task.data;

      setTimeout(() => done(d.error), d.delay || 0);

    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        data: {
          error: 'task should end with error',
          delay: 1000
        },
        onComplete: () => reject('should not be completed'),
        onError: (ctx, err) => resolve({ task: ctx, error: err })
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(r => {

        let task = r.task, err = r.error;

        task.state.should.equal('error');
        task.phase.should.equal(2);
        task.error.should.be.an('object');
        task.error.message.should.equal('task should end with error');

        err.should.be.an('object');
        err.message.should.equal('task should end with error');
      });

  });

  it('should end with complicated error', function() {

    this.timeout(10 * 1000);

    let err = {
      error: 'too bad',
      detail: 'check message for detail',
      message: 'task should end with complicated error',
      code: '500'
    };

    /** setup task handler for worker **/
    worker.on('task', (task, done) => {

      let d = task.data;

      setTimeout(() => done(d.error), d.delay || 0);

    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        data: { error: err, delay: 1000 },
        onComplete: () => reject('should not be completed'),
        onError: (t, err) => resolve({ task: t, error: err })
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(r => {
        let task = r.task, err = r.error;
        task.state.should.equal('error');
        task.phase.should.equal(2);
        task.error.should.be.an('object').and.deep.equal(err);
        err.should.be.an('object').and.deep.equal(err);
      });

  });

  it('should be ok to cancel task by master', function() {

    this.timeout(10 * 1000);

    /** setup task handler for worker **/
    worker.on('task', (task, done, progress, cancel) => {
      task.on('cancel', (reason) => {
        cancel(reason);
      });
    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        onComplete: () => reject('should not be completed'),
        onCancelled: (t) => resolve(t)
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      let task = w.dispatch(t);

      setTimeout(() => task.cancel('just cancel it'), 1000);

    });

    return pro
      .then(t => {
        t.state.should.equal('cancelled');
        t.phase.should.equal(2);
        t.isCancellationRequested.should.be.true;
        t.cancellationReason.should.equal('just cancel it');
      });
  });

  it('should be ok to cancel task by worker', function () {

    this.timeout(10 * 1000);

    /** setup task handler for worker **/
    worker.on('task', (task, done, progress, cancel) => {
      setTimeout(() => cancel('cancel by worker'), 500);
    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        onComplete: () => reject('should not be completed'),
        onCancelled: (t) => resolve(t)
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(t => {
        t.state.should.equal('cancelled');
        t.phase.should.equal(2);
        t.isCancellationRequested.should.be.false;
      });
  });

  it('should timeout', function() {

    this.timeout(10 * 1000);

    /** setup task handler for worker **/
    worker.on('task', (task, done) => {
      setTimeout(() => done('OK?'), 3000);
    });

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        timeout: 2000,
        onComplete: () => reject('should not be completed'),
        onTimeout: (t) => resolve(t)
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(t => {
        t.state.should.equal('timeout');
        t.phase.should.equal(2);
      });

  });

});