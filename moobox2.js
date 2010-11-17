/*
---

script: moobox.js

description: Provides lightweight lightbox to render images, inline content, remote pages, pdfs, ajax content, etc.

license: MIT-style license

authors:
- Mike Nelson ( http://www.mikeonrails.com | http://www.twitter.com/mdnelson30 )

requires:
- core/1.2.4: *
- class/mutators/memoize/0.3: Class.Mutators.Memoize

provides: [Moobox]

...
*/

(function($){
  
  if(!Class.Mutators.Memoize){
    try{ console.error("MOOBOX: Please include the Memoize plugin: http://mootools.net/forge/p/mootols_memoize")} catch(e){}
  } else {
  
    // Handles all the event binding, firing, and target parsing.
    Moobox = new Class({
    
      Implements: [Options, Events, Chain],
      options : {
        parser : null, // pass in a function that takes a target (url, dom element, etc) and passes back a renderer key
        parent : null,
        iframe : {
          width : 850,
          height: 575
        },
        image : {
          maxWidth : 850,
          maxHeight : 575
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
          min_height : 130,
          gallery_class : 'moobox_gallery'
        },
        title : {
          id : 'moobox_title',
          default_text : null,
          show : true,
          show_gallery_index : true,
          parent : null
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
          key_command : null,
          classes : 'moobox_control',
          disabled_class : 'moobox_disabled',
          parent : null
        }
      },
    
      initialize : function(options){
        this.setOptions(options);
        this.opt = this.options;
        this.cache = {};
        this.galleries = {};
        this.register_renderers();
      
        this.observe_anchors();
        this.observe_objects();
        this.observe_key_strokes();
        
        window.addEvent('resize', this.relocate.bind(this));
        window.addEvent('domready', this.create_fx.bind(this));
        
      },
    
      // dom shortcuts
      host : function(){ return $(this.opt.parent || document.body); },  
      content : function(){ return new Element('div', {id : this.opt.box.content_id}).inject(this.box()); },
      box : function(){ return new Element('div', {id : this.opt.box.id}).addClass(this.opt.box.classes).setStyle('display', 'none').inject(this.host()); },  
      overlay : function(){ return new Element('div', {id : this.opt.overlay.id}).setStyle('display','none').inject(this.host()).addEvent('click', this.hide.bind(this)); },
      next : function(){ this.prev(); return new Element('a', {id : this.opt.controls.next_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.next_text).addEvent('click', this.go_next.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      prev : function(){ return new Element('a', {id : this.opt.controls.prev_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.prev_text).addEvent('click', this.go_prev.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      close : function(){ this.next();return new Element('a', {id : this.opt.controls.close_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.close_text).addEvent('click', this.hide.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      title : function(){ return new Element('strong', {id : this.opt.title.id}).set('html', this.opt.title.default_text || '').inject($(this.opt.title.parent || this.box()))},
    
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
      
      observe_key_strokes : function(){
        if(!this.opt.controls.enable_shortcuts) return;
        window.addEvent('domready', function(){ $(document.body).addEvent('keyup', this.key_stroke.bind(this));}.bind(this))
      },
      
      key_stroke : function(event){
        if(!this.showing()) return;
        if(event.code == 27) {
          this.hide();
          return false;
        } else if(this.opt.controls.key_command)
          return this.opt.controls.key_command(event);
      },
      
      create_fx : function(){
        this.fx = {
          overlay : new Fx.Tween(this.overlay(), {property : 'opacity', duration : this.opt.overlay.fade_duration, transition : this.opt.overlay.transition}).set(0),
          box : new Fx.Tween(this.box(), {property : 'opacity', duration : this.opt.box.fade_duration, transition : this.opt.box.fade_transition}).set(0),
          resize : new Fx.Morph(this.box(), {duration : this.opt.box.resize_duration, transition : this.opt.box.resize_transition}),
          relocate : new Fx.Morph(this.box(), {duration : 0}),
          content : new Fx.Tween(this.content(), {property : 'opacity', duration : this.opt.box.content_fade_duration, transition : this.opt.box.content_fade_transition})
        };
      },
    
      loading_renderer : function(){
        return new Moobox.ElementRenderer(new Element('div', {id : this.opt.box.loading_id}), this);
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
    
      set_title : function(text){
        this.title().empty();
        this.title().adopt([
          new Element('strong', {text : text}),
          this.current_content.gallery && this.opt.title.show_gallery_index ? new Element('em', {text : "(" + (this.current_content.gallery.current_index + 1) + " / " + this.current_content.gallery.renderers().length + ")"}) : null
        ]);
      },
    
      go_next : function(){
        if(this.current_content && this.current_content.gallery) this.current_content.gallery.next();
        return false;
      },
    
      go_prev : function(){
        if(this.current_content && this.current_content.gallery) this.current_content.gallery.prev();
        return false;
      },
    
      disable_next : function(){
        this.next().addClass(this.opt.controls.disabled_class);
      },
    
      disable_prev : function(){
        this.prev().addClass(this.opt.controls.disabled_class);
      },
    
      enable_controls : function(){
        this.next().removeClass(this.opt.controls.disabled_class);
        this.prev().removeClass(this.opt.controls.disabled_class);
      },
    
      reveal : function(text_or_html, title){
        var r = new Moobox.ElementRenderer(new Element('div').set('html', text_or_html), title, this);
        r.render();
        return r;
      },
    
      show : function(fn){
        if(this.showing()) return;
        this.overlay().setStyle('display', '');
        this.box().setStyle('display', '');
        this.content().fade('hide');
        this.fx.overlay.start(this.opt.overlay.opacity);
        this.fx.box.start(1).chain(function(){
          (fn || $empty)();
          this.fx.content.start(1);
        }.bind(this));
      },
    
      hide : function(){
        this.fx.content.start(0).chain(function(){
          this.clear_content();
          this.fx.box.start(0).chain(function(){
            this.box().removeClass(this.opt.box.gallery_class);
            this.box().setStyle('display', 'none');
          }.bind(this));
          this.fx.overlay.start(0).chain(function(){this.overlay().setStyle('display', 'none');}.bind(this));
        }.bind(this))
        this.fireEvent('moobox_hidden');
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
        this.apply_static_elements();
        this.fireEvent('moobox_content_applied');
        renderer.after_render();
      },
    
      apply_static_elements : function(){
        if(this.opt.controls.show_close) 
          this.close().setStyle('display', '');
        else
          this.close().setStyle('display', 'none');
        
        if(this.current_content.gallery){
          this.next().setStyle('display', '');
          this.prev().setStyle('display', '');
        } else {
          this.next().setStyle('display', 'none');
          this.prev().setStyle('display', 'none');
        }
        if(this.opt.title.show && (this.current_content.title || this.opt.title.default_text || this.opt.title.show_gallery_index)){
          this.set_title(this.current_content.title || this.opt.box.default_title);
          this.title().setStyle('display', '');
        } else {
          this.set_title(null);
          this.title().setStyle('display', 'none');
        }
      },
    
      resize_and_apply : function(renderer){
        var fn = function(){  
          var size = this.cumulative_size(renderer);
          if(size.width > this.opt.box.max_width || size.height > this.opt.box.max_height) {
            renderer.shrink();
            size = this.cumulative_size(renderer);
          }
          if(size.width < this.opt.box.min_width || size.height < this.opt.box.min_height) {
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
        if(key){return key};
      
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

      Memoize : ['loading_content', 'padding', 'host', 'content', 'box', 'overlay', 'next', 'prev', 'close', 'title']
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
          if(this.box.current_content.gallery === this){
            this.current_index = this.renderers().indexOf(this.box.current_content);
            if(this.current_index == this.renderers().length - 1) this.box.disable_next();
            if(this.current_index == 0) this.box.disable_prev();
            this.box.box().addClass(this.box.opt.box.gallery_class);
          }
        }.bind(this))
        this.renderers();
      },
      next : function(){
        if(this.box.current_content.gallery === this) {
          if(this.current_index < this.renderers().length - 1) {
            this.box.enable_controls();
            this.box.set_loading();
            this.renderers()[++this.current_index].render();
            if(this.current_index == this.renderers().length - 1) this.box.disable_next();
          }
        }
      },
      prev : function(){
        if(this.box.current_content.gallery === this) {
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
            r.gallery = this;
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
        this.element().setStyle('width', this.box.opt.box.max_width - padding.width - dim.computedLeft - dim.computedRight);
        if(dim.totalHeight > this.box.opt.box.max_height)
        {
          this.element().setStyle('height', this.box.opt.box.max_height - padding.height - dim.computedTop, dim.computedBottom);
          this.element().setStyle('overflow-y', 'auto');
          this.unmemoize('dimensions');
        }
      },
      expand : function(){
        var dim = this.dimensions();
        this.unmemoize('dimensions');
        var padding = this.box.content_padding();
        this.element().setStyle('height', this.box.opt.box.min_height - padding.height - dim.computedTop - dim.computedBottom);
        if(dim.totalWidth < this.box.opt.box.min_width)
        {
          this.element().setStyle('width', this.box.opt.box.min_width - padding.width - dim.computedLeft, dim.computedRight);
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
      after_render : function(){
        if(this.scripts){eval(this.scripts);}
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
        { width : [this.box.opt.image.max_width, this.image.width].min(),
          height : [this.box.opt.image.max_height, this.image.height].max()});
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
            width : this.box.opt.iframe.width,
            height : this.box.opt.iframe.height,
            frameborder : 0
          }).setStyles({width : this.box.opt.iframe.width, height : this.box.opt.iframe.height});
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
  }
  
})(document.id || $);
