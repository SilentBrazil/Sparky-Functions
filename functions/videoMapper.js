/* eslint-disable linebreak-style */
/* eslint-disable max-len */
module.exports = {

  mapPlaylistResponseToVideo: function(videoResponse) {
    const id = videoResponse.snippet.resourceId.videoId;
    const video = {
      "id": id,
      "description": videoResponse.snippet.description,
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
      "thumbnailUrl": videoResponse.snippet.thumbnails.high.url,
      "youtubeID": videoResponse.id.videoId,
      "title": videoResponse.snippet.title,
    };
    console.log("Video => ", JSON.stringify(video));
    return video;
  },

  mapChannelResponse: function(channelResponse) {
    const channel = {
      "name": channelResponse.snippet.title,
      "publishedAt": channelResponse.snippet.publishedAt,
      "iconURL": channelResponse.snippet.thumbnails.high.url,
      "subscribe": channelResponse.snippet.subscriberCount,
      "viewCount": channelResponse.snippet.viewCount,
      "uploads": channelResponse.contentDetails.relatedPlaylists.uploads,
    };
    return channel;
  },
};
