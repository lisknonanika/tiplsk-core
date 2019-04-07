const lisk = require('@liskhq/lisk-api-client');
const liskTransaction = require('@liskhq/lisk-transactions');
const config = require('config');

const define = (name, value) => {
    Object.defineProperty(exports, name, {
        value: value,
        enumerable: false,
        writable: false,
        configurable: false
    });
}

// App Setting
define('mode', config.mode);
define('secret', config.secret);
define('regexp', {
    'depositKey': new RegExp(/(^[0-9a-zA-Z]{12,12}$)|(^[0-9a-zA-Z]{24,24}$)/),
    'password': new RegExp(/(^[0-9a-zA-Z\-_@=+!]{8,}$)/)
});
define('listenPort', 3000);
define('passwordLength', 16);
define('passwordChar', 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_@=+!');

// Lisk Setting
define('lisk', config.lisk);
if (config.mode === 'test') {
    console.log('connect Lisk Testnet!');
    define('LiskClient', lisk.APIClient.createTestnetAPIClient());
} else {
    console.log('connect Lisk Mainnet!');
    define('LiskClient', lisk.APIClient.createMainnetAPIClient());
}
define('LiskTransaction', liskTransaction);

// MongoDB Setting
define('mongo', config.mongo);
define('mongoClientParams', {auth:{user: config.mongo.user, password: config.mongo.password},
                             authSource: config.mongo.db, useNewUrlParser: true});
