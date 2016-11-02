'use strict';

var redis = require('redis');
var cookie = require('cookie');
var crypto = require('crypto');
var Utility = require('./utility');
var unSerialize=require("php-unserialize").unserializeSession;

function ClientManager(settings) {
    this.logPrefix = 'ClientManager->';     //prefix for log output
    this.settings = settings;               //app settings
    this.authenticatedClients = {};
    this.sessionChannels = {};
    this.channels = {};                     //channels list (active)
    this.sockets = {};                      //sockets list by their id
    this.sessions = {};                     //sockets list by session id
    this.users = {};                        //sockets list by uid
    this.logger = new Utility.Logger(this.settings);
}

ClientManager.prototype.getSocketCount = function () {
    return Object.keys(this.sockets).length;
};

/**
 * Add new socket (on connect)
 */
ClientManager.prototype.addSocket = function (socket) {
    var self = this;
    var redisClient = redis.createClient(this.settings.redis.port, this.settings.redis.hostname);

    self.logger.debug(self.logPrefix + 'addSocket: Client '+socket.id+' connected');

    redisClient.on('connect', function() {
        self.updateClientSocketData(socket, redisClient);
    });

    socket.on('disconnect', function() {
        self.logger.debug(self.logPrefix + 'addSocket: Client '+socket.id+' disconnected');
        redisClient.quit();
        self.removeSocket(socket);
    });
};

/**
 * Update and check client session data
 */
ClientManager.prototype.updateClientSocketData = function (socket, redisClient) {
    var data = {sockets: {}, session: {}, cookies: {}, sid: '', uid: 0}, self = this;
    if(socket.handshake.headers.cookie) {
        data.cookies = cookie.parse(socket.handshake.headers.cookie);
        data.sid = typeof data.cookies[this.settings.cookieName] !== "undefined" ? data.cookies[this.settings.cookieName] : '';
        //disconnect if no session cookie
        if(!data.sid) {
            self.logger.debug(self.logPrefix + 'updateClientSocketData: No session ID' + socket.id);
            socket.disconnect(); return;
        }
        if(typeof this.sessions[data.sid] !== "undefined" && typeof this.sessions[data.sid].data !== "undefined") {
            this.sessions[data.sid].data.cookies = data.cookies;
            data = this.sessions[data.sid].data;
        } else {
            data.sidRedis = this.settings.sessionKeyPrefix + crypto.createHash('md5').update(data.sid).digest('hex');
        }
        //Get session data from REDIS
        redisClient.get(data.sidRedis, function (error, reply) {
            if(reply) {
                data.session = unSerialize(reply);
                data.uid = typeof data.session['__id'] !== "undefined" ? data.session['__id'] : 0;
                socket.uid = data.uid;
                socket.sid = data.sid;
                self.sockets[socket.id] = socket;
                if(typeof self.sessions[socket.sid] === "undefined") {
                    self.sessions[socket.sid] = {sockets: {}, data: {}};
                }
                if(typeof self.users[socket.uid] === "undefined") {
                    self.users[socket.uid] = {sockets: {}, sessions: {}};
                }
                self.users[socket.uid].sockets[socket.id] = socket.id;
                self.users[socket.uid].sessions[socket.sid] = socket.sid;
                self.sessions[socket.sid].sockets[socket.id] = socket.id;
                self.sessions[socket.sid].data = data;
                if(typeof data.session.nodejs !== "undefined" && typeof data.session.nodejs.channels !== "undefined") {
                    self.addSessionToChannelMultiple(socket, data.session.nodejs.channels);
                }
            } else {
                //Disconnect if no session
                self.logger.debug(self.logPrefix + 'updateClientSocketData: No session ' + socket.id);
                socket.disconnect();
            }
            //self.logger.debug(self.users);
        });
    } else {
        //Disconnect if no cookies
        self.logger.debug(self.logPrefix + 'updateClientSocketData: No cookies ' + socket.id);
        socket.disconnect();
    }
    return true;
};

/**
 * Add channel to server
 */
ClientManager.prototype.addChannel = function (channel) {
    if(!this.channels.hasOwnProperty(channel)) {
        this.channels[channel] = {socketIds: {}};
    }
    return true;
};

/**
 * Remove channel from server
 */
ClientManager.prototype.removeChannel = function (channel) {
    if(this.channelExists(channel)) {
        if(typeof this.channels[channel].socketIds !== "undefined" && Object.keys(this.channels[channel].socketIds).length) {
            for (var socketId in this.channels[channel].socketIds) {
                this.removeSocketFromChannel(socketId, channel, true);
            }
        }
        if(Object.keys(this.sessionChannels)) {
            for (var sid in this.sessionChannels) {
                if(typeof this.sessionChannels[sid][channel] !== "undefined") delete this.sessionChannels[sid][channel];
                if(!Object.keys(this.sessionChannels[sid])) delete this.sessionChannels[sid];
            }
        }
        delete this.channels[channel];
    }
};

