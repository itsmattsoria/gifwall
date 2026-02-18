import imagesLoaded from 'imagesloaded';

export default class App {
  static defaults = {
    limit: 100,
    gifSize: 'downsized', // Options: original (largest), downsized_large, downsized
    loadCount: 2,
    testing: false,
  };

  constructor(element, options) {
    this.element = element;
    this.options = { ...App.defaults, ...options };
    this.gifs = [];
    this.interval = null;
    this.abortController = null;
    this.loadingTextMessages = [];
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
    const gifs = this.rotator.querySelectorAll('img');
    if (gifs.length === 0) return;

    const currentGif = this.rotator.querySelector('img.current');
    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];

    if (currentGif) {
      currentGif.classList.remove('current');
    }
    randomGif.classList.add('current');
  }

  runRotator(delayTime) {
    this.interval = setInterval(() => this.gifRotation(), delayTime);
  }

  // Add a loading spinner
  showSpinner() {
    this.rotator.insertAdjacentHTML(
      'afterbegin',
      `<div id="loading-indicator" class="loading-indicator">
        <div class="loading-indicator-inner">
          <div class="spinner"></div>
          <div class="loading-text" id="loading-text">Gathering gifs...</div>
        </div>
      </div>`
    );
    this.loadingText = this.rotator.querySelector('#loading-text');

    this.loadingTextMessages.push(
      setTimeout(() => {
        this.loadingText.textContent = 'Still gathering...';
      }, 3000)
    );

    this.loadingTextMessages.push(
      setTimeout(() => {
        this.loadingText.textContent =
          'Hmm...this is taking longer than expected...';
      }, 6000)
    );

    this.loadingTextMessages.push(
      setTimeout(() => {
        this.loadingText.textContent =
          "Are you sure you're connected to the internet?";
      }, 8000)
    );

    this.loadingTextMessages.push(
      setTimeout(() => {
        this.loadingText.textContent = 'Okay, any moment now...';
      }, 10000)
    );
  }

  // Remove the loading spinner
  hideSpinner() {
    const spinner = this.rotator.querySelector('#loading-indicator');
    if (spinner) {
      spinner.remove();

      for (let i = 0; i < this.loadingTextMessages.length; i++) {
        window.clearTimeout(this.loadingTextMessages[i]);
      }
      this.loadingTextMessages.length = 0;
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

  // Fetch with automatic retry to handle CORS-blocked 425 (Too Early) responses.
  // The Giphy API sometimes rejects TLS 0-RTT early data with a 425 that lacks
  // CORS headers, causing the browser to throw a network error instead of
  // exposing the status code. Retrying after a short delay resolves the issue.
  fetchWithRetry(url, options, retriesLeft = 3) {
    return fetch(url, options).catch(error => {
      if (error.name === 'AbortError' || retriesLeft <= 0) {
        throw error;
      }
      return new Promise(resolve => setTimeout(resolve, 500)).then(() =>
        this.fetchWithRetry(url, options, retriesLeft - 1)
      );
    });
  }

  // Use the giphy API to build the array of gifs
  buildGifsArray(apiURL, q, delayTime) {
    // Abort any in-flight fetch before starting a new one
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    this.showSpinner();
    this.rotator.classList.add('-loading');
    // Empty out the gifs array
    this.gifs = [];
    // Call the API
    this.fetchWithRetry(apiURL, {
      method: 'GET',
      redirect: 'follow',
      signal: this.abortController.signal,
    })
      .then(response => response.json())
      .then(data => {
        // Build the gifs array
        data.data.forEach(gif => {
          this.gifs.push(gif.images[this.options.gifSize].url);
        });
        // Append the new gifs to the rotator
        this.appendNewGifs(this.gifs, q);
        const stagingImages = imagesLoaded(this.staging);
        stagingImages
          .on('progress', (imgLoad, image) => {
            this.rotator.append(image.img);
            // Wait until at least X images are loaded
            if (imgLoad.progressedCount === this.options.loadCount) {
              // Run the rotator!
              this.runRotator(delayTime);
              setTimeout(() => {
                this.hideSpinner();
                this.rotator.classList.remove('-loading');
              }, delayTime);
            }
          })
          .on('fail', () => {
            this.rotator.querySelector(`img[data-term="${q}"]`).remove();
            return;
          });
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch gifs:', error);
        this.hideSpinner();
        this.rotator.classList.remove('-loading');
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
