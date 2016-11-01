<?php
/**
 *
 */
class YiiNodeSocketsAsset extends \yii\web\AssetBundle {
    public $name = 'YiiNodeSockets asset';
    public $sourcePath = '@vendor/digitv/yii2sockets/static';
    public $baseUrl = '@web';
    public $css = [];
    public $js = [];
    public $depends = [
        'yii\web\JqueryAsset',
        'yii\bootstrap\BootstrapAsset',
    ];

    public function init()
    {
        $host = Yii::$app->nodeSockets->nodeJsHostClient;
        $this->js[] = sprintf(
            "http://%s:%d%s", $host, Yii::$app->nodeSockets->nodeJsPort, '/socket.io/socket.io.js'
        );
        $this->js[] = 'static/node-client.js';
    }
}