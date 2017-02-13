var convict = require('convict');

// Define a schema
var conf = convict({
    env: {
        doc: "The applicaton environment.",
        format: ["production", "development", "test"],
        default: "development",
        env: "NODE_ENV",
        arg: "node_env"
    },
    hostname: {
        doc: "The IP address to bind.",
        format: String,
        default: "localhost",
        env: "HOSTNAME",
        arg: "host"
    },
    port: {
        doc: "The port to bind.",
        format: "port",
        default: 0,
        env: "PORT",
        arg: "port"
    },
    cookieName: {
        doc: "Cookie name with session id.",
        format: String,
        default: "PHPSESSID",
        env: "COOKIE_NAME",
        arg: "cookie-name"
    },
    redis: {
        hostname: {
            doc: "Redis server hostname.",
            format: String,
            default: "localhost",
            env: "REDIS_HOSTNAME",
            arg: "redis-host"
        },
        port: {
            doc: "Redis server port.",
            format: "port",
            default: 6379,
            env: "REDIS_PORT",
            arg: "redis-port"
        }
    },
    serviceKey: {
        doc: "Service key for server",
        format: String,
        default: ""
    },
    sessionKeyPrefix: {
        doc: "Session key prefix in Redis",
        format: String,
        default: ""
    },
    debug: {
        doc: "Debug enabled ot not",
        format: "*",
        default: false,
        env: "DEBUG",
        arg: "debug"
    },
    sslConf: {
        doc: "SSL config object",
        format: Object,
        default: {}
    }
});

// Load environment dependent configuration
var env = conf.get('env');
conf.loadFile('./configs/' + env + '.json');

// Perform validation
conf.validate({strict: true});

module.exports = conf;