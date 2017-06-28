const request = require('request'),
      GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

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
