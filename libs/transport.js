const TRANSPORT_API_APP_ID = process.env.TRANSPORT_API_APP_ID,
      TRANSPORT_API_APP_KEY = process.env.TRANSPORT_API_APP_KEY,
      TRANSPORT_API_ROOT_URL = 'http://transportapi.com/v3/uk',
      request = require('request')

module.exports = {
    train: {
        findNearBy: (lat, lng) => {
            return new Promise((resolve, reject) => {
                request(`${TRANSPORT_API_ROOT_URL}/train/stations/near.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}&lat=${lat}&lon=${lng}&rpp=10`, (error, response, body) => {
                    if(error) return resolve([])
                    let stations = JSON.parse(body).stations
                    resolve(stations)
                })
            })
        },
        timetable: (stationCode, date, time) => {
            return new Promise((resolve, reject) => {
                request(`${TRANSPORT_API_ROOT_URL}/train/station/${stationCode}/${date}/${time}/timetable.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}`, (error, response, body) => {
                    if(error) return resolve([])
                    let trains = JSON.parse(body).departures.all
                    resolve(trains)
                    console.log(JSON.stringify(trains, null, 2))
                })
            })
        }
    },
    bus: {
        findNearBy: (lat, lng) => {
            return new Promise((resolve, reject) => {
                request(`${TRANSPORT_API_ROOT_URL}/bus/stops/near.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}&lat=${lat}&lon=${lng}&rpp=10`, (error, response, body) => {
                    if(error) return resolve([])
                    let stops = JSON.parse(body).stops
                    resolve(stops)
                })
            })
        },
        timetable: (atcoCode, date, time) => {
            return new Promise((resolve, reject) => {
                request(`${TRANSPORT_API_ROOT_URL}/bus/stop/${atcoCode}/${date}/${time}/timetable.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}`, (error, response, body) => {
                    if(error) return resolve([])
                    ////////////let trains = JSON.parse(body).departures.all
                    ////////////resolve(trains)
                })
            })
        }
    },
    tube: {
        findNearBy: (lat, lng) => {
            return new Promise((resolve, reject) => {
                request(`${TRANSPORT_API_ROOT_URL}/tube/stations/near.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}&lat=${lat}&lon=${lng}&rpp=10`, (error, response, body) => {
                    if(error) return resolve([])
                    let stations = JSON.parse(body).stations
                    resolve(stations)
                })
            })
        }
    },
    public: {
        plan: (from, to) => {
            return new Promise((resolve, reject) => {
                request(`${TRANSPORT_API_ROOT_URL}/public/journey/from/${from}/to/${to}.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}&lat=${lat}&lon=${lng}&rpp=10`, (error, response, body) => {
                    if(error) return resolve([])
                    let routes = JSON.parse(body).routes
                    let route = routes && routes[0]
                    resolve(route)
                })
            })
        },
        planOn: (from, to, date, time) => {
            return new Promise((resolve, reject) => {
                console.log('PUBLIC URL', `${TRANSPORT_API_ROOT_URL}/public/journey/from/lonlat:${from}/to/lonlat:${to}/at/${date}/${time}.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}`)
                request(`${TRANSPORT_API_ROOT_URL}/public/journey/from/lonlat:${from}/to/lonlat:${to}/at/${date}/${time}.json?app_id=${TRANSPORT_API_APP_ID}&app_key=${TRANSPORT_API_APP_KEY}`, (error, response, body) => {
                    if(error) return resolve([])
                    let routes = JSON.parse(body).routes
                    let route = routes && routes[0]
                    resolve(route)
                })
            })
        }
    }
}