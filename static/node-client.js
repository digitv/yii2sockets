/**
 *
 */
if(typeof io !== "undefined") {
    var socket = io(ioConf.scheme+'://'+ioConf.host+':'+ioConf.port);

    socket.on('connect', function () {
        console.log('connected to socket.io');
        jQuery.ajaxSetup({
            headers: { 'Yii-Node-Socket-id': socket.id }
        });
    });

    socket.on('disconnect', function () {
        console.log('disconnected from socket.io');
        jQuery.ajaxSetup({
            headers: { 'yii-node-socket-id': '' }
        });
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

//Init base object
var YiiNodeSockets = {callbacks: {}};

//just test callback to show how it must be written
YiiNodeSockets.callbacks.testCallback = function (message, _socket) {
    console.log(message);
    console.log('!test callback!');
};

//jQuery frames callback
YiiNodeSockets.callbacks.jQueryFrameCallback = function (message, _socket) {
    if(typeof message.body.selector === "undefined") return;
    if(typeof message.body.methods === "undefined" || !message.body.methods.length) return;
    var elements = jQuery(message.body.selector), methodRow, args;
    for (var i in message.body.methods) {
        methodRow = message.body.methods[i];
        args = typeof methodRow.arguments !== "undefined" ? methodRow.arguments : [];
        //Function invoke
        if(methodRow.method == "_func") {
            var functionName = args.shift();
            if(functionName.indexOf('.') === -1 && typeof window[functionName] === "function") {
                window[functionName].apply(window, args);
            } else if(functionName.indexOf('.') !== -1) {
                var functionChain = functionName.split('.'), functionObj = window, _functionName;
                while (functionChain.length > 0 && functionObj !== false) {
                    _functionName = functionChain.shift();
                    if(typeof functionObj[_functionName] === "object") {
                        functionObj = functionObj[_functionName];
                    } else if(functionChain.length == 0 && typeof functionObj[_functionName] === "function") {
                        functionObj[_functionName].apply(functionObj, args);
                    }
                }
            }
        //jQuery method invoke
        } else {
            if(typeof jQuery.fn[methodRow.method] !== "function") continue;
            //fix integer arguments
            for (var j in args) {
                if(typeof args[j] === "string" && args[j] == parseInt(args[j])) args[j] = parseInt(args[j]);
            }
            jQuery.fn[methodRow.method].apply(elements, args);
        }
    }
};
