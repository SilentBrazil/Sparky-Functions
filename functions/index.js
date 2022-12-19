/* eslint-disable max-len */
const capitalize = require("capitalize");
const config = require("./config");
const youtubeService = require("./youtubeservice");
const notificationService = require("./notificationService");
const userService = require("./userService");
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const userMapper = require("./userMapper");
const podcastCollection = "Podcasts";
const sleep = (waitTimeInMs) => new Promise((resolve) => setTimeout(resolve, waitTimeInMs));
admin.initializeApp();

exports.newPodcast = functions.firestore.document("Podcasts/{podcastId}")
    .onCreate((snapshot, context) => {
      const data = snapshot.data();
      const podcast = getPodcastObject(data);
      let notIcon = "sparky_icon";
      let title = "Salve Salve família";
      const message = `A galera do ${podcast.name} se juntou a família flow!`;
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
          "body": message.replace("undefined", ""),
          "click_action": "com.silent.sparky.features.home.HomeActivity",
        },
        "data": {
          "podcast": JSON.stringify(podcast),
        },
      };
      return admin.messaging().sendToTopic("SparkyUsers", payLoad);
    });

exports.podcastLiveCheck = functions.pubsub
    .schedule("30 12-20/1 * * 1-6")
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
            youtubeService.requestLive(podcast.youtubeId, async (video) => {
              const videoCollection = db.collection(config.episodesPath);
              video.podcastId = podcast.id;
              video.publishedAt = admin.firestore.Timestamp.now();
              const title = getOnlyGuest(video.title);
              await videoCollection.doc(video.id).set(video);
              delete video.publishedAt;
              const message = `Estamos ao vivo ${title}`;
              sendPodcastNotification(podcast, message, video, "EPISODE");
            });
          }
        });
      }
    });

exports.updateEpisodes = functions.pubsub.schedule("00 08 * * *")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      const db = admin.firestore();
      const podcastCollection = db.collection(config.podcastPath);
      const videoCollection = db.collection(config.episodesPath);
      const podcastsTask = await podcastCollection.orderBy("subscribe", "desc").get();
      podcastsTask.forEach((snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          youtubeService.requestPlaylist(podcast.uploads, 1, (videos) => {
            console.log("Retrieving ", videos.length, " videos.");
            videos.forEach(async (video) => {
              video.podcastId = podcast.id;
              const timestampDate = new Date(video.publishDate);
              delete video.publishDate;
              video.publishedAt = admin.firestore.Timestamp.fromDate(timestampDate);
              await videoCollection.doc(video.id).set(video);
              console.log("Added video with id => ", video.id);
            });
            const message = `Já viu o último episódio do ${podcast.name}? Veja agora ${getGuestsNames(videos.slice(0, 1))}`;
            sendPodcastNotification(podcast, message, videos[0]);
          });
        } else {
          console.error("Snapshot not found!");
        }
      });
    });


exports.updateCuts = functions.pubsub.schedule("30 12 * * *")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      const db = admin.firestore();
      const podcastCollection = db.collection(config.podcastPath);
      const cutCollection = db.collection(config.cutsPath);
      const podcastsTask = await podcastCollection.orderBy("subscribe").get();
      podcastsTask.forEach((snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          youtubeService.requestPlaylist(podcast.cuts, 20, (videos) => {
            console.log("Retrieving ", videos.length, " videos.");
            videos.forEach(async (video) => {
              video.podcastId = podcast.id;
              const timestampDate = new Date(video.publishDate);
              delete video.publishDate;
              video.publishedAt = admin.firestore.Timestamp.fromDate(timestampDate);
              await sleep(1000);
              const pushTask = await cutCollection.doc(video.id).set(video);
              console.log("Added video with id => ", pushTask.id);
            });
            sendPodcastNotification(podcast, podcast.id, `Novos cortes do ${podcast.name} disponíveis!`);
          });
        } else {
          console.error("Snapshot not found!");
        }
      });
    });

exports.updateChannel = functions.pubsub.schedule("30 4 * * sun")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      const db = admin.firestore();
      const podcastCollection = db.collection(config.podcastPath);
      const podcastsTask = await podcastCollection.orderBy("subscribe", "desc").get();
      podcastsTask.forEach(async (snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          youtubeService.requestChannelInfo(podcast.youtubeId, async (channel) => {
            podcast.name = channel.name;
            podcast.iconURL = channel.iconURL;
            podcast.subscribe = channel.subscribe;
            podcast.viewCount = channel.viewCount;
            podcast.uploads = channel.uploads;
            await podcastCollection.doc(podcast.id).set(podcast);
            console.log("Updated podcast ", podcast.name);
          });
        }
      });
    });

