
var Moobox = new Class({
  Implements: [Events, Options],
  options: {
    parent : null,
    overlay : {
      visible : true,
      color : 'transparent',
      opacity : 0.8,
      fadeDuration : 500,
      id : 'moobox_overlay'
    },
    box : {
      id : 'moobox',
      fadeDuration : 500,
      classes : '',
      resizeDuration : 500,
      contentID : 'moobox_content',
      loadingClass : 'loading',
      shortcuts : true,
      resizeTransition : Fx.Transitions.Elastic.easeOut,
      defaultSize : {width : 200, height : 100},
      transitionOrder : 'position_and_size',
      maxWidth : 850,
      maxHeight : 600
    },
    controls : {
      keyEvents : true,
      parent : 'moobox_content',
      injectLocation : 'bottom',
      nextID : 'moobox_next',
      prevID : 'moobox_prev',
      nextText : 'next',
      prevText : 'prev',
      disabledClass : 'moobox_disabled',
      prevClasses : '',
      nextClasses : ''
    },
    footer : {
      id : 'moobox_footer',
      closeText : 'close',
      closeID : 'moobox_close',
      fadeDuration : 200,
      classes : '',
      titleID : 'moobox_title'
    },
    iframe : {
      width : 800,
      height : 500
    },
    image : {
      maxWidth : 800,
      maxHeight : 500
    }
  },
  initialize : function(options){
    this.setOptions(options);
    this.options.parent = this.options.parent || $(document.body);
    if(this.options.overlay.visible) this.createOverlay();
    this.createTestBox();
    this.createBox();
    this.createEffects();
    this.prepareLinks();
    if(this.options.box.shortcuts) this.observeKeys();
    this.currentContent = null;
    $(window).addEvent('resize', this.adjust.bind(this));
    this.cache = {};
  },
  createTestBox : function(){
    $(this.options.parent).grab(this.test = new Element('div', {id : 'moobox_test_box'}).setStyle('display', 'none'));
  },
  createOverlay : function(){
    $(this.options.parent).grab(this.bg = new Element('div', {id : this.options.overlay.id}).setStyles({'display':'none'}));
    this.bg.addEvent('click', this.close.bind(this));
  },
  createBox : function(){
    this.boxInnerHTML = '<div class="moobox_tl">' + 
      '<div class="moobox_tr">' + 
        '<div class="moobox_bl">' + 
          '<div class="moobox_br">' + 
            '<div class="mooboox_t">' + 
              '<div class="moobox_r">' + 
                '<div class="moobox_b">' + 
                  '<div class="moobox_l">' +
                    '<div class="moobox_c">' + 
                      '<div id="' + this.options.box.contentID + '"></div>' + 
                      '<div id="' + this.options.footer.id + '" style="display:none;"><h2 id="' + this.options.footer.titleID + '">&nbsp;</h2><a href="#" id="' + this.options.footer.closeID + '">' + this.options.footer.closeText + '</a></div>' + 
                    '</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
    $(this.options.parent).grab(
      this.box = new Element('div', {
        id : this.options.box.id, 
        html : this.boxInnerHTML}).addClass(this.options.box.classes).setStyle('display', 'none'));
    this.content = $(this.options.box.contentID);
    this.footer = $(this.options.footer.id).addClass(this.options.footer.classes);
    this.title = $(this.options.footer.titleID);
    this.close_link = $(this.options.footer.closeID).addEvent('click', this.close.bind(this));
  },
  createEffects : function(){
    this.fx = {
      overlay : new Fx.Tween(this.bg, {property : 'opacity', duration : this.options.overlay.fadeDuration}).set(0),
      box : new Fx.Tween(this.box, {property : 'opacity', duration : this.options.box.fadeDuration}).set(0),
      reveal : new Fx.Morph(this.box, {duration : this.options.box.resizeDuration, transition : this.options.box.resizeTransition}),
      footer : new Fx.Tween(this.footer, {property : 'opacity', duration : this.options.footer.fadeDuration})
    }
  },
  prepareLinks : function(){
    $$('a').filter(function(a){
      return a.rel && a.rel.test(/^(light|moo)box/); 
    }).each(function(anchor){
      anchor.addEvent('click', this.anchorClick.bind(this));
    }, this);
  },
  observeKeys : function(){
    $(document).addEvent('keyup', this.documentKeyup.bind(this));
  },
  adjust : function(){
    if(!this.currentContent) return;
    this.currentContent.position();
  },
  showFooter : function(){
    this.footer.setStyle('display', '');
    this.fx.footer.start(1).chain(function(){
    }.bind(this));
  },
  applyContent : function(content){
    this.fireEvent('contentRemoved', this.currentContent);
    this.currentContent = content;
    this.content.empty();
    this.content.grab(this.currentContent.getElement());
    this.box.removeClass(this.options.box.loadingClass);
    this.title.set('html', content.title);
    this.fireEvent('contentApplied', this.currentContent);
    this.showFooter();
  },
  mapWrappers : function(fn){
    if(!this.wrappers){
      var div = this.box.getChildren().pick();
      this.wrappers = [];
      while(div && div.getParent().id != this.options.box.contentID){
        this.wrappers.push(div);
        div = div.getChildren().pick();
      }
    }
    return this.wrappers.map(fn);
  },
  contentPaddingX : function(){
    if(this.x_padding) return this.x_padding;
    return this.x_padding = this.mapWrappers(function(d){
        var size = d.getComputedSize();
      return  size['padding-left'] + 
              size['padding-right'] + 
              size['border-left-width'] + 
              size['border-right-width'];}).sum();
  },
  contentPaddingY : function(){
    if(this.y_padding) return this.y_padding;
   return this.y_padding = this.mapWrappers(function(d){
      var size = d.getComputedSize();
     return size['padding-top'] + 
            size['padding-bottom'] + 
            size['border-top-width'] + 
            size['border-bottom-width']}).sum();
  },
  open : function(){
    if(this.options.overlay.visible){
      this.bg.setStyle('display', '');
      this.fx.overlay.start(this.options.overlay.opacity);
    }
    this.content.empty();
    this.box.addClass(this.options.box.loadingClass);
    this.box.setStyle('display', '');
    this.fx.box.start(1);
    //this.fx.reveal.start({width : this.options.box.defaultSize.width, height : this.options.box.defaultSize.height});
  },
  close : function(){
    this.fx.footer.start(0).chain(function(){
      this.footer.setStyle('display', 'none');
      this.fx.box.start(0).chain(function(){
        this.box.setStyle('display', 'none')
      }.bind(this));
      this.fx.overlay.start(0).chain(function(){
        this.bg.setStyle('display', 'none');
      }.bind(this));
    }.bind(this));
    this.fireEvent('contentRemoved', this.currentContent);
    this.currentContent = null;
    return false;
  },
  anchorClick : function(e){
    this.reveal(e.target.href,  (e.target.rel.test(/^moobox\[(\w+)\]$/) ? RegExp.$1 : null), e.target.title);
    return false;
  },
  documentKeyup : function(event){
    if(!this.currentContent) return;
    switch(event.code) {
			case 27:	// Esc
			case 88:	// 'x'
			case 67:	// 'c'
				this.close();
				break;
  		case 37:	// Left arrow
  		case 80:	// 'p'
  			if(this.options.controls.keyEvents && this.currentContent.group) this.currentContent.group.goPrev();
  			break;
  		case 39:	// Right arrow
  		case 78:	// 'n'
  			if(this.options.controls.keyEvents && this.currentContent.group) this.currentContent.group.goNext();
  			break;
		}
		return false;
  },
  reveal : function(target, group, title){
    this.open();
    console.log(group);
    if(group) { MooboxGroup.create(group, this);}
    var content = MooboxContent.create(target, this, title);
    content.prepare();
    return false;
  },
  reveal_text : function(text, title){
    var div = new Element('div').set('html', text);
    this.open();
    var content = new MooboxDomContent(div, this, title);
    content.prepare();
    return false;
  }
  
});

