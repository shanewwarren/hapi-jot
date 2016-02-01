'use strict';

// Load modules

const Hoek = require('hoek');
const Joi = require('joi');
const JWT = require('jsonwebtoken');
const Boom = require('boom');

// Declare internals

const internals = {
    msRegex: /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i
};


// Plugin

exports.register = function (server, options, next) {

    server.auth.scheme('jwt', internals.jwt);
    next();
};

exports.register.attributes = {
    pkg: require('../package.json')
};


// Validation

internals.schema = {

    key: Joi.string().required(),

    validateFunc: Joi.func().arity(2).required(),

    lookupFunc: Joi.func().arity(3).optional(),

    tokenUrl: Joi.string().optional().default('/token'),

    options: Joi.object({

        algorithm: Joi.string().valid('HS256', 'HS384','HS512', 'RS256', 'RS384', 'RS512',
                                      'ES256','ES384', 'ES512', 'none').optional(),

        expiresIn: Joi.alternatives().try(
            Joi.number(),
            Joi.string().regex(internals.msRegex)),

        notBefore: Joi.alternatives().try(
            Joi.number(),
            Joi.string().regex(internals.msRegex)),

        audience: Joi.string().optional(),

        issuer: Joi.string().optional(),

        jwtid: Joi.string().optional(),

        subject: Joi.string().optional(),

        noTimestamp: Joi.boolean().optional(),

        headers: Joi.object({ arg: Joi.string().required(),
                              value: Joi.string().required() }).optional()
    })
};

internals.token = function (settings) {

    const signOptions = {};

    if (settings.options) {
        if (settings.options.expiresIn) {
            signOptions.expiresIn = settings.options.expiresIn;
        }

        if (settings.options.notBefore) {
            signOptions.notBefore = settings.options.notBefore;
        }

        if (settings.options.algorithm) {
            signOptions.algorithm = settings.options.algorithm;
        }

        if (settings.options.issuer) {
            signOptions.issuer = settings.options.issuer;
        }

        if (settings.options.audience) {
            signOptions.audience = settings.options.audience;
        }

        if (settings.options.subject) {
            signOptions.subject = settings.options.audience;
        }
    }


    return (request, reply) => {
    
        settings.validateFunc(request, (err, isValid, credentials) => {

            if (err || !isValid) {

                return reply(Boom.unauthorized('Invalid credentials'));
            }

            JWT.sign(credentials, settings.key, signOptions, (token) => {

                return reply(null, {
                    token: token
                });
            });
        });
    };
};

internals.authenticate = function (settings) {

    const verifyOptions = {};
    if (settings.options) {
        if (settings.options.expiresIn) {
            verifyOptions.ignoreExpiration = false;
        }

        if (settings.options.notBefore) {
            verifyOptions.ignoreNotBefore = false;
        }
        
        if (settings.options.subject) {
            verifyOptions.subject = settings.options.subject;
        }
        
        if (settings.options.algorithm) {
            verifyOptions.algorithms = [settings.options.algorithm];
        }

        if (settings.options.issuer) {
            verifyOptions.issuer = settings.options.issuer;
        }

        if (settings.options.audience) {
            verifyOptions.audience = settings.options.audience;
        }
    }

    return function (request, reply) {

        const req = request.raw.req;
        const authorization = req.headers.authorization;
        if (!authorization) {

            return reply(Boom.unauthorized(null, 'jwt'));
        }

        const parts = authorization.split(/\s+/);
        if (parts[0].toLowerCase() !== 'bearer') {
            
            return reply(Boom.unauthorized(null, 'jwt'));
        }

        // missing actual token information.
        if (parts.length !== 2) {
            
            return reply(Boom.badRequest('Bad HTTP authentication header format', 'jwt'));
        }
        
        const token = parts[1];
        
        // check that the token has three parts
        if (token.split('.').length !== 3) {
            
            return reply(Boom.badRequest('Invalid token format'));
        }
        

        // now verify the token.
        JWT.verify(token, settings.key, verifyOptions, (err, decoded) => {

            if (err && err.name === 'JsonWebTokenError') {

                return reply(Boom.unauthorized('Invalid token'));
            }
            else if (err && err.name === 'TokenExpiredError') {

                return reply(Boom.unauthorized('Expired token'));
            }
            else if (err && err.name === 'NotBeforeError') {

                return reply(Boom.unauthorized('Token not active'));
            }
            else if (!settings.lookupFunc) {

                return reply.continue({ credentials: decoded });
            }
            
            settings.lookupFunc(request, decoded, (err, isValid, credentials) => {

                if (err || !isValid) {

                    return reply(Boom.unauthorized('Invalid token'));
                }
                
                return reply.continue({ credentials: credentials });
            });
        });
    };

};


internals.jwt = function (server, options) {

    // Validate the options
    const results = Joi.validate(options, internals.schema);
    Hoek.assert(!results.error, results.error);

    // Assign defaults and type coercions.
    const settings = results.value;

    // Setup 'token' route
    server.route({
        method: 'POST',
        path: settings.tokenUrl,
        handler: internals.token(settings)
    });

    const scheme = {
        authenticate: internals.authenticate(settings)
    };

    return scheme;
};


