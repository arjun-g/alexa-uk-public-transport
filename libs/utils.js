const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY,
      GoogleUrl = require('google-url'),
      googleUrl = new GoogleUrl({ key: GOOGLE_API_KEY })

module.exports.shorten = (url) => {
    return new Promise((resolve, reject) => {
        googleUrl.shorten(url, (er, shortUrl) => {
            resolve(shortUrl)
        })
    })
}