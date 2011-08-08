var parse = require('uglify-js').parser.parse,
    traverse = require('traverse'),
    util = require('util'),
    _ = require('underscore'),
    fs = require('fs');

var ast = parse(fs.readFileSync('test.js').toString(), false, true);

traverse(ast).forEach(function(node){
   if(node === 'comment2'){
      //console.log(parseComment(this.parent.node.value));
   }
});

function nc(ast){
   return new NodeCollection(ast);
}

function NodeCollection(ast){
   this.ast = ast;
   this.nodes = [];
   this.astNodes = [];
   var that = this;
   traverse(this.ast).forEach(function(node){
      var record = {
         node: node,
         context: this
      }
      that.nodes.push(record);
      that.astNodes.push(record);
   });
}

NodeCollection.prototype.forEach = function(fn){
   var that = this;
   this.nodes.forEach(function(node){
      fn.bind(that)(node.node, node.context);
   });
   return this;
}

NodeCollection.prototype.select = function(fn){
   var results = [];
   this.forEach(function(node, context){
      if(fn.bind(this)(node)) results.push({
         node:node, 
         context:context
      });
   });
   this.nodes = results;
   return this;
}

function arrayEqual(a, b){
   if (a.length != b.length) {
      return false;
   }
   for (var i = 0; i < a.length; i++) {
      if(a[i] != b[i]) return false;
   }
   return true;
}

NodeCollection.prototype.findNodeByPath = function(path){
   for (var i = 0; i < this.astNodes.length; i++) {
      var n = this.astNodes[i];
      if (arrayEqual(n.context.path, path)) {
         return n;
      }
   }
}

NodeCollection.prototype.map = function(fn){
   var results = [];

   this.forEach(function(node, context){
      var result = fn.bind(this)(node, context);
      typeof result !== 'undefined' && results.push(result);
   });

   this.nodes = results;
   return this;
}

NodeCollection.prototype.up = function(fn){
   fn || (fn = function(){return true;});
   
   var results = [];

   this.forEach(function(node, context){
      var match = false;
      var curr = context;

      while(curr && !match){
         curr = curr.parent;
         match = fn.bind(this)(curr.node, curr);
      }

      match && results.push({
         node: curr.node,
         context: curr
      });
   });

   this.nodes = results;
   return this;
}

NodeCollection.prototype.resolveLeftmost = function(node){
   while (typeof node !== 'string'){
      if (node[0].name === 'dot' || node[0] === 'dot') {
         node = node[1];
      } else if (node[0].name === 'assign') {
         node = node[2];
      } else if (node[0] === 'name') {
         node = node[1];
      }
   }
   return node;
}

NodeCollection.prototype.collapse = function(node){
   var ret = '';

   if (node[0] && node[0].name === 'dot') {
      ret += (node[1][0] !== 'name')
         ? this.collapse(node[1])
         : node[1][1];
      ret += '.';
      ret += (typeof node[2] !== 'string')
         ? this.collapse(node[2])
         : node[2];
   } else if (node[0] === 'dot') {
      ret += node[1][1];
      ret += '.';
      ret += node[2];
   } 

   return ret;
}

NodeCollection.prototype.resolveRightmost = function(node){
   var str = this.collapse(node);
   str = str.split('.');
   return str[str.length-1];
}

NodeCollection.prototype.properties = function(node){
   var properties = [];
   if (node[0].name === 'object') {
      for (var i = 0; i < node[1].length; i++) {
         properties.push({
            name: node[1][i][0],
            type: node[1][i][1][0].name
         });
      }
   }
   return properties;
}

NodeCollection.prototype.reduce = function(fn){
   var acc = [];

   this.forEach(function(node, context){
      acc = fn.bind(this)(acc, node, context);    
   });

   this.nodes = acc;

   return this;
}

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

//console.log(util.inspect(ast, false, 100));
//console.log(getClasses(ast));
//console.log(getFunctions(ast));

function parseComment(text){
   if (!text) {
      return false;
   }

   var S = {
      pos: 0,
      text: text,
      state: 'description'
   };

   var defs = {
      description: '',
      attributes: []
   };

   var curr_attr = {};

   while(c() != -1){
      if (c() === '@'){
         S.pos++;
         curr_attr.name = parse_name();
         S.state = 'attribute_start';
      } else if (S.state === 'description'){
         defs.description = parse_string();
         S.state = 'description_done';
      } else if (S.state === 'attribute_start'){
         curr_attr[curr_attr.name] = parse_string();
         delete curr_attr.name;
         defs.attributes.push(curr_attr);
         curr_attr = {};
      }
   }

   // Current
   function c(){
      return S.pos < S.text.length ? S.text[S.pos] : -1;
   }

   // Forward
   function f(c){
      c = c ? c : 1;
      return S.pos + c < S.text.length ? S.text[S.pos+c] : -1;
   }

   // Back
   function b(c){
      c = c ? c : 1;
      return S.pos - c >= 0 ? S.text[S.pos-c] : -1;
   }

   function parse_name(){
      var match = S.text.slice(S.pos).match(/[^ \n]*/);
      if (match[0].length) {
         S.pos+=match[0].length + match.index;
         return match[0];
      } else {
         S.pos++;
      }
   }

   function parse_string(){
      var s = '';

      while(c() != -1){
         if (!(c() == '@' && b() == ' ')) {
            s+=c();
            S.pos++; 
         } else break;
      }

      var clean = s
         .replace(/^ */g, '')
         .replace(/\*/g, '')
         .replace(/\n/g, '')
         .replace(/  /g, '')
         .replace(/ *$/g, '');

      return clean;
   }

   return defs;
}
