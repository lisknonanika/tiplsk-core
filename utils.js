const BigNumber = require('bignumber.js');
const CryptoJs = require('crypto-js');
const cst = require('./const');

/**
 * Check Empty
 */
module.exports.isEmpty = function(val) {
    return !val || Object.keys(val).length === 0;
}

/**
 * Check Number
 */
module.exports.isNumber = function(val) {
    const regex = new RegExp(/^[0-9]+$/);
    return regex.test(val); 
}

/**
 * Check Decimal
 */
module.exports.isDecimal = function(val) {
    const regex = new RegExp(/^(0|[1-9]\d*)(\.\d+)?$/);
    return regex.test(val); 
}

/**
 * Number -> String
 */
module.exports.num2str = function(val) {
    return new BigNumber(val).toFixed();
}

/**
 * val1 + val2
 */
module.exports.plus = function(val1, val2) {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.plus(d2).toFixed();
}

/**
 * val1 - val2
 */
module.exports.minus = function(val1, val2) {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.minus(d2).toFixed();
}

/**
 * val1 / val2
 */
module.exports.divide = function(val1, val2) {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.dividedBy(d2).toFixed();
}

/**
 * val1 * val2
 */
module.exports.multiply = function(val1, val2) {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.multipliedBy(d2).toFixed();
}

/**
 * sha256
 */
module.exports.sha256 = function(val) {
    return CryptoJs.SHA256(val).toString();
}

/**
 * create password
 */
module.exports.createPassword = function() {
    let password = '';
    for(let i=0; i<cst.PASSWORD_LENGTH; i++){
        password += cst.PASSWORD_CHAR[Math.floor(Math.random()*key.length)];
    }
    return password;
}