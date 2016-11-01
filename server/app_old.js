var conf = require('./config.js');
var server = require('./lib/client-manager');


var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var redis = require('redis');
var conf = require('./config.js');

var unSerialize=require("php-unserialize").unserializeSession;
var crypto = require('crypto');
var cookieParser = require('cookie-parser');
var cookie = require('cookie');
var bodyParser = require('body-parser');
var ClientManager = require('./lib/client-manager');

var clientManager = new ClientManager(conf);


app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

http.listen(conf.get('port'));

io.on('connection', function (socket) {

    //console.log(socket);
    console.log("new client connected. ID: "+socket.id);

    var sessionData = {};
    sessionData.cookies = cookie.parse(socket.handshake.headers.cookie);
    sessionData.sid = sessionData.cookies[conf.get('cookieName')];
    sessionData.sidRedis = conf.get('sessionKeyPrefix') + crypto.createHash('md5').update(sessionData.sid).digest('hex');

    var redisClient = redis.createClient(conf.get('redis.port'), conf.get('redis.hostname'));

    clientManager.updateClientData(socket, sessionData);
    redisClient.on('connect', function() { /*console.log('connected REDIS');*/ });

    redisClient.get(sessionData.sidRedis, function(err, reply) {
        if(reply) {
            sessionData.session = unSerialize(reply);
        } else {
            sessionData.session = {};
        }
        clientManager.updateClientData(socket, sessionData);
        console.log(sessionData);
    });

    socket.on('disconnect', function() {
        redisClient.quit();
    });

});

app.use(function (request, response, next) {
    // Make objects available to route callbacks.
    // (Needed because route callbacks cannot access properties via the 'this' keyword.)
    request.clientManager = clientManager;
    next();
});

app.all('/server*', function (req, res, next) {
    console.log(req.method);
    if(req.method === "POST" && req.body.serviceKey && req.body.serviceKey == conf.get('serviceKey')) {
        console.log(conf.get('serviceKey'));
        next();
    } else {
        res.status(404);
        res.send({ error: 'Not found' });
    }
});

app.post('/server/publish_message', function (req, res) {
    var body = req.body.body;
    var channel = req.body.channel;
    res.json({success: true});
});
