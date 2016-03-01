'use strict';

module.exports = {

  TaskStates: {
    INIT: 'init',
    PROGRESS: 'progress',
    COMPLETED: 'completed',
    ERROR: 'error',
    TIMEOUT: 'timeout',
    CANCEL: 'cancel',
    CANCELLED: 'cancelled'
  },

  TaskPhases: {
    INIT: 'init',
    PROCESSING: 'processing',
    DONE: 'done'
  }

};
