let bst = require('bespoken-tools'),
    server = null,
    alexa = null

describe('Alexa UK Transport', function () {

    beforeEach(function (done) {
        server = new bst.LambdaServer('./index.js', 8080, true)
        alexa = new bst.BSTAlexa('http://localhost:8080',
            'speechAssets/IntentSchema.json',
            'speechAssets/SampleUtterances.txt')
        server.start(function () {
            alexa.start(function (error) {
                if (error !== undefined) {
                    console.error("Error: " + error)
                } else {
                    console.log("success")
                    done()
                }
            })
        })
    })

    afterEach(function (done) {
        alexa.stop(function () {
            server.stop(function () {
                done()
            });
        });
    })

    it('trip planner - case 1', function (done) {
        this.timeout(20000)
        alexa.spoken('plan a trip from {wembley stadium}', (error, response) => {
            alexa.intended('LocationIntent', {location: 'downing street'}, (error, response) => {
                alexa.spoken('no', () => {
                    alexa.spoken('plan a trip from {wembley stadium}', (error, response) => {
                        alexa.intended('LocationIntent', {location: 'downing street'}, (error, response) => {
                            alexa.spoken('yes', () => {
                                alexa.intended('DateTimeIntent', { time: '17:00' }, () => {
                                    done()
                                })
                            })
                        })
                    })
                })
            })
        })
    })

    it('nearby stations - case 1', function (done) {
        this.timeout(20000)
        alexa.spoken('find stations nearby {wembley stadium}', (error, response) => {
            alexa.spoken('yes', () => {
                done()
            })
        })
    })

    /** More Test cases will be updated soon */

})