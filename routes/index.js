var express = require('express');
var router = express.Router();
var auth_id = 0;

/* Authenticates user on every link */
function checkAuth(req, res, next) {
  if (auth_id != '1234') {
    res.render('login', {
        title : "MediSys",
        message : "Please login to access the panel.",
    });
  } else {
    res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
    next();
  }
}



/* GET Login Page. */
router.get('/', function(req, res, next) {
    if(auth_id){
        res.redirect('/dashboard');
    }
    else {res.render('login', {
        title : "MediSys",
        message : "",
    });
    }
});


/* GET Dashboard. */
router.get('/dashboard', checkAuth, function(req, res, next) {
	var db = req.db;
    var collection = db.get('products');
    collection.find({},{},function(e,docs){
        res.render('dashboard', {
            title : "MediSys",
            "products" : docs
        });
    });
    
});

/* GET Add New Product page. */
router.get('/addproduct', checkAuth, function(req, res) {
	var success = req.query.success;
	var db = req.db;
    var collection = db.get('suppliers');
    collection.find({},{},function(e,docs){
        res.render('addproduct', {
            title : "Add New Product",
            "suppliers" : docs,
            "success" : success
        });
    });

});

/* POST login details */
router.post('/post/login', function (req, res) {
  var username = req.body.username;
  var password = req.body.password;
  if (username === 'admin' && password === 'admin') {
    auth_id = '1234';
    res.redirect('/dashboard');
  } else {
    res.render('login', {
        title : "MediSys",
        "message" : "Invalid username/password",
    });
  }
});

/* LOGOUT user */
router.get('/logout', function (req, res) {
  auth_id = 0;
  res.redirect('/');
});   

/* POST to Add New Product */
router.post('/post/newproduct', checkAuth, function(req, res) {

    // Set our internal DB variable
    var db = req.db;

    // Get our form values. These rely on the "name" attributes
    var name = req.body.name;
    var stock = req.body.stock;
    var price = req.body.price;
    var supplierName = req.body.supplier;
    var expiry = new Date(req.body.expiry);

    // Set our collection
    var collection = db.get('products');

    // Submit to the DB
    collection.insert({
        "name" : name,
        "stock" : stock,
        "price" : price,
        "supplierName" : supplierName,
        "expiry" : expiry
    }, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.redirect("/addproduct?success=0");
        }
        else {
            // And forward to success page
            res.redirect("/addproduct?success=1");
        }
    });
});





module.exports = router;
