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
module.exports.getTransactionInfo = async(trxId) => {
    const limit = config.lisk.transactionLimit;
    let trxData = [];
    let idx = 0;
    while(true) {
        const params = {
            recipientId: config.lisk.address,
            type: 0,
            limit: limit,
            offset: limit * idx,
            sort: 'timestamp:desc'}
        const trxInfo = await config.LiskClient.transactions.get(params);

        // データがなければ終了
        if (!trxInfo || utils.isEmpty(trxInfo.data)) break;

        // 処理用データを蓄積
        let isProcessed = false;
        for (i=0; i < trxInfo.data.length; i++) {
            if (trxInfo.data[i].id === trxId) {
                isProcessed = true;
                break;
            }
            trxData.push(trxInfo.data[i]);
        }
        if (isProcessed) break;
        
        // 全件数取得が終わったら終了
        if (trxInfo.count <= limit) break;
        idx += 1;
    }
    return trxData;
}