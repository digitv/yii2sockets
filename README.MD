Node.js server integration module (web-sockets)

**Install with composer**
```
composer require digitv/yii2sockets:1.x-dev
```
Add console command controller to the config (_controllerMap section_):
```
'controllerMap' => [
    ...
    'node-sockets' => '\digitv\yii2sockets\commands\YiiNodeSocketsController',
    ...
],
```
Add session component to the 'components' section of main config:
```
'components' => [
    ...
        'session' => [
            'class' => 'digitv\yii2sockets\YiiNodeSocketSession',
            'keyPrefix' => 'sess_preffix_',
            'timeout' => 600,
        ],
    ...
]
```
It uses Redis DB connection to share session data with Node.js server.
Of course you must use redis component to connect Redis DB. Add it in both configs (web and main).
```
'components' => [
    ...
        'redis' => [
            'class' => 'yii\redis\Connection',
            'hostname' => 'localhost',
            'port' => 6379,
            'database' => 0,
        ],
    ...
]
```
And add component do those configs (_https not implemented yet_):
```
'components' => [
    ...
        'nodeSockets' => [
            'class' => 'digitv\yii2sockets\YiiNodeSocket',
            'nodeJsHost' => 'localhost',
            'nodeJsPort' => 3001,
            'nodeJsScheme' => 'http',
            'nodeJsHostClient' => 'your-site.com',
            'serviceKey' => 'serviceKeyUsedForCommunication',
            'sessionKeyPrefix' => 'sess_preffix_',
            'channelsByPermissions' => [
                'channel_name' => 'permission',
                'channel_name_2' => [
                    'permission' => '@',
                    'url' => '/chat/index',     //URL on which users can connect to channel
                ],
            ],
        ],
    ...
]
```
Parameter `channelsByPermissions` is an array with channel names and permissions.
If `Yii::$app->user->can('permission')` returns `TRUE` than channel `channel_name` will be added to user automatically.
It runs on component init.

When configs are ready use console command to build Node.js config files:
```
./yii node-sockets/init
```

**Node.js server**

Server is in `server` subdirectory. Before first run you must install all Node.js modules. Go to `server` directory and install they with command
```
npm install
```
Now you can run server
```
node app.js
```
You can use environment variables to overwrite config options.
For example:
```
NODE_ENV=production node app.js
```
In that case it runs in production mode with disabled debug information.

#### Messages
There are 3 message classes (I call it Frames):

1. Basic (**YiiNodeSocketFrameBasic**) used for basic messages.

2. jQuery (**YiiNodeSocketFrameJQuery**) used for jQuery DOM manipulations.

3. Notify (**YiiNodeSocketFrameGrowl**) uses `kartik-v/yii2-widget-growl` to show messages for user.

4. Alert (**YiiNodeSocketFrameAlert**) plays audio alert to user.

#### Examples
Send message with array[] body to channel `test_channel`. On front end will be used Javascript callback `jsCallbackName`.
```
Yii::$app->nodeSockets->newMessage()
    ->setBody([
        'id' => $model->id,
        'message' => Yii::t('app', 'You have new incoming call'),
    ])
    ->setChannel('test_channel')
    ->setCallback('jsCallbackName')
    ->send();
```
Send message to this socket (example is used on AJAX request).
```
Yii::$app->nodeSockets->newNotify()
    ->setText('Hello world')
    ->sendToThis();
```
Send jQuery frame to user with ID `1`. It will remove element with selector `#element_selector`.
```
Yii::$app->nodeSockets->newJQuery()
    ->remove('#element_selector')
    ->setUser(1)
    ->send();
```
Send Alert frame to channel `test_channel` to all browser windows (not active too):
```
Yii::$app->nodeSockets->newAlert()
    ->setAudioId('audio_element_id')
    ->setChannel('test_channel')
    ->onlyActiveWindow(false)
    ->send();
```
Please notice, that you need to render block with `<audio>` element in order to play it.

Also includes example **YiiNodeSocketFrameChat** frame type that sends message depending on its content:
1. to `recipient_id` and `author_id` if object contains both those properties;
2. to `channel` composed automatically otherwise. You can see frame source for details.

```
$message = new ChatMessage([
    'recipient_id' => 4,
    'author_id' => 1,
    'message' => 'test text message',
]);

Yii::$app->nodeSockets->newChat()
    ->setMessage($message)
    ->send();
```

Javascript callback example:
```
YiiNodeSockets.callbacks.jsCallbackName = function (message, _socket) {
    console.log(message.body);
};
```