/**
 * Check that channel exists on server
 */
ClientManager.prototype.channelExists = function (channel) {
    return typeof this.channels[channel] !== "undefined";
};

/**
 * Add socket to active channel
 */
ClientManager.prototype.addSocketToChannel = function (socketId, channel, autoCreate) {
    if(!this.channelExists(channel)) {
        if(typeof autoCreate === "undefined" || !autoCreate) {
            this.logger.log(this.logPrefix + 'addSocketToChannel: Channel "'+channel+'" not exists');
            return false;
        }
        this.addChannel(channel);
    }
    this.channels[channel].socketIds = typeof this.channels[channel].socketIds !== "undefined" ? this.channels[channel].socketIds : {};
    this.channels[channel].socketIds[socketId] = socketId;
    this.sockets[socketId].emit('channelConnect', channel);
    this.logger.debug(this.logPrefix + 'addSocketToChannel: Socket "'+socketId+'" added to channel "'+channel+'"');
    return true;
};

/**
 * Add session ID to channel
 */
ClientManager.prototype.addSessionToChannel = function (sid, channel, autoCreate) {
    if(!this.channelExists(channel)) {
        if(typeof autoCreate === "undefined" || !autoCreate) {
            this.logger.log(this.logPrefix + 'addSessionToChannel: Channel "'+channel+'" not exists');
            return false;
        }
        this.addChannel(channel);
    }
    if(typeof this.sessions[sid] === "undefined" || !Object.keys(this.sessions[sid].sockets).length) {
        this.logger.log(this.logPrefix + 'addSessionToChannel: Session "'+sid+'" not exists');
        return false;
    }
    this.sessionChannels[sid] = typeof this.sessionChannels[sid] !== "undefined" ? this.sessionChannels[sid] : {};
    this.sessionChannels[sid][channel] = channel;
    for (var socketId in this.sessions[sid].sockets) {
        if(typeof this.channels[channel].socketIds[socketId] !== "undefined") continue;
        this.addSocketToChannel(socketId, channel);
    }
    return true;
};
/**
 * Add user ID to channel
 */
ClientManager.prototype.addUserToChannel = function (uid, channel, autoCreate) {
    if(typeof this.users[uid] === "undefined" || !Object.keys(this.users[uid].sessions).length || !Object.keys(this.users[uid].sockets).length) {
        this.logger.log(this.logPrefix + 'addUserToChannel: User "'+uid+'" not exists');
        return false;
    }
    if(!this.channelExists(channel)) {
        if(typeof autoCreate === "undefined" || !autoCreate) {
            this.logger.log(this.logPrefix + 'addUserToChannel: Channel "'+channel+'" not exists');
            return false;
        }
        this.addChannel(channel);
    }
    for (var sessionId in this.users[uid].sessions) {
        this.addSessionToChannel(sessionId, channel);
    }
    return true;
};

/**
 * Add session ID to channels (multiple channels)
 */
ClientManager.prototype.addSessionToChannelMultiple = function (socket, channels) {
    var sid = socket.sid, channel;
    this.sessionChannels[sid] = typeof this.sessionChannels[sid] !== "undefined" ? this.sessionChannels[sid] : {};
    for (var i in channels){
        channel = channels[i];
        if(typeof this.sessionChannels[sid][channel] === "undefined") {
            this.addSessionToChannel(socket.sid, channel, true);
        } else {
            this.addSocketToChannel(socket.id, channel, true);
        }
    }
};

/**
 * Remove socket from channel
 */
ClientManager.prototype.removeSocketFromChannel = function (socketId, channel, skipChannelDelete) {
    if(!this.channelExists(channel)) {
        this.logger.log(this.logPrefix + 'removeSocketFromChannel: Channel "'+channel+'" not exists');
        return false;
    }
    if(typeof this.channels[channel].socketIds[socketId] !== "undefined") delete this.channels[channel].socketIds[socketId];
    if(typeof skipChannelDelete === "undefined" || !skipChannelDelete) {
        //remove channel if empty
        if(!Object.keys(this.channels[channel].socketIds).length) this.removeChannel(channel);
    }
    return true;
};

/**
 * Remove session ID from channel
 */
ClientManager.prototype.removeSessionFromChannel = function (sid, channel) {
    if(!this.channelExists(channel)) {
        this.logger.log(this.logPrefix + 'removeSessionFromChannel: Channel "'+channel+'" not exists');
        return false;
    }
    if(typeof this.sessions[sid] === "undefined" || !Object.keys(this.sessions[sid].sockets).length) {
        this.logger.log(this.logPrefix + 'removeSessionFromChannel: Session "'+sid+'" not exists');
        return false;
    }
    if(typeof this.sessionChannels[sid][channel] !== "undefined") delete this.sessionChannels[sid][channel];
    for (var socketId in this.sessions[sid].sockets) {
        this.removeSocketFromChannel(socketId, channel);
    }
    return true;
};

