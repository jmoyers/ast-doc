var parse = require('uglify-js').parser.parse,
    util = require('util'),
    _ = require('underscore'),
    fs = require('fs'),
    nc = require('./nc.js'),
    parseComment = require('./comments.js');

var ast = parse(fs.readFileSync('test.js').toString(), false, true);

var nodes = nc(ast).select(function(node){
   return node==='prototype';
}).up(function(node){
   return node[0] && node[0].name==='assign';
}).forEach(function(node){
}).reduce(function(acc, node, context){
   var p = this.resolveLeftmost(node);
   var l = this.resolveRightmost(node[2]);
   var r = false;

   if (node[3][0].name === 'object') {
      r = this.properties(node[3]);   
   } else {
      var comment = node[0].start.comments_before[0];
      comment = comment && comment.value;
      r = {
         type     : node[3][0].name,
         comment  : parseComment(comment)
      }
   }

   var curr = acc[p] || {
      properties  : []
   };

   if (Array.isArray(r)){
      r.forEach(function(prop){
         curr.properties.push(prop);
      });
   } else {
      curr.properties.push({
         name     : l,
         type     : r.type,
         comment  : r.comment
      });
   }

   acc[p] = curr;

   return acc;
}).nodes;

console.log(util.inspect(nodes, false, 100));
