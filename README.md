# README #

### What is this repository for? ###

RDF API server side code on Node.js
* RDF API querying term defintion from DBpedia


### How do I get set up? ###
docker build -t demo/linkeddata Dockerfile .
docker run -d -p 8088:8088 demo/linkedata:latest 

###if run on Mac OSX and test locally ###
docker-machine ssh default -L 8088:localhost:8088

### sample test and result ###
http://localhost:8088/api/term?q=dbo:author
{
    "describes": "dbp:author",
    "rdf:label": "autor",
    "wasDerivedFrom": "dbp:ontologyproperty:author",
    "rdf:domain": "dbp:work",
    "rdf:type": "owl:objectproperty",
    "rdf:subPropertyOf": "owl:coparticipateswith",
    "defines": "dbp:author",
    "rdf:range": "dbp:person",
    "describedby": "dbp:definitions.ttl",
    "owl:equivalentProperty": "http://www.wikidata.org/entity/P50",
    "rdf:isDefinedBy": "http://dbpedia.org/ontology/"
}

### Who do I talk to? ###

* Bernard Lin
