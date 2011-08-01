var fs = require('fs'),
    _ = require('underscore');

var STATES = {
   none: false,
   in_description: 2,
   in_attribute_name: 3,
   in_attribute: 4
}

var EMPTY_ATTR = {name: '', value:''};
var EMPTY_DEF = {attrs:[], description:'', fun:'', proto:''};

function trim(string){
   return string.replace(/^\s+|\s+$/g,"");
}

function trimobj(obj){
   for(var key in obj){
      if (typeof obj[key] == 'string') {
         obj[key] = trim(obj[key]);
      }
   }
   return obj;
}

var skip_list = ['*', '\n'];

function skip(string){
   for (var i = 0; i < skip_list.length; i++) {
      if (string == skip_list[i]) {
         return true;
      }
   }
   return false; 
}

function line(string, i){
   var start = 0,
       end = 0;
   for (var x = i; x < string.length; x++) {
      if (string[x] == '\n') {
         end = x; break;
      }
   }

   for (var x = i; x >= 0; x--) {
      if (string[x] == '\n') {
         start = x; break;
      }
   }

   return string.slice(start, end);
}

function parse(string){
   var defs = [];
   var parse_state = STATES.none;
   var curr_def = _.clone(EMPTY_DEF);
   var curr_attr = _.clone(EMPTY_ATTR);

   for (var i = 0; i < string.length; i++) {
      if (string[i] == '*' && parse_state == STATES.none) {
         parse_state = STATES.in_description;
      } else if (parse_state == STATES.in_description && 
         string[i] != '@' &&
         string[i] != '\n' &&
         string[i] != '*') {
         curr_def.description += string[i];
      } else if (string[i] == '@' && string[i-1] == ' ' && string[i-2] == '*' ) {
         if (curr_attr.name != '') {
            curr_def.attrs.push(trimobj(curr_attr));
            curr_attr = _.clone(EMPTY_ATTR);
         }
         parse_state = STATES.in_attribute_name;
      } else if (string[i] == ' ' && parse_state == STATES.in_attribute_name) {
         parse_state = STATES.in_attribute;
      } else if (string[i] != '\n' && parse_state == STATES.in_attribute_name) {
         curr_attr.name += string[i];
      } else if (!skip(string[i]) && parse_state == STATES.in_attribute) {
         curr_attr.value += string[i];
      } else if (string[i] == '\n' && parse.state == STATES.in_attribute) {
         defs.attrs.push(curr_attr);
         curr_attr = _.clone(EMPTY_ATTR);
      } else if (string[i] == '*' && string[i+1] == '/') {
         parse_state = STATES.none;
         i+=3;
      }

      if (parse_state == STATES.none && curr_def.description != '') {
         var content = line(string, i);
         var matches = content.match(/([a-zA-Z0-9]+)\.prototype\.([a-zA-Z0-9]+)/);
         if (matches) {
            curr_def.proto = matches[1];
            curr_def.fun = matches[2];
            defs.push(trimobj(curr_def));
            curr_def = _.clone(EMPTY_DEF);
         } else {
            defs.push(trimobj(curr_def));
            curr_def = _.clone(EMPTY_DEF);
         }
      }
   }

   return defs;
}

module.exports = parse;
