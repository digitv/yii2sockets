<?php
namespace digitv\yii2sockets\commands;

use Yii;
use yii\console\Controller;

/**
 * YiiNodeSockets console controller
 */

class YiiNodeSocketsController extends Controller {

    public $confSource = __DIR__ . '/../conf_templates';

    /**
     * Generate Node.js server configs
     */
    public function actionInit() {
        $this->compileClient();
        $this->compileServer();
    }

	/**
	 * @param $error
	 */
	protected function usageError($error) {
		print "ERROR: " . $error . "\n";
		exit(1);
	}

	public function getHelp() {
		return <<<EOD
USAGE
  yii node-sockets [action] [parameter]

DESCRIPTION
  This command provides support for node socket extension

EXAMPLES
 * yii node-sockets init
   Compile config files fo Node.js
EOD;
	}

    /**
     * @return int
     */
    protected function compileClient() {
		printf("Compile client config\n");
        $nodeSockets = Yii::$app->nodeSockets;
        $redis = Yii::$app->redis;
		ob_start();
		include $this->confSource . '/client_config.js.php';
		$output = ob_get_clean();
		return file_put_contents(__DIR__ . '/../static/node-client-config.js', $output);
	}

	protected function compileServer() {
		printf("Compile server configs\n");
        $nodeSockets = Yii::$app->nodeSockets;
        $redis = Yii::$app->redis;
		ob_start();
        include $this->confSource . '/server_development.json.php';
		$devOutput = ob_get_clean();
		file_put_contents(__DIR__ . '/../server/configs/development.json', $devOutput);
		ob_start();
        include $this->confSource . '/server_production.json.php';
		$devOutput = ob_get_clean();
		file_put_contents(__DIR__ . '/../server/configs/production.json', $devOutput);
        return true;
	}
}