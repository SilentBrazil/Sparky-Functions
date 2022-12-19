/* eslint-disable linebreak-style */
/* eslint-disable max-len */

module.exports = {

  /**
 *
 * @param {snapshot} dataSnapshot retrieved from firestore
 * @return {user} user object
 */
  mapUserSnapshot: function(dataSnapshot) {
    const user = {
      "name": dataSnapshot["name"],
      "uid": dataSnapshot["uid"],
      "token": dataSnapshot["token"],
      "notifications": dataSnapshot["notifications"],
      "notificationsSettings": dataSnapshot["notificationsSettings"],
    };
    return user;
  },
};
