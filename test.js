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

    it('test', function (done) {
        this.timeout(20000)
        alexa.spoken('plan a trip from {big ben} to {downing street}', (error, response) => {
            // console.log('RESPONSE', error, response)
            alexa.spoken('yes', (error, response) => {
                alexa.spoken('on {2017-06-30} {09:00}', (error, response) => {
                    alexa.spoken('next', (error, response) => {
                        alexa.spoken('next', (error, response) => {
                            alexa.spoken('next', (error, response) => {
                                done()
                            })  
                        })  
                    })    
                })    
            })
        })
    })

})