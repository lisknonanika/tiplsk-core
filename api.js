const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const config = require('./config');
const utils = require('./utils');
const user = require('./db/user');
const history = require('./db/history');
const liskTransaction = require('./lisk/transaction');
const verify = require('./verify');
const cst = require('./const');

const app = express();
app.set('secret', config.secret);
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(helmet());

const router = express.Router();
app.use('/core', router);

/**
 * Find User By ID and PW
 */
router.post('/auth', function(req, res) {
    (async () => {
        if (!req.body || !req.body.id || !req.body.pw) {
            res.json({result: false, error: 'Required parameter missing or invalid.'});
            return;
        }
        const result = await user.find({_id: req.body.id});
        if (!result || !result.password || result.password !== utils.sha256(req.body.pw)) {
            res.json({result: false, error: "Authentication failed."});
            return;
        }
        const token = jwt.sign({twitterId: result.twitterId}, app.get('secret'), {expiresIn: 300});
        res.json({result: true, token: token});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * Find User By TwitterID
 */
router.get('/user', verify, function(req, res) {
    (async () => {
        if (!req.query || !req.query.twitterId) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        const result = await user.find({twitterId: req.query.twitterId});
        result.result = true;
        result.userId = result._id;
        delete result._id;
        delete result.password;
        res.json(result);
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * Find History By TwitterID
 */
router.get('/history', verify, function(req, res) {
    (async () => {
        const offset = !req.query.offset? 0: req.query.offset;
        const limit = !req.query.limit? 20: req.query.limit;
        if (!req.query || !req.query.twitterId || !utils.isNumber(offset) || !utils.isNumber(limit)) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        const result = await history.find({twitterId: req.query.twitterId}, +offset, +limit > 100? 100: +limit);
        result.map(element => {
            delete element._id;
        });
        res.json({result: true, datas: result});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * tip
 */
router.put('/tip', verify, function(req, res) {
    (async () => {
        if (!req.body || !utils.isDecimal(req.body.amount) ||
            !req.body.senderId || !req.body.senderNm || 
            !req.body.receiptId || !req.body.receiptNm) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        
        // 送信者の情報を取得
        const senderInfo = await user.find({twitterId: req.body.senderId});
        if (utils.isEmpty(senderInfo)) {
            await user.createUser(req.body.senderId);
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }

        // 送信後の枚数計算
        const senderAmount = utils.minus(senderInfo.amount, req.body.amount);
        if (+senderAmount <= 0) {
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }

        // 受診者の情報を取得
        const receiptInfo = await user.find({twitterId: req.body.receiptId});
        if (utils.isEmpty(receiptInfo)) {
            await user.createUser(req.body.receiptId);
            receiptInfo.amount = '0';
        }

        // 受信後の枚数計算
        const receiptAmount = utils.plus(receiptInfo.amount, req.body.amount);

        // 送信者・受診者の枚数更新＆履歴登録
        await user.updateAmount(req.body.senderId, senderAmount);
        await user.updateAmount(req.body.receiptId, receiptAmount);
        await history.insert(req.body.senderId, req.body.receiptNm, utils.num2str(req.body.amount), cst.TYPE_SEND);
        await history.insert(req.body.receiptId, req.body.senderNm, utils.num2str(req.body.amount), cst.TYPE_RECEIVE);

        res.json({result: true});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * withdraw
 */
router.put('/withdraw', verify, function(req, res) {
    (async () => {
        if (!req.body || !req.body.senderId || !req.body.liskAddress || !utils.isDecimal(req.body.amount)) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        
        // 送信者の情報を取得
        const senderInfo = await user.find({twitterId: req.body.senderId});
        if (utils.isEmpty(senderInfo)) {
            await user.createUser(req.body.senderId);
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }
        
        // Liskトランザクション作成
        const trx = liskTransaction.createTransaction(req.body.liskAddress, req.body.amount);
        if (utils.isEmpty(trx)) {
            res.json({result: true, resultType: cst.RETURN_TYPE_LISK_TRX_ERROR});
            return;
        }

        // 送信後の枚数計算
        const fee = utils.divide(trx.fee, 100000000);
        const amount = utils.minus(utils.minus(senderInfo.amount, req.body.amount), fee);
        if (+amount <= 0) {
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }

        // broadcast
        const result = await config.LiskClient.transactions.broadcast(trx);
        if (utils.isEmpty(result)) {
            res.json({result: true, resultType: cst.RETURN_TYPE_LISK_TRX_ERROR});
            return;
        }

        // 送信者の枚数更新＆履歴登録
        await user.updateAmount(req.body.senderId, amount);
        await history.insert(req.body.senderId, req.body.liskAddress, utils.num2str(req.body.amount), cst.TYPE_SEND);
        await history.insert(req.body.senderId, req.body.liskAddress, fee, cst.TYPE_FEE);

        res.json({result: true, id: trx.id, balance: amount, fee: fee});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

app.listen(53000);
console.log('TipLisk Core Start');