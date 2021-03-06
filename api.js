const ObjectId = require('mongodb').ObjectId;
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const config = require('./config');
const utils = require('./utils');
const user = require('./db/user');
const history = require('./db/history');
const liskTrx = require('./db/lisktrx');
const liskTransaction = require('./lisk/transaction');
const cst = require('./const');

const app = express();
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(helmet());

const router = express.Router();
app.use('/core', router);

/**
 * 認証処理
 */
router.post('/auth', (req, res) => {
    (async () => {
        if (!req.body || !req.body.id || !req.body.pw ||
            !config.regexp.depositKey.test(req.body.id)) {
            res.json({result: false, error: 'Required parameter missing or invalid.'});
            return;
        }
        const result = await user.find({_id: req.body.id});
        if (utils.isEmpty(result) || !result.password || result.password !== utils.sha256(req.body.pw)) {
            res.json({result: false, error: "Authentication failed."});
            return;
        }
        res.json({result: true, twitterId: result.twitterId});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * ユーザー検索処理
 */
router.get('/user', (req, res) => {
    (async () => {
        if (!req.query || !req.query.twitterId) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        const userInfo = await user.find({twitterId: req.query.twitterId});
        if (utils.isEmpty(userInfo)) {
            res.json({result: false, error: "Not Found"});
            return;
        }

        const result = {
            result: true,
            userId: userInfo._id.toHexString(),
            twitterId: userInfo.twitterId,
            amount: userInfo.amount
        }
        res.json(result);
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * ユーザー作成処理
 */
router.put('/user', (req, res) => {
    (async () => {
        if (!req.body.twitterId) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        const userInfo = await user.find({twitterId: req.body.twitterId});
        if (utils.isEmpty(userInfo)) {
            await user.createUser(req.body.twitterId);
        }
        res.json({result: true});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * 履歴検索処理
 */
router.get('/history', (req, res) => {
    (async () => {
        const offset = !req.query.offset? 0: req.query.offset;
        const limit = !req.query.limit? 20: req.query.limit;
        if (!req.query || !req.query.twitterId || !utils.isNumber(offset) || !utils.isNumber(limit)) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        const histories = await history.find({twitterId: req.query.twitterId}, +offset, +limit > 100? 100: +limit);
        histories.map(element => {
            delete element._id;
        });
        res.json({result: true, datas: histories});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * チップ処理
 */
router.put('/tip', (req, res) => {
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
            res.json({result: false, error: "Not Found"});
            return;
        }

        // 送信後の枚数計算
        const senderAmount = utils.minus(senderInfo.amount, req.body.amount);
        if (+senderAmount < 0) {
            res.json({result: true, resultType: cst.RETURN_TYPE_NOT_ENOUGH});
            return;
        }

        // 受信者の情報を取得
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
 * 出金処理
 */
router.put('/withdraw', (req, res) => {
    (async () => {
        if (!req.body || !req.body.senderId || !req.body.liskAddress || !utils.isDecimal(req.body.amount)) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        
        // 送信者の情報を取得
        const senderInfo = await user.find({twitterId: req.body.senderId});
        if (utils.isEmpty(senderInfo)) {
            res.json({result: false, error: "Not Found"});
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
        if (+amount < 0) {
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

/**
 * 入金処理
 */
router.put('/deposit', (req, res) => {
    (async () => {
        // 処理済のトランザクションIDを取得
        const trx = await liskTrx.find();
        const trxId =  utils.isEmpty(trx)? '': trx.transactionId;

        // 処理済のトランザクションより新しいトランザクションの情報を取得
        const trxInfo = await liskTransaction.getTransactionInfo(trxId);
        if (utils.isEmpty(trxInfo)) {
            res.json({result: true, data: []});
            return;
        }

        // 最新トランザクションIDに更新
        await liskTrx.update(trxInfo[0].id);
    
        let depositTarget = [];
        for (i = 0; i < trxInfo.length; i++) {
            const key = trxInfo[i].asset.data;
            if (utils.isEmpty(key) || !config.regexp.depositKey.test(key)) continue;
            
            // depositKeyでユーザー検索
            const userInfo = await user.find({_id: ObjectId(key)});
            if (utils.isEmpty(userInfo)) continue;
    
            // ユーザー情報更新&履歴登録
            const deposit = utils.divide(trxInfo[i].amount, 100000000);
            await user.updateAmount(userInfo.twitterId, utils.plus(userInfo.amount, deposit));
            await history.insert(userInfo.twitterId, trxInfo[i].senderId, deposit, cst.TYPE_RECEIVE);
    
            // 処理したトランザクションの情報を格納
            depositTarget.push({trxId: trxInfo[i].id, twitterId: userInfo.twitterId, amount: deposit});
        }
        res.json({result: true, data: depositTarget});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * WEBアクセス情報取得処理
 */
router.get('/webaccess', (req, res) => {
    (async () => {
        if (!req.query || !req.query.twitterId) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }

        // ユーザーを検索
        const userInfo = await user.find({twitterId: req.query.twitterId});
        if (utils.isEmpty(userInfo)) {
            res.json({result: false, error: "Not Found"});
            return;
        }
        let result = {result: true, userId: userInfo._id.toHexString()}

        // パスワードが未設定なら仮パスワード生成
        if (!userInfo.password) {
            const password = utils.createPassword();
            await user.updatePassword(req.query.twitterId, password);
            result.password = password;
        }
        res.json(result);
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * パスワード変更処理
 */
router.put('/password', (req, res) => {
    (async () => {
        if (!req.body || !req.body.twitterId || !req.body.pw || !config.regexp.password.test(req.body.pw)) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        await user.updatePassword(req.body.twitterId, req.body.pw);
        res.json({result: true});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

/**
 * パスワードリセット処理
 */
router.put('/resetpw', (req, res) => {
    (async () => {
        if (!req.body || !req.body.twitterId) {
            res.json({result: false, error: 'Required parameter missing or invalid'});
            return;
        }
        const password = utils.createPassword();
        await user.updatePassword(req.body.twitterId, password);
        res.json({result: true, password: password});
    })().catch((err) => {
        res.json({result: false, error: "Error!"});
        console.log(err);
    });
});

app.listen(config.listenPort);
console.log(`TipLisk Core Start (mode: ${config.mode})`);
