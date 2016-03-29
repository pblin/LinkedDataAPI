// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');
var cors = require('cors');
//var wait  = require ('wait.for');
//var Seq = require('seq');
var app        = express();
var SparqlClient = require('sparql-client');
var util = require('util');
var dbpEndpoint = 'http://dbpedia.org/sparql';
var sparqlEndpoint = 'http://dbpedia.org/sparql';
var HashMap = require ('hashmap').HashMap;
var utf8 = require ('utf8');
//var N3 = require ('n3');
//var vocabRdf = [];
var vocab = [
   { "prefix":"rdf", "url":"http://www.w3.org/1999/02/22-rdf-syntax-ns#" },
   { "prefix":"rdfs", "url":"http://www.w3.org/2000/01/rdf-schema#" },
   { "prefix":"owl", "url":"http://www.w3.org/2002/07/owl#" },
   { "prefix":"skos", "url":"http://www.w3.org/2004/02/skos/core#" },
   { "prefix":"foaf",  "url":"http://xmlns.com/foaf/0.1/" },
   { "prefix":"dbo", "url":"http://dbpedia.org/ontology/" },
   { "prefix":"dbp", "url":"http://dbpedia.org/property/" }
];

//map = new HashMap();
var linkmap = new HashMap();

var port     = process.env.PORT || 8088; // set our port

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
router.get('/', function(req, res) {
  res.send('Home page');
});

// trial
router.get('/findPerson', function (req, res) {
      var nameStr=req.query.name.replace(/\"/g,'');

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


router.get('/term', function(req, res) {
    var termStr=req.query.q;
    var request = require('request');

    if (termStr == undefined)
      res.send ("undefined query");

    console.log(termStr);
    for (var i=0; i < vocab.length; i++) {
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

    //sparqlEndpoint = virtEndpoint;
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
                for (var j=0; j < vocab.length; j++)
                {
                  if (bindings[i].p.value.search(vocab[j].prefix) >=0)
                  {
                    var propPrefix = vocab[j].prefix;
                    prop = propPrefix + ':' + bindings[i].p.value.replace(/^http:\/\/.*\.(com|io|org).*(\/|#)/,'');
                  }

                  if (bindings[i].o.value.search(vocab[j].prefix) >=0)
                  {
                    var valPrefix = vocab[j].prefix;
                    var valValue = bindings[i].o.value.replace(/^http:\/\/.*\.(com|io|org).*(\/|#)/,'');
                    //console.log("valValue="+valValue);
                    if (valValue.length > 0 )
                    {
                      value = valPrefix + ':' + valValue.toLowerCase();
                    }
                  }
                }

                console.log (prop + "=" + value);

                terms[prop] = value;

             } //for
           } //with
          res.send (terms);
   }

  request(options, callback);
});



router.get('/creator', function(req, res) {
    var uri=req.query.uri;
    console.log (uri);
    //var creatorData;

    retrieveCreatorFromDbpedia (uri,res);
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
