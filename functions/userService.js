/* eslint-disable linebreak-style */
/* eslint-disable max-len */
// eslint-disable-next-line no-unused-vars
const admin = require("firebase-admin");
const config = require("./config");
const userMapper = require("./userMapper.js");
module.exports = {

  /**
 *
 * @param {notification} notification payload to save for user *
 * @param {user} user data to save notification
 */
  updateUserNotifications: function(notification, user) {
    const db = admin.firestore();
    const usersCollection = db.collection(config.usersPath);
    user.notifications.push(notification);
    usersCollection.doc(user.uid).set(user);
  },


  getUsersList: function(collection) {
    const userList = [];
    collection.forEach((doc) => {
      const user = userMapper.mapUserSnapshot(doc);
      userList.push(user);
    });
    return userList;
  },

  getUserByToken: async function(token, userResult) {
    const db = admin.firestore();
    const usersCollection = db.collection(config.usersPath);
    const userTask = await usersCollection.where("token", "==", token).get();
    if (userTask.empty) {
      console.log("User not found :(");
    } else {
      userResult(userMapper.mapUserSnapshot(userTask.docs[0].data));
    }
  },

};
