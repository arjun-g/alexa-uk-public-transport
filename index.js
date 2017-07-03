const Alexa = require('alexa-sdk'),
      _ = require('lodash'),
      datejs = require('datejs'),
      utils = require('./libs/utils'),
      location = require('./libs/location'),
      transport = require('./libs/transport')

const APP_ID = process.env.APP_ID,
      STOP_MESSAGE = 'Bye! Have a nice journey!',
      HELP_MESSAGE = 'You can ask me to plan a public transport between two places or know about train stations near any place. What would you like me to help you with ?',
      HELP_REPROMPT_MESSAGE = 'What would you like me to help you with ?',
      HELP_TRAIN_MESSAGE = 'You can ask me to find train stations near any place. What would you like me to help you with ?',
      HELP_TRAIN_REPROMPT_MESSAGE = 'What would you like me to help you with ?',
      HELP_PLAN_MESSAGE = 'You can ask me to plan a trip between any two places using public transportation. What would you like me to help you with ?',
      HELP_PLAN_REPROMPT_MESSAGE = 'What would you like me to help you with ?',
      CANNOT_FIND_LOCATION_MESSAGE = 'Sorry, I cannot find the location you specified. Bye!',
      CANNOT_FIND_NEARBY_STATION_MESSAGE = 'Sorry, I cannot find any train stations near by. Bye!',
      CANNOT_FIND_ANYMORE_NEARBY_STATION_MESSAGE = 'Sorry, I cannot find any more train stations near by. Bye!',
      CANNOT_FIND_TRAIN_SCHEDULED_MESSAGE = 'Cannot find any more trains scheduled.',
      CANNOT_FIND_NEARBY_BUS_STOP_MESSAGE = 'Sorry, I cannot find any bus stops near by. Bye!',
      CANNOT_FIND_ANYMORE_NEARBY_BUS_STOP_MESSAGE = 'Sorry, I cannot find any bus stops near by. Bye!'

function getDistanceName(yards) {
    if(yards < 880) return `${yards} yards`
    return `${(yards / 1760).toFixed(2)} miles`
}

function durationToSpeak(duration) {
    let response = ''
    let durationParts = duration.split(':')
    let hours = parseInt(durationParts[0])
    let minutes = parseInt(durationParts[1])
    if(hours > 0){
        response = `${hours} hour${hours > 1 ? '(s)' : ''} `
    }
    if(minutes > 0){
        response += `${minutes} minutes`
    }
    return response
}

function pathToSpeak(path) {
    let pathDesc = ''
    if(path.mode === 'foot'){
        pathDescDesc = `walk for ${durationToSpeak(path.duration)} from ${path.from_point_name} to ${path.to_point_name} at ${path.departure_time}`
    }
    else if(path.mode === 'wait'){
        pathDescDesc = `wait for ${durationToSpeak(path.duration)} ${path.arrival_time ? 'until ' + path.arrival_time : ''}`
    }
    else {
        pathDescDesc = `take a ${path.mode} from ${path.from_point_name} which departs at ${path.departure_time} and reaches ${path.to_point_name} in ${durationToSpeak(path.duration)}`
    }
    return pathDescDesc
}

exports.handler = function(event, context, callback) {

    var alexa = Alexa.handler(event, context, callback)
    alexa.appId = APP_ID
    alexa.registerHandlers(handlers, planPublicHandlers, trainHandlers)
    alexa.execute()

}

