'use strict';

var redis = require('redis');
var cookie = require('cookie');
var crypto = require('crypto');
var Utility = require('./utility');
var unSerialize=require("php-unserialize").unserializeSession;

function ClientManager(settings) {
    this.logPrefix = 'ClientManager->';             //prefix for log output
    this.settings = settings;                       //app settings
    this.sessionChannels = {};                      //auto connect session channels
    this.channels = {};                             //channels list (active)
    this.sockets = {};                              //sockets list by their id
    this.sessions = {};                             //sockets list by session id
    this.users = {};                                //sockets list by uid
    this.channelUsers = {};                         //Channel users connected
    this.expired = {sessions: {}, channels: {}};    //expired data
    this.logger = new Utility.Logger(this.settings);
}

/**
 * Get sockets count
 */
ClientManager.prototype.getSocketCount = function () {
    return Object.keys(this.sockets).length;
};

/**
 * Mark channel as expired
 */
ClientManager.prototype.expireChannel = function (channel) {
    return this.expire(channel, "channel");
};

/**
 * Mark session as expired
 */
ClientManager.prototype.expireSession = function (sid) {
    return this.expire(sid, "session");
};

/**
 * Mark data as expired
 */
ClientManager.prototype.expire = function (id, type) {
    var d = new Date(), time = d.getTime();
    if(typeof type === "undefined") type = "session";
    switch (type) {
        case "session":
            this.expired.sessions[id] = time + 10000;
            break;
        case "channel":
            this.expired.channels[id] = time + 10000;
            break;
    }
};

/**
 * Remove expire time mark
 */
ClientManager.prototype.expireRemove = function (id, type) {
    switch (type) {
        case "session":
            if(typeof this.expired.sessions[id] === "undefined") return;
            delete this.expired.sessions[id];
            break;
        case "channel":
            if(typeof this.expired.channels[id] === "undefined") return;
            delete this.expired.channels[id];
            break;
    }
};

/**
 * CleanUp data
 */
ClientManager.prototype.cleanUp = function () {
    var i, self = this, d = new Date(), time = d.getTime(), timeExpire;
    //Sessions
    for (i in self.expired.sessions) {
        if(!self.expired.sessions.hasOwnProperty(i)) continue;
        timeExpire = self.expired.sessions[i];
        if(timeExpire <= time) {
            if(typeof this.sessions[i] !== "undefined" && !Object.keys(this.sessions[i].sockets).length) {
                delete this.sessions[i];
                if(typeof this.sessionChannels[i] !== "undefined") { delete this.sessionChannels[i]; }
            }
            self.expireRemove(i, "session");
        }
    }
    //Channels
    for (i in self.expired.channels) {
        if(!self.expired.channels.hasOwnProperty(i)) continue;
        timeExpire = self.expired.channels[i];
        if(timeExpire <= time) {
            if(!Object.keys(this.channels[i].socketIds).length) {
                this.removeChannel(i);
            }
            self.expireRemove(i, "channel");
        }
    }
};

/**
 * Add new socket (on connect)
 */
