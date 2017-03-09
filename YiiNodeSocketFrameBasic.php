<?php
namespace digitv\yii2sockets;

use Yii;
use yii\base\Component;
use yii\web\IdentityInterface;

/**
 * Message class basic
 * @var array|string $_body
 * @var string $_sessionId
 * @var string $_channel
 * @var string $_callback
 * @var integer|array $_userId
 * @var boolean $_broadcast
 */
class YiiNodeSocketFrameBasic extends Component {
    protected $_channel;
    protected $_sessionId;
    protected $_userId;
    protected $_socketId;
    protected $_broadcast = false;
    protected $_body;
    protected $_callback;

    public $errors = [];

    /**
     * Set message body
     * @param $body mixed
     * @return $this
     */
    public function setBody($body) {
        $this->_body = $body;
        return $this;
    }

    /**
     * Set message body param
     * @param $key
     * @param $data
     * @return $this
     */
    public function setBodyParam($key, $data) {
        if(!isset($this->_body)) $this->_body = [];
        if(is_array($this->_body)) $this->_body[$key] = $data;
        return $this;
    }

    /**
     * Set channel name
     * @param $channel string
     * @return $this
     */
    public function setChannel($channel) {
        $this->_channel = $channel;
        return $this;
    }

    /**
     * Set session ID
     * @param $sessionId string
     * @return $this
     */
    public function setSession($sessionId) {
        $this->_sessionId = $sessionId;
        return $this;
    }

    /**
     * Set user ID
     * @param $userId integer|object
     * @return $this
     */
    public function setUser($userId) {
        if($userId instanceof IdentityInterface) { $userId = $userId->getId(); }
        $this->_userId = $userId;
        return $this;
    }

    public function setSocketId($socketId) {
        $this->_socketId = $socketId;
        return $this;
    }

    /**
     * Set callback method name
     * @param $callback string
     * @return $this
     */
    public function setCallback($callback) {
        $this->_callback = $callback;
        return $this;
    }

    /**
     * Set message broadcast flag
     * @return $this
     */
    public function broadcast() {
        $this->_broadcast = true;
        return $this;
    }

    /**
     * Get message body
     * @return mixed
     */
    public function getBody() {
        return $this->_body;
    }

    /**
     * Get channel name
     * @return mixed
     */
    public function getChannel() {
        return $this->_channel;
    }

    /**
     * Get session ID
     * @return mixed
     */
    public function getSession() {
        return $this->_sessionId;
    }

    /**
     * Get user ID
     * @return mixed
     */
    public function getUser() {
        return $this->_userId;
    }

    /**
     * Check if message is broadcast
     * @return bool
     */
    public function isBroadcast() {
        return $this->_broadcast;
    }

    /**
     * Get callback method name
     * @return mixed
     */
    public function getCallback() {
        return $this->_callback;
    }

    /**
     * Send frame
     * @return bool|mixed
     */
    public function send() {
        if($this->validate()) {
            /* @var $nodeSockets YiiNodeSocket */
            $data = $this->composeData();
            $nodeSockets = Yii::$app->nodeSockets;
            return $nodeSockets->sendMessage($data);
        }
        return false;
    }

    /**
     * Send frame to current user socketId
     * useful on ajax requests
     * @return bool|mixed
     */
    public function sendToThis() {
        $socketId = Yii::$app->nodeSockets->userSocketId;
        if(!$socketId) return false;
        $this->setSocketId($socketId);
        return $this->send();
    }

    /**
     * Validate input
     * @return bool
     */
    protected function validate() {
        $valid = true;
        $this->errors = [];
        if(!isset($this->_userId) && !isset($this->_sessionId) && !isset($this->_socketId) && !isset($this->_channel) && !$this->isBroadcast()) {
            $valid = false;
            $this->errors[] = 'There are no recipient for this message';
        }
        if(!isset($this->_body)) {
            $valid = false;
            $this->errors[] = 'Message body is empty';
        }
        return $valid;
    }

    /**
     * Get data array for YiiNodeSocket
     * @return array
     */
    protected function composeData() {
        $data = [];
        //grab addressee
        if($this->isBroadcast()) { $data['broadcast'] = true; }
        elseif(isset($this->_channel)) { $data['channel'] = $this->_channel; }
        elseif(isset($this->_userId)) { $data['userId'] = $this->_userId; }
        elseif(isset($this->_sessionId)) { $data['sessionId'] = $this->_sessionId; }
        elseif(isset($this->_socketId)) { $data['socketId'] = $this->_socketId; }
        //check callback
        if(isset($this->_callback)) { $data['callback'] = $this->_callback; }
        //add body
        $data['body'] = $this->_body;

        return $data;
    }
}