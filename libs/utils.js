const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY,
      GoogleUrl = require('google-url'),
      googleUrl = new GoogleUrl({ key: GOOGLE_API_KEY })

/** Shorten the map url to display in card */
module.exports.shorten = (url) => {
    return new Promise((resolve, reject) => {
        googleUrl.shorten(url, (err, shortUrl) => {
            console.log('SHORT URL', url, err, shortUrl)
            resolve(shortUrl)
        })
    })
}