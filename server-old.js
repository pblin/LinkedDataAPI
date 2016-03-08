// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');
var cors = require('cors');
//var wait  = require ('wait.for');
var Seq = require('seq');
var bodyParser = require('body-parser');
var app        = express();
var SparqlClient = require('sparql-client');
var rdfstore = require('rdfstore');
var util = require('util');
var dbpEndpoint = 'http://dbpedia.org/sparql';
var spdEndpointTest = 'http://localhost:8080/LMF/sparql/select';
var spdEndpoint = 'http://poc.scholastic-labs.io:8088/LMF/sparql/select';
var pcdEndpoint = 'http://wso2.scholastic-labs.io:3030/PCD/query';
var imageService = 'http://esvcs.scholastic.com/SchCXFWS/services/ImgService/';
var HashMap = require ('hashmap').HashMap;
var utf8 = require ('utf8');
map = new HashMap(); 


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


// trial 
router.route('/try').get (function (req, res) {
        var client = new SparqlClient(dbpEndpoint);
        client.query ('select  ?property ?value WHERE { <http://dbpedia.org/resource/A_Descent_into_the_Maelstr%C3%B6m> ?property ?value }')
          .execute (function (err, results) { 
              res.json(results);
            });
});


function retrieveCreatorFromDbpedia (uri,res)
{
  if (uri.length == 0 ) {
     return;
  }

  var creatorInfo = {
                    "link": "",
                    "name": "N/A",
                    "abstract": {},
                    "wikilink": "N/A",
                    "thumbnail": "N/A"
                  };
  var error;
  creatorInfo.link = uri;

  var q = "select ?p ?o WHERE { " + '<' + uri + '>' + " ?p ?o . " + 
            "FILTER ( regex (?p, 'name') || regex (?p, 'isPrimaryTopicOf') || \
             regex (?p, 'thumbnail' ) || regex (?p, 'creator') || regex (?p, 'abstract' )) }"

  var request = require('request');

  var options = {
      url: encodeURI(dbpEndpoint + "?query=" + q),
      headers: {
        'User-Agent': 'Node.js',
        'content-Type' : 'application/sparql-results+json',
        'format' : 'application/sparql-results+json',
        'Accept': 'application/json'
      }
    };
  console.log (q);
  function callback(error, response, body) {
    if (error) { console.log(error); } 
    else {
        //console.log (body);
        var results = JSON.parse(body);
        //console.log (results);
        with (results.results) {
          for (var i = 0; i < bindings.length; i++) {
              console.log (bindings[i].p.value);
              if (bindings[i].p.value.search ("abstract") > 0 ) 
                  { 
                    var lang = bindings[i].o['xml:lang'];
                    var desc = bindings[i].o.value;
                    //var about = {};
                    //about[lang] = desc;
                    creatorInfo.abstract[lang] = desc; 
                    continue; 
                  } 
              if (bindings[i].p.value.search ("name") > 0) { creatorInfo.name = bindings[i].o.value; } 
              if (bindings[i].p.value.search ("PrimaryTopic") > 0 ) { creatorInfo.wikilink = bindings[i].o.value; continue; }         
              if (bindings[i].p.value.search ("thumbnail") > 0 ) { creatorInfo.thumbnail = bindings[i].o.value; continue; }
              //if (bindings[i].p.value.search ("creator") > 0 ) { creatorInfo.isCreatorOf.push( bindings[i].o.value ); continue; }
            }
          }
        //console.log (creatorInfo);
        res.send(creatorInfo);
        
      }
  }

  request(options, callback);
}


