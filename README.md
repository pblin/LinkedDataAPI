# README #

### What is this repository for? ###

RDF API server side code on Node.js
* RDF API querying term defintion from DBpedia


### How do I get set up? ###
docker run -d -p 8088:8088 bernardlin/linkedata:latest 

###if run on Mac OSX and test locally ###
docker-machine ssh default -L 8088:localhost:8088

### sample test ###
http://localhost:8088/api/term?q=dbo:author

### sample result ###
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

