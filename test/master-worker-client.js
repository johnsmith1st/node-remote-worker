'use strict';

let chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

let should = chai.should();
let Promise = require('bluebird');

let Master = require('..').Master;
let Client = require('..').Client;
let Worker = require('..').Worker;

describe('master-worker-client', function() {

  let master = new Master({ port: 3000 }),
      client = new Client({ port: 3000 }),
      workers = [0,1,2,3].map(() => new Worker({ port: 3000 }));

  let cases = {
    INTEGRATED_TEST: 'integrated'
  };

  /** handle task **/
  workers.forEach(worker => {
    worker.handle(cases.INTEGRATED_TEST, (task, done, progress) => {
      let d = task['data'], p = 0, hInterval;
      hInterval = setInterval(() => {
        p += 25;
        progress(`progress ${p}% from worker ${worker.endpoint}`);
        if (p == 100) {
          done(null, d.result);
          clearInterval(hInterval);
        }
      }, 500);
    });
  });

  /** handle commands **/
  master.execute(cases.INTEGRATED_TEST, (cmd, done, progress) => {
    Promise
      .map(master.workers, (worker, i) => {
        return new Promise((resolve, reject) => {
          let t = {
            type: cases.INTEGRATED_TEST,
            data: { result: i + 1 },
            onProgress: (ctx, p) => progress(p),
            onComplete: (ctx, r) => resolve({ task: ctx, result: r }),
            onError: (ctx, e) => reject(e)
          };
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

  before(function(done) {

    this.timeout(10 * 1000);

    master.listen(() => {

      console.log('master startup');

      /** start up worker **/
      let workerStartupAsync = Promise.map(workers, (worker) => {
        return new Promise((resolve, reject) => {
          worker.connect((err) => {
            if (err) {
              return reject(err);
            }
            console.log('worker startup');
            return resolve(1);
          });
        });
      });

      /** start up client **/
      let clientStartupAsync = new Promise((resolve, reject) => {
        client.connect((err) => {
          if (err) {
            return reject(err);
          }
          console.log('client startup');
          return resolve(1);
        });
      });

      Promise
        .all([workerStartupAsync, clientStartupAsync])
        .then(() => {
          done();
        });
    });

  });

  after(function() {
    workers.forEach(w => w.close());
    client.close();
    master.close();
  });

  it('should work well', function() {

    this.timeout(10 * 1000);

    let pro = new Promise((resolve, reject) => {
      let c = {
        type: cases.INTEGRATED_TEST,
        onProgress: (ctx, p) => console.log(p),
        onComplete: (ctx, r) => resolve(r),
        onError: (ctx, e) => reject(e)
      };
      client.publish(c);
    });

    return pro
      .then(r => {
        r.should.deep.equal([1, 2, 3, 4]);
      });
  });

});
