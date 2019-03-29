const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const config = require('./config');
const utils = require('./utils');
const user = require('./db/user');
const history = require('./db/history');
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
        if (!req.query || !req.query.id || !req.query.pw) {
            res.json({result: false, error: 'Required parameter missing or invalid.'});
            return;
        }
        const result = await user.find({_id: req.query.id});
        if (!result || !result.password || result.password !== utils.sha256(req.query.pw)) {
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
        result.result = true,
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
        if (!req.query || !utils.isDecimal(req.query.amount) ||
            !req.query.senderId || !req.query.senderNm || 
            !req.query.receiptId || !req.query.receiptNm) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        
        // 送信者の情報を取得
        const senderInfo = await user.find({twitterId: req.query.senderId});
        if (!senderInfo || !senderInfo._id) {
            await user.createUser(req.query.senderId);
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }

        // 送信後の枚数計算
        const senderAmount = utils.minus(senderInfo.amount, req.query.amount);
        if (+senderAmount <= 0) {
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }

        // 受診者の情報を取得
        const receiptInfo = await user.find({twitterId: req.query.receiptId});
        if (!receiptInfo || !receiptInfo._id) {
            await user.createUser(req.query.receiptId);
            receiptInfo.amount = '0';
        }

        // 受信後の枚数計算
        const receiptAmount = utils.plus(receiptInfo.amount, req.query.amount);

        // 送信者・受診者の枚数更新＆履歴登録
        await user.updateAmount(req.query.senderId, senderAmount);
        await user.updateAmount(req.query.receiptId, receiptAmount);
        await history.insert(req.query.senderId, req.query.receiptNm, utils.num2str(req.query.amount), cst.TYPE_SEND);
        await history.insert(req.query.receiptId, req.query.senderNm, utils.num2str(req.query.amount), cst.TYPE_RECEIVE);

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
        if (!req.query || !req.query.sender || !req.query.receipt || !utils.isDecimal(amount)) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        
        // TODO

        res.json({result: true});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

app.listen(53000);
console.log('TipLisk Core Start');