MooboxGroup = new Class({
  initialize : function(group, moobox){
    this.box = moobox;
    this.box.addEvent('contentApplied', this.createButtons.bind(this));
    this.box.addEvent('contentRemoved', this.removeButtons.bind(this));
    this.name = group;
    this.currentIndex = 0;
    this.links = $$('a').filter(function(a){return a.rel.test(new RegExp("^moobox\\[" + group + "\\]$"));});
    this.contents = this.links.map(function(link){
      return MooboxContent.create(link.href, moobox, link.title, this);
    }.bind(this));
  },
  hasNext : function(){
    return this.currentIndex < this.contents.length - 1;
  },
  hasPrev : function(){
    return this.currentIndex > 0;
  }, 
  goNext : function(){
    if(!this.hasNext()) return;
    this.contents[this.currentIndex + 1].prepare();
  },
  goPrev : function(){
    if(!this.hasPrev()) return;
    this.contents[this.currentIndex - 1].prepare();
  },
  createButtons : function(content){
    if(!content || content.group != this) return;
    this.currentIndex = this.contents.indexOf(content);
    
    [ this.prev = new Element('a', {id : this.box.options.controls.prevID}).addClass(this.box.options.controls.prevClasses).set('html', this.box.options.controls.prevText).addEvent('click', this.goPrev.bind(this)),
      this.next = new Element('a', {id : this.box.options.controls.nextID}).addClass(this.box.options.controls.nextClasses).set('html', this.box.options.controls.nextText).addEvent('click', this.goNext.bind(this))
    ].each(function(button){
     $(this.box.options.controls.parent).grab(button, this.box.options.controls.injectLocation); 
    }, this)
    
    if(!this.hasPrev()) this.prev.addClass(this.box.options.controls.disabledClass);
    if(!this.hasNext()) this.next.addClass(this.box.options.controls.disabledClass);
  },
  removeButtons : function(content){
    if(!content || content.group != this) return;
    if(this.prev) this.prev.dispose();
    if(this.next) this.next.dispose();
  }
});
MooboxGroup.cache = {};
MooboxGroup.create = function(group, moobox){
  var mgroup = MooboxGroup.cache[group];
  if(mgroup) return mgroup;
  return MooboxGroup.cache[group] = new MooboxGroup(group, moobox);
}

