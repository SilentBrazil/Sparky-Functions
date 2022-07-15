const functions = require("firebase-functions");


exports.newEpisodes = functions.database.ref('/Videos/').onWrite(async (change, context) => {
    const registrationToken = 'My Token'
    const payLoad = {
        notification: {
            title: 'Salve salve família!',
            body: 'Novos episódios da família flow estão disponíveis!'
        }
    }


})
