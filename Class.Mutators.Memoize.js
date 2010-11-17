/*
---

script: Class.Mutators.Memoize.js

description: Allows methods to be memoized, returning a previously returned value rather than running the method again.

license: MIT-style license

authors:
- Mike Nelson ( http://www.mikeonrails.com | http://www.twitter.com/mdnelson30 )

requires:
- core:1.2.4

provides: [Class.Mutators.Memoize]

...
*/

Class.Mutators.Memoize = function(method_names){
  
  Array.from(method_names).each(function(method){
    var old_method = this.prototype[method];
    this.prototype[method] = function(){
      if(this.__memoized[method] !== undefined) return this.__memoized[method];
      return this.__memoized[method] = old_method.apply(this, arguments);
    };
  }, this);
  
  this.prototype.unmemoize = function(key){
    var val = this.__memoized[key];
    this.__memoized[key] = undefined;
    return val;
  }
  this.prototype.unmemoizeAll = function(){ this.__memoized = {}; }
  this.prototype.unmemoizeAll();

}