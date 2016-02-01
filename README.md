![jot Logo](https://github.com/shanewwarren/hapi-jot/raw/master/images/jot.png)

JWT (JSON Web Token) authentication plugin for [`hapi`](https://github.com/hapijs/hapi).

# Documentation

[**API Documentation**](API.md)

# Example

 ```js
const Hapi = require('hapi');
const Hoek = require('hoek');
const Bcrypt = require('bcrypt');

const users = {
    jappleseed: {
        id: 1,
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm', // 'secret'
        name: 'Johnny Appleseed',
        username: 'jappleseed'
    }
};

const server = new Hapi.Server();
server.connection();

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

            Bcrypt.compare(password, user.password, (err, isValid) => {

                // generate a JWT from { id: user.id, name: user.name }
                callback(err, isValid, { id: user.id, username: user.username });
            });
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
    
    server.start();
});
```
