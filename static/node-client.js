/**
 *
 */

String.prototype.hashCode = function() {
    var hash = 0, i, chr, len;
    if (this.length === 0) return hash;
    for (i = 0, len = this.length; i < len; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};

if(typeof io !== "undefined") {
    var socket = io(ioConf.scheme+'://'+ioConf.host+':'+ioConf.port, {query: {userPage: window.location.pathname}});

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

var WindowActivity = {
    windowId: false,
    cookieOptions: {},
    setActiveBrowser: function (value) {
        Cookies.set('_back_active_window', '' + value, WindowActivity.cookieOptions);
    },
    setActiveWindow: function (clear) {
        if(typeof clear === "undefined") clear = false;
        if(clear) {
            Cookies.remove('_back_active_window_id', WindowActivity.cookieOptions);
        } else {
            var value = WindowActivity.getWindowId();
            //var options = !clear ? { expires: 365, path: '/' } : { path: '/' };
            Cookies.set('_back_active_window_id', value, WindowActivity.cookieOptions);
        }
    },
    isActiveBrowser: function () {
        var cookieVal = Cookies.get('_back_active_window');
        cookieVal = !isNaN(parseInt(cookieVal)) ? parseInt(cookieVal) : 0;
        return !!cookieVal;
    },
    isActiveWindow: function () {
        var cookieVal = Cookies.get('_back_active_window_id');
        if(typeof cookieVal === "undefined" || !cookieVal) WindowActivity.setActiveWindow();
        return cookieVal == WindowActivity.getWindowId() || !cookieVal;
    },
    getWindowId: function () {
        if(!WindowActivity.windowId) {
            var d = new Date();
            WindowActivity.windowId = '' + d.getTime() + window.location.href.hashCode();
        }
        return WindowActivity.windowId;
    },
    setNotificationEnabled: function (value) {
        var cookieVal = value ? '1' : '0';
        Cookies.set('_back_notifications_enabled', '' + cookieVal, WindowActivity.cookieOptions);
    },
    getNotificationEnabled: function () {
        var cookieVal = Cookies.get('_back_notifications_enabled');
        return !cookieVal;
    }
};

//Window blur/focus
$(window).on("blur focus unload load", function(e) {
    var prevType = $(this).data("prevType");
    //reduce double fire issues
    if (prevType != e.type) {
        switch (e.type) {
            case "blur":
                WindowActivity.setActiveBrowser(0);
                break;
            case "focus":
                WindowActivity.setActiveWindow();
                WindowActivity.setActiveBrowser(1);
                break;
            case "unload":
                //clear active window ID
                if(WindowActivity.isActiveWindow()) {
                    WindowActivity.setActiveWindow(true);
                }
                break;
            case "load":
                WindowActivity.isActiveWindow();
                break;
        }
    }
    $(this).data("prevType", e.type);
});

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
    var elements = jQuery(message.body.selector), methodRow, methodName = '', args;
    var reloadMethods = ['replaceWithContext', 'replaceWith', 'remove'];
    for (var i in message.body.methods) {
        //Reselect elements after some methods
        if(reloadMethods.indexOf(methodName) !== -1) elements = jQuery(message.body.selector);
        methodRow = message.body.methods[i];
        methodName = methodRow.method;
        args = typeof methodRow.arguments !== "undefined" ? methodRow.arguments : [];
        //Function invoke
        if(methodName == "_func") {
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
            if(typeof jQuery.fn[methodName] !== "function") continue;
            //fix integer arguments
            for (var j in args) {
                if(typeof args[j] === "string" && args[j] == parseInt(args[j])) args[j] = parseInt(args[j]);
            }
            jQuery.fn[methodName].apply(elements, args);
        }
    }
};

//Growl notify frames callback
YiiNodeSockets.callbacks.notifyFrameCallback = function (message, _socket) {
    if(typeof jQuery.notify !== "function") return;
    var body = message.body;
    jQuery.notify(body.options, body.settings);
};

//Alert/Sound notify frames callback
YiiNodeSockets.callbacks.alertFrameCallback = function (message, _socket) {
    var body = message.body, audioElem = $('#' + body.audioId);
    if(!audioElem.length || (body.onlyActiveWindow && !WindowActivity.isActiveWindow())) return;
    audioElem[0].play();
};

//Chat frames callback
YiiNodeSockets.callbacks.chatFrameCallback = function (message, _socket) {
    var body = message.body;
    if(typeof body.frameType === "undefined") return;
    switch (body.frameType) {
        case 'room':
        case 'pm':
            chat.addMessage(body.chatId, body.message);
            break;
        case 'close_chat':
            chat.closeChat(body.chatId);
            break;
    }
};