exports.weekEpisodes = functions.pubsub.schedule("0 11 * * SAT")
    .timeZone(config.timeZone)
    .onRun(async (context) => {
      const db = admin.firestore();
      const podcastCollection = db.collection(config.podcastPath);
      const videoCollection = db.collection(config.episodesPath);

      const podcastsTask = await podcastCollection.orderBy("subscribe", "asc").get();

      podcastsTask.forEach(async (snapshot) => {
        if (snapshot.exists) {
          const podcast = getPodcastObject(snapshot.data());
          const videoTask = await videoCollection.orderBy("publishedAt", "desc").where("podcastId", "==", podcast.id).limit(7).get();
          let guestsMessage = "";
          videoTask.forEach((snapshot) => {
            if (snapshot.exists) {
              const video = snapshot.data();
              guestsMessage += getOnlyGuest(video["title"]);
              guestsMessage += ",";
            }
          });
          const message = `Veja o que rolou essa semana no ${podcast.name}! \n${guestsMessage}`;
          sendPodcastNotification(podcast, podcast.id, message);
        }
      });
    });


exports.newNotification = functions.firestore.document("Users/{userId}").onUpdate(async (change, context) => {
  const db = admin.firestore();
  const newValue = userMapper.mapUserSnapshot(change.after.data());
  const previousValue = userMapper.mapUserSnapshot(change.before.data());

  if (newValue.notifications.length < previousValue.notifications.length || newValue.notifications.length == previousValue.notifications.length) {
    console.log("Theres no new notifications");
    return;
  }

  const lastNotification = newValue.notification[newValue.notifications - 1];
  const noticationSettings = newValue.notificationsSettings;
  const notificationType = lastNotification.type;
  const podcastCollection = db.collection(config.podcastPath);
  const podcastsTask = await podcastCollection.doc(lastNotification.podcastId).get();
  let payload = null;
  if (podcastsTask.exists) {
    const podcast = getPodcastObject(podcastsTask.docs[0].data());
    payload = {
      "notification": {
        "icon": podcast.notificationIconnotIcon,
        "color": String(podcast.highLightColor),
        "title": lastNotification.title,
        "body": lastNotification.message.replace("undefined", ""),
        "sound": "notification.wav",
        "click_action": "notification_tag",
      },
      "data": {
        "podcast": JSON.stringify(podcast),
      },
    };
  }
  if (notificationEnabled(notificationType, noticationSettings)) return admin.messaging().sendToDevice(newValue.token, payload);
});

/**
 *
 * @param {notificationType} notificationType of notification received
 * @param {settings} settings defined settings for notifications
 * @return {boolean} value according to settings and notification type
 */
function notificationEnabled(notificationType, settings) {
  if (notificationType == "EPISODE" && settings.episodesEnabled) return true;
  if (notificationType == "CUT" && settings.episodesEnabled) return true;
  return false;
}


/**
 *
 * @param {string} title from video
 * @return {string} guest name formatted
 */
function getOnlyGuest(title) {
  return capitalize.words(title.substring(0, title.indexOf("-")).toLowerCase());
}

/**
 *
 * @param {array} videos list of recent episodes fetched on youtube api
 * @return {string} manipulated string with guest names
 */
function getGuestsNames(videos) {
  let guestName = "";
  if (videos.length < 2) {
    const video = videos[0];
    const title = capitalize.words(video.title.substring(0, video.title.indexOf("-")).toLowerCase());
    return title;
  }
  for (let i = 0; i< videos.length; i++) {
    const video = videos[i];
    const title = capitalize.words(video.title.substring(0, video.title.indexOf("-")).toLowerCase());
    if (i == videos.length - 1) {
      guestName += ` e ${title}.`;
    } else if (i == videos.length - 2) {
      guestName += ` ${title}`;
    } else {
      guestName += ` ${title},`;
    }
  }
  return guestName.replace("-", "");
}

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
    "subscribers": dataSnapshot["subscribers"],
  };
  console.log("Podcast => ", JSON.stringify(podcast));
  return podcast;
}

/**
 *
 * @param {object} podcast gets podcast data to send notification
 * @param {string} tokens to send usersMessage
 * @param {string} message custom message sended by functions
 * @param {object} video to open in
 * @return {task} fcm notification task
 */
function sendPodcastNotification(podcast, message, video, type) {
  console.log("payload data => ", JSON.stringify(podcast), "\n video =>", JSON.stringify(video));
  let title = "Salve Salve família";
  if (podcast.slogan) {
    title = podcast.slogan;
  }

  podcast.tokens.forEach((token) => {
    userService.getUserByToken(token, (user) => {
      const notification = notificationService.createNotification(title, message, podcast.id, video.id, video.thumbnailURL, type);
      userService.updateUserNotifications(notification, user);
    });
  });
}

