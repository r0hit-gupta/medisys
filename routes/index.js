var express = require('express');

var request = require('request');
var cheerio = require('cheerio');

var router = express.Router();
var auth_id = '1234';

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

/* Search Products Page. */
router.get('/products/search', checkAuth, function(req, res, next) {
    var db = req.db;
    var keyword = req.query.keyword;
    var query = {
          name: {
            $regex: keyword,
            $options: 'i' //i: ignore case, m: multiline, etc
          }
        };

    var collection = db.get('products');
    
    collection.find(query ,{},function(e,docs){
        
        res.render('products', {
            title : 'Search Results for "'+keyword+'"',
            "products" : docs,
        });
    });
    
});

/* Edit Products Page. */
router.get('/products/:product', checkAuth, function(req, res, next) {
    var success = req.query.success;
    var db = req.db;
    var product = req.params.product;
    var query = {
          name: {
            $regex: product,
            $options: 'i' //i: ignore case, m: multiline, etc
          }
        };
    var suppliers;
    var collection = db.get('products');
    var collectionSuppliers= db.get('suppliers');
    collectionSuppliers.find({},{},function(e,docs){
            suppliers = docs;
    });
    collection.find(query ,{},function(e,docs){
        res.render('editproduct', {
            title : 'Edit Product',
            "products" : docs,
            "suppliers" : suppliers,
            "success" : success
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


/* GET Invoices Page. */
router.get('/invoices', checkAuth, function(req, res, next) {
    var db = req.db;
    var collection = db.get('products');
    collection.find({},{},function(e,docs){
        //res.send(docs);
        res.render('invoices', {
            title : "invoices",
            "products" : docs,
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
    var collection = db.get('products');
    var id;
    collection.find({},{},function(e,docs){
        console.log(doc[docs.length-1].productid);
        id = docs[docs.length-1].productid + 1;
        
    });
    // Get our form values. These rely on the "name" attributes
    var name = req.body.name;
    var stock = parseInt(req.body.stock, 10);
    var price = parseFloat(req.body.price, 10);
    var supplierName = req.body.supplier;
    var expiry = new Date(req.body.expiry);

    // Submit to the DB
    collection.insert({
        "productid" : productID,
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


/* POST to Add New Product */
router.post('/post/updateproduct', checkAuth, function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    var collection = db.get('products');

    // Get our form values. These rely on the "name" attributes
    var productid = req.body.productid;
    var name = req.body.name;
    var stock = parseInt(req.body.stock, 10);
    var price = parseFloat(req.body.price, 10);
    var supplierName = req.body.supplier;
    var expiry = new Date(req.body.expiry);

    var query = (
        { productid: productid },
           {
              name: name,
              stock: stock,
              price: price,
              supplierName: supplierName,
              expiry: expiry
           }
        );
    

    // Submit to the DB
    collection.update(query, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.redirect("/editproduct?success=0");
        }
        else {
            // And forward to success page
            res.redirect("/editproduct?success=1");
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

router.get('/api/products', checkAuth, function(req, res){
    var db = req.db;
    var collection = db.get('products');
    collection.find({},{},function(e,docs){

        // function to change "name" in json to "label"
        function changeData(data) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].hasOwnProperty("name")) {
                        data[i]["label"] = data[i]["name"];
                        delete data[i]["name"];
                    }
                }
                return data;
        }

        docs = changeData(docs);
        res.send(docs);
        });
});

module.exports = router;
