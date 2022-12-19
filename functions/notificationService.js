/* eslint-disable linebreak-style */
/* eslint-disable max-len */
// eslint-disable-next-line no-unused-vars
module.exports = {


  createNotification: function(title, message, podcastId, videoId, videoThumbnail, type) {
    const notification = {
      "title": title,
      "message": message,
      "podcastId": podcastId,
      "videoId": videoId,
      "videoThumbnail": videoThumbnail,
      "type": type,
    };

    return notification;
  },

};
