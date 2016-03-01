'use strict';

/**
 * Get socket local endpoint (ip:port).
 * @param socket {*} net.Socket
 * @returns {string}
 */
module.exports.getSocketLocalEndpoint = function getSocketLocalEndpoint(socket) {
  let address = socket.address();
  return `${address.address}:${address.port}`
};

/**
 * Get socket remote endpoint (ip:port).
 * @param socket {*} net.Socket
 * @returns {string}
 */
module.exports.getSocketRemoteEndpoint = function getSocketRemoteEndpoint(socket) {
  let address = (socket.remoteAddress || '').replace(/^\D+/g, '');
  let port = socket.remotePort;
  return `${address}:${port}`;
};