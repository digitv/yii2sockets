<?php
namespace digitv\yii2sockets;

use Yii;
use yii\base\Component;
use yii\helpers\Url;
use yii\web\IdentityInterface;

/**
 * Message class basic
 * @var array|string $_body
 * @var string $_sessionId
 * @var string $_channel
 * @var string $_callback
 * @var integer $_userId
 * @var boolean $_broadcast
 * @var string $_text
 * @var string $_title
 * @var string $_icon
 * @var string $_url
 * @var string $_url_target
 * @var string $_type
 * @var integer $_time
 * @var integer $_allow_dismiss
 */
class YiiNodeSocketFrameGrowl extends YiiNodeSocketFrameBasic {
    const MESSAGE_TYPE_SUCCESS = 'success';
    const MESSAGE_TYPE_INFO = 'info';
    const MESSAGE_TYPE_DANGER = 'danger';
    const MESSAGE_TYPE_WARNING = 'warning';

    protected $_text;
    protected $_title;
    protected $_icon;
    protected $_url;
    protected $_url_target = '_self';
    protected $_type = self::MESSAGE_TYPE_SUCCESS;
    protected $_time = 5000;
    protected $_allow_dismiss = 1;

    /**
     * @param string $text
     * @return $this
     */
    public function setText($text) {
        $this->_text = $text;
        return $this;
    }

    /**
     * @param string $title
     * @return $this
     */
    public function setTitle($title) {
        $this->_title = $title;
        return $this;
    }

    /**
     * @param string $type
     * @return $this
     */
    public function setType($type) {
        $this->_type = $type;
        return $this;
    }

    /**
     * @param string|array $url
     * @return $this
     */
    public function setUrl($url) {
        if(is_array($url)) $url = Url::to($url, true);
        $this->_url = $url;
        return $this;
    }

    /**
     * @param string $url_target
     * @return $this
     */
    public function setUrlTarget($url_target) {
        if(!in_array($url_target, ['_blank', '_self', '_top'])) $url_target = '_self';
        $this->_url_target = $url_target;
        return $this;
    }

    /**
     * @param string $icon
     * @return $this
     */
    public function setIcon($icon) {
        $this->_icon = $icon;
        return $this;
    }

    /**
     * @return $this
     */
    public function noIcon() {
        $this->_icon = null;
        return $this;
    }

    /**
     * @return $this
     */
    public function defaultIcon() {
        $this->_icon = 'fa fa-envelope';
        return $this;
    }

    /**
     * @param integer $time
     * @return $this
     */
    public function setTime($time) {
        $this->_time = $time;
        return $this;
    }

    /**
     * @return $this
     */
    public function allowDismiss() {
        $this->_allow_dismiss = 1;
        return $this;
    }

    /**
     * @return $this
     */
    public function disallowDismiss() {
        $this->_allow_dismiss = 0;
        return $this;
    }

    /**
     * @return string|null
     */
    public function getText() {
        return $this->_text;
    }

    /**
     * @return string|null
     */
    public function getTitle() {
        return $this->_title;
    }

    /**
     * @return string|null
     */
    public function getType() {
        return $this->_type;
    }

    /**
     * @return string|null
     */
    public function getUrl() {
        return $this->_url;
    }

    /**
     * @return string
     */
    public function getUrlTarget() {
        return $this->_url_target;
    }

    /**
     * @return string|null
     */
    public function getIcon() {
        return $this->_icon;
    }

    /**
     * @return integer
     */
    public function getTime() {
        return $this->_time;
    }

    /**
     * Validate input
     * @return bool
     */
    protected function validate() {
        $this->checkType();
        if(!$this->getCallback()) $this->setCallback('notifyFrameCallback');
        $this->composeOptions();
        $valid = parent::validate();

        return $valid;
    }

    /**
     * Get data array for YiiNodeSocket
     * @return array
     */
    protected function composeData() {
        $data = parent::composeData();

        return $data;
    }

    protected function composeOptions() {
        $options = [];
        $settings = [];
        $optionsMap = [
            'message' => '_text',
            'title' => '_title',
            'icon' => '_icon',
            'url' => '_url',
            'target' => '_url_target',
        ];
        $settingsMap = [
            'type' => '_type',
            'delay' => '_time',
            'allow_dismiss' => '_allow_dismiss',
        ];

        foreach ($optionsMap as $mapName => $fieldName) {
            $options[$mapName] = $this->{$fieldName};
        }

        foreach ($settingsMap as $mapName => $fieldName) {
            $settings[$mapName] = $this->{$fieldName};
        }

        $this->setBody([
            'options' => $options,
            'settings' => $settings,
        ]);
    }

    protected function checkType() {
        $types = [
            self::MESSAGE_TYPE_SUCCESS,
            self::MESSAGE_TYPE_INFO,
            self::MESSAGE_TYPE_DANGER,
            self::MESSAGE_TYPE_WARNING,
        ];
        if(!in_array($this->_type, $types)) $this->setType(self::MESSAGE_TYPE_SUCCESS);
    }
}