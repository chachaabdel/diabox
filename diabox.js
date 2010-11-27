/*
---

script: diabox.js

description: Provides lightweight lightbox to render images, inline content, remote pages, pdfs, ajax content, youtube videos, vimeo videos, etc.

license: MIT-style license

authors:
- Mike Nelson ( http://www.mikeonrails.com | http://www.twitter.com/mikeonrails )

requires:
- core/1.2.4: *
- class/mutators/memoize/0.3: Class.Mutators.Memoize

provides: [Diabox]

...
*/

(function($){
  
  if(!Class.Mutators.Memoize){
    try{ console.error("MOOBOX: Please include the Memoize plugin: http://mootools.net/forge/p/mootols_memoize")} catch(e){}
  } else {

    Diabox = new Class({
    
      Implements: [Options, Events],
      options : {
        parser : null,                            // pass in a function that takes a target (url, dom element, etc) and passes back a renderable key
        parent : null,                            // the element that diabox and it's overlay are children of; null will use the body element
        rel_target : /^(dia|light)box/,           // the pattern to match when analyzing links on the site.
        error_text : '<p style="text-align:center;padding:10px;">Sorry, there was an error retrieving the content.<br />Please try again later.</p>',
        iframe : {                              
          width : 850,                            // the content width of an iframe renderable
          height: 575                             // the content height of an iframe renderable
        },                                      
        image : {                               
          maxWidth : 850,                         // the max image width of an image renderable
          maxHeight : 575                         // the max image height of an image renderable
        },                                      
        box : {                                 
          id : 'diabox',                          // the id of the modal window
          content_id : 'diabox_content',          // the id of the content div inside the modal window
          loading_id : 'diabox_loading',          // the id of the loading div that get's injected while no other content is present
          fade_duration : 400,                    // the fade in and fade out duration for the modal window
          resize_duration : 400,                  // the duration when the box is resizing before applying the next content
          content_fade_duration : 200,            // the duration it takes for the content to appear after being added to the modal window
          fade_transition : Fx.Transitions.Sine.easeOut,
          resize_transition : Fx.Transitions.Back.easeOut,
          content_fade_transition : Fx.Transitions.Sine.easeOut,
          classes : '',                           // classes to add to the modal window
          loading_class : 'loading',              // class that's added to the modal window when data is loading.
          max_width : 900,                        // the maximum width the modal window can be
          max_height : 700,                       // the maximum height the modal window can be
          min_width: 50,                          // the minimum width the modal window can be
          min_height : 80,                        // the minimum height the modal window can be
          draggable : false,                      // is the box draggable
          draggable_class : 'draggable',          // the class to add when the box is draggable
          apply_renderable_class : true,          // when content is applied should it add the renderable key to the box (text, ajax, youtube, etc)
          apply_gallery_class : true              // when a gallery is applied should the gallery name be added to the box
        },                                      
        gallery : {                             
          enabled : true,                         // allow galleries to be created and iterated through
          box_class : 'diabox_gallery',           // the class that gets added to the modal window when a gallery is present
          slideshow_class : 'diabox_slideshow',   // the class that gets added to the modal window when a slideshow is running
          slideshow_duration : 5000,              // the amount of time each content in the gallery stays present
          autostart : false,                      // start the slideshow whenever a gallery is shown
          loop : false                            // allow iteration from first to last and last to first  
        },                                      
        title : {                               
          id : 'diabox_title',                    // the id of the title element
          default_text : null,                    // a default title
          show : true,                            // show titles
          show_gallery_index : true,              // show the current page of the gallery (1 / 3), (3 / 5), etc
          parent : null                           // the parent element of the title (id or element)
        },                                      
        overlay : {                             
          id : 'diabox_overlay',                  // id of the overlay
          fade_duration : 400,                    // amount of time for the overlay to fade in
          opacity : 0.7,                          // the end opacity of the overlay
          transition : Fx.Transitions.Sine.easeOut // the transition to use when the overlay is appearing
        },
        gdoc : {
          width : 850,                            // the width of a pdf, tiff, or ppt
          height : 500                            // the height of a pdf, tiff, or ppt
        },
        youtube : {
          width: 650,                             // the width of youtube videos
          height: 350                             // the height of youtube videos
        },
        vimeo : {
          width : 650,                            // the width of vimeo videos
          height: 350                             // the height of vimeo videos
        },
        controls : {
          next_id : 'diabox_next',                // id of the next button
          prev_id : 'diabox_prev',                // id of the previous button
          close_id : 'diabox_close',              // id of the close button
          play_id : 'diabox_play',                // id of the play button
          next_text : 'next',                     // text of the next button (html ok)
          prev_text : 'prev',                     // text of the prev button (html ok)
          close_text : 'close',                   // text of the close button (html ok)
          play_text : 'start / stop',             // text of the play button (html ok)
          show_close : true,                      // display the close button
          enable_shortcuts : true,                // allow keyboard shortcuts, by default only ESC is implemented
          key_command : null,                     // function to call when a key command (not ESC) is fired. return false to stop propogation
          classes : 'diabox_control',             // class that's added to all control elements (prev, next, close, play)
          disabled_class : 'diabox_disabled',     // the class that's added to control elements when they should be disabled
          parent : null                           // the parent of the control elements, by default the modal window
        }
      },
    
      initialize : function(options){
        this.setOptions(options);
        this.opt = this.options;
        
        this.cache = {};
        this.galleries = {};
        
        this.register_renderables();
        this.observe_anchors();
        this.observe_objects();
        this.observe_key_strokes();
        
        window.addEvent('resize', this.relocate.bind(this));
        window.addEvent('domready', this.create_fx.bind(this));
        
      },
    
      // dom / control shortcuts
      host : function(){ return $(this.opt.parent || document.body); },  
      content : function(){ return new Element('div', {id : this.opt.box.content_id}).inject(this.box()); },
      box : function(){ 
        var box = new Element('div', {id : this.opt.box.id}).addClass(this.opt.box.classes).setStyle('display', 'none').inject(this.host());
        if(this.opt.box.draggable) {
          var drag = new Drag(box).attach();
          box.addClass(this.opt.box.draggable_class);
        }
        return box;
      },  
      overlay : function(){ return new Element('div', {id : this.opt.overlay.id}).setStyle('display','none').inject(this.host()).addEvent('click', this.hide.bind(this)); },
      next : function(){ this.prev(); return new Element('a', {id : this.opt.controls.next_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.next_text).addEvent('click', this.go_next.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      play : function(){ return new Element('a', {id : this.opt.controls.play_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.play_text).addEvent('click', this.toggle_slideshow.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      prev : function(){ this.play(); return new Element('a', {id : this.opt.controls.prev_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.prev_text).addEvent('click', this.go_prev.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      close : function(){ this.next();return new Element('a', {id : this.opt.controls.close_id}).addClass(this.opt.controls.classes).set('html', this.opt.controls.close_text).addEvent('click', this.hide.bind(this)).inject($(this.opt.controls.parent || this.box())); },
      title : function(){ return new Element('strong', {id : this.opt.title.id}).set('html', this.opt.title.default_text || '').inject($(this.opt.title.parent || this.box()))},
      
      // register all the default renderables
      register_renderables : function(){
        this.renderable_classes = {};
        this.register_renderable('text', Diabox.TextRenderable);
        this.register_renderable('gdoc', Diabox.GDocRenderable);
        this.register_renderable('image', Diabox.ImageRenderable);
        this.register_renderable('ajax', Diabox.AjaxRenderable);
        this.register_renderable('remote', Diabox.RemoteRenderable);
        this.register_renderable('inline', Diabox.InlineRenderable);
        this.register_renderable('element', Diabox.ElementRenderable);
        this.register_renderable('youtube', Diabox.YoutubeRenderable);
        this.register_renderable('vimeo', Diabox.VimeoRenderable);
      },
    
      // register a class as a renderable for a specific target key
      register_renderable : function(key, renderable_klazz){
        this.renderable_classes[key] = renderable_klazz;
      },
    
      // construct a new renderable object unless one's already built and stored in the cache
      construct_renderable : function(target, title){
        if(this.cache[target]) return this.cache[target];
        var key = this.parse_target(target);
        return this.cache[target] = new (this.renderable_classes[key])(target, title, this, key);
      },
    
      // observe clicks on all valid links and fire a render event based on the link's attributes.
      observe_anchors : function(){
        this.links = $$('a').each(function(a){
          if(a.rel && a.rel.test(this.opt.rel_target)){
          
            if(this.opt.gallery.enabled && a.rel.test(/\[(\w+)\]$/))
              this.galleries[RegExp.$1] = this.galleries[RegExp.$1] || new Diabox.Gallery(RegExp.$1, this);
            
            a.addEvent('click', function(){
              this.set_loading();
              this.construct_renderable(a.href, a.title).render();
              return false;
            }.bind(this))
          }
        }, this);
      },
    
      // resize and apply a renderable when it announces that it's ready
      observe_objects : function(){
        this.addEvent('render_ready', function(renderable){
          this.resize_and_apply(renderable);
        }.bind(this));
      },
      
      // observe key strokes that are propogated to the body
      observe_key_strokes : function(){
        if(!this.opt.controls.enable_shortcuts) return;
        window.addEvent('domready', function(){ $(document.body).addEvent('keyup', this.key_stroke.bind(this));}.bind(this))
      },
      
      // handle a key event. close when ESC is pressed or pass to provided function
      key_stroke : function(event){
        if(!this.showing()) return;
        if(event.code == 27) {
          this.hide();
          return false;
        } else if(this.opt.controls.key_command)
          return this.opt.controls.key_command(event);
      },
      
      // create fx objects to allow easy chaining
      create_fx : function(){
        this.fx = {
          overlay : new Fx.Tween(this.overlay(), {property : 'opacity', duration : this.opt.overlay.fade_duration, transition : this.opt.overlay.transition}).set(0),
          box : new Fx.Tween(this.box(), {property : 'opacity', duration : this.opt.box.fade_duration, transition : this.opt.box.fade_transition}).set(0),
          resize : new Fx.Morph(this.box(), {duration : this.opt.box.resize_duration, transition : this.opt.box.resize_transition}),
          relocate : new Fx.Morph(this.box(), {duration : 0}),
          content : new Fx.Tween(this.content(), {property : 'opacity', duration : this.opt.box.content_fade_duration, transition : this.opt.box.content_fade_transition})
        };
      },
    
      // the temporary renderable that's displayed when no others are present
      loading_renderable : function(){
        return new Diabox.ElementRenderable(new Element('div', {id : this.opt.box.loading_id}), null, this);
      },
    
      // apply the loading renderable and add a loading class to the box
      set_loading : function(){
        if(!this.showing()){
          this.show();
          this.apply_content(this.loading_renderable());
        } else {
          this.clear_content();
        }
        this.box().addClass(this.opt.box.loading_class);
      },
    
      // set the title and handle gallery information
      set_title : function(text){
        this.title().empty();
        this.title().adopt([
          new Element('strong').set('html', text),
          (this.current_content.gallery && this.opt.title.show_gallery_index ? new Element('em').set('html', "(" + (this.current_content.gallery.current_index + 1) + " / " + this.current_content.gallery.renderables().length + ")") : null)
        ]);
      },
      
      // go to the next page in gallery
      go_next : function(){
        if(this.current_content && this.current_content.gallery) this.current_content.gallery.next();
        return false;
      },
      
      // go to the previous page in gallery
      go_prev : function(){
        if(this.current_content && this.current_content.gallery) this.current_content.gallery.prev();
        return false;
      },
      
      // start or stop the slideshow
      toggle_slideshow : function(){
        if(this.current_content && this.current_content.gallery)
          this.current_content.gallery.toggle_slideshow();
        return false;
      },
    
      // disable the next button
      disable_next : function(){
        this.next().addClass(this.opt.controls.disabled_class);
      },
    
      // disable the previous button
      disable_prev : function(){
        this.prev().addClass(this.opt.controls.disabled_class);
      },
    
      // enable the next and previous buttons
      enable_controls : function(){
        $$(this.next(), this.prev()).removeClass(this.opt.controls.disabled_class);
      },
    
      // reveal text or html directly to this diabox
      reveal : function(target_or_text_or_html_or_id, title){
        this.set_loading();
        var key = this.parse_target(target_or_text_or_html_or_id);
        var r = key == 'text' ? new Diabox.TextRenderable(target_or_text_or_html_or_id, title, this, 'text') : this.construct_renderable(target_or_text_or_html_or_id, title);
        r.render();
        return r;
      },
    
      // show the window then execute fn when the content is in the dom (before it's revealed)
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
    
      // hide the window, fading each element out.
      hide : function(){
        this.fx.content.start(0).chain(function(){
          this.clear_content();
          this.fx.box.start(0).chain(function(){
            this.box().removeClass(this.opt.gallery.box_class);
            this.box().setStyle('display', 'none');
          }.bind(this));
          this.fx.overlay.start(0).chain(function(){this.overlay().setStyle('display', 'none');}.bind(this));
        }.bind(this))
        this.fireEvent('diabox_hidden');
      },
    
      // is the box visible right now?
      showing : function(){
        return !!this.current_content;
      },
    
      // remove the content from the window
      clear_content : function(){
        this.box().removeClass('loading');
        this.content().empty();
        if(this.current_content){
          this.current_content.after_remove();
          if(this.current_content.class_name) this.box().removeClass(this.current_content.class_name);
          if(this.current_content.gallery) this.box().removeClass(this.current_content.gallery.name);
        } 
        this.current_content = null;
      },
    
      // apply a renderable to the window
      apply_content : function(renderable){
        this.clear_content();
        this.current_content = renderable;
        this.content().adopt(renderable.element());
        if(this.opt.box.apply_renderable_class) this.box().addClass(this.current_content.class_name);
        if(this.opt.box.apply_gallery_class && this.current_content.gallery) this.box().addClass(this.current_content.gallery.name);
        this.fireEvent('diabox_content_applied');
        this.apply_static_elements();
        renderable.after_render();
      },
    
      // apply all the static buttons and title to the window
      apply_static_elements : function(){
        if(this.opt.controls.show_close) 
          this.close().setStyle('display', '');
        else
          this.close().setStyle('display', 'none');
        
        if(this.opt.gallery.enabled && this.current_content.gallery){
          $$(this.next(), this.prev(), this.play()).setStyle('display', '');
        } else {
          $$(this.next(), this.prev(), this.play()).setStyle('display', 'none');
        }
        if(this.opt.title.show && (this.current_content.title || this.opt.title.default_text || this.opt.title.show_gallery_index)){

          this.set_title(this.current_content.title || this.opt.box.default_title);
          this.title().setStyle('display', '');
        } else {
          this.set_title(null);
          this.title().setStyle('display', 'none');
        }
        
      },
    
      // show the box if necessary, resize the box to fit the next content, then apply it.
      resize_and_apply : function(renderable){
        var fn = function(){  
          var size = this.cumulative_size(renderable);
          if(size.width > this.opt.box.max_width || size.height > this.opt.box.max_height) {
            renderable.shrink();
            size = this.cumulative_size(renderable);
          }
          if(size.width < this.opt.box.min_width || size.height < this.opt.box.min_height) {
            renderable.expand();
            size = this.cumulative_size(renderable);
          }
          var pos = this.next_position(size); 
          this.fx.resize.start({
            width : size.width,
            height : size.height,
            left : pos.left,
            top : pos.top
          }).chain(function(){
            this.apply_content(renderable);
          }.bind(this));
        }.bind(this);
        if(this.showing()){
          fn();
        } else {
          this.show(fn);
        }
      },
    
      // relocate the box immediately when a window changes dimension
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
    
      // the cumulative size of the window based on specific content
      cumulative_size : function(renderable){
        return {
          width : (renderable.dimensions().totalWidth + this.content_padding().width),
          height : (renderable.dimensions().totalHeight + this.content_padding().height)
        };
      },
    
      // the position of the window based on the next dimension
      next_position : function(next_size){
        var csize = this.box().measure(function(){
          return this.getComputedSize();
        });
        return {
          left : [parseInt((window.getSize().x - (next_size.width + csize.computedLeft + csize.computedRight)) / 2.0), 0].max(),
          top : [parseInt((window.getSize().y - (next_size.height + csize.computedTop + csize.computedBottom)) / 2.0), 0].max()
        };
      },
    
      // the extra width based on the content div
      content_padding : function(){
        var cisize = this.content().measure(function(){
          return this.getComputedSize();
        });
        return {
          width : (cisize.computedLeft + cisize.computedRight),
          height : (cisize.computedTop + cisize.computedBottom)
        };
      },
    
      // turn target into a renderable key
      parse_target : function(target){
        var key = null;
        if(this.opt.parser) key = this.opt.parser(target);
        if(key){return key};
      
        if(typeOf(target) == 'element')
          return 'element';
        else if(typeOf(target) == 'string'){
          if(target.test(/youtube\.com\/watch\?v\=(\w+)(&|)/i)){
            return 'youtube';
          } else if(target.test(/vimeo\.com\/(\d+)/i)) {
            return 'vimeo';
          } else if(target.test(/\.(ppt|PPT|tif|TIF|pdf|PDF)$/i)) {
            return 'gdoc';
          } else if(target.test(/\.(png|PNG|jpg|JPG|jpeg|JPEG|gif|GIF)$/i)){
            return 'image';
          } else if(target.test(/\:\/\/[^#]+#([a-zA-Z]?[a-zA-Z0-9\-\_\:\.]*)/i)){ 
              return 'inline';
          } else if(target.test(/\:\/\//i)) {
            if(!target.test(RegExp('^(' + window.location.protocol + '\\/\\/' + window.location.hostname + '/)', 'i')))
              return 'remote';
            else 
              return 'ajax';
          } else {
            return 'text';
          }
        }
        return null;
      },

      Memoize : ['loading_content', 'padding', 'host', 'content', 'box', 'overlay', 'next', 'prev', 'close', 'title', 'play']
    });
    
    
    // The gallery handles the iteration over content, slideshows, and toggling button styles
    Diabox.Gallery = new Class({
      initialize : function(name, diabox){
        this.name = name;
        this.box = diabox;
        this.current_index = null;
        this.slideshow = null;
        this.box.addEvent('diabox_hidden', function(){
          this.current_index = null;
          this.stop_slideshow();
        }.bind(this));
        this.box.addEvent('diabox_content_applied', function(){
          if(this.box.current_content.gallery === this){
            this.current_index = this.renderables().indexOf(this.box.current_content);
            this.box.enable_controls();
            this.update_buttons();
            this.box.box().addClass(this.box.opt.gallery.box_class);
            if(this.box.opt.gallery.autostart)
              this.start_slideshow();
          }
        }.bind(this))
        this.renderables();
      },
      
      // jump to the next content. if loop is enabled allow jumping from n-1 to 0
      next : function(){
        if(this.box.current_content.gallery === this && (this.box.opt.gallery.loop || this.current_index < this.renderables().length - 1)) {
          this.box.set_loading();
          this.renderables()[(this.current_index < this.renderables().length - 1 ? ++this.current_index : (this.current_index = 0))].render();
          this.update_buttons();
          if(!this.box.opt.gallery.loop && this.current_index == this.renderables().length - 1)
            this.stop_slideshow();
        }
      },
      
      // jump to the prev content. if loop is enabled allow jumping from 0 ot n-1
      prev : function(){
        if(this.box.current_content.gallery === this && (this.box.opt.gallery.loop || this.current_index > 0)) {
          this.box.set_loading();
          this.renderables()[(this.current_index > 0 ? --this.current_index : (this.current_index = this.renderables().length - 1))].render();
          this.update_buttons();
        }
      },
      
      // is able to iterate forward
      can_next : function(){ return this.box.opt.gallery.loop || this.current_index < (this.renderables().length - 1);},
      
      // is able to iterate backward
      can_prev : function(){ return this.box.opt.gallery.loop || this.current_index > 0;},
      
      // update the button status (before here they were set to enabled)
      update_buttons : function(){
        if(!this.can_next()){this.box.disable_next();}
        if(!this.can_prev()){this.box.disable_prev();}
      },
      
      // start a slideshow
      start_slideshow : function(){
        if(this.playing()) return;
        this.box.box().addClass(this.box.opt.gallery.slideshow_class);
        this.slideshow = this.next.periodical(this.box.opt.gallery.slideshow_duration, this);
      },
      
      // stop the slideshow
      stop_slideshow : function(){
        clearTimeout(this.slideshow);
        this.slideshow = null;
        this.box.box().removeClass(this.box.opt.gallery.slideshow_class);
      },
      
      // turn the slideshow on / off
      toggle_slideshow : function(){
        if(this.playing())
          this.stop_slideshow();
        else
          this.start_slideshow();
      },
      
      // is there a slideshow running?
      playing : function(){
        return !!this.slideshow;
      },
      
      // the renderables in this gallery. cache the gallery in the renderable for easy comparison (renderable.gallery === this)
      renderables : function(){
        var rs = [];
        $$('a').each(function(a){
          if(a.rel && a.rel.test(RegExp("\\[" + this.name + "\\]$"))) {
            var r = this.box.construct_renderable(a.href, a.title);
            r.gallery = this;
            rs.push(r);
          }
        }, this);
        return rs;
      },
      Memoize : ['renderables']
    });
  
  
    /**********************************
      Renderable class. Wraps a target (link, element, element id, etc) and allows retrieval and displaying of that target.
      To implement your own renderable just Extend : Diabox.Renderable then implement the render method (normally $empty).
      The render method should be in the following format:
      render : function(){
        if(!this.retrieved()){
          var elems = // some code to create an element or set of elements utilizing this.target
          this.set_content(elems);
        }
      }
      It's imperative that you use the retrieved() and set_content() methods. These handle firing events, alerting the diabox.
      retrieved() will either return true and fire an event or it will return false.
      set_content() applies the content you've created then fires the required events. 
    /**********************************/
    
    Diabox.Renderable = new Class({
      Implements : Events,
      initialize : function(target, title, diabox, class_name){
        this.box = diabox;
        this.target = target;
        this.title = title;
        this.class_name = class_name;
        this.addEvent('ready', this.alert.bind(this));
      },
      render : $empty,
      // after render callback. by default calls any scripts that may be present.
      after_render : function(){ if(this.scripts){eval(this.scripts);}},
      // after remove callback. called when the content is removed from 
      after_remove : $empty,
      // alert the diabox that this render is ready to be shown
      alert : function(){
        if(this.element()) this.box.fireEvent('render_ready', this);
      },
      // if multiple elements are passed then wrap them with a div, otherwise return the element
      element : function(){
        if(Array.from(this.elements).length == 0) return undefined; // so the memoizing won't take affect.
        return Array.from(this.elements).length > 1 ? new Element('div').adopt(this.elements) : Array.from(this.elements).pick();
      },
      
      // shrink the content to fit within the bounds of the diabox settings
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
      
      // expand the content to fit outside the minimum bounds set by the diabox settings.
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
      
      // what are the dimensions of the produced element. insert them in a hidden test box, measure, then remove them.
      dimensions : function(){
        if(!this.element()) return undefined;
        var test = $('diabox_test_box');
        if(!test) (test = new Element('div', {id : 'diabox_test_box'}).setStyle('display', 'none')).inject(this.box.host());
        test.grab(this.element());
        var dim = this.element().measure(function(){
          return this.getComputedSize();
        });
        test.empty();
        return dim;
      },
      
      // has the content been retrieved. if so, fire a READY event
      retrieved : function(){
        if(!!this.element()){
          this.fireEvent('ready');
          return true;
        } else {
          return false;
        }
      },
      
      // set the content and fire a ready event.
      set_content : function(elements){
        this.elements = elements || new Element('p').set('html', this.box.opt.error_text);
        this.fireEvent('ready');
      },
      
      Memoize : ['element', 'dimensions']
    });
  
  
    Diabox.TextRenderable = new Class({
      Extends : Diabox.Renderable,
      render : function(){
        if(!this.retrieved())
          this.set_content(new Element('div').set('html', this.target));
      }
    });
    
    Diabox.ImageRenderable = new Class({
      Extends : Diabox.Renderable,
      render : function(){
        if(!this.retrieved()){
          this.image = new Image();
          this.image.onload = this.finish_render.bind(this);
          this.image.onerror = this.finish_failed_render.bind(this);
          this.image.src = this.target;
        }
      },
      finish_render : function(){
        this.set_content(new Element('img', {src : this.target}).set('styles',
        { width : [this.box.opt.image.max_width, this.image.width].min(),
          height : [this.box.opt.image.max_height, this.image.height].max()}));
      },
      finish_failed_render : function(){
        this.set_content(null);
      }
    });
  
    Diabox.AjaxRenderable = new Class({
      Extends : Diabox.Renderable,
      render : function(){
        if(!this.retrieved()){
          new Request.HTML({url : this.target, evalScripts : false, onSuccess : function(tree, elems, html, js){
            this.set_scripts(js);
            this.set_content(elems);
          }.bind(this), onFailure : function(){
            this.set_content(null);
          }}).get();
        }
      }
    });
  
    Diabox.RemoteRenderable = new Class({
      Extends : Diabox.Renderable,
      render : function(){
        if(!this.retrieved()){
          this.set_content(new Element('iframe', {
            src : this.target,
            id : 'iframe_' + (new Date().getTime()),
            width : this.width || this.box.opt.iframe.width,
            height : this.height || this.box.opt.iframe.height,
            frameborder : 0
          }).setStyles({width : this.box.opt.iframe.width, height : this.box.opt.iframe.height}));
        }
      }
    });
  
    Diabox.GDocRenderable = new Class({
      Extends : Diabox.RemoteRenderable,
      initialize : function(target, title, diabox, class_name){
        this.parent("http://docs.google.com/viewer?embedded=true&url=" + target, title, diabox, class_name);
        this.width = this.box.opt.gdoc.width;
        this.height = this.box.opt.gdoc.height;
      }
    });
    
    Diabox.VimeoRenderable = new Class({
      Extends : Diabox.RemoteRenderable,
      initialize : function(target, title, diabox, class_name){
        target.test(/vimeo\.com\/(\d+)/)
        this.parent("http://player.vimeo.com/video/" + RegExp.$1, title, diabox, class_name);
        this.width = this.box.opt.vimeo.width;
        this.height = this.box.opt.vimeo.height;
      }
    });
  
  
    Diabox.ElementRenderable = new Class({
      Extends : Diabox.Renderable,
      render : function(){
        if(!this.retrieved()){
          this.set_content(this.target);
        }
      }
    });
  
    Diabox.InlineRenderable = new Class({
      Extends : Diabox.Renderable,
      render : function(){
        if(!this.retrieved()){
          var e = $(this.target.substring(this.target.indexOf('#') + 1)).clone(true, false);
          if(e.getStyle('display') == 'none') e.setStyle('display', '');
          this.set_content(e);
        }
      }
    });
    
    Diabox.YoutubeRenderable = new Class({
      Extends : Diabox.Renderable,
      initialize : function(target, title, diabox, class_name){
        target.test(/v=([0-9a-zA-Z\-\_]+)(&|)/)
        this.parent(RegExp.$1, title, diabox, class_name);
      },
      render : function(){
        if(!this.retrieved()){
          this.set_content(new Element('div').set('html', '<object width="' + this.box.opt.youtube.width + '" height="' + this.box.opt.youtube.height + '">' + 
                '<param name="movie" value="http://www.youtube.com/v/' + this.target + '?fs=1&amp;hl=en_US"></param>' + 
                '<param name="wmode" value="transparent"></param>' +
                '<param name="allowFullScreen" value="true"></param>' + 
                '<param name="allowscriptaccess" value="always"></param>' + 
                '<embed src="http://www.youtube.com/v/' + this.target + '?fs=1&amp;hl=en_US" wmode="transparent" type="application/x-shockwave-flash" allowscriptaccess="always" allowfullscreen="true" width="' + this.box.opt.youtube.width + '" height="' + this.box.opt.youtube.height + '"></embed>' + 
                '</object>'));
        }
      }
    })
  }
  
})(document.id || $);
