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
    INIT: 0,
    PROCESSING: 1,
    DONE: 2
  }

};
