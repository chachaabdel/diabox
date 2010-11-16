/*
* Requirements: 
*  - multiple types; image, image groups, ajax (local), remote url, inline content
*  - fully css customizable
*  - inner html agnostic
*  - event driven
*  - alter options at any time
*  - singleton instance
*/

(function($){
  
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

    this.prototype.unmemoizeAll = function(){
      this.__memoized = {};
    }

    this.prototype.unmemoizeAll();
  }
  
  // Handles all the event binding, firing, and target parsing.
  Moobox = new Class({
    
    Implements: [Options, Events, Chain],
    options : {
      parser : null, // pass in a function that takes a target (url, dom element, etc) and passes back a renderer key
      parent : null,
      rel_match : /^(moo|light)box/,
      iframe : {
        width : 800,
        height: 500
      },
      image : {
        maxWidth : 800,
        maxHeight : 500
      },
      box : {
        id : 'moobox',
        content_id : 'moobox_content',
        loading_id : 'moobox_loading',
        fade_duration : 400,
        resize_duration : 400,
        content_fade_duration : 200,
        fade_transition : Fx.Transitions.Sine.easeOut,
        resize_transition : Fx.Transitions.Elastic.easeOut,
        content_fade_transition : Fx.Transitions.Sine.easeOut
      },
      overlay : {
        id : 'moobox_overlay',
        fade_duration : 400,
        transition : Fx.Transitions.Sine.easeOut
      }
    },
    
    initialize : function(options){
      this.setOptions(options);
      this.cache = {};
      this.register_renderers();
      
      this.observe_anchors();
      this.observe_objects();
      
      window.addEvent('domready', this.create_fx.bind(this));
    },
    
    host : function(){
      return $(this.options.parent || document.body);
    },
    
    content : function(){
      return $(this.options.box.content_id) || new Element('div', {id : this.options.box.content_id}).inject(this.box());
    },
    
    box : function(){
      return $(this.options.box.id) || new Element('div', {id : this.options.box.id}).setStyle('display', 'none').inject(this.host());
    },
    
    overlay : function(){
      return $(this.options.overlay.id) || new Element('div', {id : this.options.overlay.id}).setStyle('display','none').inject(this.host()).addEvent('click', this.hide.bind(this));
    },
    
    
    // register the default renderers. to override call register_renderer with the appropriate arguments
    register_renderers : function(){
      this.register_renderer('image', Moobox.ImageRenderer);
      this.register_renderer('ajax', Moobox.AjaxRenderer);
      this.register_renderer('remote', Moobox.RemoteRenderer);
      this.register_renderer('inline', Moobox.InlineRenderer);
      this.register_renderer('element', Moobox.ElementRenderer);
    },
    
    // registers a renderer via an event. no renderers are stored in the Moobox object.
    register_renderer : function(key, renderer_klazz){
      this.removeEvents('render_' + key);
      this.addEvent("render_" + key, function(target){
        this.set_loading();
        if(this.cache[target])
          this.cache[target].render();
        else
          (this.cache[target] = this[key + '_renderer'] = new renderer_klazz(target, this)).render();
      }.bind(this));
    },
    
    // find all the anchors that match the provided rel regex. observe clicks on them and fire the renderer.
    observe_anchors : function(){
      this.links = $$('a').each(function(a){
        if(a.rel && a.rel.test(this.options.rel_match)){
          var renderer_key = this.parse_target(a.href);
          a.addEvent('click', function(){
            this.fireEvent('render_' + renderer_key, a.href)
            return false;
          }.bind(this))
        }
      }, this);
    },
    
    observe_objects : function(){
      this.addEvent('render_ready', function(renderer){
        this.resize_and_apply(renderer);
      }.bind(this));
    },
    
    create_fx : function(){
      this.fx = {
        overlay : new Fx.Tween(this.overlay(), {property : 'opacity', duration : this.options.overlay.fade_duration, transition : this.options.overlay.transition}).set(0),
        box : new Fx.Tween(this.box(), {property : 'opacity', duration : this.options.box.fade_duration, transition : this.options.box.fade_transition}).set(0),
        resize : new Fx.Morph(this.box(), {duration : this.options.box.resize_duration, transition : this.options.box.resize_transition}),
        content : new Fx.Tween(this.content(), {property : 'opacity', duration : this.options.box.content_fade_duration, transition : this.options.box.content_fade_transition})
      };
    },
    
    loading_renderer : function(){
      return new Moobox.ElementRenderer(new Element('div', {id : this.options.box.loading_id}), this);
    },
    
    set_loading : function(){
      this.clear_content();
      this.loading_renderer().render();
    },
    
    show : function(fn){
      this.overlay().setStyle('display', '');
      this.box().setStyle('display', '');
      this.content().fade('hide');
      this.fx.overlay.start(this.options.overlay.opacity);
      this.fx.box.start(1).chain(function(){
        (fn || $empty)();
        this.fx.content.start(1);
      }.bind(this));
    },
    
    hide : function(){
      this.fx.content.start(0).chain(function(){
        this.fx.box.start(0).chain(function(){this.box().setStyle('display', 'none');}.bind(this));
        this.fx.overlay.start(0).chain(function(){this.overlay().setStyle('display', 'non');}.bind(this));
      }.bind(this))
    },
    
    showing : function(){
      return this.box().getStyle('display') != 'none';
    },
    
    clear_content : function(){
      this.content().empty();
    },
    
    apply_content : function(element){
      this.content().adopt(element);
    },
    
    resize_and_apply : function(renderer){
      console.log(renderer);
      var fn = function(){  
        var size = this.cumulative_size(renderer);
        var pos = this.next_position(size); 
        this.fx.resize.start({
          width : size.width,
          height : size.height,
          left : pos.left,
          top : pos.top
        }).chain(function(){
          this.apply_content(renderer.element());
        }.bind(this));
      }.bind(this);
      if(this.showing()){
        fn();
      } else {
        this.show(fn);
      }
    },
    
    cumulative_size : function(renderer){
      return {
        width : renderer.dimensions().totalWidth + this.content_padding().width,
        height : renderer.dimensions().totalHeight + this.content_padding().height
      };
    },
    
    next_position : function(next_size){
      return {
        top : [parseInt((window.getSize().height / 2.0) - (next_size.height / 2.0)), 0].max(),
        left : [parseInt((window.getSize().width / 2.0) - (next_size.width / 2.0)), 0].max()
      };
    },
    
    content_padding : function(){
      var cisize = this.content().measure(function(){
        return this.getComputedSize();
      });
      return {
        width : (cisize.computedLeft + cisize.computedRight),
        height : (cisize.computedTop + cisize.computedBottom)
      };
    },
    
    // turn target into a renderer key
    parse_target : function(target){
      var key = null;
      if(this.parser) key = this.parser(target);
      if(key) return key;
      
      if(typeOf(target) == 'element')
        return 'element';
      else if(typeOf(target) == 'string'){
        if(target.test(/#/i)){ 
          return 'inline';
        } else if(target.test(/\.(png|jpg|jpeg|gif)$/i)){
          return 'image';
        } else if(!target.test(RegExp('^((http:\\/\\/|)' + window.location.hostname + '|\\/)'))) {
          return 'remote';
        } else {
          return 'ajax';
        }
      }
      return null;
    },

    Memoize : ['loading_content', 'padding', 'content', 'box', 'overlay', 'parent']
  });
  
  Moobox.Renderer = new Class({
    Implements : Events,
    initialize : function(target, moobox){
      this.box = moobox;
      this.target = target;
      this.addEvent('ready', this.alert.bind(this));
    },
    render : $empty,
    alert : function(){
      if(this.element()) this.box.fireEvent('render_ready', this);
    },
    element : function(){
      if(Array.from(this.elements).length == 0) return undefined; // so the memoizing won't take affect.
      return Array.from(this.elements).length > 1 ? new Element('div').adopt(this.elements) : Array.from(this.elements).pick();
    },
    dimensions : function(){
      if(!this.element()) return undefined;
      var test = $('moobox_test_box');
      if(!test) (test = new Element('div', {id : 'moobox_test_box'}).setStyle('display', 'none')).inject(this.box.host());
      test.grab(this.element());
      var dim = this.element().measure(function(){
        return this.getComputedSize();
      });
      test.empty();
      return dim;
    },
    Memoize : ['element', 'dimensions']
  });
  
  Moobox.ImageRenderer = new Class({
    Extends : Moobox.Renderer,
    render : function(){
      if(!this.elements){
        this.image = new Image();
        this.image.onload = this.finish_render.bind(this)
        this.image.src = this.target;
      } else {
        this.fireEvent('ready');
      }
    },
    finish_render : function(){
      this.elements = new Element('img', {src : this.target}).setStyles(
      { width : [this.box.options.image.max_width, this.image.width].min(),
        height : [this.box.options.image.max_height, this.image.height].max()});
      this.fireEvent('ready');
    }
  });
  
  Moobox.AjaxRenderer = new Class({
    Extends : Moobox.Renderer,
    render : function(){
      if(!this.elements){
        new Request.HTML({url : this.target, evalScripts : false, onSuccess : function(tree, elems, html, js){
          this.elements = elems;
          this.scripts = js;
          this.fireEvent('ready');
        }.bind(this)})
      } else {
        this.fireEvent('ready');
      }
    }
  });
  
  Moobox.RemoteRenderer = new Class({
    Extends : Moobox.Renderer,
    render : function(){
      if(!this.elements){
        this.elements = new Element('iframe', {
          src : this.target,
          id : 'iframe_' + (new Date().getTime()),
          width : this.box.options.iframe.width,
          height : this.box.options.iframe.height,
          frameborder : 0
        }).setStyles({width : this.box.options.iframe.width, height : this.box.options.iframe.height});
      }
      this.fireEvent('ready');
    }
  });
  
  Moobox.ElementRenderer = new Class({
    Extends : Moobox.Renderer,
    render : function(){
      if(!this.elements) this.elements = this.target;
      this.fireEvent('ready');
    }
  });
  
  Moobox.InlineRenderer = new Class({
    Extends : Moobox.Renderer,
    render : function(){
      if(!this.elements) this.elements = $(this.target.substring(this.target.indexOf('#' + 1))).clone(true, false);
      this.fireEvent('ready');
    }
  });
  
  
})(document.id || $);