MooboxContent = new Class({
  Implements : Events,
  initialize : function(content, moobox, title, group){
    this.content = content;
    this.box = moobox;
    this.scripts = null;
    this.title = title || '';
    this.group = group;
    this.addEvent('ready', function(){
      this.ready = true;
      this.show();
    }.bind(this));
  },
  prepare : function(){ 
    if(this.ready)
      this.show();
    else
      this.getElement(); 
  },
  show : function(){
    this.box.content.empty();
    this[this.box.options.box.transitionOrder]();
  },
  position_and_size : function(){ this.size_and_position(); },
  size_and_position : function(){
    var fdim = this.finalDimensions();
    var fpos = this.finalPosition();
    this.box.footer.setStyle('width', fdim.x_padded - this.box.footer.getStyle('padding-left').toInt() - this.box.footer.getStyle('padding-right').toInt() - this.box.footer.getStyle('margin-left') - this.box.footer.getStyle('margin-right'));
    this.box.fx.reveal.start({
        width : fdim.x_padded,
        height : fdim.y_padded,
        left : fpos.x,
        top : fpos.y
    }).chain(function(){
      this.apply();
    }.bind(this));
  },
  position_then_size : function(){
    var fdim = this.finalDimensions();
    var fpos = this.finalPosition();
    this.box.footer.setStyle('width', fdim.x_padded - this.box.footer.getStyle('padding-left').toInt() - this.box.footer.getStyle('padding-right').toInt() - this.box.footer.getStyle('margin-left') - this.box.footer.getStyle('margin-right'));
    this.box.fx.reveal.start({
      left : fpos.x,
      top : fpos.y
    }).chain(function(){
      this.box.fx.reveal.start({
          width : fdim.x_padded,
          height : fdim.y_padded,
      }).chain(function(){
        this.apply();
      }.bind(this));
    }.bind(this));
  },
  position : function(){
    var fpos = this.finalPosition();
    return this.box.fx.reveal.start({
        left : fpos.x,
        top : fpos.y
    });
  },
  apply : function(){
    this.box.applyContent(this);
    if(this.scripts){eval(this.scripts);}
  },
  getElement : function(){
    if(!this.element) this.elementize();
    return this.element;
  },
  elementize : function(){
    this.element = new Element('div').set('html', this.content);
    this.fireEvent('ready');
  },
  finalDimensions : function(){
    if(this.final_dimensions) return this.final_dimensions;
    this.box.test.empty();
    
    this.getElement().inject(this.box.test);
    this.final_dimensions = this.getElement().measure(function(){
      var computedSize = this.getComputedSize();
      return Object.merge(computedSize, {x : computedSize.totalWidth, y : computedSize.totalHeight});
    });
    // too wide. force it to shrink then recalculate the height. 
    if(this.final_dimensions.x + this.box.contentPaddingX() > this.box.options.box.maxWidth){
      this.getElement().setStyle('width', (this.box.options.box.maxWidth - 
                                            this.box.contentPaddingX() - 
                                            this.final_dimensions['padding-left'] -
                                            this.final_dimensions['padding-right'] -
                                            this.final_dimensions['border-left-width'] - 
                                            this.final_dimensions['border-right-width']));
      this.final_dimensions = null;
      return this.finalDimensions();
    }
    this.final_dimensions.x_padded = [this.final_dimensions.x + this.box.contentPaddingX(), this.box.options.box.maxWidth].min();
    this.final_dimensions.y_padded = [this.final_dimensions.y + this.box.contentPaddingY(), this.box.options.box.maxHeight].min();
    this.box.test.empty();
    return this.final_dimensions;
  },
  finalPosition : function(){
    var contentSize = this.finalDimensions();
    var windowSize = $(window).getSize();
    return { x : [(windowSize.x / 2 - contentSize.x_padded / 2), 0].max(),
      y : [(windowSize.y / 2 - contentSize.y_padded / 2), 0].max() };
  }
});

