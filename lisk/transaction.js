const config = require('../config');
const utils = require('../utils');

module.exports.createTransaction = (recipientId, amount) => {
    try {
        const params = {
            amount: utils.multiply(amount, '100000000'),
            recipientId: recipientId,
            passphrase: config.lisk.passphrase,
            secondPassphrase: config.lisk.secondPassphrase,
            data: 'TipLisk'
        }
        return config.LiskTransaction.transfer(params);
    } catch(err) {
        console.log(err);
        return {};
    }
}

module.exports.broadcast = async(trx) => {
    try {
        const result = await config.LiskClient.transactions.broadcast(trx);
        return result;
    } catch(err) {
        console.log(err);
        return {};
    }
}