const BigNumber = require('bignumber.js');
const CryptoJs = require('crypto-js');
const config = require('./config');

/**
 * Check Empty
 */
module.exports.isEmpty = (val) => {
    return val == null || val.length === 0 || Object.keys(val).length === 0;
}

/**
 * Check Number
 */
module.exports.isNumber = (val) => {
    const regex = new RegExp(/^[0-9]+$/);
    return regex.test(val); 
}

/**
 * Check Decimal
 */
module.exports.isDecimal = (val) => {
    const regex = new RegExp(/^(0|[1-9]\d*)(\.\d+)?$/);
    return regex.test(val); 
}

/**
 * Number -> String
 */
module.exports.num2str = (val) => {
    return new BigNumber(val).toFixed();
}

/**
 * val1 + val2
 */
module.exports.plus = (val1, val2) => {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.plus(d2).toFixed();
}

/**
 * val1 - val2
 */
module.exports.minus = (val1, val2) => {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.minus(d2).toFixed();
}

/**
 * val1 / val2
 */
module.exports.divide = (val1, val2) => {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.dividedBy(d2).toFixed();
}

/**
 * val1 * val2
 */
module.exports.multiply = (val1, val2) => {
    const d1 = new BigNumber(val1);
    const d2 = new BigNumber(val2);
    return d1.multipliedBy(d2).toFixed();
}

/**
 * sha256
 */
module.exports.sha256 = (val) => {
    return CryptoJs.SHA256(val).toString();
}

/**
 * create password
 */
module.exports.createPassword = () => {
    let password = '';
    for(let i=0; i<config.passwordLength; i++){
        password += config.passwordChar[Math.floor(Math.random()*config.passwordChar.length)];
    }
    return password;
}
