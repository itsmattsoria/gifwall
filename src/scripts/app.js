import imagesLoaded from 'imagesloaded';

export default class App {
  static defaults = {
    limit: 100,
    gifSize: 'downsized', // Options: original (largest), downsized_large, downsized
    loadCount: 3,
    testing: false,
  };

  constructor(element, options) {
    this.element = element;
    this.options = { ...App.defaults, ...options };
    this.gifs = [];
    this.interval = null;
    this.apiURL = null;

    this.init();
  }

  init() {
    document.body.classList.add('loaded');
    this.createChildRefs().enable();
  }

  createChildRefs() {
    this.staging = document.querySelector('[data-staging]');
    this.rotator = document.querySelector('[data-rotator]');
    this.controls = document.querySelector('[data-controls]');
    this.controlsClose = this.controls.querySelector('[data-controls-close]');
    this.controlsForm = this.controls.querySelector('[data-controls-form]');

    return this;
  }

  enable() {
    if (this.options.testing === true) {
      document.body.classList.add('testing');
    }

    this.initControls();
    window.addEventListener('keyup', e => {
      if (e.key === 'Escape') {
        // Close Controls
        this.hideControls();
      }
    });

    return this;
  }

  parseUrl() {
    // Get Search Terms from URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('q');
    if (searchTerm) {
      hideControls();
      const termId = searchTerm.replace(/\+/g, '');
      // Fire it up!
      this.staging.id = termId;
      this.buildRotator(searchTerm, 'pg', 3500);
    }
  }

  enterFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    }
  }

  exitFullScreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }

  // Pick a random gif from the rotator and make it the current gif
  gifRotation() {
    this.rotator = document.querySelector('[data-rotator]');
    const gifs = this.rotator.querySelectorAll('img');
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    this.rotator.querySelector('img.current').classList.remove('current');
    randomGif.classList.add('current');
  }

  runRotator(delayTime) {
    this.interval = setInterval(this.gifRotation, delayTime);
  }

  // Add a loading spinner
  showSpinner() {
    this.rotator.insertAdjacentHTML(
      'afterbegin',
      '<div class="spinner"></div>'
    );
  }

  // Remove the loading spinner
  hideSpinner() {
    const spinner = this.rotator.querySelector('.spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  // Build the API URL
  buildApiURL(searchTerm, rating) {
    this.apiURL =
      'https://api.giphy.com/v1/gifs/search?q=' +
      searchTerm +
      '&limit=' +
      this.options.limit +
      '&rating=' +
      rating +
      '&api_key=5nOwP2xmE5kzeVezjD6x9Yj1IfHs1PH5';
    return this.apiURL;
  }

  // Use the giphy API to build the array of gifs
  buildGifsArray(apiURL, searchTerm, delayTime) {
    this.showSpinner();
    this.rotator.classList.add('-loading');
    // Empty out the gifs array
    this.gifs = [];
    // Call the API
    fetch(apiURL, {
      method: 'GET',
      redirect: 'follow',
    })
      .then(response => response.json())
      .then(data => {
        // Build the gifs array
        data.data.forEach(gif => {
          this.gifs.push(gif.images[this.options.gifSize].url);
        });
        // Append the new gifs to the rotator
        this.appendNewGifs(this.gifs, searchTerm);
        // let termId = searchTerm.replace(/\+/g, '');
        // this.staging = document.querySelector(`#${termId}`);
        const stagingImages = imagesLoaded(this.staging);
        stagingImages
          .on('progress', (imgLoad, image) => {
            this.rotator.append(image.img);
            // Wait until at least X images are loaded
            if (imgLoad.progressedCount === this.options.loadCount) {
              // Run the rotator!
              this.runRotator(delayTime);
              this.hideSpinner();
              this.rotator.classList.remove('-loading');
            }
          })
          .on('fail', () => {
            this.rotator
              .querySelector(`img[data-term="${searchTerm}"]`)
              .remove();
            return;
          });
      });
  }

  appendNewGifs(gifs, searchTerm) {
    // Add new gifs to the rotator
    for (let i = 0; i < gifs.length; i++) {
      let gifClass = '';
      if (i === 0) {
        gifClass = ' class="current"';
      }
      const staging = this.element.querySelector('[data-staging]');
      staging.insertAdjacentHTML(
        'beforeend',
        `<img src="${this.gifs[i]}" alt="${searchTerm} Gif" ${gifClass} data-term="${searchTerm}">`
      );
    }
  }

  buildRotator(searchTerm, rating, delayTime) {
    let apiURL = this.buildApiURL(searchTerm, rating);
    this.buildGifsArray(apiURL, searchTerm, delayTime);
  }

  // Initialize the controls
  initControls() {
    // Close it up:
    this.controlsClose.addEventListener('click', e => {
      e.preventDefault();
      this.hideControls();
    });
    // Open the controls when you click anywhere
    document.body.addEventListener('click', e => {
      if (
        !e.target.matches('[data-controls]') &&
        !e.target.matches('[data-controls] *')
      ) {
        this.showControls();
      }
    });

    // Form submission
    this.controlsForm.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(this.controlsForm);
      let searchTerm = data.get('searchTerm');
      let rating = data.get('rating');
      let delayTime = data.get('delayTime');
      let layout = data.get('layout');
      const fullscreen = data.get('fullscreen');

      // Replace spaces with '+' for the giphy API
      searchTerm = searchTerm.replace(/\s/g, '+');

      // Defaults
      if (delayTime === '') {
        delayTime = 3500;
      } else {
        // Convert seconds to milliseconds
        delayTime = delayTime * 1000;
      }

      if (searchTerm === '') {
        searchTerm = 'glitch+art';
      }

      if (rating === '') {
        rating = 'pg';
      }

      // If natural ratio layout is chosen
      if (layout === 'natural-ratio') {
        this.rotator.classList.add('natural-ratio');
      } else if (layout === 'fillscreen') {
        this.rotator.classList.remove('natural-ratio');
      }

      const termId = searchTerm.replace(/\+/g, '');

      // Fire it up!
      window.stop();
      clearInterval(this.interval);
      this.staging.innerHTML = '';
      this.staging.id = termId;
      this.rotator.innerHTML = '';
      this.buildRotator(searchTerm, rating, delayTime);

      // Hide the controls
      this.hideControls();
      // Enter Fullscreen if set
      if (fullscreen) {
        this.enterFullScreen();
      }
    });
  }

  showControls() {
    this.controls.classList.add('-active');
    this.controlsForm.querySelector('input').focus();
  }

  hideControls() {
    this.controls.querySelector(':focus').blur();
    this.controls.classList.remove('-active');
  }
}
