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

  let tasks = {
    TEST_COMPLETE: 'complete',
    TEST_COMPLETE_WITH_PROGRESS: 'complete_with_progress',
    TEST_END_WITH_ERR: 'end_with_error',
    TEST_CANCEL_BY_MASTER: 'cancel_by_master',
    TEST_CANCEL_BY_CLIENT: 'cancel_by_client',
    TEST_TIMEOUT: 'timeout'
  };

  before(function(done) {

    this.timeout(10 * 1000);

    /** start up master **/
    master = new Master({ port: 3000 });
    master.listen(() => {

      console.log('master startup');

      /** start up worker **/
      worker = new Worker({ port: 3000 });

      /** setup worker handlers **/

      worker.handle(tasks.TEST_COMPLETE, (task, done) => {
        let d = task['data'];
        setTimeout(() => done(null, d.result), d.delay || 0);
      });

      worker.handle(tasks.TEST_COMPLETE_WITH_PROGRESS, (task, done, progress) => {
        let d = task['data'], p = 0, hInterval;
        hInterval = setInterval(() => {
          p += 25;
          progress(p + '%');
          if (p == 100) {
            done(null, d.result);
            clearInterval(hInterval);
          }
        }, 500);
      });

      worker.handle(tasks.TEST_END_WITH_ERR, (task, done) => {
        let d = task['data'];
        setTimeout(() => done(d.error), d.delay || 0);
      });

      worker.handle(tasks.TEST_CANCEL_BY_MASTER, (task, done, progress, cancel) => {
        task.on('cancel', (reason) => {
          cancel(reason);
        });
      });

      worker.handle(tasks.TEST_CANCEL_BY_CLIENT, (task, done, progress, cancel) => {
        setTimeout(() => cancel('cancel by worker'), 500);
      });

      worker.handle(tasks.TEST_TIMEOUT, (task, done) => {
        setTimeout(() => done('OK'), 3000);
      });

      worker.connect(() => {
        console.log('worker startup');
        done();
      });

    });

  });

  after(function() {
    worker.close();
    master.close();
  });

  it('should work', function(done) {
    done();
  });

  it('should be ok and completed', function() {

    this.timeout(10 * 1000);

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_COMPLETE,
        data: { result: 'foo', delay: 1000 },
        onComplete: (ctx, result) => resolve({ task: ctx, result: result }),
        onError: (ctx, err) => reject(err)
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

    let px = [], rx = { foo: 'foo', bar: 'bar' };

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_COMPLETE_WITH_PROGRESS,
        data: { result: rx },
        onComplete: (ctx, result) => resolve({ task: ctx, result: result }),
        onProgress: (ctx, p) => px.push(p),
        onError: (ctx, err) => reject(err)
      };

      /** dispatch task from master to worker **/
      let w = master.workers[0];
      w.dispatch(t);

    });

    return pro
      .then(r => {
        r.result.should.deep.equal(rx);
        r.task.result.should.deep.equal(rx);
        r.task.state.should.equal('completed');
        r.task.phase.should.equal(2);
        r.task.progress.should.deep.equal([ '25%', '50%', '75%', '100%' ]);
        px.should.deep.equal([ '25%', '50%', '75%', '100%' ]);
      })

  });

  it('should end with error', function() {

    this.timeout(10 * 1000);

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_END_WITH_ERR,
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

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_END_WITH_ERR,
        data: { error: err, delay: 1000 },
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
        task.error.should.be.an('object').and.deep.equal(err);
        err.should.be.an('object').and.deep.equal(err);
      });

  });

  it('should be ok to cancel task by master', function() {

    this.timeout(10 * 1000);


    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_CANCEL_BY_MASTER,
        onComplete: () => reject('should not be completed'),
        onCancelled: (ctx) => resolve(ctx)
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

  it('should be ok to cancel task by worker', function() {

    this.timeout(10 * 1000);

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_CANCEL_BY_CLIENT,
        onComplete: () => reject('should not be completed'),
        onCancelled: (ctx) => resolve(ctx)
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

    let pro = new Promise((resolve, reject) => {

      /** prepare task **/
      let t = {
        type: tasks.TEST_TIMEOUT,
        timeout: 2000,
        onComplete: () => reject('should not be completed'),
        onTimeout: (ctx) => resolve(ctx)
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