
Jot provides the following functionality:

1.  Generate a JSON Web Token
2.  Secure a route by verifying a JSON Web Token.

### 1.  Generating a JSON Web Token

Jot exposes the configurable route `/token` to acquire a JWT (JSON Web Token).  

```
POST: /token { username: "jappleseed", password: "LovesMeSomeApples" }
```

The `/token` handler calls the required strategy option, `validateFunc`, and provides it the request object.  `validateFunc` accesses the request parameters to perform the user lookup and validation.  If the validation is successful `validateFunc` executes the callback passing the object to generate a JWT from. 
 
 ```js
const Hapi = require('hapi');
const Hoek = require('hoek');
const Jot = require('hapi-jot');
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

server.register(Jot, (err) => {

    Hoek.assert(!err, err);

    server.auth.strategy('token', 'jwt', {
        key: 'keepMeASecret',
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
                callback(err, isValid, { id: user.id, name: user.name });
            });
        });

});
```

If successful, the `/token` replies with the generated JWT: 
```
{ 
    token: 'eyJ0eXAiOiJKV1QiLCJhbGciO...'
}
```



### 2.  Secure a route by verifying a JSON Web Token.




The **nes** protocol is described in the [Protocol documentation](https://github.com/hapijs/nes/blob/master/PROTOCOL.md).

## Examples

### Route invocation

#### Server

```js
'use strict';

const Hapi = require('hapi');
const Jot = require('hapi-jot');

var server = new Hapi.Server();
server.connection();

server.register(Nes, function (err) {

    server.route({
        method: 'GET',
        path: '/h',
        config: {
            id: 'hello',
            handler: function (request, reply) {

                return reply('world!');
            }
        }
    });

    server.start(function (err) { /* ... */ });
});

const server = new Hapi.Server();
server.connection({ host: 'localhost', port: 80 });
server.register(HapiAuthJwt, (err) => {

    expect(err).to.be.undefined;

    server.auth.strategy('custom', 'jwt', {
        key: 'superSecret',
        tokenUrl: '/auth/token',
        validateFunc: (request, callback) => {

            const user = internals.users.john;
            callback(null, true, user);
        }
    });

    server.inject({
        url: '/auth/token',
        method: 'POST',
        payload: {
            username: 'shanewwarren',
            password: '12345678'
        }
    }, (res) => {

        const payload = JSON.parse(res.payload);
        expect(payload).to.have.keys('token');
        done();
    });


});
});
```

#### Client

```js
var Nes = require('nes');

var client = new Nes.Client('ws://localhost');
client.connect(function (err) {

    client.request('hello', function (err, payload) {   // Can also request '/h'

        // payload -> 'world!'
    });
});
```

### Subscriptions


 The `'jwt'` scheme takes the following options:

- `key` - (required) secret used to sign and verify the token.

- `validateFunc` - (required) user and password validation function with the signature `function(request, decoded, callback)` where:
    - `request` - is the hapi request object of the request which is being authenticated.
    - `decoded` - the decoded JSON Web Token payload.
    - `callback` - a callback function with the signature `function(err, isValid, credentials)` where:
        - `err` - an internal error.
        - `isValid` - `true` if the data in the `decoded` object matches the user credentials, otherwise `false`.
        - `credentials` - a credentials object passed back to the application in `request.auth.credentials`. Typically, `credentials` are only
          included when `isValid` is `true`, but there are cases when the application needs to know who tried to authenticate even when it fails
          (e.g. with authentication mode `'try'`).
          
- `lookupFunc` - (required) a user lookup and validation function with the signature `function(request, callback)` where:
    - `request` - is the hapi request object of the request which is being authenticated.
    - `callback` - a callback function with the signature `function(response, credentials)` where:
        - `response` - An optional hapi [`response`](http://hapijs.com/api#response-object) object.  Used to short-circuit creating a token to return an HTTP response to the user.  
        - `payload` - The object that will be signed into a JSON Web Token.  

```javascript
const Hapi = require('hapi');
const HapiAuthJwt = require('../lib');

const users = {
    john: {
        username: 'john',
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeP3NvhPrXAeLSaGCj6IR/XU5QtjVu5Tm',   // 'secret'
        name: 'Johnny Appleseed',
        id: '2133d32a'
    }
};

const validate = function (request, decoded, callback) {

    const user = users[decoded.username];
    if (!user) {
        return callback(null, false);
    }

    Bcrypt.compare(password, user.password, (err, isValid) => {

        callback(err, isValid, { id: user.id, name: user.name });
    });
};

server.register(require('hapi-auth-basic'), (err) => {

    server.auth.strategy('simple', 'basic', { validateFunc: validate });
    server.route({ method: 'GET', path: '/', config: { auth: 'simple' } });
});
```