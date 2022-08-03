/* eslint-disable max-len */
const request = require("request");
const config = require("./config");
const youtubeService = require("./youtubeservice");
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
      const now = admin.firestore.Timestamp.now().toDate();
      const convertedTimezone = now.toLocaleString("pt-br", {hour: "numeric", hour12: false, timeZone: config.timeZone});
      console.log("server date is ", now);
      console.log("local time is ", convertedTimezone);
      const convertedHour = parseInt(convertedTimezone);
      console.log("checking for lives at: ", convertedHour);
      const db = admin.firestore();
      const liveQuery = db.collection(podcastCollection)
          .where("liveTime", "==", convertedHour);
      const task = await liveQuery.get();
      if (task.empty) {
        console.error(`No podcast scheduled for this hour ${convertedHour}`);
      } else {
        task.forEach((snapshot) => {
          if (snapshot.exists) {
            const podcast = getPodcastObject(snapshot.data());
            console.warn("Podcast ", podcast.name, "should be live");
            requestYoutubeLive(podcast.youtubeId, (video) => {
              const title = video.title;
              sendPodcastLiveNotification(podcast, podcast.id, `Estamos ao vivo com ${title}`, video);
            });
          }
        });
      }
    });


exports.updateEpisodes = functions.pubsub.schedule("30 00 * * *")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      const db = admin.firestore();
      const podcastCollection = db.collection(config.podcastPath);
      const videoCollection = db.collection(config.episodesPath);
      const podcastsTask = await podcastCollection.orderBy("subscribe").get();
      podcastsTask.forEach((snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          youtubeService.requestPlaylist(podcast.uploads, (videos) => {
            console.log("Retrieving ", videos.length, " videos.");
            videos.forEach((video) => {
              video.podcastId = podcast.id;
              const timestampDate = new Date(video.publishDate);
              delete video.publishDate;
              console.log("timestamp date => ", timestampDate);
              video.publishedAt = admin.firestore.Timestamp.fromDate(timestampDate);
              videoCollection.doc(video.id).set(video);
            });
            sendPodcastNotification(podcast, podcast.id, `Novos episódios no ${podcast.name}`);
          });
        } else {
          console.error("Snapshot not found!");
        }
      });
    });

exports.updateCuts = functions.pubsub.schedule("30 05 * * *")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      const db = admin.firestore();
      const podcastCollection = db.collection(config.podcastPath);
      const cutCollection = db.collection(config.cutsPath);
      const podcastsTask = await podcastCollection.orderBy("subscribe").get();
      podcastsTask.forEach((snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          youtubeService.requestPlaylist(podcast.cuts, (videos) => {
            console.log("Retrieving ", videos.length, " videos.");
            videos.forEach((video) => {
              video.podcastId = podcast.id;
              const timestampDate = new Date(video.publishDate);
              delete video.publishDate;
              console.log("timestamp date => ", timestampDate);
              video.publishedAt = admin.firestore.Timestamp.fromDate(timestampDate);
              cutCollection.doc(video.id).set(video);
            });
            sendPodcastNotification(podcast, podcast.id, `Novos cortes no ${podcast.name}`);
          });
        } else {
          console.error("Snapshot not found!");
        }
      });
    });

exports.podcastUpdate = functions.firestore.document("Podcasts/{podcastId}")
    .onWrite((change, context) => {
      const snapshot = change.after.data();
      const podcast = getPodcastObject(snapshot);
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
    "id": dataSnapshot["id"],
    "name": dataSnapshot["name"],
    "iconURL": dataSnapshot["iconURL"],
    "slogan": dataSnapshot["slogan"],
    "notificationIcon": dataSnapshot["notificationIcon"],
    "highLightColor": dataSnapshot["highLightColor"],
    "liveTime": dataSnapshot["liveTime"],
    "uploads": dataSnapshot["uploads"],
    "cuts": dataSnapshot["cuts"],
    "youtubeId": dataSnapshot["youtubeID"],
  };
  console.log("Podcast => ", JSON.stringify(podcast));
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
  console.log("notification payload -> ", JSON.stringify(payLoad.notification));
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
  console.log("live notification payload -> ", JSON.stringify(payLoad.notification));
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
    "description": videoJson.snippet.description,
    "publishedAt": videoJson.snippet.publishedAt,
    "thumbnailUrl": getYoutubeThumb(videoJson.id.videoId),
    "youtubeId": videoJson.id.videoId,
    "title": videoJson.snippet.title,
  };
  return video;
}

/**
 *
 * @param {string} youtubeId youtube channel id to perfom query
 * @param {videoObjext} responseResult video object to retrieve
 */
async function requestYoutubeLive(youtubeId, responseResult) {
  const queryString = `?part=snippet&channelId=${youtubeId}&type=video&eventType=live&maxResults=1&key=${config.youtubeKey}`;
  const options = {
    path: "search" + queryString,
    method: "GET",
  };
  const requestURl = config.youtubeApiURl + options.path;
  console.log("requesting =>", requestURl);
  const youtubeRequest = request.get(requestURl, function(error, response, body) {
    console.log("error:", error);
    console.log("statusCode:", response && response.statusCode);

    const object = JSON.parse(body);
    if (object.items.length > 0) {
      const videoObject = getVideoObject(object.items[0]);
      responseResult(videoObject);
    } else {
      console.error("No live founded for => ", youtubeId);
    }
  });
  youtubeRequest.end();
}
