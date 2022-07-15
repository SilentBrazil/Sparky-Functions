const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

exports.newPodcast = functions.firestore.document("Podcasts/{podcastId}")
    .onCreate((snapshot, context) => {
      const data = snapshot.data();
      console.log("Podcast found: ", data);
      const podcast = {
        "id": data.id,
        "name": data["name"],
        "iconURL": data["iconUrl"],
      };
      return sendPodcastNotification(podcast, "SparkyUsers");
    });

exports.podcastUpdate = functions.firestore.document("Podcasts/{podcastId}")
    .onWrite((change, context) => {
      const dataSnapshot = change.after.data();
      console.log("new podcast -> ", dataSnapshot);
      const podcast = {
        "id": dataSnapshot.id,
        "name": dataSnapshot["name"],
        "iconURL": dataSnapshot["iconUrl"],
      };
      return sendPodcastNotification(podcast, podcast.id);
    });

/**
 *
 * @param {object} podcast gets podcast data to send notification
 * @param {string} topic to send usersMessage
 * @return {task} fcm notification task
 */
function sendPodcastNotification(podcast, topic) {
  const payLoad = {
    notification: {
      title: "Salve salve família!",
      body: `Tem novidade no ${podcast.name}`,
      click_action: podcast.id,
    },
  };
  return admin.messaging().sendToTopic(topic, payLoad);
}
