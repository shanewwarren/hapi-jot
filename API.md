
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
