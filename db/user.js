const config = require('../config');
const MongoClient = require('mongodb').MongoClient;
const ObjectId = require('mongodb').ObjectId;
const utils = require('../utils');

module.exports.find = async(params) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionUser);
        if (params._id) params._id = ObjectId(params._id);
        if (params.password) params.password = utils.sha256(password);
        const data = await tbl.findOne(params);
        return !data? {}: data;
    } finally {
        con.close();
    }
}

module.exports.createUser = async(twitterId) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionUser);
        await tbl.insertOne({twitterId: twitterId, amount: '0', password: ''});
        return {result: true};
    } finally {
        con.close();
    }
}

module.exports.updateAmount = async(twitterId, amount) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionUser);
        await tbl.updateOne({twitterId: twitterId}, {$set: {amount: utils.num2str(amount)}});
        return {result: true};
    } finally {
        con.close();
    }
}

module.exports.updatePassword = async(twitterId, password) => {
    const con = await MongoClient.connect(config.mongo.url, config.mongoClientParams);
    try {
        const db = await con.db(config.mongo.db);
        const tbl = await db.collection(config.mongo.collectionUser);
        await tbl.updateOne({twitterId: twitterId}, {$set: {password: utils.sha256(password)}});
        return {result: true};
    } finally {
        con.close();
    }
}
