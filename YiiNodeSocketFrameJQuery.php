<?php

namespace digitv\yii2sockets;

use Yii;
use yii\base\Component;
use yii\web\IdentityInterface;

/**
 * Message class for jQuery DOM manipulations
 */
class YiiNodeSocketFrameJQuery extends YiiNodeSocketFrameBasic  {
    protected $_body = ['selector' => '', 'methods' => []];
    protected $_callback = 'jQueryFrameCallback';

    /**
     * Set elements selector
     * @param $selector string
     * @return $this
     */
    public function selector($selector) {
        $this->_body['selector'] = $selector;
        return $this;
    }

    /**
     * Method .remove()
     * @return $this
     */
    public function remove() {
        $data = $this->composeMethodData('remove', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .html()
     * @return $this
     */
    public function html() {
        $data = $this->composeMethodData('html', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .fadeOut()
     * @return $this
     */
    public function fadeOut() {
        $data = $this->composeMethodData('fadeOut', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .fadeIn()
     * @return $this
     */
    public function fadeIn() {
        $data = $this->composeMethodData('fadeIn', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .fadeToggle()
     * @return $this
     */
    public function fadeToggle() {
        $data = $this->composeMethodData('fadeToggle', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .slideUp()
     * @return $this
     */
    public function slideUp() {
        $data = $this->composeMethodData('slideUp', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .slideDown()
     * @return $this
     */
    public function slideDown() {
        $data = $this->composeMethodData('slideDown', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .slideToggle()
     * @return $this
     */
    public function slideToggle() {
        $data = $this->composeMethodData('slideToggle', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .hide()
     * @return $this
     */
    public function hide() {
        $data = $this->composeMethodData('hide', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .show()
     * @return $this
     */
    public function show() {
        $data = $this->composeMethodData('show', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .append()
     * @return $this
     */
    public function append() {
        $data = $this->composeMethodData('append', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .prepend()
     * @return $this
     */
    public function prepend() {
        $data = $this->composeMethodData('prepend', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .val() for form fields
     * @return $this
     */
    public function val() {
        $data = $this->composeMethodData('val', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    public function css() {
        $data = $this->composeMethodData('css', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * Method .trigger() for events
     * @return $this
     */
    public function triggerEvent() {
        $data = $this->composeMethodData('trigger', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * @param $functionName string
     * @return $this
     */
    public function func($functionName) {
        $data = $this->composeMethodData('_func', func_get_args());
        $this->_body['methods'][] = $data;
        if(empty($this->_body['selector'])) $this->selector('body');
        return $this;
    }


    /* MY CUSTOM METHODS */

    /**
     * Invoke Counters method
     * @return $this
     */
    public function counters() {
        $data = $this->composeMethodData('_counters', func_get_args());
        $this->_body['methods'][] = $data;
        if(empty($this->_body['selector'])) $this->selector('body');
        return $this;
    }

    /**
     * Update counters
     * @return $this
     */
    public function countersUpdate() {
        $args = array_merge(['update'], func_get_args());
        return $this->counters($args);
    }

    /**
     * Replace by element in context
     * @return $this
     */
    public function replaceWithContext() {
        $data = $this->composeMethodData('replaceWithContext', func_get_args());
        $this->_body['methods'][] = $data;
        return $this;
    }

    /**
     * @inheritdoc
     */
    protected function validate() {
        if(empty($this->_body['selector']) || empty($this->_body['methods'])) {
            $valid = false;
            $this->errors[] = 'Empty selector or no methods';
        } else {
            $valid = parent::validate();
        }

        return $valid;
    }

    /**
     * @inheritdoc
     */
    protected function composeData() {
        $data = parent::composeData();

        return $data;
    }

    /**
     * Compose method array
     * @param string $name
     * @param array $arguments
     * @return array
     */
    private function composeMethodData($name = '', $arguments = []) {
        $data = ['method' => $name, 'arguments' => []];
        if(!empty($arguments)) { $data['arguments'] = $arguments; }
        return $data;
    }
}