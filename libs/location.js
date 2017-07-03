const request = require('request'),
      GOOGLE_API_KEY = process.env.GOOGLE_API_KEY,
      _ = require('lodash')

/** Convert location name uttered by user to latitude and longitude */
module.exports.findLatLong = locationName => {
    return new Promise((resolve, reject) => {
        /** Calling Google's geocoding api */
        request(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${GOOGLE_API_KEY}`, (error, response, body) => {
            /** If failed return empty location list */
            if(error) resolve([])
            let bodyObj = JSON.parse(body)
            if(bodyObj.status === 'OK'){
                let results = bodyObj.results
                if(results.length === 0) return resolve([])
                let ukResults = results.filter(result => {
                    return !!result.address_components.find(address_component => {
                        /** Filtering for only locations in UK */
                        return address_component.types.indexOf('country') >= 0 && address_component.short_name === 'GB'
                    })
                }).map(result => {
                    return {
                        name: locationName,
                        fullLocationName: result.formatted_address.replace(', UK', '').replace(', uk', ''), /** Remove the text UK from the location name */
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng
                    }
                })
                /** Return results */
                resolve(ukResults)
            }
            else{
                resolve([])
            }
        })
    })
}

/** Get url for the static map image depending on the latitude and longitude */
module.exports.getMapImage = (lat, lng) => {
    /** Static map image centered on lat,lng and with the marker in the point */
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&maptype=roadmap%20&scale=2&key=${GOOGLE_API_KEY}&markers=color:black%7C${lat},${lng}`
}

/** Get url of the google map with directions laid out in the coordinates given */
module.exports.getMapUrl = (coordinates) => {
    let origin = _.first(coordinates).reverse().join(',')
    let destination = _.last(coordinates).reverse().join(',')
    let waypoints = _.map(coordinates.slice(1, coordinates.length - 1), coordinate => coordinate.reverse().join(',')).join('|')
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
}