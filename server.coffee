// BASE SETUP
// =============================================================================

// call the packages we need
require ('coffee-script/register');

var express    = require('express');
var bodyParser = require('body-parser');
var app        = express();

sparql     = require 'sparql'

// configure app
app.use(bodyParser());

var port     = process.env.PORT || 8888; // set our port

/*
var mongoose   = require('mongoose');
mongoose.connect('mongodb://node:node@novus.modulusmongo.net:27017/Iganiq8o'); // connect to our database
var Bear     = require('./app/models/bear');
*/

// ROUTES FOR OUR API
// =============================================================================

// create our router
var router = express.Router();

// middleware to use for all requests
router.use(function(req, res, next) {
	// do logging
	console.log('Something is happening.');
	next();
});

// test route to make sure everything is working (accessed at GET http://localhost:8888/api)
router.get('/', function(req, res) {


	res.json({ message: 'Welcome to our api!' });	
});

// trial 
router.route('/try').get (function (req, res) {
        var dbpclient = new sparql.Client 'http://dbpedia.org/sparql'
        client.query 'select *  where {?s a bibo:Book } LIMIT 50', (err, results) ->
        console.log results


});

// get a book
router.route ('/book/:isbn13').get ( function(req, res) {

	var uri=req.query.uri;
	var isbn=req.params.isbn13;
	var aNode = '<' + uri + isbn + '>';
	//res.json ({node: aNode});
	rdfstore.create(function(store) {
		var execStmt = 'LOAD ' + aNode + ' INTO GRAPH <book> ';
		console.log (execStmt);
  		store.execute('LOAD ' + aNode + ' INTO GRAPH <book>', function() {
  			  var entity = "spd:" + isbn;
  			  store.setPrefix ('spd', uri);
  			  console.log (entity);
    	      store.node(store.rdf.resolve(entity), "book", function(success, graph) {

    	      		var query =  'PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
                              PREFIX foaf: <http://xmlns.com/foaf/0.1/> \
                              PREFIX dcterms: <http://purl.org/dc/terms/> \
								              PREFIX sso: <http://wso2.scholastic-labs.io/sso#> \
								              PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
								              PREFIX cool: <http://wso2.scholastic-labs.io/cool#> \
						                  PREFIX dc: <http://purl.org/dc/elements/1.1/> \
								              PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
								              PREFIX skos: <http://www.w3.org/2004/02/skos/core#>\
								              PREFIX schcore: <http://wso2.scholastic-labs.io/schcore#> \
								              PREFIX cc: <http://creativecommons.org/ns#> \
								              PREFIX schema: <http://wso2.scholastic-labs.io/schema#> \
								              PREFIX owl: <http://www.w3.org/2002/07/owl#> \
								              PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> \
                              select ?p ?o WHERE { ' + aNode + ' ?p ?o }' ;

                    console.log(query);
                
				 	
      	           	store.execute ( query,  
                          function(ok, results) {

  						     res.type('text/plain'); // set content-type
  					         res.json(results);
  
                   	});


    	      });
		     

  		});
	});

});



// REGISTER OUR ROUTES -------------------------------
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('API happens on port ' + port);
