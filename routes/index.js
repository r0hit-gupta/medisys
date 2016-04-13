var express = require('express');

var request = require('request');
var cheerio = require('cheerio');

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
    collection.find({ stock: {$lt : 10}},{},function(e,docs){
        res.render('dashboard', {
            title : "dashboard",
            "products" : docs,
        });
    });
    
});

/* GET Products Page. */
router.get('/products', checkAuth, function(req, res, next) {
    var db = req.db;
    var collection = db.get('products');
    collection.find({},{},function(e,docs){
        res.render('products', {
            title : "products",
            "products" : docs,
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
    var stock = parseInt(req.body.stock, 10);
    var price = parseFloat(req.body.price, 10);
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

/* POST Medicine Search Scraper */
router.get('/api/scrape', checkAuth, function(req, res){

    //var title = req.body.keyword;
    //var keyword = title.replace(" ", "-");
    var keyword = req.query.keyword; //"aspirin";
    var url = 'http://www.drugs.com/' + keyword + '.html';
    //var description;
    var json = {"description" : "", "image": ""};

    request(url, function(error, response, html){

        if(!error){

            var $ = cheerio.load(html);
            // Selects description 
            $("p[itemprop='description']").filter(function(){
                json.description = $(this).text();
            });

            // Selects image URL
            $("img[itemprop='contentUrl']").filter(function(){
                json.image = $(this).attr('src');
            });
            res.json(json);
        }
        else{
            res.send("Error");
        }
    });
});


module.exports = router;
