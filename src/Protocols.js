'use strict';

module.exports = {

  ClientProtocol: 'client-protocol',

  WorkerProtocol: 'worker-protocol',

  MasterEvents: {
    CLIENT_ONLINE: 'client_online',
    CLIENT_OFFLINE: 'client_offline',
    WORKER_ONLINE: 'worker_online',
    WORKER_OFFLINE: 'worker_offline'
  },

  ClientEvents: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error'
  },

  WorkerEvents: {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
    TASK: 'task'
  },

  ProcessEvents: {
    PROGRESS: 'progress',
    COMPLETE: 'complete',
    ERROR: 'error',
    TIMEOUT: 'timeout',
    CANCEL: 'cancel',
    CANCELLED: 'cancelled'
  },

  ProcessStates: {
    INIT: 'init',
    PROGRESS: 'progress',
    COMPLETED: 'completed',
    ERROR: 'error',
    TIMEOUT: 'timeout',
    CANCEL: 'cancel',
    CANCELLED: 'cancelled'
  },

  ProcessPhases: {
    INIT: 0,
    PROCESSING: 1,
    DONE: 2
  }

};
