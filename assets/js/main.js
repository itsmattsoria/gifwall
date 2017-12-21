var Main = (function($) {

  var $document,
      loadingTimer;

  function _init() {
    // Cache some common DOM queries
    $document = $(document);
    $('body').addClass('loaded');

    // Init functions
    _initControls();

    // Esc handlers
    $(document).keyup(function(e) {
      if (e.keyCode === 27) {

      }
    });

  } // end init()

  function _initControls() {
    
    // Setup some vars
    var apiUrl,
        gifs = [],
        limit = 100,
        size = 'downsized', // Options: original (largetst), downsized_large, downsized
        $rotator = $('.rotator'),
        $controls = $('.controls'),
        $controlsClose = $controls.find('.close'),
        $controlsForm = $('#controlsForm');
    
    // Add a blank img to the rotator
    $rotator.append('<img src="" class="hidden">');
    var $img = $rotator.find('img');
    // Pick a random gif from the array and replace the img src
    function gifRotation() {
      var randomGif = Math.floor(Math.random() * gifs.length - 1 ) + 1;
      $img.attr('src', gifs[randomGif]);
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
    function buildGifsArray(apiUrl) {
      showSpinner();
      // Empty out the gifs array
      gifs = [];
      // Call the API
      $.get(apiUrl, function() {
      }).done(function(response) {
        hideSpinner();
        for (var i = 1;i <= response.data.length - 1;i++) {
          gifs.push(response.data[i]["images"][size]["url"]);
        }
      });
    }
    
    // Controls
    function toggleControls() {
      $controls.toggleClass('-active');
    }
    function showControls() {
      $controls.addClass('-active');
    }
    function hideControls() {
      $controls.removeClass('-active');
    }
    // Close it up:
    $controlsClose.on('click', function() {
      hideControls();
    });
    // Close when hitting the esc key too!
    $(document).keyup(function(e) {
      if (e.keyCode === 27) {
        hideControls();
      }
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
      
      var searchTerm = data[0]['value'],
          rating = data[1]['value'],
          delayTime = data[2]['value'],
          layout = data[3]['value'];
      
      // Replace spaces with '+' for the giphy API
      searchTerm = searchTerm.split(' ').join('+');
      
      // Defaults
      if (delayTime === '') { 
        delayTime = 3500; 
      } else {      
        // Convert seconds to milliseconds
        delayTime = delayTime * 1000;
      }
      if (searchTerm === '') { searchTerm = 'glitch+art'; }
      if (rating === '') { rating = 'pg'; }
      
      // if natural ratio layout is chosen
      if (layout === 'natural-ratio') {
        $rotator.addClass('natural-ratio');
      } else if (layout === 'fullscreen') {
        $rotator.removeClass('natural-ratio');
      }
      
      // Fire it up!
      $img.removeClass('hidden');
      var apiUrl = buildApiUrl(searchTerm, rating);
      buildGifsArray(apiUrl);
      gifRotation();
      setInterval(gifRotation, delayTime);
      
      // Hide the controls
      hideControls();
    });

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
