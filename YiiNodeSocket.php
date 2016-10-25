<?php
namespace digitv\yii2sockets;
use yii\base\Component;

/**
 *
 */

class YiiNodeSocket extends Component {


    /**
     * Cookie name
     * @var string
     */
    public $sessionVarName = 'PHPSESSID';

    public $nodeJsHost = 'localhost';

}