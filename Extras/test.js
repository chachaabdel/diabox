window.addEvent("domready", function(){
  suite();
});


function suite(){
  window.successes = window.failures = 0;
  window.suite_methods = ['initialize', 'creates_dom', 'finds_links', 'displays', 'adds_loading_class', 'displays_image', 
    'hides_gallery_controls', 'modal_hides_on_overlay_click', 'width_and_height_alterations', 'width_and_height_alterations_with_galleries',
    'width_alterations', 'height_alterations', 'gallery_initializes', 'gallery_plays', 'gallery_stops',
    'close_button_works', 'detects_resize', 'dragging_works', 'adds_class_names', 'adds_gallery_names', 'tests_all_content_types', 'show_results'].reverse();
}

function next(){
  var method = window.suite_methods.pop();
  if(method)
    window[method]();
}

function delay(fn, ms){
  setTimeout(fn, ms || window.diabox_delay);
}

function show_and_click(id){
  $(id).setStyle('display', 'block').fireEvent('click').setStyle('display:none');
}

function initialize(){
  try{
    window.diabox = new Diabox({box : {draggable : true},
                                    gallery : {slideshow_duration : 2000}});
    window.diabox_delay = (diabox.options.box.fade_duration + diabox.options.box.content_fade_duration)*2;
    result(true, 'Diabox Integrated Properly');
  } catch(e){
    result(false, 'Diabox Integrated Properly');
  }
  next();
}

function creates_dom(){
  result($(diabox.options.overlay.id), "Overlay Initialization")
  result($(diabox.options.box.id), "Modal Window Initialization")
  next();
}

function finds_links(){
  result(diabox.links.length > 0, "Finds links on page");
  next();
}

function displays(){
  diabox.set_loading();
  delay(function(){
    result($(diabox.options.overlay.id).getStyle('display') != 'none', "Overlay is visible");
    result($(diabox.options.box.id).getStyle('display') != 'none', 'Modal Window is visible');
    next();
  });
}

function adds_loading_class(){
  result($(diabox.options.box.id).hasClass(diabox.options.box.loading_class), 'Adds Loading Class');
  next();
}

function displays_image(){
  show_and_click('image_test');
  delay(function(){
    result(diabox.content().getChildren('img').length > 0, "Image displays");
    next(); 
  });
}

function hides_gallery_controls(){
  result(!diabox.box().hasClass(diabox.options.gallery.box_class), "Gallery class not added to box");
  [diabox.next(), diabox.prev(), diabox.play()].each(function(control){
    result(control.getStyle('display') == 'none', "Hides " + control.id + " when not showing a gallery");
  });
  next();
}

function modal_hides_on_overlay_click(){
  $(diabox.options.overlay.id).fireEvent('click');
  delay(function(){
    result(diabox.box().getStyle('display') == 'none', 'Diabox hides when overlay is clicked.');
    result(diabox.overlay().getStyle('display') == 'none', "Diabox overlay hides when overlay is clicked.");
    next();
  });
}

function width_and_height_alterations(){
  show_and_click('image_test');
  delay(function(){
    result(!!diabox.current_content.override_width && !!diabox.current_content.override_height, '[widthxheight] syntax evaluates properly without galleries');
    next();
  });
}

function width_and_height_alterations_with_galleries(){
  show_and_click('image_test2');
  delay(function(){
    result(!!diabox.current_content.override_width && !!diabox.current_content.override_height, '[widthxheight] syntax evaluates properly with galleries');
    next();
  });
}

function width_alterations(){
  show_and_click('image_test3');
  delay(function(){
    result(!!diabox.current_content.override_width && !diabox.current_content.override_height, '[widthx] syntax evaluates properly');
    next();
  });
}

function height_alterations(){
  show_and_click('image_test4');
  delay(function(){
    result(!diabox.current_content.override_width && !!diabox.current_content.override_height, '[xheight] syntax evaluates properly');
    next();
  });
}

function gallery_initializes(){
  show_and_click('image_test2');
  delay(function(){
    result(!!diabox.current_content.gallery, "Gallery initialized in memory");
    result(diabox.play().getStyle('display') != 'none', "Play button is visible");
    next();
  });
}

