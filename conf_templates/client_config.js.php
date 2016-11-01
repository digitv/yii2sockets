<?php
/**
 * @var $nodeSockets \digitv\yii2sockets\YiiNodeSocket
 * @var $redis yii\redis\Connection
 */
?>
var ioConf = {
    host: "<?= $nodeSockets->nodeJsHostClient ?>",
    port: <?= $nodeSockets->nodeJsPort ?>,
    scheme: "<?= $nodeSockets->nodeJsScheme ?>",
    dummy: 0
};