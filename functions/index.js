/* eslint-disable max-len */
const request = require("request");
const youtubeRequestUrl = "https://www.googleapis.com/youtube/v3/search";
const config = require("./config");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const podcastCollection = "Podcasts";
admin.initializeApp();

exports.newPodcast = functions.firestore.document("Podcasts/{podcastId}")
    .onCreate((snapshot, context) => {
      const data = snapshot.data();
      const podcast = getPodcastObject(data);
      return sendPodcastNotification(podcast,
          "SparkyUsers",
          `A galera do ${podcast.name} se juntou a família flow!`);
    });

exports.podcastLiveCheck = functions.pubsub
    .schedule("every 1 hours")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      console.log("This function will run every 1 hour at time zone ", config.timeZone);
      const now = admin.firestore.Timestamp.now().toDate();
      console.log("checking for lives at ", now);
      console.log("hour is ", now.getHours());
      const db = admin.firestore();
      const liveQuery = db.collection(podcastCollection)
          .where("liveTime", "==", now.getHours());
      const task = await liveQuery.get();

      task.forEach((snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          console.warn("Podcast ", podcast.name, "should be live");
          requestYoutubeLive(podcast.youtubeId, (response) => {
            sendPodcastLiveNotification(podcast, podcast.id, response);
          });
        } else {
          console.error(`No podcast scheduled for this hour ${now}`);
        }
      });
    });

exports.podcastUpdate = functions.firestore.document("Podcasts/{podcastId}")
    .onWrite((change, context) => {
      const dataSnapshot = change.after.data();
      const podcast = getPodcastObject(dataSnapshot);
      return sendPodcastNotification(podcast,
          podcast.id,
          `Tem novidade no ${podcast.name}`);
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
    "liveTime": dataSnapshot["liveTime"],
    "uploads": dataSnapshot["uploads"],
  };
  return podcast;
}

/**
 *
 * @param {object} podcast gets podcast data to send notification
 * @param {string} topic to send usersMessage
 * @param {string} message custom message sended by functions
 * @return {task} fcm notification task
 */
function sendPodcastNotification(podcast, topic, message) {
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
    "notification": {
      "icon": notIcon,
      "color": String(podcast.highLightColor),
      "title": title,
      "body": message,
      "click_action": "com.silent.sparky.features.home.HomeActivity",
    },
    "data": {
      "podcast": JSON.stringify(podcast),
    },
  };
  console.log("notification payload -> ", payLoad.notification);
  return admin.messaging().sendToTopic(topic, payLoad);
}


/**
 *
 * @param {object} podcast gets podcast data to send notification
 * @param {string} topic to send usersMessage
 * @param {string} message custom message sended by functions
 * @param {object} video retrieved from youtube api
 * @return {task} fcm notification task
 */
function sendPodcastLiveNotification(podcast, topic, message, video) {
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
    "notification": {
      "icon": notIcon,
      "color": String(podcast.highLightColor),
      "title": title,
      "body": message,
      "click_action": "com.silent.sparky.features.home.HomeActivity",
    },
    "data": {
      "podcast": JSON.stringify(podcast),
      "video": JSON.stringify(video),
    },
  };
  console.log("notification payload -> ", payLoad.notification);
  return admin.messaging().sendToTopic(topic, payLoad);
}

/**
 *
 * @param {string} videoId required to concatenate on youtube thumb url
 * @return {string} url to video thumbnail
 */
function getYoutubeThumb(videoId) {
  return `"https://img.youtube.com/vi/${videoId}/hqdefault.jpg"`;
}

/**
 *
 * @param {jsonObject} videoJson retrieved from youtube API
 * @return {videoObject} video object to append to live
 */
function getVideoObject(videoJson) {
  const video = {
    "id": videoJson.id.videoId,
    "description": videoJson.description,
    "publishedAt": videoJson.publishedAt,
    "thumbnailUrl": getYoutubeThumb(videoJson.id.videoId),
    "youtubeId": videoJson.id.videoId,
    "title": videoJson.title,
  };
  return video;
}

/**
 *
 * @param {string} youtubeId youtube channel id to perfom query
 * @param {videoObjext} responseResult video object to retrieve
 */
async function requestYoutubeLive(youtubeId, responseResult) {
  const youtubeRequest = await request
      .get(youtubeRequestUrl)
      .query({"channelId": youtubeId})
      .query({part: "snippet"})
      .query({type: "video"})
      .query({eventType: "live"})
      .query({maxResults: 1})
      .query({key: config.youtubeKey});

  console.log("Request result ->", youtubeRequest);
  if (!youtubeRequest.error && youtubeRequest.response.statusCode == 200) {
    const object = JSON.parse(youtubeRequest.body);
    if (object.items.length > 0) {
      const video = getVideoObject(object.items[0]);
      responseResult(video);
    } else {
      console.error("API didn't found any result for id ", youtubeId);
    }
  } else {
    console.log(`Error searching for live -> ${youtubeRequest.response}`);
  }
}
