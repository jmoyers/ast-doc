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

function getClasses(ast){
   var classes = [];
   traverse(ast).forEach(function(node){
      if (node === 'prototype') {
         var tmp = ast;
         var clazz = false;
         
         this.path.forEach(function(i){
            tmp = tmp[i];
            if (tmp[0] && (tmp[0] === 'dot' || tmp[0].name === 'dot')) {
               clazz = tmp[1][1];
            }
         });

         classes.push(clazz);
      }
   });
   return _.unique(classes);
}

function getFunctions(ast){
   var funs = []
   traverse(ast).forEach(function(node){
      if (node === 'defun' || node === 'function') {
         var tmp = ast;
         var fun = false;
         
         this.path.forEach(function(i){
            tmp = tmp[i];
            if (tmp[0] && tmp[0].name === 'var') {
               fun = tmp[1][0][0];
            }
            if (tmp[0] && tmp[0].name === 'defun') {
               fun = tmp[1];
            }
         });

         fun && funs.push(fun);
      }
   });
   return funs;
}

//console.log(util.inspect(ast, false, 100));
console.log(getClasses(ast));
console.log(getFunctions(ast));

function parseComment(text){
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
         console.log('description');
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
