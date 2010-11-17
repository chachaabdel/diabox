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
        resize_transition : Fx.Transitions.Back.easeOut,
        content_fade_transition : Fx.Transitions.Sine.easeOut,
        classes : '',
        max_width : 900,
        max_height : 700,
        min_width: 100,
        min_height : 100,
        gallery_class : 'moobox_gallery'
      },
      overlay : {
        id : 'moobox_overlay',
        fade_duration : 400,
        opacity : 0.7,
        transition : Fx.Transitions.Sine.easeOut
      },
      gdoc : {
        width : 850,
        height : 500
      },
      controls : {
        next_id : 'moobox_next',
        prev_id : 'moobox_prev',
        close_id : 'moobox_close',
        next_text : 'next',
        prev_text : 'prev',
        close_text : 'close',
        show_close : true,
        enable_shortcuts : true,
        class : 'moobox_control',
        disabled_class : 'moobox_disabled'
      }
    },
    
    initialize : function(options){
      this.setOptions(options);
      this.cache = {};
      this.galleries = {};
      this.register_renderers();
      
      this.observe_anchors();
      this.observe_objects();
      
      window.addEvent('resize', this.relocate.bind(this));
      window.addEvent('domready', this.create_fx.bind(this));
    },
    
    // dom shortcuts
    host : function(){ return $(this.options.parent || document.body); },  
    content : function(){ return $(this.options.box.content_id) || new Element('div', {id : this.options.box.content_id}).inject(this.box()); },
    box : function(){ return $(this.options.box.id) || new Element('div', {id : this.options.box.id, class : this.options.box.classes}).setStyle('display', 'none').inject(this.host()); },  
    overlay : function(){ return $(this.options.overlay.id) || new Element('div', {id : this.options.overlay.id}).setStyle('display','none').inject(this.host()).addEvent('click', this.hide.bind(this)); },
    next : function(){ return $(this.options.controls.next_id) || new Element('a', {id : this.options.controls.next_id, class : this.options.controls.class}).set('html', this.options.controls.next_text).addEvent('click', this.go_next.bind(this)).inject(this.box()); },
    prev : function(){ return $(this.options.controls.prev_id) || new Element('a', {id : this.options.controls.prev_id, class : this.options.controls.class}).set('html', this.options.controls.prev_text).addEvent('click', this.go_prev.bind(this)).inject(this.box()); },
    close : function(){ return $(this.options.controls.close_id) || new Element('a', {id : this.options.controls.close_id, class : this.options.controls.class}).set('html', this.options.controls.close_text).addEvent('click', this.hide.bind(this)).inject(this.box()); },
    
    // register the default renderers. to override call register_renderer with the appropriate arguments
    register_renderers : function(){
      this.renderer_classes = {};
      this.register_renderer('gdoc', Moobox.GDocRenderer);
      this.register_renderer('image', Moobox.ImageRenderer);
      this.register_renderer('ajax', Moobox.AjaxRenderer);
      this.register_renderer('remote', Moobox.RemoteRenderer);
      this.register_renderer('inline', Moobox.InlineRenderer);
      this.register_renderer('element', Moobox.ElementRenderer);
    },
    
    // registers a renderer via an event. no renderers are stored in the Moobox object.
    register_renderer : function(key, renderer_klazz){
      this.renderer_classes[key] = renderer_klazz;
    },
    
    construct_renderer : function(target, title){
      if(this.cache[target]) return this.cache[target];
      return (this.cache[target] = new (this.renderer_classes[this.parse_target(target)])(target, title, this));
    },
    
    // find all the anchors that match the provided rel regex. observe clicks on them and fire the renderer.
    observe_anchors : function(){
      this.links = $$('a').each(function(a){
        if(a.rel && a.rel.test(/^(moo|light)box/)){
          
          if(a.rel.test(/box\[(\w+)\]$/))
            this.galleries[RegExp.$1] = this.galleries[RegExp.$1] || new Moobox.Gallery(RegExp.$1, this);
            
          a.addEvent('click', function(){
            this.set_loading();
            this.construct_renderer(a.href, a.title).render();
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
        relocate : new Fx.Morph(this.box(), {duration : 0}),
        content : new Fx.Tween(this.content(), {property : 'opacity', duration : this.options.box.content_fade_duration, transition : this.options.box.content_fade_transition})
      };
    },
    
    loading_renderer : function(){
      return new Moobox.ElementRenderer(new Element('div', {id : this.options.box.loading_id}), this);
    },
    
    set_loading : function(){
      if(!this.showing()){
        this.show();
        this.apply_content(this.loading_renderer());
      } else {
        this.clear_content();
      }
      this.box().addClass('loading');
    },
    
    show : function(fn){
      if(this.showing()) return;
      this.overlay().setStyle('display', '');
      this.box().setStyle('display', '');
      this.content().fade('hide');
      this.fx.overlay.start(this.options.overlay.opacity);
      this.fx.box.start(1).chain(function(){
        (fn || $empty)();
        if(this.options.controls.show_close) this.close().setStyle('display', '');
        this.fx.content.start(1);
      }.bind(this));
    },
    
    hide : function(){
      this.fx.content.start(0).chain(function(){
        this.clear_content();
        this.fx.box.start(0).chain(function(){
          this.box().removeClass(this.options.box.gallery_class);
          this.box().setStyle('display', 'none');
        }.bind(this));
        this.fx.overlay.start(0).chain(function(){this.overlay().setStyle('display', 'non');}.bind(this));
      }.bind(this))
      this.fireEvent('moobox_hidden');
    },
    
    go_next : function(){
      if(this.current_content && this.current_content.group) this.current_content.group.next();
    },
    
    go_prev : function(){
      if(this.current_content && this.current_content.group) this.current_content.group.prev();
    },
    
    disable_next : function(){
      this.next().addClass(this.options.controls.disabled_class);
    },
    
    disable_prev : function(){
      this.prev().addClass(this.options.controls.disabled_class);
    },
    
    enable_controls : function(){
      this.next().removeClass(this.options.controls.disabled_class);
      this.prev().removeClass(this.options.controls.disabled_class);
    },
    
    showing : function(){
      return !!this.current_content;
    },
    
    clear_content : function(){
      this.box().removeClass('loading');
      this.content().empty();
      this.current_content = null;
    },
    
    apply_content : function(renderer){
      this.clear_content();
      this.current_content = renderer;
      this.content().adopt(renderer.element());
      this.apply_gallery_controls();
      this.fireEvent('moobox_content_applied');
    },
    
    apply_gallery_controls : function(){
      if(this.current_content && this.current_content.group){
        this.next().setStyle('display', '');
        this.prev().setStyle('display', '');
      } else {
        this.next().setStyle('display', 'none');
        this.prev().setStyle('display', 'none');
      }
    },
    
    resize_and_apply : function(renderer){
      var fn = function(){  
        var size = this.cumulative_size(renderer);
        if(size.width > this.options.box.max_width || size.height > this.options.box.max_height) {
          renderer.shrink();
          size = this.cumulative_size(renderer);
        }
        if(size.width < this.options.box.min_width || size.height < this.options.box.min_height) {
          renderer.expand();
          size = this.cumulative_size(renderer);
        }
        var pos = this.next_position(size); 
        this.fx.resize.start({
          width : size.width,
          height : size.height,
          left : pos.left,
          top : pos.top
        }).chain(function(){
          this.apply_content(renderer);
        }.bind(this));
      }.bind(this);
      if(this.showing()){
        fn();
      } else {
        this.show(fn);
      }
    },
    
    relocate : function(){
      if(this.showing()){
        var size = this.cumulative_size(this.current_content);
        var pos = this.next_position(size);
        this.fx.relocate.start({
          left : pos.left,
          top : pos.top
        });
      }
    },
    
    cumulative_size : function(renderer){
      return {
        width : renderer.dimensions().totalWidth + this.content_padding().width,
        height : renderer.dimensions().totalHeight + this.content_padding().height,
      };
    },
    
    next_position : function(next_size){
      return {
        left : [parseInt((window.getSize().x - next_size.width) / 2.0), 0].max(),
        top : [parseInt((window.getSize().y - next_size.height) / 2.0), 0].max()
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
        if(target.test(/\.(ppt|PPT|tif|TIF|pdf|PDF)$/i)) {
          return 'gdoc';
        } else if(target.test(/\.(png|PNG|jpg|JPG|jpeg|JPEG|gif|GIF)$/i)){
          return 'image';
        } else if(target.test(/#/i)){ 
            return 'inline';
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
  
  Moobox.Gallery = new Class({
    initialize : function(name, moobox){
      this.name = name;
      this.box = moobox;
      this.current_index = null;
      this.box.addEvent('moobox_hidden', function(){
        this.current_index = null;
      }.bind(this));
      this.box.addEvent('moobox_content_applied', function(){
        if(this.box.current_content.group === this){
          this.current_index = this.renderers().indexOf(this.box.current_content);
          if(this.current_index == this.renderers().length - 1) this.box.disable_next();
          if(this.current_index == 0) this.box.disable_prev();
          this.box.box().addClass(this.box.options.box.gallery_class);
        }
      }.bind(this))
      this.renderers();
    },
    next : function(){
      if(this.box.current_content.group === this) {
        if(this.current_index < this.renderers().length - 1) {
          this.box.enable_controls();
          this.box.set_loading();
          this.renderers()[++this.current_index].render();
          if(this.current_index == this.renderers().length - 1) this.box.disable_next();
        }
      }
    },
    prev : function(){
      if(this.box.current_content.group === this) {
        if(this.current_index > 0) {
          this.box.enable_controls();
          this.box.set_loading();
          this.renderers()[--this.current_index].render();
          if(this.current_index == 0) this.box.disable_prev();
        }
      }
    },
    renderers : function(){
      var rs = [];
      $$('a').each(function(a){
        if(a.rel && a.rel.test(RegExp("box\\[" + this.name + "\\]$"))) {
          var r = this.box.construct_renderer(a.href, a.title);
          r.group = this;
          rs.push(r);
        }
      }, this);
      return rs;
    },
    Memoize : ['renderers']
  });
  
  Moobox.Renderer = new Class({
    Implements : Events,
    initialize : function(target, title, moobox){
      this.box = moobox;
      this.target = target;
      this.title = title;
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
    shrink : function(){
      var dim = this.dimensions();
      this.unmemoize('dimensions');
      var padding = this.box.content_padding();
      this.element().setStyle('width', this.box.options.box.max_width - padding.width - dim.computedLeft - dim.computedRight);
      if(dim.totalHeight > this.box.options.box.max_height)
      {
        this.element().setStyle('height', this.box.options.box.max_height - padding.height - dim.computedTop, dim.computedBottom);
        this.element().setStyle('overflow-y', 'auto');
        this.unmemoize('dimensions');
      }
    },
    expand : function(){
      var dim = this.dimensions();
      this.unmemoize('dimensions');
      var padding = this.box.content_padding();
      this.element().setStyle('height', this.box.options.box.min_height - padding.height - dim.computedTop - dim.computedBottom);
      if(dim.totalWidth < this.box.options.box.min_width)
      {
        this.element().setStyle('width', this.box.options.box.min_width - padding.width - dim.computedLeft, dim.computedRight);
        this.unmemoize('dimensions');
      }
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
  
  Moobox.GDocRenderer = new Class({
    Extends : Moobox.RemoteRenderer,
    initialize : function(target, title, moobox){
      this.parent("http://docs.google.com/viewer?embedded=true&url=" + target, title, moobox);
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
      if(!this.elements) this.elements = $(this.target.substring(this.target.indexOf('#') + 1)).clone(true, false);
      if(this.elements.getStyle('display') == 'none') this.elements.setStyle('display', '');
      this.fireEvent('ready');
    }
  });
  
  
})(document.id || $);
