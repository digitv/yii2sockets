<?php
/**
 * Chat frame class (Example)
 * (example based on some message class {recipient_id: 1, author_id: 2 ... })
 */

namespace digitv\yii2sockets;

use backend\modules\chat\models\ChatMessage;

/**
 * @property boolean $_onlyActiveWindow
 * @property string $_audioId
 */
class YiiNodeSocketFrameChat extends YiiNodeSocketFrameBasic
{
    const TYPE_PRIVATE_MESSAGE = 'pm';
    const TYPE_ROOM_MESSAGE = 'room';
    const TYPE_CHAT_CLOSE = 'close_chat';
    const TYPE_MESSAGE_DELETE = 'delete_message';
    const TYPE_MESSAGE_DELETE_BULK = 'delete_messages_bulk';

    protected $_callback = 'chatFrameCallback';
    protected $_frameType;
    protected $_message;
    protected $_chatId;

    /**
     * @param ChatMessage $message
     * @return YiiNodeSocketFrameChat
     */
    public function setMessage($message) {
        if(isset($message->recipient_id)) {
            $this->_frameType = self::TYPE_PRIVATE_MESSAGE;
            $uIds = [$message->recipient_id, $message->author_id];
            $this->_userId = $uIds;
        } else {
            $this->_frameType = self::TYPE_ROOM_MESSAGE;
            $this->_channel = 'chat-' . $message->getChatId();
        }
        $this->_message = $message->composeJsonData();
        $this->_chatId = $message->getChatId();
        return $this;
    }

    /**
     * Close user chat window
     * @param string $chatId
     * @return YiiNodeSocketFrameChat $this
     */
    public function closeUserChat($chatId) {
        $this->_frameType = self::TYPE_CHAT_CLOSE;
        $this->_chatId = $chatId;
        $this->_userId = \Yii::$app->user->id;
        return $this;
    }

    /**
     * Delete message from chat
     * @param ChatMessage $message
     * @return YiiNodeSocketFrameChat
     */
    public function deleteMessage($message) {
        $this->_frameType = self::TYPE_MESSAGE_DELETE;
        if(isset($message->recipient_id)) {
            $uIds = [$message->recipient_id, $message->author_id];
            $this->_userId = $uIds;
        } else {
            $this->_channel = 'chat-' . $message->getChatId();
        }
        $this->_message = $message->composeJsonData();
        $this->_chatId = $message->getChatId();
        return $this;
    }

    /**
     * Delete messages bulk from chat
     * @param array $messageIds
     * @param string $chatId
     * @param string|null $channel
     * @param array|null $uIds
     * @return YiiNodeSocketFrameChat
     */
    public function deleteMessagesBulk($messageIds, $chatId, $channel = null, $uIds = null) {
        $this->_frameType = self::TYPE_MESSAGE_DELETE_BULK;
        $ids = [];
        foreach ($messageIds as $message) {
            if(is_scalar($message)) $ids[] = $message;
            else $ids[] = $message->id;
        }
        if(isset($channel)) $this->_channel = $channel;
        if(isset($uIds)) $this->_userId = $uIds;
        $this->_chatId = $chatId;
        $this->_message = ['ids' => $ids];
        return $this;
    }

    /**
     * Validate frame
     * @return bool
     */
    public function validate()
    {
        $this->composeOptions();
        return parent::validate();
    }

    /**
     * Compose this frame options
     */
    protected function composeOptions() {
        $this->setBody([]);
        $this->setBodyParam('frameType', $this->_frameType);
        $this->setBodyParam('chatId', $this->_chatId);
        if(isset($this->_message)) {
            $this->setBodyParam('message', $this->_message);
        }
    }
}