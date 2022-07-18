const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.newPodcast = functions.firestore.document("Podcasts/{podcastId}")
    .onCreate((snapshot, context) => {
      const data = snapshot.data();
      const podcast = getPodcastObject(data);
      return sendPodcastNotification(podcast, "SparkyUsers");
    });

exports.podcastUpdate = functions.firestore.document("Podcasts/{podcastId}")
    .onWrite((change, context) => {
      const dataSnapshot = change.after.data();
      const podcast = getPodcastObject(dataSnapshot);
      return sendPodcastNotification(podcast, podcast.id);
    });
/**
 *
 * @param {snapshot} dataSnapshot retrieved from firestore
 * @return {podcast} podcast object
 */
function getPodcastObject(dataSnapshot) {
  const podcast = {
    "id": dataSnapshot.id,
    "name": dataSnapshot["name"],
    "iconURL": dataSnapshot["iconUrl"],
    "slogan": dataSnapshot["slogan"],
    "notificationIcon": dataSnapshot["notificationIcon"],
    "highLightColor": dataSnapshot["highLightColor"],
  };
  return podcast;
}

/**
 *
 * @param {object} podcast gets podcast data to send notification
 * @param {string} topic to send usersMessage
 * @return {task} fcm notification task
 */
function sendPodcastNotification(podcast, topic) {
  let notIcon = "sparky_icon";
  let title = "Salve Salve família";
  console.log("Podcast: ", podcast);
  if (podcast.slogan) {
    title = podcast.slogan;
  }
  if (podcast.notificationIcon) {
    notIcon = podcast.notificationIcon;
  }
  const payLoad = {
    notification: {
      icon: notIcon,
      color: String(podcast.highLightColor),
      title: title,
      body: `Tem novidade no ${podcast.name}`,
      click_action: podcast.id,
    },
  };
  return admin.messaging().sendToTopic(topic, payLoad);
}
