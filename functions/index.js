const functions = require("firebase-functions");
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);


exports.newEpisodes = functions.database.ref('/Podcasts/{podcastId}').onWrite(async (change, context) => {
    const podcastId = context.params.podcastId
    var db = admin.firestore();
    const podcastRef = db.collection('Podcasts').doc(podcastId)
    const podcastDoc = await podcastRef.get()

    if(!podcastDoc.exists) {
        console.log('Podcast not found!');

    } else {
        conseole.log('Podcast found: ', podcastDoc.data())
        var data = podcastDoc.data()
        var podcast = {
            "id": doc.id,
            "name": doc['name'],
            "iconURL": doc['iconUrl']
        }
        const payLoad = {
            notification: {
                title: 'Salve salve família!',
                body: `Tem novidade no ${podcast.name}`,
                icon: podcast.iconURL,
                click_action: podcast.id
            }
        }

        const options = {
            priority: "default",
            timeToLive: 60*60*2
        };

        return admin.messaging().sendToTopic(podcast.id, payLoad, options)
    }
     
   


})
