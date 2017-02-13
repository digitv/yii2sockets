<?php
/**
 * Created by PhpStorm.
 * User: coder1
 * Date: 10.02.17
 * Time: 11:36
 */

namespace digitv\yii2sockets;

/**
 * @property boolean $_onlyActiveWindow
 * @property string $_audioId
 */
class YiiNodeSocketFrameAlert extends YiiNodeSocketFrameBasic
{
    protected $_onlyActiveWindow = true;
    protected $_callback = 'alertFrameCallback';
    protected $_audioId = 'notifier-audio';

    /**
     * Set only active window or not
     * @param bool $value
     * @return YiiNodeSocketFrameAlert $this
     */
    public function onlyActiveWindow($value = true) {
        $this->_onlyActiveWindow = !empty($value);
        return $this;
    }

    /**
     * Set alert audio element ID
     * @param string $audioId
     * @return YiiNodeSocketFrameAlert $this
     */
    public function setAudioId($audioId)
    {
        $this->_audioId = $audioId;
        return $this;
    }

    public function validate()
    {
        $this->composeOptions();
        return parent::validate();
    }

    protected function composeOptions() {
        $this->setBody([
            'audioId' => $this->_audioId,
            'onlyActiveWindow' => $this->_onlyActiveWindow,
        ]);
    }
}