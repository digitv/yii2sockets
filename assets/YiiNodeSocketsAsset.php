<?php
namespace digitv\yii2sockets\assets;

use Yii;
use yii\web\AssetBundle;
/**
 *
 */
class YiiNodeSocketsAsset extends AssetBundle {
    public $name = 'YiiNodeSockets asset';
    public $sourcePath = '@vendor/digitv/yii2sockets/static';
    public $baseUrl = '@web';
    public $css = [];
    public $js = [];
    public $depends = [
        'yii\web\JqueryAsset',
        'yii\bootstrap\BootstrapAsset',
        'yii\bootstrap\BootstrapPluginAsset',
    ];

    public function init()
    {
        $host = Yii::$app->nodeSockets->nodeJsHostClient;
        $scheme = Yii::$app->nodeSockets->nodeJsScheme;
        $this->js[] = sprintf(
            "%s://%s:%d%s", $scheme, $host, Yii::$app->nodeSockets->nodeJsPort, '/socket.io/socket.io.js'
        );
        $this->js[] = 'node-client-config.js';
        $this->js[] = 'js.cookie.js';
        $this->js[] = 'node-client.js';
    }
}