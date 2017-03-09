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

    public $sslConf = [];

    public $channelsByPermissions = [];

    public $userSocketId;

    public function init()
    {
        parent::init();
        //Get current user socket id
        $headers = Yii::$app->request->hasMethod('getHeaders') ? Yii::$app->request->getHeaders() : [];
        if(!empty($headers) && !empty($headers['yii-node-socket-id'])) {
            $userSocketId = is_array($headers['yii-node-socket-id']) ? reset($headers['yii-node-socket-id']) : $headers['yii-node-socket-id'];
            $this->userSocketId = !empty($userSocketId) ? $userSocketId : null;
        }
        //Init user (if there was no calls to it before)
        Yii::$app->user->getIsGuest();
        $this->processChannelsInConfig();
    }

    /**
     * Check that user has connected socket (by request headers)
     * @return bool
     */
    public function hasSocketConnected() {
        return !empty($this->userSocketId);
    }

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
            $this->removeSessionFromChannel(session_id(), $channel);
        }
    }

    /**
     * Set auto connect channels on session start
     * @param $channels
     */
    public function setUserSessionChannels($channels) {
        $_SESSION['nodejs']['channels'] = $channels;
    }

    /**
     * Get auto connect channels from session
     * @return array
     */
    public function getUserSessionChannels() {
        return isset($_SESSION['nodejs']['channels']) ? $_SESSION['nodejs']['channels'] : [];
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
     * Send message to session ID
     * @param mixed $message
     * @param string $socketId
     * @param string $callback
     * @return bool|mixed
     */
    public function sendMessageToSocket($message, $socketId = '', $callback = '') {
        if(!$socketId) return false;
        $data = [
            'body' => $message,
            'socketId' => $socketId,
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
     * Add session to channel
     * @param string $sid
     * @param string $channel
     * @return mixed
     */
    public function addSessionToChannel($sid, $channel) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/add_session_to_channel';
        $data = [
            'sid' => $sid,
            'channel' => $channel,
        ];
        return $this->sendDataToNodeJS($data, $url);
    }

    /**
     * Remove session from channel
     * @param string $sid
     * @param string $channel
     * @return mixed
     */
    public function removeSessionFromChannel($sid, $channel) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/remove_session_from_channel';
        $data = [
            'sid' => $sid,
            'channel' => $channel,
        ];
        return $this->sendDataToNodeJS($data, $url);
    }

    /**
     * Add user to channel
     * @param integer $uid
     * @param string $channel
     * @return mixed
     */
    public function addUserToChannel($uid, $channel) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/add_user_to_channel';
        $data = [
            'uid' => $uid,
            'channel' => $channel,
        ];
        return $this->sendDataToNodeJS($data, $url);
    }

    /**
     * Remove user from channel
     * @param integer $uid
     * @param string $channel
     * @return mixed
     */
    public function removeUserFromChannel($uid, $channel) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/remove_user_from_channel';
        $data = [
            'uid' => $uid,
            'channel' => $channel,
        ];
        return $this->sendDataToNodeJS($data, $url);
    }

    /**
     * Get channel user list
     * @param string $channel
     * @return mixed
     */
    public function getChannelUsers($channel) {
        $url = $this->getNodeBaseUrl() . $this->nodeJsServerBase . '/get_channel_users';
        $data = [
            'channel' => $channel,
        ];
        $result = $this->sendDataToNodeJS($data, $url);
        return !empty($result['users']) ? (array)$result['users'] : [];
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
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        $nodeOut = curl_exec($curl);
        //try to decode JSON data
        $nodeOutJSON = @json_decode($nodeOut, true);
        curl_close ($curl);
        return $nodeOutJSON ? $nodeOutJSON : $nodeOut;
    }

    /**
     * Process channels connect, defined in config
     */
    private function processChannelsInConfig() {
        $sessionChannels = $this->getUserSessionChannels();
        foreach ($this->channelsByPermissions as $channel => $_data) {
            $permData = is_scalar($_data) ? [
                'url' => '*',
                'permission' => $_data,
            ] : $_data;
            $permData = $permData + ['url' => '*'];
            $sessionChannels[$channel] = $permData;
        }
        if(empty($sessionChannels)) return;
        foreach ($sessionChannels as $channel => $data) {
            $can = false;
            if ($data['permission'] == '@') $can = !Yii::$app->user->isGuest;
            elseif ($data['permission'] == '?') $can = Yii::$app->user->isGuest;
            else $can = $data['permission'] == '*' || (!Yii::$app->user->isGuest && Yii::$app->user->can($data['permission']));
            if (!$can) {
                unset($sessionChannels[$channel]);
                $this->removeUserSessionChannel($channel);
            } else {
                $sessionChannels[$channel] = $data['url'];
            }
        }
        $this->setUserSessionChannels($sessionChannels);
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

    /**
     * @return YiiNodeSocketFrameGrowl
     */
    public function newNotify() {
        return new YiiNodeSocketFrameGrowl();
    }

    /**
     * @return YiiNodeSocketFrameAlert
     */
    public function newAlert() {
        return new YiiNodeSocketFrameAlert();
    }

    /**
     * @return YiiNodeSocketFrameChat
     */
    public function newChat() {
        return new YiiNodeSocketFrameChat();
    }
}