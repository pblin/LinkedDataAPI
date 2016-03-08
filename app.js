var express = require('express');
var app = express();
var rdfstore = require('rdfstore');

app.get('/test', function(req, res) {


	rdfstore.create(function(store) {
  		store.execute('LOAD <http://dbpedia.org/resource/Tim_Berners-Lee> INTO GRAPH <http://example.org/people>', function() {

    	      store.setPrefix('dbp', 'http://dbpedia.org/resource/');

    	      store.node(store.rdf.resolve('dbp:Tim_Berners-Lee'), "http://example.org/people", function(success, graph) {

      	           var peopleGraph = graph.filter(store.rdf.filters.type(store.rdf.resolve("foaf:Person")));

      	           store.execute('PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\
                                  PREFIX foaf: <http://xmlns.com/foaf/0.1/>\
                                  PREFIX : <http://example.org/>\
                                  SELECT ?s FROM NAMED :people { GRAPH ?g { ?s rdf:type foaf:Person } }',
                          function(success, results) {

  						  res.type('text/plain'); // set content-type
  						
                          res.send(results[0].s.value);
  
                   });

    	      });

  		});
	});

});

app.get('/book/:isbn13', function(req, res) {

	//var uri=req.query.uri;
	var isbn=req.params.isbn13;
	//var aNode = '<' + uri + isbn '>';
	console.log (isbn13);

});



app.listen(process.env.PORT || 8888);