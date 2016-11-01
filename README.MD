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
            ],
        ],
    ...
]
```
When configs are ready use console command to build Node.js config files:
```
./yii node-sockets/init
```

Node.js server

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
At that case it runs in production mode with disabled debug information.