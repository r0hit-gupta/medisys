var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	var db = req.db;
    var collection = db.get('products');
    collection.find({},{},function(e,docs){
        res.render('dashboard', {
            title : "MediSys",
            "products" : docs
        });
    });
    //res.render('dashboard', { title: 'MediSys' });
});

module.exports = router;
