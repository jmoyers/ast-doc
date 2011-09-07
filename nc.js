var traverse = require('traverse');

module.exports = function nc(ast){
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