ClientManager.prototype.addSocket = function (socket) {
    var self = this;
    var redisClient = redis.createClient(this.settings.redis.port, this.settings.redis.hostname);

    socket.handshake.query.userPage = typeof socket.handshake.query.userPage !== "undefined" ? socket.handshake.query.userPage : '/';

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
                    self.addSessionToChannelMultipleInternal(socket, data.session.nodejs.channels);
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
    if(!this.channelUsers.hasOwnProperty(channel)) {
        this.channelUsers[channel] = {};
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
        if(Object.keys(this.sessionChannels).length) {
            for (var sid in this.sessionChannels) {
                if(typeof this.sessionChannels[sid][channel] !== "undefined") delete this.sessionChannels[sid][channel];
                if(!Object.keys(this.sessionChannels[sid])) delete this.sessionChannels[sid];
            }
        }
        if(typeof this.channelUsers[channel] !== "undefined") {
            delete this.channelUsers[channel];
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
ClientManager.prototype.addSocketToChannel = function (socketId, channel, autoCreate, urlCheck) {
    if(!this.channelExists(channel)) {
        if(typeof autoCreate === "undefined" || !autoCreate) {
            this.logger.log(this.logPrefix + 'addSocketToChannel: Channel "'+channel+'" not exists');
            return false;
        }
        this.addChannel(channel);
    }
    urlCheck = typeof urlCheck !== "undefined" ? urlCheck : '*';
    this.channels[channel].socketIds = typeof this.channels[channel].socketIds !== "undefined" ? this.channels[channel].socketIds : {};
    if(urlCheck != "*") {
        var urlChecked = false;
        if(typeof urlCheck === "object") {
            for (var i in urlCheck) {
                if(urlCheck[i] == this.sockets[socketId].handshake.query.userPage) { urlChecked = true; break; }
            }
        } else if(urlCheck == this.sockets[socketId].handshake.query.userPage) {
            urlChecked = true;
        }
        if(!urlChecked) return false;
    }
    this.channels[channel].socketIds[socketId] = socketId;
    if(typeof this.channelUsers[channel][this.sockets[socketId].uid] === "undefined") this.channelUsers[channel][this.sockets[socketId].uid] = this.sockets[socketId].uid;
    this.sockets[socketId].emit('channelConnect', channel);
    this.logger.debug(this.logPrefix + 'addSocketToChannel: Socket "'+socketId+'" added to channel "'+channel+'"');
    return true;
};

/**
 * Add session ID to channel
 */
ClientManager.prototype.addSessionToChannel = function (sid, channel, autoCreate, urlCheck) {
    if(!this.channelExists(channel)) {
        if(typeof autoCreate === "undefined" || !autoCreate) {
            this.logger.log(this.logPrefix + 'addSessionToChannel: Channel "'+channel+'" not exists');
            return false;
        }
        this.addChannel(channel);
    }
    urlCheck = typeof urlCheck !== "undefined" ? urlCheck : '*';
    if(typeof this.sessions[sid] === "undefined" || !Object.keys(this.sessions[sid].sockets).length) {
        this.logger.log(this.logPrefix + 'addSessionToChannel: Session "'+sid+'" not exists');
        return false;
    }
    this.sessionChannels[sid] = typeof this.sessionChannels[sid] !== "undefined" ? this.sessionChannels[sid] : {};
    this.sessionChannels[sid][channel] = channel;
    for (var socketId in this.sessions[sid].sockets) {
        if(typeof this.channels[channel].socketIds[socketId] !== "undefined") continue;
        this.addSocketToChannel(socketId, channel, false, urlCheck);
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

ClientManager.prototype.addSessionToChannelMultipleInternal = function (socket, sessionChannels) {
    var sid = socket.sid, channel;
    this.sessionChannels[sid] = typeof this.sessionChannels[sid] !== "undefined" ? this.sessionChannels[sid] : {};
    for (var i in sessionChannels){
        channel = i;
        if(typeof this.sessionChannels[sid][channel] === "undefined") {
            this.addSessionToChannel(socket.sid, channel, true, sessionChannels[i]);
        } else {
            this.addSocketToChannel(socket.id, channel, true, sessionChannels[i]);
        }
    }
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
 * Get channel user list
 */
ClientManager.prototype.getChannelUsers = function (channel) {
    if(!this.channelExists(channel)) {
        this.logger.log(this.logPrefix + 'getChannelUsers: Channel "'+channel+'" not exists');
        return false;
    }
    var userIds = {}, userId;
    for (var socketId in this.channels[channel].socketIds) {
        userId = this.sockets[socketId].uid;
        if(userId && typeof userIds[userId] === "undefined") userIds[userId] = userId;
    }
    return userIds;
};

/**
 * Get channel user list (cached)
 */
ClientManager.prototype.getChannelUsersCached = function (channel) {
    if(!this.channelExists(channel)) {
        this.logger.log(this.logPrefix + 'getChannelUsers: Channel "'+channel+'" not exists');
        return false;
    }
    return typeof this.channelUsers[channel] !== "undefined" ? this.channelUsers[channel] : {};
};

/**
 * Remove socket from channel
 */
ClientManager.prototype.removeSocketFromChannel = function (socketId, channel, skipChannelDelete) {
    if(!this.channelExists(channel)) {
        this.logger.log(this.logPrefix + 'removeSocketFromChannel: Channel "'+channel+'" not exists');
        return false;
    }
    if(typeof this.channels[channel].socketIds[socketId] !== "undefined") {
        delete this.channels[channel].socketIds[socketId];
    }
    if(typeof skipChannelDelete === "undefined" || !skipChannelDelete) {
        //remove channel if empty
        if(!Object.keys(this.channels[channel].socketIds).length) {
            this.expireChannel(channel);
        }
    }
    var userId = this.sockets[socketId].uid;
    if(typeof this.users[userId] === "undefined" && typeof this.channelUsers[channel] !== "undefined" && typeof this.channelUsers[channel][userId] !== "undefined") {
        delete this.channelUsers[channel][userId];
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
            //expire session in session list
            this.expireSession(sid);
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
    var sentCount = this.getSocketCount();
    for (var socketId in this.sockets) {
        res = this.publishMessageToClient(socketId, message);
    }
    this.logger.debug(this.logPrefix + 'publishMessageBroadcast: sent to '+sentCount+' recipients');
    return sentCount;
};

module.exports = ClientManager;