// get a book
router.route ('/book/:isbn13').get ( function(req, res) {
  // wait.launchFiber(handleSequence, req, res);
    var bookInfoSchema = {
          "isbn13": "N/A",
           "title": "",
           "description": "",
           "thumbnail": [],
           "creator": {
                      "link": "",
                      "name": "N/A",
                    },

          "illustrator": {
                      "link": "",
                      "name": "N/A",
                    },

          "publisher": "N/A",
          "minAge": "N/A",
          "maxAge": "N/A",
          "readingLevel": [],
          "genre": [],
          "theme":[],
          "numberOfPages": "1",
          "sameAs": [],
          "seeAlso":[]
    };

    var baseUri = req.query.uri;

  	var isbn=req.params.isbn13;

    if (baseUri === undefined ) {//default 
      baseUri = "http://poc.scholastic-labs.io:8088/LMF/"; 
    }

    var uri = baseUri + 'resource/';
  	
    var namedNode = '<' + uri + isbn + '>';
    console.log (namedNode);

     var q =  'select ?p ?v WHERE { ' + namedNode + ' ?p ?v }' ;
     var contentType, acceptType;

      console.log (q);

      var options; 

      var queryEndpoint = baseUri + 'sparql'; 
      if (baseUri.search ('LMF') > 0 ) {
         queryEndpoint += '/select';
         contentType =  acceptType = "application/sparql-results+json";
         options = {
              url: encodeURI (queryEndpoint + "?query=" + q + "&output=json"),
              headers: {
                'User-Agent': "Node.js",
                'Content-Type': contentType,
                'Accept': acceptType
              }
          };
         //console.log(options);
       }

        
      var isPCD = -1;
      if ( (isPCD=baseUri.search("pcd")) > 0 || baseUri.search("spd") > 0  ) {
          if (isPCD > 0) {
            queryEndpoint = queryEndpoint.replace ("pcd", "PCD");
          } else {
            queryEndpoint = queryEndpoint.replace ("spd", "SPD");
          }

          queryEndpoint = queryEndpoint.replace (':8080', ':3030');
          acceptType = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
          options = {
               url: encodeURI (queryEndpoint + "?query=" + q + "&output=json"),
               headers: {
                  'User-Agent': "Node.js",
                  'Accept': acceptType 
                }
              };
          //console.log (options);
      }
       
      console.log (options.url);
      // var client = new SparqlClient(queryEndpoint);
      var request = require('request');

      function callback(error, response, body) {

          if (error != null) { console.log(error); }
          else {
            console.log (body);
            var results = JSON.parse(body);

            with (results.results) {
              for (var i = 0; i < bindings.length; i++) {
                //console.log (bindings[i].p.value);
                if (bindings[i].p.value.search ("isbn") > 0 ) { 
                          bookInfoSchema.isbn13 = bindings[i].v.value; 
                          bookInfoSchema.thumbnail = imageService + bookInfoSchema.isbn13 + '.jpg' + "?h=190&w=100";
                          continue; } 

                if (bindings[i].p.value.search ("title") > 0) { bookInfoSchema.title = bindings[i].v.value; } 
                if (bindings[i].p.value.search ("description") > 0 ) { bookInfoSchema.description = bindings[i].v.value; continue; }         
                if (bindings[i].p.value.search ("publisher") > 0 ) { bookInfoSchema.publisher = bindings[i].v.value; continue; }
                if (bindings[i].p.value.search ("sameAs") > 0) { bookInfoSchema.sameAs.push (bindings[i].v.value); continue; }
                if (bindings[i].p.value.search ("seeAlso") > 0) { bookInfoSchema.seeAlso.push (bindings[i].v.value); continue; }

                if (bindings[i].p.value.search ("readingLevelLexHigh") > 0|| 
                    bindings[i].p.value.search ("readingLevelLexLow") > 0 || 
                    bindings[i].p.value.search ("lexileReadingLevel") > 0 ) { 
                        if ( bindings[i].v.value != "NULL" ) { 
                             bookInfoSchema.readingLevel.push (bindings[i].v.value); 
                        }
                        continue; 
                 }  
                                                                                
                if ( bindings[i].p.value.search("genre") > 0 ) { 
                  var genre = bindings[i].v.value;  
                  //console.log ("genre=" + genre);   
                    if ( genre.search(/\:\(/g) < 0 ) {
                        bookInfoSchema.genre.push (bindings[i].v.value); 
                        continue; 
                      }
                    }

               if (bindings[i].p.value.search("theme") > 0 ) { 
                    if ( bindings[i].v.value.search(/\:\(/g)  < 0) { 
                        bookInfoSchema.theme.push (bindings[i].v.value); 
                        continue; 
                      }
                    }

                if (bindings[i].p.value.search("numberOfPages") > 0 ) { bookInfoSchema.numberOfPages = bindings[i].v.value; continue; }
                if (bindings[i].p.value.search("illustrator") > 0 ) { 
                                          bookInfoSchema.illustrator.name = bindings[i].v.value; 
                                          if (bindings[i].v.value.search ("http") == 0) {
                                              var nameStr = bindings[i].v.value.replace(/^http:\/\/.*\..*\/resource\//i,'').replace(/_/g, ' ');
                                              console.log (nameStr);
      
                                              bookInfoSchema.illustrator.name = nameStr;
                                              bookInfoSchema.illustrator.link = bindings[i].v.value;
                                          }
                                          continue; 
                                        }

                if (bindings[i].p.value.search ("creator") > 0 ) { 
                                          bookInfoSchema.creator.name = bindings[i].v.value; 
                                          if (bindings[i].v.value.search ("http") == 0) {
                                              var nameStr = bindings[i].v.value.replace(/^http:\/\/.*\..*\/resource\//i,'').replace(/_/g,' ');
                                              console.log (nameStr);
                            
                                              bookInfoSchema.creator.name = nameStr;
                                              bookInfoSchema.creator.link = bindings[i].v.value;
                                          }
                                          continue; 
                                        }

                                                                  
             } //for 
           } //with
         }//else
      res.send (bookInfoSchema);
   }
  request(options, callback);
});

router.route ('/creator').get ( function(req, res) {
    var uri=req.query.uri;
    console.log (uri);
    //var creatorData;

    retrieveCreatorFromDbpedia (uri,res);
  });
 
 
router.route ('/book').get ( function (req, res) {
    var titleStr=req.query.title; 
    var baseUri=req.query.uri;

    if (baseUri === undefined ) {//default 
      baseUri = "http://poc.scholastic-labs.io:8088/LMF/"; 
    }
    console.log ("uri=" + baseUri);
     var q; 
    var uri = baseUri + 'resource/';
    console.log (titleStr);
    var titleArray = [ ]; 
    var rdfPredicate = "<http://wso2.scholastic-labs.io/cool#title>";

   var options;
   var queryEndpoint = baseUri + 'sparql'; 
   q =  "SELECT ?s ?p ?o WHERE {?s " + rdfPredicate + " ?o . " + " filter(regex(?o, '" + titleStr + "'))} limit 20" ;

   if (baseUri.search ('LMF') > 0 ) {
     queryEndpoint += '/select';
     contentType =  acceptType = "application/sparql-results+json";
     options = {
          url: encodeURI (queryEndpoint + "?query=" + q + "&output=json"),
          headers: {
            'User-Agent': "Node.js",
            'Content-Type': contentType,
            'Accept': acceptType
          }
      };
    }

    var isPCD = -1;
    if ( (isPCD=baseUri.search("pcd")) > 0 || baseUri.search("spd") > 0  ) {

        if (isPCD > 0 ) {
          queryEndpoint = queryEndpoint.replace ('pcd', 'PCD');
          rdfPredicate = '<http://purl.org/dc/elements/1.1/title>';

        } else {
          queryEndpoint = queryEndpoint.replace ('spd', 'SPD');
          rdfPredicate = "<http://wso2.scholastic-labs.io/cool%23title>";
        }
        console.log("isPCD="+isPCD);
        queryEndpoint = queryEndpoint.replace (':8080', ':3030');
      
      if (baseUri.search('dbpedia') > 0) {
          queryEndpoint = dbpEndpoint;
          rdfPredicate = '<http://dbpedia.org/property/title>'; 
      }

    
      var contentType = acceptType = "application/sparql-results+json";
      q =  "SELECT ?s ?p ?o WHERE {?s " + rdfPredicate + " ?o . " + " filter(regex(?o, '" + titleStr + "'))} limit 20" ;
        acceptType = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
        options = {
             url: queryEndpoint + "?query=" + q + "&output=json",
             headers: {
                'User-Agent': "Node.js",
                'Accept': acceptType 
              }
            };

      }
    console.log (queryEndpoint);
    console.log(q);

    map.forEach (function(value, key) {
      if (value.search (titleStr) >=0 && 
          key.indexOf(baseUri) >= 0 ) {

              console.log(key + " : " + value);
               var found = { 
                             'uri': key, 
                             'title': value 
                          };
               titleArray.push (found);
            } 
        if (titleArray.length > 0) { res.send(titleArray); }

    });
      
  if (titleArray.length == 0 ) {

      var request = require('request');
   
      console.log (options.url);

        //var client = new SparqlClient(spdEndpointTest);
      function callback(error, response, body) {
        if (error != null) { console.log(error); }
        else {
          
          console.log (body);
          var results = JSON.parse(body);

          with (results.results) {
            for (var i = 0; i < bindings.length; i++) {
              //console.log (bindings[i].p.value);
              var title = bindings[i].o.value;
              map.set (bindings[i].s.value, title);
              if (title.search (titleStr) >= 0 ) {
                  var found = { 
                                'uri': bindings[i].s.value, 
                                'title': title 
                              };
                  titleArray.push (found);
              }
             } //for 
           } //with
        }//else
        res.send (titleArray);
      }
      request(options, callback);
  }
});

//Enable CORS
app.use (cors());
//app.set('views', __dirname + '/app/html');
//app.engine('html', require('ejs').renderFile);

// REGISTER OUR ROUTES -------------------------------
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('API happens on port, CORS enabled ' + port);
