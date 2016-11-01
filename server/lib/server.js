/*
 * SubModule for setting up the server.
 */
'use strict';

var express = require('express');
var http = require('http');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var ClientManager = require('./client-manager');
var Routes = require('./routes');
var Utility = require('./utility');

var server = {};

server.start = function (conf) {
    var app = express();
    var settings = conf.getProperties();
    var clientManager = new ClientManager(settings);
    var routes = new Routes();
    var httpServer;
    var logger = new Utility.Logger(settings);
    app.use(cookieParser());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.use(function (request, response, next) {
        request.clientManager = clientManager;
        next();
    });

    app.all('/server*', routes.checkServiceKey);

    app.post('/server/publish_message', routes.publishMessage);
    app.post('/server/add_channel_to_user', routes.addChannelToUser);
    app.post('/server/reload_user_channels', routes.updateUserData);

    app.all('*', routes.send404);

    httpServer = http.createServer(app);
    httpServer.listen(settings.port);

    var io = require('socket.io')(httpServer);

    io.on('connection', function(socket) {
        clientManager.addSocket(socket);
    }).on('error', function(exception) {
        logger.log('Socket error [' + exception + ']');
    });

};

module.exports = server;