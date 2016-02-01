# API

## Usage
**jot** works by exposing an endpoint to generate a JSON Web Token.  The **token**-based authentication strategy is then used to secure your custom hapi endpoints.  The strategy checks and verifies the correctness of the JSON Web Token.  **jot** will only call the handler once the user is successfully authenticated.

## Options

The server.auth.strategy() method has the following strategy options:

- `key` - (**required**) the secret key used to sign and verify the token.
- `validateFunc` - (**required**) the function to perform user lookup and password validation with the signature `function(request, callback)` where:
    - `request` - is the hapi request object of the request which is being authenticated.
    - `callback` - a callback function with the signature `function(err, isValid, credentials)`
        - `err` - an internal error.
        - `isValid` - `true` if the user lookup and password validation is successful, otherwise `false`.
        - `credentials` -  a credentials object passed back to the application that is used to generate a JSON Web Token. Typically, credentials are only included when isValid is true, but there are cases when the application needs to know who tried to authenticate even when it fails (e.g. with authentication mode 'try').

- `lookupFunc` - (**optional**) function used to perform a user lookup and optionally to check and see if the JSON Web Token is still valid.  If this function is not specified, `request.auth.credentials` is set to the decoded JSON Web Token.  The signature of the function is `function(request, decoded, callback)` where:
    - `request` - is the hapi request object of the request which is being authenticated.
    - `decoded` - The decoded and verified JSON Web Token.  Contains the `credentials` passed back to the application specified in the `validateFunc`.
    - `callback` - a callback function with the signature `function(err, isValid, credentials)` 
        - `err` - an internal error.
        - `isValid` - `true` if the user lookup and password validation is successful, otherwise `false`.
        - `credentials` -  a credentials object passed back to the application in request.auth.credentials. Typically, credentials are only included when isValid is true.

- `tokenUrl` - (**optional**) By default the token endpoint is exposed on the `/token` route.  Specify a `tokenUrl` to override the value.  Example: `tokenUrl: '/auth/token'`.

- `options` - (**optional**) Settings to define how the JSON Web Token is signed and consequently verified.

    - `algorithm` - (**optional**) The algorithm used to sign and decode the JSON Web Token.  Valid values are: `HS256`, `HS384`, `HS512`, `RS256`, `RS384`, `RS512`, `ES256`, `ES384`, `ES512`, `none`.

    - `expiresIn` - (**optional**)  Specify the time from now of when the JSON Web Token will expire.  This gives a limit to how long a JSON Web Token is valid.  Value can be expressed in seconds or a string describing a time span [rauchg/ms](https://github.com/rauchg/ms.js). Eg: 60, "2 days", "10h", "7d".

    - `notBefore` - (**optional**) Specify the time from now of when the JSON Web Token will be active and can be used.  The JSON Web Token is not valid until the specified time has passed.  Value can be expressed in seconds or a string describing a time span [rauchg/ms](https://github.com/rauchg/ms.js). Eg: 60, "2 days", "10h", "7d".

    - `audience` - (**optional**) The audience(s) of this token. String value.

    - `issuer` - (**optional**)  The issuer of the claim.  String value.

    - `jwtid` - (**optional**)  The jti (JWT ID) claim provides a unique identifier for the JSON Web Token.

    - `subject` - (**optional**) The subject of this token.  String value.

    - `noTimestamp` - (**optional**) By default the `iat` claim is assigned to the JSON Web Token, when it is generated.  Setting this option to `true` prevents this claim from getting included.

    - `headers` - (**optional**) Include any additional headers to be passed into the JSON Web Token.  `headers` must be in the format of an object containing string key/value pairs.
    })