const handlers = {
    'LaunchRequest': function() {
        let speechOutput = HELP_MESSAGE
        let reprompt = HELP_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'NearByTrainIntent': function() {
        /** Jump to trainHandlers */
        this.handler.state = 'TRAIN'
        this.emitWithState('NearByTrainIntent')
    },
    'PlanPublicTransportIntent': function() {
        /** Jump to planPublicHandlers */
        this.handler.state = 'PLAN_PUBLIC'
        this.emitWithState('PlanPublicTransportIntent')
    },
    'AMAZON.HelpIntent': function() {
        let speechOutput = HELP_MESSAGE
        let reprompt = HELP_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'AMAZON.CancelIntent': function() {
        this.emit(':tell', STOP_MESSAGE)
    },
    'AMAZON.StopIntent': function() {
        this.emit(':tell', STOP_MESSAGE)
    },
    'Unhandled': function() {
        this.attributes = {}
        let speechOutput = 'Sorry I cannot understand your query. ' + HELP_MESSAGE
        let reprompt = HELP_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'SessionEndedRequest': function() {
        this.emit(':tell', STOP_MESSAGE)
    }
}

/** Handlers for finding nearby train stations */
let trainHandlers = Alexa.CreateStateHandler('TRAIN', {
    'NearByTrainIntent': function() {
        let data = this.event.request.intent.slots
        if(data.location && data.location.value){
            location.findLatLong(data.location.value)
            .then(locations => {
                if(locations.length === 0){
                    this.emit(':tell', CANNOT_FIND_LOCATION_MESSAGE)
                }
                else{
                    this.attributes.locations = locations
                    this.attributes.locationIndex = 0
                    this.attributes.confirmFor = 'LOCATION'
                    let currentLocation = locations[0]
                    this.emit(':ask',
                              `Did you mean train stations near ${currentLocation.fullLocationName} ?`,
                              `Say yes to search train stations near ${currentLocation.fullLocationName} or no to know about other similar locations if any`)
                }
            })
        }
        else{
            this.emit(':ask',
                      `Ok. Near which location do you want me to check for train stations ?`,
                      `If you give me the location to search i will start searching for statiosn nearby ? For which location do you want me to check for stations ?`)
        }
    },
    'LocationIntent': function() {
        let data = this.event.request.intent.slots
        if(data.location && data.location.value){
            location.findLatLong(data.location.value)
            .then(locations => {
                if(locations.length === 0){
                    this.emit(':tell', CANNOT_FIND_LOCATION_MESSAGE)
                }
                else{
                    this.attributes.locations = locations
                    this.attributes.locationIndex = 0
                    this.attributes.confirmFor = 'LOCATION'
                    let currentLocation = locations[0]
                    this.emit(':ask',
                              `Did you mean train stations near ${currentLocation.fullLocationName} ?`,
                              `Say yes to search train stations near ${currentLocation.fullLocationName} or no to know about other similar locations if any`)
                }
            })
        }
        else {
            this.emit(':tell', CANNOT_FIND_LOCATION_MESSAGE)
        }
    },
    'AMAZON.YesIntent': function() {
        switch(this.attributes.confirmFor){
            case 'LOCATION':
            let currentLocation = this.attributes.locations[this.attributes.locationIndex]
            this.attributes.location = currentLocation
            transport.train.findNearBy(currentLocation.lat, currentLocation.lng)
            .then(stations => {
                delete this.attributes.locations
                delete this.attributes.locationIndex
                if(stations.length === 0){
                    this.emit(':tell', CANNOT_FIND_NEARBY_STATION_MESSAGE)
                }
                else{
                    this.attributes.stations = stations
                    this.attributes.stationIndex = 0
                    this.attributes.confirmFor = 'STATION'
                    let currentStation = stations[0]
                    let cardTitle = currentStation.name
                    let cardDescription = `${currentStation.name} is ${getDistanceName(currentStation.distance)} away from ${currentLocation.fullLocationName}`
                    let cardImage = {
                        smallImageUrl: location.getMapImage(currentStation.latitude, currentStation.longitude),
                        largeImageUrl: location.getMapImage(currentStation.latitude, currentStation.longitude)
                    }
                    this.emit(':askWithCard',
                              `I found ${stations.length} station${stations.length === 1 ? '' : 's'} near ${currentLocation.fullLocationName}. The closest is ${currentStation.name} which is ${getDistanceName(currentStation.distance)} away. Would you like to know its time tabled service updates ?`,
                              `Say yes to know the time tabled service updates for ${currentStation.name} or no know about other near by stations`,
                              cardTitle,
                              cardDescription,
                              cardImage)
                }
            })
            break
            case 'STATION':
            this.attributes.station = this.attributes.stations[this.attributes.stationIndex]
            delete this.attributes.stations
            delete this.attributes.stationIndex
            this.attributes.confirmFor = 'GETDATETIME'
            this.emit(':ask',
                      `For what date and time would you like to know the time table for ?`,
                      `Say a date and time to know the time tabled service updates for ${this.attributes.station.name}`)
            break
            case 'TRAIN':
            this.attributes.trainIndex = this.attributes.trainIndex + 1
            let currentTrain = this.attributes.trains[this.attributes.trainIndex]
            this.emit(':ask',
                      `A train to ${currentTrain.destination_name} is scheduled to ${!!currentTrain.aimed_arrival_time ? `arrive at ${currentTrain.aimed_arrival_time} and` : ''} depart at ${currentTrain.aimed_departure_time} on platform ${currentTrain.platform}. ${(this.attributes.trains.length === (this.attributes.trainIndex + 1)) ? (CANNOT_FIND_TRAIN_SCHEDULED_MESSAGE + ' ' + STOP_MESSAGE) : 'Would you like to know about the train scheduled next ?'}`)
            break
        }
    },
    'AMAZON.NoIntent': function() {
        switch(this.attributes.confirmFor){
            case 'LOCATION':
            this.attributes.locationIndex = this.attributes.locationIndex + 1
            if(this.attributes.locations.length <= this.attributes.locationIndex){
                this.emit(':tell', CANNOT_FIND_LOCATION_MESSAGE)
            }
            else{
                this.attributes.confirmFor = 'LOCATION'
                let currentLocation = this.attributes.locations[this.attributes.locationIndex]
                this.emit(':ask',
                          `Did you mean ${currentLocation.fullLocationName} ?`,
                          `Say yes to search train stations near ${currentLocation.fullLocationName} or say no to know about other similar locations if any`)
            }
            break
            case 'STATION':
            this.attributes.stationIndex = this.attributes.stationIndex + 1
            if(this.attributes.stations.length <= this.attributes.stationIndex){
                this.emit(':tell', CANNOT_FIND_ANYMORE_NEARBY_STATION_MESSAGE)
            }
            else{
                let currentStation = this.attributes.stations[this.attributes.stationIndex]
                let currentLocation = this.attributes.location
                let cardTitle = currentStation.name
                let cardDescription = `${currentStation.name} is ${getDistanceName(currentStation.distance)} away from ${currentLocation.fullLocationName}`
                let cardImage = {
                    smallImageUrl: location.getMapImage(currentStation.latitude, currentStation.longitude),
                    largeImageUrl: location.getMapImage(currentStation.latitude, currentStation.longitude)
                }
                this.emit(':askWithCard',
                          `${currentStation.name} is ${getDistanceName(currentStation.distance)} away from ${currentLocation.fullLocationName}. Would you like to know its time tabled service updates ?`,
                          `Say yes to know the time tabled service updates for ${currentStation.name} or no know about other near by stations`,
                          cardTitle,
                          cardDescription,
                          cardImage)
            }
            case 'TRAIN':
            this.emit(':tell',STOP_MESSAGE)
            break
        }
    },
    'DateTimeIntent': function() {
        let date = (this.event.request.intent.slots.date && this.event.request.intent.slots.date.value) || this.attributes.selectedDate
        let time = (this.event.request.intent.slots.time && this.event.request.intent.slots.time.value) || this.attributes.selectedTime
        if(date && time){
            this.attributes.selectedDate = date
            this.attributes.selectedTime = time
            transport.train.timetable(this.attributes.station.station_code, date, time)
            .then(trains => {
                if(trains.length === 0){
                    this.emit(':tell', `No trains scheduled in ${this.attributes.station.name} on ${date} ${time}.`)
                }
                else{
                    this.attributes.confirmFor = 'TRAIN'
                    this.attributes.trains = trains
                    this.attributes.trainIndex = 0
                    let currentTrain = trains[0]
                    this.emit(':ask',
                              `A train to ${currentTrain.destination_name} is scheduled to arrive at ${currentTrain.aimed_arrival_time} and depart at ${currentTrain.aimed_departure_time} on platform ${currentTrain.platform}. Would you like to know about the train scheduled next ?`,
                              'Say yes if you would like to know about the next scheduled train')
                }
            })
        }
        else if(date && !time){
            this.attributes.selectedDate = date
            this.emit(':ask',
                      `For what time do you like to know the time table for ${this.attributes.station.name} ?`,
                      `Say the time for which you like to know the time table for ${this.attributes.station.name} ?`)
        }
        else if(!date && time){
            this.attributes.selectedTime = time
            this.emit(':ask',
                      `For what time do you like to know the time table for ${this.attributes.station.name} ?`,
                      `Say the time for which you like to know the time table for ${this.attributes.station.name} ?`)
        }
    },
    'AMAZON.HelpIntent': function() {
        let speechOutput = HELP_TRAIN_MESSAGE
        let reprompt = HELP_TRAIN_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'AMAZON.CancelIntent': function() {
        this.emit(':tell', STOP_MESSAGE)
    },
    'AMAZON.StopIntent': function() {
        this.emit(':tell', STOP_MESSAGE)
    },
    'Unhandled': function(){
        this.attributes = {}
        let speechOutput = 'Sorry I cannot understand your query. ' + HELP_MESSAGE
        let reprompt = HELP_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'SessionEndedRequest': function() {
        this.emit(':tell', STOP_MESSAGE)
    }
})

/** Handlers for finding nearby bus stops - NOT IMPLEMENTED YET */
let busHandlers = Alexa.CreateStateHandler('BUS', {
    'NearByBusIntent': function() {
        let data = this.event.request.intent.slots
        if(data.location && data.location.value){
            location.findLatLong(data.location.value)
            .then(locations => {
                if(locations.length === 0){
                    this.emit(':tell', CANNOT_FIND_LOCATION_MESSAGE)
                }
                else{
                    this.attributes.locations = locations
                    this.attributes.locationIndex = 0
                    this.attributes.confirmFor = 'LOCATION'
                    let currentLocation = locations[0]
                    this.emit(':ask',
                              `Did you mean bus stops near ${currentLocation.fullLocationName} ?`,
                              `Say yes to search bus stops near ${currentLocation.fullLocationName} or no to know about other similar locations if any`)
                }
            })
        }
    },
    'AMAZON.YesIntent': function() {
        switch(this.attributes.confirmFor){
            case 'LOCATION':
            let currentLocation = this.attributes.locations[this.attributes.locationIndex]
            delete this.attributes.locations
            delete this.attributes.locationIndex
            this.attributes.location = currentLocation
            transport.bus.findNearBy(currentLocation.lat, currentLocation.lng)
            .then(stops => {
                if(stops.length === 0){
                    this.emit(':tell', CANNOT_FIND_ANYMORE_NEARBY_BUS_STOP_MESSAGE)
                }
                else{
                    this.attributes.stops = stops
                    this.attributes.stopIndex = 0
                    this.attributes.confirmFor = 'STOP'
                    let currentStop = stops[0]
                    this.emit(':ask',
                              `I found ${stops.length} station${stops.length === 1 ? '' : 's'} near ${currentLocation.fullLocationName}. The closest is ${currentStop.name} which is ${getDistanceName(currentStation.distance)} away. Would you like to know about another nearby bus stop ?`,
                              `Say yes to know about another bus stop near by ${currentLocation.fullLocationName}`)
                }
            })
            break
            case 'STOP':
            this.attributes.stopIndex = this.attributes.stopIndex + 1
            if(this.attributes.stops.length === this.attributes.stopIndex){
                this.emit(':tell', CANNOT_FIND_NEARBY_BUS_STOP_MESSAGE)
            }
            else{
                let currentStop = this.attributes.stops[this.attributes.stopIndex]

            }
        }
    },
    'AMAZON.NoIntent': function() {
        switch(this.attributes.confirmFor){
            case 'LOCATION':
            this.attributes.locationIndex = this.attributes.locationIndex + 1
            if(this.attributes.locations.length <= this.attributes.locationIndex){
                this.emit(':tell', CANNOT_FIND_LOCATION_MESSAGE)
            }
            else{
                this.attributes.confirmFor = 'LOCATION'
                let currentLocation = this.attributes.locations[this.attributes.locationIndex]
                this.emit(':ask',
                          `Did you mean ${currentLocation.fullLocationName} ?`,
                          `Say yes to search train stations near ${currentLocation.fullLocationName} or say no to know about other similar locations if any`)
            }
            break
            case 'STOP':
            this.attributes.stationIndex = this.attributes.stationIndex + 1
            if(this.attributes.stations.length <= this.attributes.stationIndex){
                this.emit(':tell', CANNOT_FIND_ANYMORE_NEARBY_STATION_MESSAGE)
            }
            else{
                let currentStation = this.attributes.stations[this.attributes.stationIndex]
                this.emit(':ask',
                          `${currentStation.name} is ${getDistanceName(currentStation.distance)} away from ${currentLocation.fullLocationName}. Would you like to know its time tabled service updates ?`,
                          `Say yes to know the time tabled service updates for ${currentStation.name} or no know about other near by stations`)
            }
            case 'TRAIN':
            this.emit(':tell',STOP_MESSAGE)
            break
        }
    }
})

/** Handlers for finding nearby tube stations - NOT IMPLEMENTED YET */
let tubeHandlers = Alexa.CreateStateHandler('TUBE', {

})

/** Handlers for plannign trip between two places */
let planPublicHandlers = Alexa.CreateStateHandler('PLAN_PUBLIC', {
    'PlanPublicTransportIntent': function() {
        let from = this.event.request.intent.slots.from && this.event.request.intent.slots.from.value
        let to = this.event.request.intent.slots.to && this.event.request.intent.slots.to.value
        if(from && to){
            location.findLatLong(from)
            .then(locations => {
                this.attributes.from = locations[0]
                location.findLatLong(to)
                .then(locations => {
                    this.attributes.to = locations[0]
                    if(!this.attributes.from){
                        cannotUnderstandFrom(this)
                    }
                    else if(!this.attributes.to){
                        cannotUnderstandTo(this)
                    }
                    else{
                        comfirmFromAndTo(this)
                    }
                })
            })
        }
        else if(!from && !to){
            this.attributes.askFor = 'FROM'
            this.emit(':ask',
                      `Ok let's do it. From where would you like to start your trip from ?`,
                      `If you give the starting location I will start planning the trip. Where would you like to start the strip from ?`)
        }
        else if(!from){
            location.findLatLong(to)
            .then(locations => {
                this.attributes.to = locations[0]
                if(!this.attributes.to){
                    cannotUnderstandTo(this)
                }
                else{
                    this.attributes.askFor = 'FROM'
                    this.emit(':ask',
                      `Ok sure. From where would you like to start your trip from ?`,
                      `If you give the starting location I will start planning the trip. Where would you like to start the strip from ?`)
                }
            })
        }
        else if(!to){
            location.findLatLong(from)
            .then(locations => {
                this.attributes.from = locations[0]
                if(!this.attributes.from){
                    cannotUnderstandFrom(this)
                }
                else{
                    this.attributes.askFor = 'TO'
                    this.emit(':ask',
                      `Sure. Where would you like to go ?`,
                      `If you give me your destination I will start planning the trip. Where would you like go ?`)
                }
            })
        }
    },
    'LocationIntent': function() {
        let locationName = ''
        switch(this.attributes.askFor){
            case 'FROM':
            locationName = this.event.request.intent.slots.location.value
            location.findLatLong(locationName)
            .then(locations => {
                if(locations.length === 0){
                    this.emit(':ask',
                            `Sorry I can't find ${locationName}. Can you be a little more specific or any near by well known place ?`,
                            `If you give me more details of the place or any well known place near by it would be more helpful. So, from where would you like to start your trip ?`)
                }
                else{
                    this.attributes.from = locations[0]
                    if(!this.attributes.to){
                        this.attributes.askFor = 'TO'
                        this.emit(':ask',
                                   `Good. Now where would you like to go ?`,
                                   `If you give me the place name I can proceed with planning the trip. So where would you like to go ?`)
                    }
                    else{
                        comfirmFromAndTo(this)
                    }
                }
            })
            break
            case 'TO':
            locationName = this.event.request.intent.slots.location.value
            location.findLatLong(locationName)
            .then(locations => {
                if(locations.length === 0){
                    this.emit(':ask',
                            `Sorry I can't find ${locationName}. Can you be a little more specific or any near by well known place ?`,
                            `If you give me more details of the place or any well known place near by it would be more helpful. So, where would you like to go ?`)
                }
                else{
                    this.attributes.to = locations[0]
                    if(!this.attributes.from){
                        this.attributes.askFor = 'FROM'
                        this.emit(':ask',
                                   `Good. Now where would you like to start your trip ?`,
                                   `If you give me the place name I can proceed with planning the trip. So where would you like to start your trip from ?`)
                    }
                    else{
                        comfirmFromAndTo(this)
                    }
                }
            })
            break
        }
    },
    'DateTimeIntent': function() {
        let date = (this.event.request.intent.slots.date && this.event.request.intent.slots.date.value) || this.attributes.date
        let time = this.event.request.intent.slots.time && this.event.request.intent.slots.time.value || this.attributes.time
        if(date && time){
            if(!parseDate(date)){
                delete this.attributes.date
                this.emit(':ask',
                            `${randomCantUnderstandMessage()}. Can you repeat the date ?`,
                            `I am having some difficulty understanding the date. What date do you want to plan the trip for ?`)
            }
            else{
                let from = this.attributes.from
                let to = this.attributes.to
                console.log('FROM', from, 'TO', to)
                transport.public.planOn(`${from.lng},${from.lat}`, `${to.lng},${to.lat}`, parseDate(date), time)
                .then(route => {
                    if(route && route.route_parts && route.route_parts.length > 0){
                        this.attributes.route = route
                        this.attributes.routeIndex = 0
                        let googleMapUrl = location.getMapUrl(_.flatten(route.route_parts.map(route_part => {
                            return [_.first(route_part.coordinates), _.last(route_part.coordinates)]
                        })))
                        utils.shorten(googleMapUrl)
                        .then(shortenedMapUrl => {
                            let cardTitle = `Travel plan from ${this.attributes.from.name} to ${this.attributes.to.name}`
                            let cardDescription = `If you start at ${route.departure_time} you may reach your destination in ${durationToSpeak(route.duration)}. Here is the map ${shortenedMapUrl}`
                            this.emit(':askWithCard',
                                `OK, here is the plan. If you start at ${route.departure_time} you may reach your destination in ${durationToSpeak(route.duration)}. Now, I will read out the direction and mode of transport one by one. If you ask me to repeat i will read it again and if you ask me to go next i will read out the next direction. ${route.route_parts.length > 1 ? 'First, ': ''} ${pathToSpeak(route.route_parts[0])}`,
                                `You can ask me to repeat this or ${route.route_parts.length > 1 ? 'read the next path': 'exit' }`,
                                cardTitle,
                                cardDescription)
                        })
                    }
                    else {
                        this.emit(':tell', `Sorry I am unable to plan a trip between ${this.attributes.from.name} and ${this.attributes.to.name} on the time you asked. Please try for different time or between different locations. Thank you.`)
                    }
                })
            }
        }
        else if(time && !date){
            this.attributes.date = Date.today().toString('yyyy-MM-dd')
            this.emitWithState('DateTimeIntent')
        }
        else if(!time){
            this.emit(':ask',
                    `Ok. At what time would you like to plan the trip for ?`,
                    `If you give the time for which you would like to plan the trip I will start planning immediatly. So, at what time would you like to plan the trip for ?`)
        }
    },
    'AMAZON.YesIntent': function() {
        switch(this.attributes.confirmFor){
            case 'LOCATION':
            this.emit(':ask',
                      `Nice. When do you want to plan the travel ?`,
                      `If you give me the date and time you want to travel `)
            break
        }
    },
    'AMAZON.NoIntent': function() {
        switch(this.attributes.confirmFor){
            case 'LOCATION':
            delete this.attributes.confirmFor
            delete this.attributes.from
            delete this.attributes.to
            delete this.attributes.askFor
            this.emit(':ask',
                      `OK! Let's start over again. From where would you like to start your trip from ?`,
                      `If you give the starting location I will start planning the trip. Where would you like to start the strip from ?`)
            break
        }
    },
    'AMAZON.NextIntent': function() {
        if(this.attributes.route){
            let route = this.attributes.route
            this.attributes.routeIndex += 1
            if(this.attributes.routeIndex === route.route_parts.length){
                this.emit(':tell', `That\'s it you would have already reached you destination. ${STOP_MESSAGE}`)
            }
            else{
                this.emit(':ask',
                    `${(route.route_parts.length - 1) === this.attributes.routeIndex ? 'Finally, ': 'Next, '} ${pathToSpeak(route.route_parts[this.attributes.routeIndex])}. ${(route.route_parts.length - 1) === this.attributes.routeIndex ? '. You will reach you destination': ''}`,
                    `You can ask me to repeat this or ${(route.route_parts.length - 1) > this.attributes.routeIndex ? 'read the next path': 'exit' }`)
            }
        }
        else {
            this.emit(':tell', `${randomCantUnderstandMessage()}`)
        }
    },
    'AMAZON.RepeatIntent': function() {
        if(this.attributes.route){
            let route = this.attributes.route
            if(this.attributes.routeIndex === route.route_parts.length){
                this.emit(':tell', `That\'s it you would have already reached you destination. ${STOP_MESSAGE}`)
            }
            else{
                this.emit(':ask',
                    `Ok let me repeat it again. ${pathToSpeak(route.route_parts[this.attributes.routeIndex])}.  ${(route.route_parts.length - 1) === this.attributes.routeIndex ? '. You would have reached your destination': ''}`,
                    `You can ask me to repeat this again or ${(route.route_parts.length - 1) > this.attributes.routeIndex ? 'read the next path': 'exit' }`)
            }
        }
        else {
            this.emit(':tell', `${randomCantUnderstandMessage()}`)
        }
    },
    'AMAZON.HelpIntent': function() {
        let speechOutput = HELP_PLAN_MESSAGE
        let reprompt = HELP_PLAN_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'AMAZON.CancelIntent': function() {
        this.emit(':tell', STOP_MESSAGE)
    },
    'AMAZON.StopIntent': function() {
        this.emit(':tell', STOP_MESSAGE)
    },
    'Unhandled': function(){
        this.attributes = {}
        let speechOutput = 'Sorry I cannot understand your query. ' + HELP_MESSAGE
        let reprompt = HELP_REPROMPT_MESSAGE
        this.emit(':ask', speechOutput, reprompt)
    },
    'SessionEndedRequest': function() {
        this.emit(':tell', STOP_MESSAGE)
    }
})

function cannotUnderstandFrom(alexa){
    alexa.attributes.askFor = 'FROM'
    alexa.emit(':ask',
               `${randomCantUnderstandMessage()}. From which place do you want to start your trip from ?`,
               `Please say from which part you want to start your trip from ?`)
}

function cannotUnderstandTo(alexa){
    alexa.attributes.askFor = 'TO'
    alexa.emit(':ask',
               `${randomCantUnderstandMessage()}. To which place do you want to plan a trip for ?`,
               `Please say to which place you want to plan your trip to ?`)
}

function comfirmFromAndTo(alexa){
    delete alexa.attributes.askFor
    alexa.attributes.confirmFor = 'LOCATION'
    alexa.emit(':ask',
               `So, you want to plan a trip from ${alexa.attributes.from.name} to ${alexa.attributes.to.name}. Am I right ?`,
               `If you confirm I will start planning a trip with available public transports from ${alexa.attributes.from.name} to ${alexa.attributes.to.name}. Shall I continue ?`)
}

function randomCantUnderstandMessage(){
    let messages = [
        'Sorry I didn\'t understand that',
        'I didn\'t quite catch that'
    ]
    return _.sample(messages)
}

function parseDate(isoDateString){
    let date = Date.parse(isoDateString)
    return date && date.toString('yyyy-MM-dd')
}