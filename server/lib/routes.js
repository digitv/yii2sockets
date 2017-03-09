'use strict';

function Routes() {
    // Dependencies are injected by a middleware into the request object in each route callback.
    // Available objects:
    //   - request.clientManager
    //   - request.clientManager.backend
    //   - request.clientManager.settings
}

Routes.prototype.checkServiceKey = function (request, response, next) {
    console.log('Check service key');
    if (request.clientManager.settings.serviceKey == request.header('NodejsServiceKey', '')) {
        next();
    } else {
        response.send({'error': 'Invalid service key.'});
    }
};

Routes.prototype.publishMessage = function (request, response) {
    var body = {body: request.body.body},
        channel = typeof request.body.channel !== "undefined" ? request.body.channel : false,
        userId = typeof request.body.userId !== "undefined" ? request.body.userId : false,
        sessionId = typeof request.body.sessionId !== "undefined" ? request.body.sessionId : false,
        socketId = typeof request.body.socketId !== "undefined" ? request.body.socketId : false,
        broadcast = typeof request.body.broadcast !== "undefined" ? request.body.broadcast : false;
    if(typeof request.body.callback !== "undefined") body.callback = request.body.callback;
    var sentCount = 0, resp = {success: false, sent: 0};
    if(userId === false && sessionId === false && socketId === false && channel === false && broadcast === false) {
        resp.error = 'Undefined recipient (sessionId|socketId|userId|channel|broadcast)';
    //Send to User ID
    } else if(userId !== false) {
        //Users ID array
        if(typeof userId !== "object") {
            sentCount = 0;
            for (var i in userId) {
                sentCount += request.clientManager.publishMessageToUser(userId[i], body);
            }
        //Single user ID
        } else {
            sentCount = request.clientManager.publishMessageToUser(userId, body);
        }
    //Send to Session ID
    } else if(sessionId !== false) {
        sentCount = request.clientManager.publishMessageToSid(sessionId, body);
    //Send to Socket ID
    } else if(socketId !== false) {
        sentCount = request.clientManager.publishMessageToClient(socketId, body) ? 1 : 0;
    //Send to channel
    } else if(channel !== false) {
        sentCount = request.clientManager.publishMessageToChannel(channel, body);
    //Send to all users
    } else if(broadcast !== false && broadcast) {
        sentCount = request.clientManager.publishMessageBroadcast(body);
    }
    resp.success = typeof resp.error === "undefined";
    resp.sent = sentCount;

    response.json(resp);
};

Routes.prototype.addUserToChannel = function (request, response) {
    var result = request.clientManager.addUserToChannel(request.body.uid, request.body.channel, true);
    response.json({success: result});
};

Routes.prototype.addSessionToChannel = function (request, response) {
    var result = request.clientManager.addSessionToChannel(request.body.sid, request.body.channel, true);
    response.json({success: result});
};

Routes.prototype.removeUserFromChannel = function (request, response) {
    var result = request.clientManager.removeUserFromChannel(request.body.uid, request.body.channel);
    response.json({success: result});
};

Routes.prototype.removeSessionFromChannel = function (request, response) {
    var result = request.clientManager.removeSessionFromChannel(request.body.sid, request.body.channel);
    response.json({success: result});
};

Routes.prototype.getChannelUsers = function (request, response) {
    var result = request.clientManager.getChannelUsersCached(request.body.channel);
    response.json({success: true, users: result});
};

Routes.prototype.updateUserData = function (request, response) {
    var sid = request.body.sid;

    response.json({success: true});
};

Routes.prototype.send404 = function (request, response) {
    response.status(404).send('Not Found.');
};

module.exports = Routes;