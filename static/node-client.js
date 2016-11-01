/**
 *
 */
if(typeof io !== "undefined") {
    var socket = io(ioConf.scheme+'://'+ioConf.host+':'+ioConf.port);
    //console.log(socket);

    socket.on('connect', function () {
        console.log('connected');
    });

    socket.on('disconnect', function () {
        console.log('disconnected');
    });

    socket.on('message', function (message) {
        if(typeof message.callback !== "undefined" && typeof YiiNodeSockets.callbacks[message.callback] !== "undefined") {
            YiiNodeSockets.callbacks[message.callback](message, socket);
        }
    });

    socket.on('channelConnect', function (channelName) {
        console.log('channelConnect: ' + channelName);
    });
}

var YiiNodeSockets = {callbacks: {}};

YiiNodeSockets.callbacks.testCallback = function (message, _socket) {
    console.log(message);
    console.log('test callback!');
};

//jQuery frames callback
YiiNodeSockets.callbacks.jQueryFrameCallback = function (message, _socket) {
    if(typeof message.body.selector === "undefined") return;
    if(typeof message.body.methods === "undefined" || !message.body.methods.length) return;
    var elements = jQuery(message.body.selector), methodRow, args;
    for (var i in message.body.methods) {
        methodRow = message.body.methods[i];
        if(typeof jQuery.fn[methodRow.method] !== "function") continue;
        args = typeof methodRow.arguments !== "undefined" ? methodRow.arguments : [];
        //fix integer arguments
        for (var j in args) {
            if(typeof args[j] === "string" && args[j] == parseInt(args[j])) args[j] = parseInt(args[j]);
        }
        jQuery.fn[methodRow.method].apply(elements, args);
    }
};
