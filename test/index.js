'use strict';

// Load modules

const expect = require('chai').expect; // assertion library
const Hapi = require('hapi');
const HapiAuthJwt = require('../lib');


const internals = {};

internals.users = {
    john: {
        username: 'john',
        password: '$2a$10$iqJSHD.BGr0E2IxQwYgJmeU5QtjVu5Tm',   // 'secret'
        name: 'John Doe',
        id: '2133d32a'
    }
};

describe('hapi-jot', () => {

    it('should require a key, a lookup function, and a validation function', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            expect(err).to.be.undefined;

            try {
                server.auth.strategy('custom', 'jwt', {
                    // no options
                });
            }
            catch (e) {

                expect(e).not.to.be.undefined;
            }

            done();
        });
    });



    it('should return a json response with a token', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            expect(err).to.be.undefined;

            server.auth.strategy('custom', 'jwt', {
                key: 'superSecret',
                validateFunc: (request, callback) => {

                    const user = internals.users.john;
                    callback(null, true, user);
                }
            });

            server.inject({
                url: '/token',
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
    
    
    it('should return a json response with a token, when setting tokenUrl', (done) => {

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

    it('returns 401 when called before notBefore time', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            expect(err).to.be.undefined;

            server.auth.strategy('token', 'jwt', {
                key: 'superSecret',
                options: {
                    notBefore: '10s'
                },
                validateFunc: (request, callback) => {

                    const user = internals.users.john;
                    callback(null, true, user);
                }
            });

            server.route({
                method: 'GET', path: '/user',
                config: {
                    auth: {
                        mode: 'required',
                        strategy: 'token'
                    },
                    handler: function (request, reply) {

                        return reply(request.auth.credentials);
                    }
                }
            });
            
            server.inject({
                url: '/token',
                method: 'POST',
                payload: {
                    username: 'shanewwarren',
                    password: '12345678'
                }
            }, (res) => {

                const token = JSON.parse(res.payload).token;
                server.inject({
                    url: '/user',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }, (innerRes) => {

                    expect(innerRes.statusCode).to.equal(401);
                    done();
                });
            });

        });
    });

    it('should return a 401 due to expired token', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            expect(err).to.be.undefined;

            server.auth.strategy('token', 'jwt', {
                key: 'superSecret',
                options: {
                    expiresIn: '1s'
                },
                validateFunc: (request, callback) => {

                    const user = internals.users.john;
                    callback(null, true, user);
                }
            });

            server.route({
                method: 'GET', path: '/user',
                config: {
                    auth: {
                        mode: 'required',
                        strategy: 'token'
                    },
                    handler: function (request, reply) {

                        return reply(request.auth.credentials);
                    }
                }
            });
            
            // token should expire in 1 second...
            // so we will wait 1.5 seconds.
            server.inject({
                url: '/token',
                method: 'POST',
                payload: {
                    username: 'shanewwarren',
                    password: '12345678'
                }
            }, (res) => {

                setTimeout(() => {

                    const token = JSON.parse(res.payload).token;
                    server.inject({
                        url: '/user',
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }, (innerRes) => {

                        expect(innerRes.statusCode).to.equal(401);
                        done();
                    });

                }, 1500);
            });

        });
    });

    it('should authenticate a request', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            expect(err).to.be.undefined;

            server.auth.strategy('token', 'jwt', {
                key: 'superSecret',
                validateFunc: (request, callback) => {

                    const user = internals.users.john;
                    callback(null, true, user);
                }
            });

            server.route({
                method: 'GET', path: '/user',
                config: {
                    auth: {
                        mode: 'required',
                        strategy: 'token'
                    },
                    handler: function (request, reply) {

                        return reply(request.auth.credentials);
                    }
                }
            });

            server.inject({
                url: '/token',
                method: 'POST',
                payload: {
                    username: 'shanewwarren',
                    password: '12345678'
                }
            }, (res) => {

                const token = JSON.parse(res.payload).token;
                server.inject({
                    url: '/user',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }, (innerRes) => {

                    const payload = JSON.parse(innerRes.payload);
                    expect(payload.id).to.equal(internals.users.john.id);
                    expect(payload.name).to.equal(internals.users.john.name);
                    done();
                });

            });
        });
    });


    it('should authenticate a request without a lookupFunc', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            expect(err).to.be.undefined;

            server.auth.strategy('token', 'jwt', {
                key: 'superSecret',
                validateFunc: (request, callback) => {

                    const user = internals.users.john;
                    callback(null, true, user);
                }
            });

            server.route({
                method: 'GET', path: '/user',
                config: {
                    auth: {
                        mode: 'required',
                        strategy: 'token'
                    },
                    handler: function (request, reply) {

                        return reply(request.auth.credentials);
                    }
                }
            });

            server.inject({
                url: '/token',
                method: 'POST',
                payload: {
                    username: 'shanewwarren',
                    password: '12345678'
                }
            }, (res) => {

                const token = JSON.parse(res.payload).token;
                server.inject({
                    url: '/user',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }, (innerRes) => {

                    const payload = JSON.parse(innerRes.payload);

                    expect(payload.id).to.equal(internals.users.john.id);
                    expect(payload.name).to.equal(internals.users.john.name);
                    done();
                });

            });
        });
    });

    it('should return a 401 when no valid token is present', (done) => {

        const server = new Hapi.Server();
        server.connection({ host: 'localhost', port: 80 });
        server.register(HapiAuthJwt, (err) => {

            server.auth.strategy('token', 'jwt', {
                key: 'superSecret',
                validateFunc: (request, callback) => {

                    const user = internals.users.john;
                    callback(null, true, user);
                }
            });

            server.route({
                method: 'GET', path: '/user',
                config: {
                    auth: {
                        mode: 'required',
                        strategy: 'token'
                    },
                    handler: function (request, reply) {

                        return reply(request.auth.credentials);
                    }
                }
            });

            server.inject({
                url: '/user',
                method: 'GET'
            }, (res) => {

                expect(res.statusCode).to.equal(401);
                done();
            });
        });
    });

});
