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
        broadcast = typeof request.body.broadcast !== "undefined" ? request.body.broadcast : false;
    if(typeof request.body.callback !== "undefined") body.callback = request.body.callback;
    var sentCount = 0, resp = {success: false, sent: 0};
    if(userId === false && sessionId === false && channel === false && broadcast === false) {
        resp.error = 'Undefined recipient (sessionId|userId|channel|broadcast)';
    } else if(userId !== false) {
        request.clientManager.publishMessageToUser(request.body.userId, body);
    } else if(sessionId !== false) {
        request.clientManager.publishMessageToSid(request.body.sessionId, body);
    } else if(channel !== false) {
        request.clientManager.publishMessageToChannel(channel, body);
    } else if(broadcast !== false && broadcast) {
        request.clientManager.publishMessageBroadcast(body);
    }
    resp.success = typeof resp.error === "undefined";
    resp.sent = sentCount;

    response.json(resp);
};

Routes.prototype.addChannelToUser = function (request, response) {

    response.json({success: true});
};

Routes.prototype.updateUserData = function (request, response) {
    var sid = request.body.sid;

    response.json({success: true});
};

Routes.prototype.send404 = function (request, response) {
    response.status(404).send('Not Found.');
};

module.exports = Routes;