<?php
/**
 * @var $nodeSockets \digitv\yii2sockets\YiiNodeSocket
 * @var $redis yii\redis\Connection
 */
?>
{
    "port": <?= $nodeSockets->nodeJsPort ?>,
    "hostname": "<?= $nodeSockets->nodeJsHost ?>",
    "cookieName": "<?= $nodeSockets->sessionVarName ?>",
    "sessionKeyPrefix": "<?= $nodeSockets->sessionKeyPrefix ?>",
    "redis": {
        "hostname": "<?= $redis->hostname ?>",
        "port": <?= $redis->port ?>
    },
    "serviceKey": "<?= $nodeSockets->serviceKey ?>",
    "sslConf": <?= json_encode($nodeSockets->sslConf) ?>,
    "debug": false
}