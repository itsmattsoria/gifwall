import imagesLoaded from 'imagesloaded';

export default class App {
  static defaults = {
    limit: 100,
    gifSize: 'downsized', // Options: original (largest), downsized_large, downsized
    loadCount: 3,
    testing: true,
  };

  constructor(element, options) {
    this.element = element;
    this.options = { ...App.defaults, ...options };
    this.gifs = [];
    this.interval = null;
    this.apiKey = this.element.dataset.apiKey;
    this.controlsOpen = true;
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

    this.parseUrl();
    this.initControls();
    window.addEventListener('keyup', e => {
      if (e.key === 'Escape') {
        // Close Controls
        this.hideControls();
      }

      if (e.key === 'x' && !this.controlsOpen) {
        this.removeGif();
      }
    });
  }

  parseUrl() {
    // Get Search Terms from URL
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    const rating = urlParams.get('rating') ?? 'pg13';
    const delayTime = urlParams.get('delayTime') ?? '3.5';

    if (q) {
      const termId = q.replace(/\+/g, '');
      // Fire it up!
      this.staging.id = termId;
      this.controlsForm.querySelector('input[name="q"]').value = q;
      this.controlsForm.querySelector('select[name="rating"]').value = rating;
      this.controlsForm.querySelector('input[name="delayTime"]').value =
        delayTime;
      this.handleFormSubmit();
    }

    return this;
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
  buildApiURL(q, rating) {
    this.apiURL =
      'https://api.giphy.com/v1/gifs/search?q=' +
      q +
      '&limit=' +
      this.options.limit +
      '&rating=' +
      rating +
      '&api_key=' +
      this.apiKey;
    return this.apiURL;
  }

  // Use the giphy API to build the array of gifs
  buildGifsArray(apiURL, q, delayTime) {
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
        this.appendNewGifs(this.gifs, q);
        // let termId = q.replace(/\+/g, '');
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
            this.rotator.querySelector(`img[data-term="${q}"]`).remove();
            return;
          });
      });
  }

  appendNewGifs(gifs, q) {
    // Add new gifs to the rotator
    for (let i = 0; i < gifs.length; i++) {
      let gifClass = '';
      if (i === 0) {
        gifClass = ' class="current"';
      }
      const staging = this.element.querySelector('[data-staging]');
      staging.insertAdjacentHTML(
        'beforeend',
        `<img src="${this.gifs[i]}" alt="${q} Gif" ${gifClass} data-term="${q}">`
      );
    }
  }

  removeGif() {
    const currentGif = this.rotator.querySelector('img.current');
    if (currentGif) {
      let nextGif = currentGif.nextElementSibling;
      if (nextGif) {
        nextGif.classList.add('current');
      } else {
        nextGif = this.rotator.querySelector('img:first-child');
        nextGif.classList.add('current');
      }
      currentGif.remove();
    }
  }

  buildRotator(q, rating, delayTime) {
    let apiURL = this.buildApiURL(q, rating);
    this.buildGifsArray(apiURL, q, delayTime);
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
      this.handleFormSubmit();
    });
  }

  handleFormSubmit() {
    const data = new FormData(this.controlsForm);
    let q = data.get('q') || 'glitch+art';
    let rating = data.get('rating') || 'pg';
    let delayTime = data.get('delayTime') || '3.5';
    let layout = data.get('layout');
    const fullscreen = data.get('fullscreen');

    // Replace spaces with '+' for the giphy API
    q = q.replace(/\s/g, '+');

    // Convert seconds to milliseconds
    const delayTimeConverted = Number(delayTime) * 1000;

    // If natural ratio layout is chosen
    if (layout === 'natural-ratio') {
      this.rotator.classList.add('natural-ratio');
    } else if (layout === 'fillscreen') {
      this.rotator.classList.remove('natural-ratio');
    }

    const termId = q.replace(/\+/g, '');

    // Fire it up!
    window.stop();
    clearInterval(this.interval);
    this.staging.innerHTML = '';
    this.staging.id = termId;
    this.rotator.innerHTML = '';
    this.buildRotator(q, rating, delayTimeConverted);
    this.updateUrl(q, rating, delayTime);

    // Hide the controls
    this.hideControls();
    // Enter Fullscreen if set
    if (fullscreen) {
      this.enterFullScreen();
    }
  }

  updateUrl(q, rating, delayTime) {
    const url = new URL(window.location.href);
    url.searchParams.set('q', q);
    url.searchParams.set('rating', rating);
    url.searchParams.set('delayTime', delayTime);
    window.history.pushState({}, '', url.toString());
  }

  showControls() {
    this.controlsOpen = true;
    document.body.classList.add('controls-open');
    this.controls.classList.add('-active');
    this.controlsForm.querySelector('input').focus();
  }

  hideControls() {
    this.controlsOpen = false;
    document.body.classList.remove('controls-open');
    this.controls.querySelector(':focus')?.blur();
    this.controls.classList.remove('-active');
  }
}
