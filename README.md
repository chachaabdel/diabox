Diabox
===

![logo](http://files.mikeonrails.com/diabox/img/logo.png)

Diabox is another modal window solution. It provides support for Images, Local HTML, Remote Pages, PDF's, Powerpoints, TIFF's, Youtube Videos, Vimeo Videos, SWF, Elements, Inline Content, and Raw Text. It's extremely customizable and even allows custom extensions of the provided Renderable interface. Diabox provides you with: Diabox, Diabox.Gallery, and Diabox.Renderable.

How to Use 
---
Just include diabox.js on your page. Diabox is dependent on Element.Measure and Array.Extras (and Drag if you turn it on) which are part of Mootools More.

	<script type="text/javascript" src="/javascripts/mootools.js"></script>
	<script type="text/javascript" src="/javascripts/mootools_more.js"></script>
	<script type="text/javascript" src="/javascripts/diabox.js"></script>


Box Creation
---
Diabox does not create a global object because it's intended to be very customizable. So it's up to you to create the Diabox object. Once created however, all links are analyzed, all events are attached, and all required DOM structures are created. Initializing the Diabox is as easy as:

	<script type="text/javascript">
		window.addEvent('domready', function(){ window.diabox = new Diabox({gallery : {enabled : true}}); });
	</script>

Links
---
If you want links on your page to be noticed by Diabox just set their *rel* attribute to *diabox* or *lightbox*. So if I wanted some content to be loaded and displayed in the Diabox I would do:

	<a href="http://www.google.com" rel="diabox">Don't believe me, Google it!</a>

Galleries
---
If you want to display galleries it's as easy as adding a [gallery_name] to the *rel*. The galleries are ordered based on dom traversal. Galleries work for all content types, as long as it's wrapped by the Renderable interface. The gallery names *cannot* start with a number.

	<a href="/images/a.png" rel="diabox[examples]"><img src="/images/a.png" /></a>
	<a href="/images/b.png" rel="diabox[examples]"><img src="/images/b.png" /></a>
	<a href="/images/c.png" rel="diabox[examples]"><img src="/images/c.png" /></a>
	<a href="/images/d.png" rel="diabox[examples]"><img src="/images/d.png" /></a>


Titles
---
The titles on links are passed to the renderable and displayed when the content is shown. Titles can be turned off if you'd prefer but it's very useful to show them as captions.

	<a href="/images/a.png" rel="diabox[examples]" title="Some Awesome [A]"><img src="/images/a.png" /></a>

Custom Dimensions
---
Custom dimensions can be passed in the *rel*. They are defined with a similar syntax to galleries except you provide the width and height. The syntax is rel="diabox[widthxheight]". The width and the height are optional meaning you can override the width and leave the height blank if you'd like. Currently dimensions do not determine best fit or anything like that so make sure you're careful when using this on images or proportional content.

	<a href="/images/a.png" rel="diabox[200x150]"><img src="/images/a.png" /></a>
	<a href="/images/b.png" rel="diabox[examples][200x150]"><img src="/images/b.png" /></a>
	<a href="/images/c.png" rel="diabox[examples][200x]"><img src="/images/c.png" /></a>       // only mods the width
	<a href="/images/d.png" rel="diabox[examples][x150]"><img src="/images/d.png" /></a>       // only mods the height

Inline Content
---
Diabox allows you to display inline content without modifying the page at all. Inline content is referenced via id's but the id is not included in the clone. Make sure any css styles reference classes on the element and not the id. To reference an idea just do so in the link target:

	<a href="#id_of_element" rel="diabox">Show some content on this page</a>

Dynamic Content
---
Dynamic content can be displayed using the *reveal* method. It can handle any content that can be mapped to a renderable. So you can pass urls, ids, text content, ids (#id), etc. A second, optional argument is the title that's used for the provided content.

	<script type="text/javascript">
		diabox.reveal("#some_element", "Some Element");
		diabox.reveal("http://www.google.com", "Google");
		diabox.reveal("This is some text content I want displayed.");
	</script>

Options
---
Diabox gives you a multitude of options. Rather than explaining each and every one, here's a copy of the source:

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
        apply_gallery_class : true,             // when a gallery is applied should the gallery name be added to the box
        apply_title_class : true
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
        parent : null,                          // the parent element of the title (id or element)
        box_class : 'with_title'
      },                                      
      overlay : {                             
        id : 'diabox_overlay',                  // id of the overlay
        fade_duration : 400,                    // amount of time for the overlay to fade in
        opacity : 0.7,                          // the end opacity of the overlay
        transition : Fx.Transitions.Sine.easeOut, // the transition to use when the overlay is appearing
        click_to_close : true
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
      swf : {                                   
        width : 500,                            // the default width of swf content
        height : 300,                           // the default height of swf content
        bg_color : '#000000'                    // the default background color of swf content
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
        show_play : false,                      // display the play button when a gallery is available
        enable_shortcuts : true,                // allow keyboard shortcuts, by default only ESC is implemented
        key_command : null,                     // function to call when a key command (not ESC) is fired. return false to stop propogation
        classes : 'diabox_control',             // class that's added to all control elements (prev, next, close, play)
        disabled_class : 'diabox_disabled',     // the class that's added to control elements when they should be disabled
        parent : null                           // the parent of the control elements, by default the modal window
      }
    }

Creating Your Own Renderable
---
The renderable interface wraps any content applied to the box. It also allows you to create and register your own renderable objects, essentially giving you the ability to render any type of content not currently supported. If you create your own renderable you'll need to do a few things for the Diabox to see it. First, you'll have to implement the Diabox.Renderable class.

	Diabox.MyCustomRenderable = new Class({
		Extends : Diabox.Renderable,
		render : function(){
 			if(!this.retrieved()){
				var e = new Element('div').set('html', this.target);
				this.set_content(e);
			}
		}
	});

There's a few things to note about this Renderable class. The only method you should be overriding is the *render* method. The render method should follow the basic format seen above. If the content has previously been created then it will be cached, enabling instantaneous rendering from then on. This is done within the *retrieved* method. If the retrieved method returns true then a render event has been fired and you should not be modifying the content. If it returns false then you should be setting the content. 

The content passed to the *set_content* method must be 1 or more elements. When the set_content method is called and the elements are properly configured an event is fired and the content will be displayed.

If you need to execute scripts then utilize the *set_scripts* method. They will be executed after the content is displayed, allowing you to reference elements within the applied content. Here's the AjaxRenderable as an example:

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


Registering Your Renderable
---

Once you've created your renderable class you must register it with the Diabox instance. To register it you just call the *register_renderable* method with the renderable key and the class:

	diabox.register_renderable('my_custom_key', Diabox.MyCustomRenderable);

Calling Your Renderable
---
The last step is to create a parser function that handles converting a target to your renderable key. The parser function is called prior to default evaluation. The parser is passed the target (which could be anything) and should return a renderable key. Here's the parser included in the diabox source:

	parse_target : function(target){
		var key = null;
		if(this.options.parser) key = this.options.parser(target);
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
	}
	
	
Screenshots
---

![Screenshot 1](http://files.mikeonrails.com/diabox/img/screenshot1.png)
![Screenshot 2](http://files.mikeonrails.com/diabox/img/screenshot2.png)
![Screenshot 3](http://files.mikeonrails.com/diabox/img/screenshot3.png)