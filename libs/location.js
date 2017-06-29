const request = require('request'),
      GOOGLE_API_KEY = process.env.GOOGLE_API_KEY,
      _ = require('lodash')

module.exports.findLatLong = locationName => {
    return new Promise((resolve, reject) => {
        request(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(locationName)}&key=${GOOGLE_API_KEY}`, (error, response, body) => {
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
                        fullLocationName: result.formatted_address.replace(', UK', '').replace(', uk', ''),
                        lat: result.geometry.location.lat,
                        lng: result.geometry.location.lng
                    }
                })
                resolve(ukResults)
            }
            else{
                resolve([])
            }
        })
    })
}

module.exports.getMapImage = (lat, lng) => {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=15&size=600x400&maptype=roadmap%20&scale=2&key=${GOOGLE_API_KEY}&markers=color:black%7C${lat},${lng}`
}

module.exports.getMapUrl = (coordinates) => {
    console.log('COORDINATES', coordinates)
    let origin = _.first(coordinates).reverse().join(',')
    let destination = _.last(coordinates).reverse().join(',')
    let waypoints = _.map(coordinates.slice(1, coordinates.length - 1), coordinate => coordinate.reverse().join(',')).join('|')
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}`
}