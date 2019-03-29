const config = require('../config');
const MongoClient = require('mongodb').MongoClient;
const utils = require('../utils');

module.exports.find = async(params, offset, limit) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionHistory);
        const data = await tbl.find(params).sort({execDate: -1}).skip(offset).limit(limit).toArray();
        return !data? []: data;
    } finally {
        con.close();
    }
}

module.exports.insert = async(twitterId, targetNm, amount, type) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionHistory);
        const params = {twitterId: twitterId,
                        type: type,
                        amount: utils.num2str(amount),
                        targetNm: targetNm,
                        execDate: new Date()};;
        await tbl.insertOne(params);
        return {result: true};
    } finally {
        con.close();
    }
}