function gallery_plays(){
  $(diabox.options.controls.play_id).fireEvent('click');
  delay(function(){
    result(diabox.current_content.gallery.playing(), "Play button should start the slideshow.");
    next();
  });
}

function gallery_stops(){
  delay(function(){
    $(diabox.options.controls.play_id).fireEvent('click');
    result(!diabox.current_content.gallery.playing(), "Stop button should stop the slideshow.");
    next();
  }, diabox.options.gallery.slideshow_duration);
}

function close_button_works(){
  $(diabox.close().fireEvent('click'));
  delay(function(){
    result(diabox.box().getStyle('display') == 'none', "Close button closes the modal.");
    next();
  });
}

function detects_resize(){
  show_and_click('image_test');
  delay(function(){
    diabox.reveal('<p style="text-align:center;padding:10px;margin:0;">Please resize your browser then click this:<br /><a href="#" onclick="finish_resize_test();return false;">done resize</a></p>');
    delay(function(){window.diabox_old_location = diabox.box().getPosition();});
  });
}

function finish_resize_test(){
  var new_location = diabox.box().getPosition();
  result(diabox_old_location.x != new_location.x, 'Detects window resize.');
  diabox.hide()
  delay(next);
}

function dragging_works(){
  diabox.reveal('<p style="text-align:center;padding:10px;margin:0;">Please try to drag the dialog.<br />Then click <a href="#" onclick="assess_dragging();return false;">here</a>.</p>');
  delay(function(){
    window.diabox_old_location = diabox.box().getPosition();
    result(diabox.box().hasClass(diabox.options.box.draggable_class), "Draggable class added to box");
  });
}

function assess_dragging(){
  var new_location = diabox.box().getPosition();
  result(diabox_old_location.x != new_location.x || diabox_old_location.y != new_location.y, 'Drags properly.');
  diabox.hide();
  delay(next);
}

function adds_class_names(){
  show_and_click('image_test');
  delay(function(){
    result(diabox.box().hasClass('image'), "Class names are added to box");
    diabox.hide();
    delay(next);
  });
}

function adds_gallery_names(){
  show_and_click('image_test2');
  delay(function(){
    result(diabox.box().hasClass('demo'), "Gallery names are added to box");
    diabox.hide();
    delay(next);
  });
}

function tests_all_content_types(){
  var timeout = diabox_delay * -3;
  [['http://files.mikeonrails.com/diabox/img/logo.png','image'],
  [(window.location + '#hidden_content'), 'inline'],
  [new Element('div').set('html', '<h2>Completely new element</h2>'), 'element'],
  ['http://www.google.com', 'remote'],
  ['http://www.youtube.com/watch?v=txqiwrbYGrs', 'youtube'],
  ['http://www.vimeo.com/15952335', 'vimeo'],
  ['http://www.samplepdf.com/sample.pdf', 'http://www.chicopee.mec.edu/pages/Excel%20-%20PPoint%20workshop/PPoint%20samples/Company%20Meeting.ppt',
  'http://www.fileformat.info/format/tiff/sample/3794038f08df403bb446a97f897c578d/CCITT_1.TIF', 'gdoc'],
  ['http://files.mikeonrails.com/diabox/img/ClearExternalNoVol.swf', 'swf'],
  ["Some inline text", 'text']].each(function(test){
    var looking_for = test.pop();
    test.each(function(target){
      delay(function(){
        diabox.reveal(target, null);
        delay(function(){
          result(diabox.box().hasClass(looking_for), "Has correct content type (" +  looking_for + ")");
        })
      }, timeout += diabox_delay * 3);
    })
  });
  delay(next, timeout + diabox_delay * 3);
}

function show_results(){
  diabox.reveal('<p style="text-align:center;padding:20px;font-size:1.5em;color:#444;margin:0;">Thanks for testing the Diabox plugin. The results were as follows:<br /><br /><strong>' + successes + ' successes</strong><br />' + failures + ' failures</p>', 'Test Results');
}




function result(bool, test){
  $('results').grab(new Element('li').addClass(bool ? 'passed' : 'failed').adopt([
    new Element('strong').set('html', test),
    new Element('em').set('html', bool ? 'passed' : 'failed')]));
  if(bool) 
    successes++;
  else
    failures++;
    
  return bool;
}






