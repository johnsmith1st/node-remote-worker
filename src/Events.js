'use strict';

module.exports = {

  MasterEvents: {
    WORKER_ONLINE: 'worker_online',
    WORKER_OFFLINE: 'worker_offline'
  },

  WorkerEvents: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    TASK: 'task'
  },

  TaskEvents: {
    PROGRESS: 'progress',
    COMPLETE: 'completed',
    ERROR: 'error',
    TIMEOUT: 'timeout',
    CANCEL: 'cancel',
    CANCELLED: 'cancelled'
  }

};