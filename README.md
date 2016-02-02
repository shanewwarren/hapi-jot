![jot Logo](https://github.com/shanewwarren/hapi-jot/raw/master/images/jot.png)

JWT (JSON Web Token) authentication plugin for [`hapi`](https://github.com/hapijs/hapi).

[![Build Status](https://secure.travis-ci.org/shanewwarren/hapi-jot.svg)](http://travis-ci.org/shanewwarren/hapi-jot)

# Documentation

[**API Documentation**](API.md)

# Example

 ```js
'use strict';

const Hapi = require('hapi');
const Hoek = require('hoek');

const users = {
    jappleseed: {
        id: 1,
        password: 'loveThoseApples', // 'secret'
        name: 'Johnny Appleseed',
        username: 'jappleseed'
    }
};

const server = new Hapi.Server();

server.connection({ host: 'localhost', port: 3000 });

// Register jot with the server
server.register(require('hapi-jot'), (err) => {

    // Handle jot validation errors
    Hoek.assert(!err, err);

    // Declare an authentication strategy using the jwt scheme
    // with the secret key to sign and verify the JWT with, 
    // and the validation function to validate user credentials.
    //
    // The strategy exposes a '/token' endpoint to generate a JWT.
    // A POST request to '/token' with { username: 'jappleseed, password: 'apples' }
    // will respond with a token in the format of:
    // { token: 'eyJ0eXAiOiJKV1QiLCJhbGciO...' }
    server.auth.strategy('token', 'jwt', {
        key: 'mySuperSecretKey',
        validateFunc: (request, callback) => {

            // access the request parameters
            const username = request.payload.username;
            const password = request.payload.password;

            const user = users[username];
            if (!user) {
                return callback(null, false);
            }

            // Perform the validation, obviously
            // passwords shouldn't be stored in plain-text
            // in practice.
            if (user.password === password) {

                callback(null, true, { id: user.id, username: user.username });
            }
            else {

                callback(null, false);
            }


        }
    });


    // Use the 'token' authentication strategy to protect the
    // endpoint that gets the authenticate user's name.
    //
    // In order to authenticate with this endpoint, a valid token
    // must be sent in the 'Authorization' header of the request.
    // 
    // The header takes the form of:
    // 'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciO...'
    server.route({
        method: 'GET',
        path: '/user',
        config: {
            auth: {
                strategy: 'token'
            },
            handler: function (request, reply) {

                if (!request.auth.isAuthenticated) {
                    return reply('Authentication failed due to: ' + request.auth.error.message);
                }

                // Perform the account lookup by using the credentials
                // stored in request.auth.credentials.
                const user = users[request.auth.credentials.username];

                return reply({ name: user.name });
            }
        }
    });

    server.start((err) => {

        Hoek.assert(!err, err);
        console.log(`Server started at: ${server.info.uri} \n\n`);

        console.log(`1.  To generate a token.`);
        console.log(`POST to ${server.info.uri}/token with the following JSON:\n`);

        console.log({
            username: 'jappleseed',
            password: 'loveThoseApples'
        });

        console.log(`\n\n2. To access the secured route include the token as a header in the request.`);

        console.log(`GET to ${server.info.uri}/user with the following header:\n`);

        console.log({
            'Authorization': 'Bearer (token value)'
        });
    });
});

```
