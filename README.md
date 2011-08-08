Goal
------------
Use the extended ast from uglify to create a tree of prototype definitions, 
parsing javadoc style comments as you go. Eventually, you should be able to map
this data structure onto a template to create documentation.

Example (thus far)
------------

test.js
=============
    
    /**
     * Song
     *
     * @author Joshua Moyers <jmoyers@gmail.com>
     * @copyright Joshua Moyers - July 31, 2011
     * @package newco
     */

    var util = require('util'),
        inherits = util.inherits;

    /**
     * A test method for kicking total ass
     *
     * @return Number
     */
    TestPrototype.prototype.method = function(){
       console.log('test');
    }

    TestPrototype2.prototype = {
       /**
        * A method for ruling the world
        *
        * @return void
        */
       method: function(){}
    }    

`> node parse.js`

    [ TestPrototype: { properties: 
         [ { name: 'method',
             type: 'function',
             comment: 
              { description: 'A test method for kicking total ass',
                attributes: [ { return: 'Number' } ] } } ] },
      TestPrototype2: { properties: 
         [ { name: 'method', type: 'function' },
           { name: 'method', type: 'function' } ] } ]
        
