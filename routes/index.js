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
    //res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
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
    
    function checkExpiry(date){
        var today = Date.now();
        var expiry = new Date(date);
        var remain = expiry - today;
        remain = parseInt(((((remain/1000)/60)/60)/24));
        return remain;
    }

    var stockWarning, expiryWarning, adminNotes;
    var db = req.db;
    var collection = db.get('products');
    var settingsdb = db.get('settings');

    settingsdb.find({},{},function(e,docs){
        stockWarning = docs[0].stockAlert + 1; 
        expiryWarning = docs[0].expiryAlert; 
        adminNotes = docs[0].adminNotes;    
    


    var expiryProducts = [];

    collection.find({},{},function(e,docs){
        for (var i = 0; i < docs.length; i++){
            if (checkExpiry(docs[i].expiry) < expiryWarning ) {
                expiryProducts.push(docs[i]);
            }
        }
    
    
    console.log(stockWarning);

    collection.find({ stock: {$lt : stockWarning }},{},function(e,docs){
        res.render('dashboard', {
            "title" : "Dashboard",
            "products" : docs,
            "expiryProducts" : expiryProducts,
            "adminNotes" : adminNotes
        });
    });
    });
    });
});

/* GET Settings Page. */
router.get('/settings', checkAuth, function(req, res, next) {
    var success = req.query.success;
    
    var db = req.db;

    var collection = db.get('settings');
    collection.find({},{},function(e,docs){
        res.render('settings', {
            title : "Settings",
            "settings" : docs,
            "success" : success
        });
    });
    
});

/* GET Products Page. */
router.get('/products', checkAuth, function(req, res, next) {
    var db = req.db;
    var collection = db.get('products');
    collection.find({},{},function(e,docs){
        res.render('products', {
            title : "Products",
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
router.get('/editproduct', checkAuth, function(req, res, next) {
    var success = req.query.success;
    var product = req.query.edit;

    var db = req.db;
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
    
    collection.find(query ,{},function(e,docs){
        res.render('editproduct', {
            title : 'Edit Product',
            "products" : docs,
            "suppliers" : suppliers,
            "success" : success
        });
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
    var collection = db.get('invoices');
    collection.find({},{},function(e,docs){
        //res.send(docs);
        res.render('invoices', {
            title : "Invoices",
            "invoices" : docs,
        }); 
    });
    
});

router.get('/invoices/new', checkAuth, function(req, res, next) {
        res.render('createinvoice', {
            title : "Create New Invoice"
    });
    
});

router.get('/invoices/:number', checkAuth, function(req, res, next) {
        
        var invoiceNumber = req.params.number;

        var db = req.db;
        var query = {
          number: {
            $regex: invoiceNumber,
            $options: 'i' //i: ignore case, m: multiline, etc
          }
        };

    var collection = db.get('invoices');
    collection.find(query ,{},function(e,docs){
        //console.log(docs);
        res.render('invoicetemplate', {
            title : 'Invoice #'+invoiceNumber,
            "invoice" : docs,

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
        //console.log(docs[docs.length-1].productid);
        id = (docs[docs.length-1].productid + 1);
        
    
    // Get our form values. These rely on the "name" attributes
    var name = req.body.name;
    var stock = parseInt(req.body.stock, 10);
    var price = parseFloat(req.body.price, 10);
    var supplierName = req.body.supplier;
    var expiry = new Date(req.body.expiry);

    // Submit to the DB
    collection.insert({
        "productid" : id,
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
});

/* POST to Add New Product */
router.post('/post/updateproduct', checkAuth, function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    var collection = db.get('products');

    // Get our form values. These rely on the "name" attributes
    var productid = parseInt(req.body.productid, 10);
    var name = req.body.name;
    var stock = parseInt(req.body.stock, 10);
    var price = parseFloat(req.body.price, 10);
    var supplierName = req.body.supplier;
    var expiry = new Date(req.body.expiry);
    
    var deleteProduct = parseInt(req.body.delete, 10);

    if (deleteProduct == 1) {
        collection.remove({ "productid": productid }, function (err) {
           if (err) {
                res.redirect("/editproduct?edit="+name+"&success=0");
            }
            else {
                res.redirect("/products");
            }
});
    }
    else {
        // Update in the DB
        collection.update({ "productid": productid }, { $set: {"name": name,
        "stock": stock,
        "price": price,
        "supplierName": supplierName,
        "expiry": expiry} }, function (err, doc) {
            if (err) {
                // If it failed, return error
                //res.redirect("/products/"+name+"?success=0");
                res.redirect("/editproduct?edit="+name+"&success=0");
            }
            else {
                // And forward to success page
                //res.redirect("/products/"+name+"?success=1");
                res.redirect("/editproduct?edit="+name+"&success=1");
            }
        });
    }
});


/* POST Settings */
router.post('/post/settings', checkAuth, function(req, res) {

    // Set our internal DB variable
    var db = req.db;
    var collection = db.get('settings');

    // Get our form values. These rely on the "name" attributes
    var stockAlert = parseInt(req.body.stock, 10);
    var expiryAlert = parseInt(req.body.expiry, 10);
    var adminNotes = req.body.notes;
        // Update in the DB
    collection.update({ _id : "57127759e4b065a8c4d71007" }, { $set: {"stockAlert": stockAlert,
    "expiryAlert": expiryAlert,
    "adminNotes": adminNotes } }, function (err, doc) {
        if (err) {
            res.redirect("/settings?success=0");
        }
        else {
            res.redirect("/settings?success=1");
        }
    });
    
});



/* GET Medicine Search Scraper */
router.get('/api/scrape', checkAuth, function(req, res){

    var keyword = req.query.keyword; 
    var url = 'http://www.drugs.com/' + keyword + '.html';

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

/* POST Invoices */
router.post('/post/invoice', checkAuth, function(req, res) {
   var details = req.body;
   var invoiceNumber = req.body.number;
   req.body.date = new Date(req.body.date);
   req.body.grandtotal = parseFloat(req.body.grandtotal);
   if(!Array.isArray(req.body.productid)){
        req.body.productid = new Array(req.body.productid);
        req.body.productname = new Array(req.body.productname);
        req.body.productprice = new Array(req.body.productprice);
        req.body.productquantity = new Array(req.body.productquantity);
        req.body.producttotal = new Array(req.body.producttotal);

   }

   //res.send(req.body);
   var db = req.db;
   var collection = db.get('invoices');
   
   collection.insert(details, function (err, doc) {
        if (err) {
            // If it failed, return error
            res.send("Error");
        }
        else {
            // And forward to success page
            res.redirect("/invoices/"+ invoiceNumber);
        }
    }); 
    
});



/* Autocomplete Invoice */
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


/* GET Stats Page */
router.get('/stats', function(req, res, next) {

   var db = req.db;
    var collection = db.get('invoices');
    var products = db.get('products');

    var saleQuery = [
    {
        $group : {
           _id : { month: { $month: "$date" }, year: { $year: "$date" } },
           sales: { $sum: "$grandtotal" },
           count: { $sum: 1 }
        }
      }];

     var supplierQuery =  { 
    $group : {_id : "$supplierName", count : { $sum : 1 }}
    };


    collection.col.aggregate(saleQuery, function (err, saleData) {
            // And forward to success page
        products.col.aggregate(supplierQuery, function (err, count) {
            collection.find({},{},function(e,invoiceData){
                //res.json(invoiceData);
                res.render('stats', {
                    title : "Statistics",
                    monthSales: saleData,
                    supplierView: count,
                    invoiceData: invoiceData

                 });

       });
        });
    });
    
});


module.exports = router;
