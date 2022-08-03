/* eslint-disable linebreak-style */
/* eslint-disable max-len */
// eslint-disable-next-line no-unused-vars
const request = require("request");
const config = require("./config");
const videoMapper = require("./videoMapper");

module.exports = {

  requestPlaylist: async function(playlistId, responseResult) {
    const options = {
      path: "playlistItems",
      query: `?part=snippet&playlistId=${playlistId}&maxResults=50&key=${config.youtubeKey}`,
    };
    const requestURL = config.youtubeApiURl + options.path + options.query;
    console.log("requesting => ", requestURL);
    const youtubeRequest = request.get(requestURL, function(error, response, body) {
      console.log("error:", error);
      console.log("statusCode:", response && response.statusCode);
      const object = JSON.parse(body);
      if (object.items.length > 0) {
        const videos = [];
        object.items.forEach((response) => {
          const video = videoMapper.mapPlaylistResponseToVideo(response);
          videos.push(video);
        });
        responseResult(videos);
      } else {
        console.error("No videos founded for playlist => ", playlistId);
      }
      youtubeRequest.end();
    });
  },

  requestLives: async function(channelId, requestResult) {
    const queryString = `?part=snippet&channelId=${channelId}&type=video&eventType=live&maxResults=1&key=${config.youtubeKey}`;
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
        const videoObject = videoMapper.mapLiveVideoResponse(object.items[0]);
        requestResult(videoObject);
      } else {
        console.error("No live founded for => ", channelId);
      }
    });
    youtubeRequest.end();
  },
};
