// routes/index.js
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('index', { 
        title: 'Dashboard',
        active: 'home' 
    });
});

router.get('/data', function(req, res, next) {
    res.render('data', { 
        title: 'Données',
        active: 'data'
    });
});

module.exports = router;
