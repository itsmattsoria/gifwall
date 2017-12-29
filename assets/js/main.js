var Main = (function($) {

  var $document,
      apiUrl,
      gifs = [],
      limit = 100,
      size = 'downsized', // Options: original (largetst), downsized_large, downsized
      loadCount = 3,
      $rotator,
      stagingImages,
      $controls,
      $controlsClose,
      $controlsForm,
      interval,
      testing = false;

  function _init() {
    // Cache some common DOM queries
    $document = $(document);
    $('body').addClass('loaded');
    $rotator = $('.rotator');
    $controls = $('.controls');
    $controlsClose = $controls.find('.close');
    $controlsForm = $('#controlsForm');

    // Testing
    // testing = true;
    if (testing === true) {
      $('body').addClass('testing');
    }

    // Init functions
    initControls();

    // Esc handlers
    $(document).keyup(function(e) {
      if (e.keyCode === 27) {
        // Close Controls
        hideControls();
      }
    });

  } // end init()

  function enterFullScreen(elem) {
    elem = elem || document.documentElement;
    if (!document.fullscreenElement && !document.mozFullScreenElement &&
      !document.webkitFullscreenElement && !document.msFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    }
  }

  function exitFullScreen(elem) {
     if (document.exitFullscreen) {
       document.exitFullscreen();
     } else if (document.msExitFullscreen) {
       document.msExitFullscreen();
     } else if (document.mozCancelFullScreen) {
       document.mozCancelFullScreen();
     } else if (document.webkitExitFullscreen) {
       document.webkitExitFullscreen();
     }
  }

  // Pick a random gif from the array and replace the img src
  function gifRotation() {
    var $gifs = $rotator.find('img');
    var randomGif = Math.floor(Math.random() * $gifs.length - 1 ) + 1;
    $rotator.find('img.current').removeClass('current');
    $gifs.eq(randomGif).addClass('current');
  }

  function runRotator(delayTime) {
    interval = setInterval(gifRotation, delayTime);
  }

  // Add a loading spinner
  function showSpinner() {
    $rotator.prepend('<div class="spinner"></div>');
  }
  // Get rid of it!
  function hideSpinner() {
    $('.spinner').remove();
  }

  // Put together the api url
  function buildApiUrl(searchTerm, rating) {    
    apiUrl = 'https://api.giphy.com/v1/gifs/search?q=' + searchTerm + '&limit=' + limit + '&rating=' + rating + '&api_key=5nOwP2xmE5kzeVezjD6x9Yj1IfHs1PH5';
    return apiUrl;
  }

  // Use the giphy api to build the array of gifs
  function buildGifsArray(apiUrl, searchTerm, delayTime) {
    showSpinner();
    $rotator.addClass('-loading');
    // Empty out the gifs array
    gifs = [];
    // Call the API
    $.get(apiUrl, function() {
    }).done(function(response) {
      for (var i = 1;i <= response.data.length - 1;i++) {
        gifs.push(response.data[i].images[size].url);
      }
      gifs.sort(function() { return 0.5 - Math.random(); });
      appendNewGifs(gifs, searchTerm);
      var termId = searchTerm.replace(/\+/g, '');
      $staging = $('#'+termId);
      stagingImages = imagesLoaded($staging);
      stagingImages.on('progress', function(imgLoad, image) {
        $(image.img).appendTo($rotator);
        // Wait until at least X images are loaded
        if (imgLoad.progressedCount === loadCount) {
          // Run the rotator!
          runRotator(delayTime);
          hideSpinner();
          $rotator.removeClass('-loading');
        }
      }).on('fail', function(instance) {
        $rotator.find('img[data-term="'+searchTerm+'"]').remove();
        return;
      });
    });
  }

  function appendNewGifs(gifs, searchTerm) {
    for (i=0;i<gifs.length;i++) {
      var firstGif = '';
      if (i===0) {
        firstGif = ' class="current"';
      }
      $('.staging').append('<img src="'+gifs[i]+'"'+firstGif+' data-term="'+searchTerm+'">');
    }
  }

  function buildRotator(searchTerm, rating, delayTime) {
    var apiUrl = buildApiUrl(searchTerm, rating);
    buildGifsArray(apiUrl, searchTerm, delayTime);
  }

  function initControls() {
    
    // Close it up:
    $controlsClose.on('click', function() {
      hideControls();
    });
    // Open the controls when you click anywhere
    $(document).on('click', function(e) {
      if (!$(e.target).parents('.controls').length && !$controls.is('.-active')) {
        showControls();
      }
    });
    
    $controlsForm.submit(function(e) {
      e.preventDefault();
      var data = $(this).serializeArray();
      
      var searchTerm = data[0].value,
          rating = data[1].value,
          delayTime = data[2].value,
          layout = data[3].value;

      var fullscreen = data.length === 5;
      
      // Replace spaces with '+' for the giphy API
      searchTerm = searchTerm.split(' ').join('+');

      // Defaults
      if (delayTime === '') { 
        delayTime = 3500; 
      } else {      
        // Convert seconds to milliseconds
        delayTime *= 1000;
      }
      if (searchTerm === '') { searchTerm = 'glitch+art'; }
      if (rating === '') { rating = 'pg'; }
      
      // if natural ratio layout is chosen
      if (layout === 'natural-ratio') {
        $rotator.addClass('natural-ratio');
      } else if (layout === 'fillscreen') {
        $rotator.removeClass('natural-ratio');
      }

      var termId = searchTerm.replace(/\+/g, '');

      // Fire it up!
      window.stop();
      clearInterval(interval);
      $('.staging').remove();
      $('body').prepend('<div class="staging hidden" id="'+termId+'"></div>');
      $rotator.empty();
      buildRotator(searchTerm, rating, delayTime);
      
      // Hide the controls
      hideControls();
      // Toggle fullscreen mode
      if (fullscreen === true) {
        enterFullScreen();
      } else {
        exitFullScreen();
      }
    });

  }

  // Controls
  function toggleControls() {
    $controls.toggleClass('-active');
  }
  function showControls() {
    $controls.addClass('-active');
    $controls.find('input').first().focus();
  }
  function hideControls() {
    $controls.removeClass('-active');
  }

  // Track ajax pages in Analytics
  function _trackPage() {
    if (typeof ga !== 'undefined') { ga('send', 'pageview', document.location.href); }
  }

  // Track events in Analytics
  function _trackEvent(category, action) {
    if (typeof ga !== 'undefined') { ga('send', 'event', category, action); }
  }

  // Public functions
  return {
    init: _init
  };

})(jQuery);

// Fire up the mothership
jQuery(document).ready(Main.init);

// Zig-zag the mothership
jQuery(window).resize(Main.resize);