/**
 * Remove user ID from channel
 */
ClientManager.prototype.removeUserFromChannel = function (uid, channel) {
    if(typeof this.users[uid] === "undefined" || !Object.keys(this.users[uid].sessions).length || !Object.keys(this.users[uid].sockets).length) {
        this.logger.log(this.logPrefix + 'removeUserFromChannel: User "'+uid+'" not exists');
        return false;
    }
    if(!this.channelExists(channel)) {
        this.logger.log(this.logPrefix + 'removeUserFromChannel: Session "'+sid+'" not exists');
        return false;
    }
    for (var sessionId in this.users[uid].sessions) {
        this.removeSessionFromChannel(sessionId, channel);
    }
    return true;
};

/**
 * Remove socket from server (delete)
 */
ClientManager.prototype.removeSocket = function (socket) {
    if(typeof this.sockets[socket.id] === "undefined") return;
    var sid = this.sockets[socket.id].sid, uid = this.sockets[socket.id].uid;
    //Cleanup user sockets list
    if(typeof this.users[uid] !== "undefined" && typeof this.users[uid].sockets[socket.id] !== "undefined") {
        delete this.users[uid].sockets[socket.id];
        if(Object.keys(this.users[uid].sockets).length == 0) delete this.users[uid];
    }
    //Cleanup sessions sockets list
    if(typeof this.sessions[sid] !== "undefined" && typeof this.sessions[sid].sockets[socket.id] !== "undefined") {
        delete this.sessions[sid].sockets[socket.id];
        if(Object.keys(this.sessions[sid].sockets).length == 0) {
            //delete session from session list
            delete this.sessions[sid];
            //delete session from users sessions list
            if(typeof this.users[uid] !== "undefined" && typeof this.users[uid].sessions[sid] !== "undefined") {
                delete this.users[uid].sessions[sid];
            }
        }
    }
    //Cleanup channels
    for (var channelName in this.channels) {
        if(typeof this.channels[channelName].socketIds[socket.id] !== "undefined") this.removeSocketFromChannel(socket.id, channelName);
    }
};

//@TODO: Add socket param
ClientManager.prototype.getClientData = function (sid) {
    return typeof this.sessions[sid] !== "undefined" ? this.sessions[sid] : false;
};

/**
 * Publish message to socket id
 */
ClientManager.prototype.publishMessageToClient = function (socketId, message) {
    if (this.sockets[socketId]) {
        this.sockets[socketId].json.send(message);
        this.logger.debug(this.logPrefix + "publishMessageToClient: Sent message to client " + socketId);
        return true;
    } else {
        this.logger.debug(this.logPrefix + "publishMessageToClient: Failed to find client " + socketId);
    }
    return false;
};

/**
 * Publish message to user id
 */
ClientManager.prototype.publishMessageToUser = function (uid, message) {
    if(typeof this.users[uid] === "undefined" || typeof this.users[uid].sockets === "undefined") return 0;
    var res, sentCount = 0;
    for (var socketId in this.users[uid].sockets) {
        res = this.publishMessageToClient(socketId, message);
        sentCount = res ? sentCount +1 : sentCount;
    }
    this.logger.debug(this.logPrefix + 'publishMessageToUser: sent to '+sentCount+' recipients');
    return sentCount;
};

/**
 * Publish message to session id
 */
ClientManager.prototype.publishMessageToSid = function (uid, message) {
    if(typeof this.sessions[sid] === "undefined" || typeof this.sessions[sid].sockets === "undefined") return 0;
    var res, sentCount = 0;
    for (var socketId in this.sessions[sid].sockets) {
        res = this.publishMessageToClient(socketId, message);
        sentCount = res ? sentCount +1 : sentCount;
    }
    this.logger.debug(this.logPrefix + 'publishMessageToSid: sent to '+sentCount+' recipients');
    return sentCount;
};

/**
 * Publish message to channel
 */
ClientManager.prototype.publishMessageToChannel = function (channel, message) {
    if(!this.channelExists(channel)) {
        this.logger.debug(this.logPrefix + 'publishMessageToChannel: Channel "'+channel+'" not exists');
        return 0;
    }
    var sentCount = 0, res;
    for (var socketId in this.channels[channel].socketIds) {
        res = this.publishMessageToClient(socketId, message);
        sentCount = res ? sentCount +1 : sentCount;
    }
    this.logger.debug(this.logPrefix + 'publishMessageToChannel: Send message to "'+sentCount+'" recipients');
    return sentCount;
};

/**
 * Publish broadcast message
 */
ClientManager.prototype.publishMessageBroadcast = function (message) {
    var res;
    var sentCount = Object.keys(this.sockets).length;
    for (var socketId in this.sockets) {
        res = this.publishMessageToClient(socketId, message);
    }
    this.logger.debug(this.logPrefix + 'publishMessageBroadcast: sent to '+sentCount+' recipients');
    return sentCount;
};

module.exports = ClientManager;