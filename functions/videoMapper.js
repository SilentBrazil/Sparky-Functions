/* eslint-disable linebreak-style */
/* eslint-disable max-len */
module.exports = {

  mapPlaylistResponseToVideo: function(videoResponse) {
    const id = videoResponse.snippet.resourceId.videoId;
    const video = {
      "id": id,
      "publishDate": videoResponse.snippet.publishedAt,
      "thumbnailUrl": videoResponse.snippet.thumbnails.high.url,
      "youtubeID": id,
      "title": videoResponse.snippet.title,
    };
    console.log("Video => ", JSON.stringify(video));
    return video;
  },

  mapLiveVideoResponse: function(videoResponse) {
    const video = {
      "id": videoResponse.id.videoId,
      "description": videoResponse.snippet.description,
      "publishedAt": videoResponse.snippet.publishedAt,
      "thumbnailUrl": videoResponse.snippet.thumbnails.high.url,
      "youtubeId": videoResponse.id.videoId,
      "title": videoResponse.snippet.title,
    };
    console.log("Video => ", JSON.stringify(video));
    return video;
  },
};
