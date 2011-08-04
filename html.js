var parse = require('./index'),
    fs = require('fs'),
    ejs = require('ejs'),
    _ = require('underscore');

var docs = parse(fs.readFileSync('test.js').toString());

var protos = {}

docs.forEach(function(doc){
   if (typeof protos[doc.proto] === 'undefined') {
      protos[doc.proto] = [];
   }

   protos[doc.proto].push(doc);
});

console.log(protos);

var template = fs.readFileSync('doc.ejs').toString();
var content = ejs.render(template, {
   locals: {protos:protos}
});
