/*
 * SubModule for setting up the server.
 */
'use strict';

var express = require('express');
var fs = require('fs');
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
    app.post('/server/add_user_to_channel', routes.addUserToChannel);
    app.post('/server/add_session_to_channel', routes.addSessionToChannel);
    app.post('/server/remove_user_from_channel', routes.removeUserFromChannel);
    app.post('/server/remove_session_from_channel', routes.removeSessionFromChannel);
    app.post('/server/get_channel_users', routes.getChannelUsers);
    //app.post('/server/reload_user_channels', routes.updateUserData);

    app.all('*', routes.send404);

    //HTTPS/SSL server
    if(typeof settings.sslConf.key !== "undefined" && typeof settings.sslConf.cert !== "undefined") {
        var sslConf = {
            key: fs.readFileSync(settings.sslConf.key, 'utf-8'),
            cert: fs.readFileSync(settings.sslConf.cert, 'utf-8')
        };
        var sslShParam = settings.sslConf.dhparam;
        if(typeof sslShParam !== "undefined") {
            sslConf.dhparam = fs.readFileSync(sslShParam, 'utf-8');
        }
        var https = require('https');
        httpServer = https.createServer(sslConf, app);
    //HTTP server
    } else {
        var http = require('http');
        httpServer = http.createServer(app);
    }

    httpServer.listen(settings.port);

    var io = require('socket.io')(httpServer);

    io.on('connection', function(socket) {
        clientManager.addSocket(socket);
    }).on('error', function(exception) {
        logger.log('Socket error [' + exception + ']');
    });

    //CleanUp interval
    setInterval(function () {
        clientManager.cleanUp();
    }, 2000);

};

module.exports = server;