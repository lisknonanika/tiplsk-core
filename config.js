const lisk = require('@liskhq/lisk-api-client');
const liskTransaction = require('@liskhq/lisk-transactions');
const config = require('config');

function define(name, value) {
    Object.defineProperty(exports, name, {
        value: value,
        enumerable: false,
        writable: false,
        configurable: false
    });
}

define('mode', config.mode);
define('lisk', config.lisk);
define('mongo', config.mongo);

//var liskClient = lisk.APIClient.createTestnetAPIClient();
var liskClient = lisk.APIClient.createMainnetAPIClient();
define('LiskClient', liskClient);
define('LiskTransaction', liskTransaction);

var mongoClientParams = {auth:{user: config.mongo.user, password: config.mongo.password},
                         authSource: config.mongo.db, useNewUrlParser: true}
define('mongoClientParams', mongoClientParams);
