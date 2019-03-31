const config = require('../config');
const MongoClient = require('mongodb').MongoClient;

module.exports.find = async() => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionLiskTrx);
        const data = await tbl.findOne();
        return !data? {}: data;
    } finally {
        con.close();
    }
}

module.exports.update = async(trxId) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionLiskTrx);
        await tbl.updateOne({}, {$set: {transactionId: trxId}}, {upsert: true});
        return {result: true};
    } finally {
        con.close();
    }
}