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
var lmfEndpoint = 'http://poc.scholastic-labs.io:8088/LMF/sparql/select';
var virtEndpoint = 'http://poc.scholastic-labs.io:8890/sparql';
var imageService = 'http://esvcs.scholastic.com/SchCXFWS/services/ImgService/';
var HashMap = require ('hashmap').HashMap;
var utf8 = require ('utf8');
//var N3 = require ('n3');
//var vocabRdf = [];
var vocab = [
   { "prefix":"cc", "url":"http://creativecommons.org/ns#" }, 
   { "prefix":"dc", "url":"http://purl.org/dc/elements/1.1/"},
   { "prefix":"dcterms", "url":"http://purl.org/dc/terms/" },
   { "prefix":"gr", "url":"http://purl.org/goodrelations/v1#" },
   { "prefix":"rdf", "url":"http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
   { "prefix":"rdfs", "url":"http://www.w3.org/2000/01/rdf-schema#" },
   { "prefix":"owl", "url":"http://www.w3.org/2002/07/owl#" }, 
   { "prefix":"skos", "url":"http://www.w3.org/2004/02/skos/core#" }, 
   { "prefix":"foaf",  "url":"http://xmlns.com/foaf/0.1/" },
   { "prefix":"schcore", "url":"http://wso2.scholastic-labs.io/schcore#" },
   { "prefix":"cool", "url":"http://wso2.scholastic-labs.io/cool#" },
   { "prefix":"sso", "url":"http://wso2.scholastic-labs.io/sso#" },
   { "prefix":"schema", "url":"http://wso2.scholastic-labs.io/schema#" }
];

map = new HashMap(); 
linkmap = new HashMap();


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
router.route('/findPerson').get (function (req, res) {
      var nameStr=req.query.name; 

      if (nameStr == undefined )
        {
          res.send("none"); 
        }
      if (nameStr.length == 0) {
        res.send("none");
      }

      var names = nameStr.split("and");
      //console.log(names)
      var searchVector = "";
      for (var i=0; i< names.length ; i++) {
        var nameParts;
        names[i] = names[i].replace("'", "\\'");
        if ( names[i].indexOf(",") > 0 ) {
          nameParts = names[i].split(',');
        } else {
          nameParts = names[i].split (" ");
        }

        for (var j=0; j < nameParts.length; j++) {
            var word = "'" + nameParts[j] + "'";
            console.log (word);
            searchVector += word;
            if (i == names.length - 1 && j == nameParts.length - 1 ) {
              break;
            }
            searchVector += ",";     
        }
      }
      
      if (searchVector.length == 0) {
        res.send("none");
      }

      console.log (nameStr + ",vector= " + searchVector);
      linkmap.forEach(function(value, key) {
        if (key.search(encodeURI(nameStr)) >=0 ) {

              console.log(key + " : " + value);
              res.send (value);
            } 
      });    

      var client = new SparqlClient(dbpEndpoint);
      var query = "select distinct ?s ?o(bif:search_excerpt(bif:vector(" + searchVector +
                  "),?o)) WHERE { ?s a foaf:Person . ?s rdfs:label ?o . filter(bif:contains(?o, '\"" + nameStr + "\"')) . " +
                  "filter(langMatches(lang(?o),'EN'))}";

      console.log (query);
      client.query (query)
        .execute (function (err, results) {
            //console.log(results);
            var linkUri = "none";
            
            if (results != null  ) {
                if (results.results.bindings.length > 0) {
                  linkUri = results.results.bindings[0].s.value;
                  if (linkUri.length > 0) {
                    linkmap.set(encodeURI(nameStr), linkUri);
                  }
                } 
              }
            res.send(linkUri);

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
    if (error || body.search("Web Site Under") >=0 ) { console.log(error); } 
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


router.route('/custom-term').get( function(req, res) {
    var termStr=req.query.q;
    var request = require('request');

    if (termStr == undefined)
      res.send ("undefined query");

    console.log(termStr);
    for (var i=0; i < vocab.length; i++) {
      // skip non-custom terms 
      if (vocab[i].url.search("scholastic") < 0 && vocab[i].url.search("schema") < 0 )
        continue; 

      var termNode;
      var parts = termStr.split(":");
      console.log (parts[0]) ;

      if ( vocab[i].prefix == parts[0] ) { 
          termNode = '<' + vocab[i].url + parts[1] + '>';
          break;
        }
    }
    console.log (termNode);

    var q =  "DESCRIBE " + termNode;
    var contentType, acceptType;

    console.log (q);

    sparqlEndpoint = virtEndpoint;
    acceptType = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
    options = {
         url: encodeURI (sparqlEndpoint + "?default-graph-uri=" + "" + "&query=" + q + "&output=json"),
         headers: {
            'User-Agent': "Node.js",
            'Accept': acceptType 
          }
        };

      //bookInfoSchema.termMap = getTerms();
      function callback(error, response, body) {

          if (error != null || body.search("Web Site Under") >=0 ) 
              onsole.log(error); 
      
            console.log (body);
            var results = JSON.parse(body);
            var terms =  {};

            with (results.results) {
              for (var i = 0; i < bindings.length; i++) {
                var term = {};
                var prop, value;
                var gc=0 ,tc=0,ac=0;
            
                prop = bindings[i].p.value.replace(/^http:\/\/.*\.(com|io|org).*(\/|#)/,'');
                
                //value = bindings[i].o.value.replace(/^http:\/\/.*\.(com|io|org).*(\/|#)/,'');
                value = bindings[i].o.value;

                console.log (prop + "=" + value);

                terms[prop] = value;
                                                                  
             } //for 
           } //with
          res.send (terms);
   }

  request(options, callback);
});


// get a book
router.route ('/book/:isbn13').get(function(req, res) {
  // wait.launchFiber(handleSequence, req, res);
    var bookInfoSchema = {
          "EAN": "",
          "schema:thumbnail": "",
          "cool:genre":[],
          "cool:theme":[],
          "cool:skill":[],
          "dcterms:hasFormat":[], 
          "schcore:appealLevel":[],
          "schore:masterseries":[]
    };

    var graphUri = req.query.uri.replace(/\/$/, "");
    var output = req.query.output;
    var jsonld = require ('jsonld');

    var context = 

    console.log (graphUri);
    if (output == undefined) {
        output = "json";
    }

  	var isbn=req.params.isbn13;

    if (graphUri === undefined ) {//default 
      graphUri = "http://scholastic-labs.io/spd"; 
    }

    var uri = graphUri + '/resource/';
  	var sparqlEndpoint;

    var namedNode = '<' + uri + isbn + '>';
    console.log (namedNode);

     var prefixes = "prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> \
        prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> \
        prefix xsd: <http://www.w3.org/2001/XMLSchema#> \
        prefix owl: <http://www.w3.org/2002/07/owl#> \
        prefix dc: <http://purl.org/dc/elements/1.1/> \
        prefix dcterms: <http://purl.org/dc/terms/> \
        prefix foaf: <http://xmlns.com/foaf/0.1/> \
        prefix skos: <http://www.w3.org/2004/02/skos/core#> \
        prefix schema: <http://wso2.scholastic-labs.io/schema#> \
        prefix schcore: <http://wso2.scholastic-labs.io/schcore#> \
        prefix cool: <http://wso2.scholastic-labs.io/cool#> \
        prefix sso: <http://wso2.scholastic-labs.io/sso#> \
        prefix cc: <http://creativecommons.org/ns#>";

     var q =  prefixes + " DESCRIBE " + namedNode;
     var contentType, acceptType;

      console.log (q);

      var options; 

      if (graphUri.search ('LMF') > 0 ) {
         q = "SELECT ?p ?o WHERE { " + namedNode + " ?p ?o }";
         contentType =  acceptType = "application/sparql-results+json";
         sparqlEndpoint = lmfEndpoint;
         options = {
              url: encodeURI (sparqlEndpoint + "?query=" + q + "&output=json"),
              headers: {
                'User-Agent': "Node.js",
                'Content-Type': contentType,
                'Accept': acceptType
              }
          };
         console.log(options);
       }

      if ( (isPCD=graphUri.search("pcd")) > 0 || graphUri.search("spd") > 0  ) {
          sparqlEndpoint = virtEndpoint;
          acceptType = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
          if (output.toLowerCase() == "xml") 
            contentType = "application/rdf+xml";
          else 
            contentType = "application/sparql-results+json";

          options = {
               url: encodeURI (sparqlEndpoint + "?default-graph-uri=" + graphUri + "&query=" + q +"&format="+output),
               headers: {
                  'User-Agent': "Node.js",
                  'Content-Type': contentType,
                  'Accept': contentType
                }
              };
      }
      console.log (options);
      var request = require('request');

      //bookInfoSchema.termMap = getTerms();
      function callback(error, response, body) {

          if (error != null || body.search("Web Site Under") >=0) { console.log(error); }
          else {
            if (output == "xml") {
              res.send (body);
              return;
            }

            console.log (body);
            var results = JSON.parse(body);

            with (results.results) {
              for (var i = 0; i < bindings.length; i++) {
                var prop;
                var gc=0 ,tc=0,ac=0;
                //find prefix
                for (var n=0; n<vocab.length; n++) {
                  if ( bindings[i].p.value.search(vocab[n].url) >= 0 ) {
                    prop = vocab[n].prefix;
                    break;
                  }
                }
                prop += bindings[i].p.value.replace(/^http:\/\/.*\.(com|io|org).*(\/|#)/,':');
                console.log (prop);
               
                if (bindings[i].p.value.search ("isbn") > 0 ) { 
                          bookInfoSchema.EAN = bindings[i].o.value; 
                          bookInfoSchema["schema:thumbnailUrl"] = imageService + bookInfoSchema.isbn13 + '.jpg' + "?h=190&w=100";
                          continue; } 
                                                                                
                if ( prop.indexOf("genre") >= 0 || 
                     prop.indexOf("theme") >= 0 || 
                     prop.indexOf("appealLevel") >= 0 || 
                     prop.indexOf("hasFormat") >= 0) { 
                        console.log("repeated column = " + prop );
                        bookInfoSchema[prop].push (bindings[i].o.value);
                        continue; 
                    }

                if (prop.indexOf("illustrator") > 0  || prop.indexOf("creator") > 0) { 
                      var contributorInfo = { "name":"", "link":""} ;
                      contributorInfo.name = bindings[i].o.value;
                      if (bindings[i].o.value.search ("http") == 0) {
                            var nameStr = bindings[i].o.value.replace(/^http:\/\/.*\..*\/resource\//i,'').replace(/_/g, ' ');
    
                            contributorInfo.name = nameStr;
                            contributorInfo.link = bindings[i].o.value;
                        }
                      bookInfoSchema[prop] = contributorInfo;
                      continue; 
                 }

                 bookInfoSchema[prop] = bindings[i].o.value;
                                                                  
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
    var graphUri=req.query.uri;
    var sparqlEndpoint;

    if (graphUri === undefined ) {//default 
      graphUri = "http://scholastic-labs.io/spd"; 
    }

    graphUri = graphUri.replace(/\/$/, "");

    console.log ("uri=" + graphUri);
     var q; 
    var uri = graphUri + '/resource/';
    console.log (titleStr);
    var titleArray = []; 
    var rdfPredicate = "cool:title";

   var options;
   q =  "SELECT ?s ?o WHERE {?s " + rdfPredicate + " ?o . " + " filter(regex(?o," + "\"" + titleStr + "\"" + "))} limit 20" ;

   if (graphUri.search ('LMF') > 0 ) {
    sparqlEndpoint = lmfEndpoint;
     contentType =  acceptType = "application/sparql-results+json";
     options = {
          url: encodeURI (sparqlEndpoint + "?query=" + q + "&output=json" ),
          headers: {
            'User-Agent': "Node.js",
            'Content-Type': contentType,
            'Accept': acceptType
          }
      };
    }

    var isPCD = -1;
    if ( (isPCD=graphUri.search("pcd")) > 0 || graphUri.search("spd") > 0  || graphUri.search(/dbpedia/i) > 0  ) {

        sparqlEndpoint = virtEndpoint;

        if (isPCD > 0 ) {
          console.log("PCD");
          rdfPredicate = 'dc:title';

        } else {
          console.log("SPD");
          rdfPredicate = "cool:title";
        }
      
      if (graphUri.search(/dbpedia/i) > 0) {
          console.log("dbpedia");
          sparqlEndpoint = dbpEndpoint;
          rdfPredicate = 'dbpprop:title'; 
      }
    
      var contentType = acceptType = "application/sparql-results+json";
      q =  "SELECT ?s ?o WHERE {?s " + rdfPredicate + " ?o . " + " filter(regex(?o, "+ "\"" + titleStr + "\"" +  "))} limit 20" ;
        acceptType = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
        options = {
             url: encodeURI (sparqlEndpoint + "?default-graph-uri=" + graphUri + "&query=" + q + "&output=json" ),
             headers: {
                'User-Agent': "Node.js",
                'Accept': acceptType 
              }
            };

      }
    console.log(q);

    map.forEach (function(value, key) {
      if (value.search (titleStr) >=0 && 
          key.indexOf(graphUri) >= 0 ) {

              console.log(key + " : " + value);
               var found = { 
                             'uri': key, 
                             'title': value 
                          };
               titleArray.push (found);
            } 
    });
   if (titleArray.length > 0) { res.send(titleArray); }

      
  if (titleArray.length == 0 ) {

      var request = require('request');
   
      console.log (options);

        //var client = new SparqlClient(spdEndpointTest);
      function callback(error, response, body) {
        if (error != null || body.search("Web Site Under") >=0 ) { 
          console.log(error); 
          titleArray = [{"uri":"External site is down.", "title":"N/A"}];
        }
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

router.route('/fuzzy').get (function (req, res) {
  var tryName = req.query.q;
  console.log(tryName);

  var books = [
            "Harry Potter",
            "Harry Potter and the Chamber of Secret",
            "The Hunger Games",
            "The Ellie Chronicles # 3: Circle of Flight",
            "Math Fables Too:  Making Science Count",
            "Where Is Eric?",
            "I SPY Santa Claus",
            "Harry Potter and the Half-Blood Prince",
            "Yikes! Bikes!",
            "Halloween Fraidy-Cat",
            "Shark Tooth Tale",
            "I SPY Little Bunnies",
            "The Road of the Dead",
            "Magic Tree House Boxed Set",
            "NBA Reader: Hardwood Heroes",
            "The School Play Surprise",
            "Monday Is One Day",
            "David Goes to School",
            "A Kiss for Little Bear",
            "The Jacket I Wear in the Snow",
            "The Night Before Christmas",
            "Click, Clack, Moo",
            "Creep from the Deep",
            "La veste que je porte dans la neige",
            "I SPY Little Christmas",
            "Dogs",
            "Freaky Friday",
            "The Grey Lady and the Strawberry Snatcher",
            "Caddie Woodlawn",
            "King of the Wind",
            "Alphabatics",
            "The Day the Dinosaurs Died",
            "One Lighthouse, One Moon",
            "Lirael",
            "Lily B. on the Brink of Cool"
        ];

        var fuzzy = require ('fuzzy');
        var results = fuzzy.filter(tryName, books)
        var matches = results.map(function(el) { return el.string; });

        //var possible = { "query": "Unit", "suggestions": []};
        var defaultToken = {"name":tryName, "id":tryName} ;
        var possible = [];
        for (var i = 0; i < matches.length; i++) {
                var token = {"name":"","id":""};
                token.id=matches[i];
                token.name=matches[i];
                possible.push(token);
        }
        if (matches.length == 0) {

          possible.push (defaultToken);
        }
        
        console.log(possible);
        res.send(possible);

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
