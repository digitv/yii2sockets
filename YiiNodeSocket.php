<?php
namespace digitv\yii2sockets;
use Yii;
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
    public $sessionKeyPrefix = '';
    public $serviceKey = 'qwerty';

    public $nodeJsHost = 'localhost';
    public $nodeJsHostClient = 'localhost';
    public $nodeJsPort = '3001';
    public $nodeJsScheme = 'http';
    public $nodeJsServerBase = '/server';

    public $channelsByPermissions = [];

    /**
     * Get base url of Node.js server
     * @return string
     */
    protected function getNodeBaseUrl() {
        return $this->nodeJsScheme . '://' . $this->nodeJsHost . ':' . $this->nodeJsPort;
    }

    /**
     * Add auto connect channel while session start
     * @param $channel
     */
    public function addUserSessionChannel($channel) {
        $_SESSION['nodejs'] = isset($_SESSION['nodejs']) ? $_SESSION['nodejs'] : [];
        $_SESSION['nodejs']['channels'] = isset($_SESSION['nodejs']['channels']) ? $_SESSION['nodejs']['channels'] : [];
        $_SESSION['nodejs']['channels'][$channel] = $channel;
    }

    /**
     * Remove auto connect channel from user
     * @param $channel
     */
    public function removeUserSessionChannel($channel) {
        if(isset($_SESSION['nodejs']['channels'][$channel])) {
            unset($_SESSION['nodejs']['channels'][$channel]);
        }
    }

    public function addUserChannel($channel, $sid = null, $reset = false) {
        if(!isset($sid)) $sid = session_id();
        $thisSid = session_id();
        $handler = Yii::$app->session;
        if(empty($channel)) return;
        //backup original session data
        if($sid !== $thisSid) {
            $session = $handler->readSession($sid);
            $__sess = $_SESSION; session_decode($session);
        }
        $_SESSION['nodejs'] = isset($_SESSION['nodejs']) ? $_SESSION['nodejs'] : [];
        $_SESSION['nodejs']['channels'] = isset($_SESSION['nodejs']['channels']) ? $_SESSION['nodejs']['channels'] : [];
        if(is_array($channel)) {
            foreach ($channel as $_channel) { $_SESSION['nodejs']['channels'][] = $_channel; }
        } else {
            $_SESSION['nodejs']['channels'][] = $channel;
        }
        //restore original session data
        if($sid !== $thisSid) {
            $session = session_encode();
            $_SESSION = isset($__sess) ? $__sess : $_SESSION;
            $handler->writeSession($sid, $session);
        }
        if($reset) {

        }
    }

    public function removeUserChannel($channel, $sid = null) {
        if(!isset($sid)) $sid = session_id();
        $thisSid = session_id();
        $handler = Yii::$app->session;
        if(empty($channel)) return;
        //backup original session data
        if($sid !== $thisSid) {
            $session = $handler->readSession($sid);
            $__sess = $_SESSION; session_decode($session);
        }
        $_SESSION['nodejs'] = isset($_SESSION['nodejs']) ? $_SESSION['nodejs'] : [];
        $_SESSION['nodejs']['channels'] = isset($_SESSION['nodejs']['channels']) ? $_SESSION['nodejs']['channels'] : [];
        if(is_array($channel)) {
            foreach ($channel as $_channel) {
                if(isset($_SESSION['nodejs']['channels'][$_channel])) unset($_SESSION['nodejs']['channels'][$_channel]);
            }
        } else {
            if(isset($_SESSION['nodejs']['channels'][$channel])) unset($_SESSION['nodejs']['channels'][$channel]);
        }
        //restore original session data
        if($sid !== $thisSid) {
            $session = session_encode();
            $_SESSION = isset($__sess) ? $__sess : $_SESSION;
            $handler->writeSession($sid, $session);
        }
    }

    public function reloadUserChannels($sid = null) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/reload_user_channels';
        $data = [
            'sid' => $sid,
        ];
        $this->sendDataToNodeJS($data, $url);
    }

    /**
     * Send message to user ID
     * @param mixed $message
     * @param integer $uid
     * @param string $callback
     * @return bool|mixed
     */
    public function sendMessageToUser($message, $uid = 0, $callback = '') {
        $data = [
            'body' => $message,
            'userId' => $uid,
            'callback' => $callback,
        ];
        return $this->sendMessage($data);
    }

    /**
     * Send message to session ID
     * @param mixed $message
     * @param string $sid
     * @param string $callback
     * @return bool|mixed
     */
    public function sendMessageToSession($message, $sid = '', $callback = '') {
        if(!$sid) return false;
        $data = [
            'body' => $message,
            'sessionId' => $sid,
            'callback' => $callback,
        ];
        return $this->sendMessage($data);
    }

    /**
     * Send message to channel
     * @param mixed $message
     * @param string $channel
     * @param string $callback
     * @return mixed
     */
    public function sendMessageToChannel($message, $channel = 'notify', $callback = '') {
        $data = [
            'body' => $message,
            'channel' => $channel,
            'callback' => $callback,
        ];
        return $this->sendMessage($data);
    }

    /**
     * Send message
     * @param $message
     * @return mixed
     */
    public function sendMessage($message) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/publish_message';
        return $this->sendDataToNodeJS($message, $url);
    }

    /**
     * Send any data to Node.js server
     * @param mixed $data
     * @param string $url
     * @return mixed
     */
    public function sendDataToNodeJS($data, $url) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_POST => 1,
            CURLOPT_POSTFIELDS => http_build_query($data),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [ 'NodejsServiceKey: ' . $this->serviceKey ],
        ]);
        $nodeOut = curl_exec($curl);
        //try to decode JSON data
        $nodeOutJSON = @json_decode($nodeOut, true);
        curl_close ($curl);
        return $nodeOutJSON ? $nodeOutJSON : $nodeOut;
    }

    /**
     * @return YiiNodeSocketFrameBasic
     */
    public function newMessage() {
        return new YiiNodeSocketFrameBasic();
    }
    /**
     * @return YiiNodeSocketFrameJQuery
     */
    public function newJQuery() {
        return new YiiNodeSocketFrameJQuery();
    }
}