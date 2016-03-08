'use strict';

/**
 * A notification is a kind of event that send by master and handle by client.
 */
class Notification {

  /**
   * @constructor
   * @param event {string}
   * @param data {object}
   */
  constructor(event, data) {
    this.event = event;
    this.data = data;
  }

  /**
   * Serialize notification to JSON string.
   * @param n {Notification}
   * @returns {string}
   */
  static serialize(n) {
    let d = {
      Notification: {
        event: n.event,
        data: n.data
      }
    };
    return JSON.stringify(d);
  }

  /**
   * Deserialize notification from JSON string.
   * @param s {string}
   * @returns {Notification|null}
   */
  static deserialize(s) {
    try {
      let obj = JSON.parse(s);
      if (obj && obj.Notification) {
        return new Notification(obj.Notification.event, obj.Notification.data);
      }
    }
    catch(e) { }
    return null;
  }

}

module.exports = Notification;