// content is an Image()
MooboxImageContent = new Class({
  Extends : MooboxContent,
  elementize : function(){
    this.image = new Image();
    this.image.src = this.content;
    this.image.onload = function(){
      this.element = new Element('img', {src : this.image.src}).setStyles({
        width : [this.box.options.image.maxWidth, this.image.width].min(),
        height: [this.box.options.image.maxHeight, this.image.height].min()
      });
      this.fireEvent('ready');
    }.bind(this);
  }
});

// content is the id of a dom element
MooboxDomContent = new Class({
  Extends : MooboxContent,
  elementize : function(){
    this.element = $(this.content).clone(true, false);
    this.element.setStyle('display', '');
    this.fireEvent('ready');
  }
});

MooboxIframeContent = new Class({
  Extends : MooboxContent,
  elementize : function(){
    this.element = new Element('iframe', {
      src : this.content,
      width : this.box.options.iframe.width,
      height : this.box.options.iframe.height,
      frameborder : 0
    }).setStyles({width : this.box.options.iframe.width, height : this.box.options.iframe.height});
    this.fireEvent('ready');
  }
});

MooboxElementContent = new Class({
  Extends : MooboxContent,  
  elementize : function(){
   this.element = this.content;
   this.fireEvent('ready');
  }
});

MooboxAjaxContent = new Class({
  Extends : MooboxContent,
  elementize : function(){
    new Request.HTML({url : this.content, evalScripts : false, onSuccess : function(tree, elems, html, js){
      this.scripts = js;
      this.element = new Element('div').set('html', html);
      this.fireEvent('ready');
    }.bind(this)}).get();
  }
});

MooboxContent.cache = {};
MooboxContent.create = function(target, box, title, group){
  var content = MooboxContent.cache[target];
  if(content) return content;
  
  if(typeOf(target) == 'element')
    return MooboxContent.cache[target] = new MooboxElementContent(target, box, title, group);
  else if(typeOf(target) == 'string'){
    if(target.test(/#/i)){ 
      return MooboxContent.cache[target] = new MooboxDomContent(target.substring(target.indexOf('#') + 1), box, title, group);
    } else if(target.test(/\.(png|jpg|jpeg|gif)$/i)){
      return MooboxContent.cache[target] = new MooboxImageContent(target, box, title, group);
    } else if(!target.test(RegExp('^((http:\\/\\/|)' + window.location.hostname + '|\\/)'))) {
      return MooboxContent.cache[target] = new MooboxIframeContent(target, box, title, group);
    } else {
      return MooboxContent.cache[target] = new MooboxAjaxContent(target, box, title, group);
    }
  }
}