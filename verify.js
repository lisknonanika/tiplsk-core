var jwt = require('jsonwebtoken');
var config = require('./config');

module.exports = (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) return res.status(403).send({error: 'Invalid Token'});

    jwt.verify(token, config.secret, function(error, decoded) {
        if (error) return res.status(403).send({error: 'Invalid Token'});
        req.decoded = decoded;
        next();
    });
}