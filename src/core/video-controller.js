/**
 * Video Controller class for managing individual video elements
 * Modular architecture using global variables
 */

window.VSC = window.VSC || {};

class VideoController {
  constructor(target, parent, config, actionHandler) {
    // Return existing controller if already attached
    if (target.vsc) {
      return target.vsc;
    }

    this.video = target;
    this.parent = target.parentElement || parent;
    this.config = config;
    this.actionHandler = actionHandler;
    this.controlsManager = new window.VSC.ControlsManager(actionHandler, config);

    this.manualEdit = false;

    // Add to tracked media elements
    config.addMediaElement(target);

    // Initialize speed asynchronously
    this.initializeSpeed();

    // Create UI
    this.div = this.initializeControls();

    // Set up event handlers
    this.setupEventHandlers();

    // Ensure manualEdit starts as false after initialization
    this.manualEdit = false;

    // Set up mutation observer for src changes
    this.setupMutationObserver();

    // Attach controller to video element
    target.vsc = this;

    window.VSC.logger.info('VideoController initialized for video element');
  }

  /**
   * Initialize video speed based on settings
   * @private
   */
  initializeSpeed() {
    let targetSpeed = 1.0;

    // Check if we should use per-video stored speeds
    const videoSrc = this.video.currentSrc || this.video.src;
    const storedVideoSpeed = this.config.settings.speeds[videoSrc];

    if (this.config.settings.rememberSpeed) {
      if (storedVideoSpeed) {
        window.VSC.logger.debug(`Using stored speed for video: ${storedVideoSpeed}`);
        targetSpeed = storedVideoSpeed;
      } else if (this.config.settings.lastSpeed) {
        window.VSC.logger.debug(`Using lastSpeed: ${this.config.settings.lastSpeed}`);
        targetSpeed = this.config.settings.lastSpeed;
      }

      // Reset speed isn't really a reset, it's a toggle to stored speed
      this.config.setKeyBinding('reset', targetSpeed);
    } else {
      // When rememberSpeed is disabled, use random speed instead of 1.0
      const presetSpeeds = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];
      const randomIndex = Math.floor(Math.random() * presetSpeeds.length);
      targetSpeed = presetSpeeds[randomIndex];

      window.VSC.logger.debug(`Random speed selected: ${targetSpeed}`);
      // Reset speed toggles to fast speed when rememberSpeed is disabled
      this.config.setKeyBinding('reset', this.config.getKeyBinding('fast'));
    }

    window.VSC.logger.debug(`Setting initial playbackRate to: ${targetSpeed}`);

    // Apply the speed immediately if forceLastSavedSpeed is enabled
    if (this.config.settings.forceLastSavedSpeed && targetSpeed !== 1.0) {
      this.setVideoSpeed(targetSpeed);
    } else {
      // Set the speed immediately and also set up event listeners for when video loads
      this.setVideoSpeed(targetSpeed);

      // Also set up listeners to ensure speed is applied when video becomes ready
      this.setupSpeedListeners(targetSpeed);
    }
  }

  /**
   * Set video speed with error handling
   * @param {number} speed - Target playback speed
   * @private
   */
  setVideoSpeed(speed) {
    try {
      this.video.playbackRate = speed;
      window.VSC.logger.debug(`Set video playback rate to: ${speed}x`);
    } catch (error) {
      window.VSC.logger.debug(`Failed to set playback rate immediately: ${error.message}`);
    }
  }

  /**
   * Set up event listeners to ensure speed is applied when video becomes ready
   * @param {number} targetSpeed - Target playback speed
   * @private
   */
  setupSpeedListeners(targetSpeed) {
    const applySpeed = () => {
      this.setVideoSpeed(targetSpeed);
    };

    // Store the target speed for later use
    this.targetSpeed = targetSpeed;

    // Apply speed when video metadata loads
    if (this.video.readyState < 1) {
      this.video.addEventListener('loadedmetadata', applySpeed, { once: true });
    }

    // Apply speed when video data loads
    if (this.video.readyState < 2) {
      this.video.addEventListener('loadeddata', applySpeed, { once: true });
    }

    // Apply speed when video can start playing
    if (this.video.readyState < 3) {
      this.video.addEventListener('canplay', applySpeed, { once: true });
    }
  }

  /**
   * Initialize video controller UI
   * @returns {HTMLElement} Controller wrapper element
   * @private
   */
  initializeControls() {
    window.VSC.logger.debug('initializeControls Begin');

    const document = this.video.ownerDocument;
    const speed = this.video.playbackRate.toFixed(2);
    const position = window.VSC.ShadowDOMManager.calculatePosition(this.video);

    window.VSC.logger.debug(`Speed variable set to: ${speed}`);

    // Create wrapper element
    const wrapper = document.createElement('div');
    wrapper.classList.add('vsc-controller');

    // Set positioning styles but don't force visibility
    wrapper.style.cssText = `
      position: absolute !important;
      z-index: 9999999 !important;
    `;

    if (!this.video.currentSrc) {
      wrapper.classList.add('vsc-nosource');
    }

    if (this.config.settings.startHidden) {
      wrapper.classList.add('vsc-hidden');
    } else {
      // Ensure controller is visible, especially on YouTube
      wrapper.classList.add('vcs-show');
    }

    // Create shadow DOM
    const shadow = window.VSC.ShadowDOMManager.createShadowDOM(wrapper, {
      top: position.top,
      left: position.left,
      speed: speed,
      opacity: this.config.settings.controllerOpacity,
      buttonSize: this.config.settings.controllerButtonSize,
    });

    // Set up control events
    this.controlsManager.setupControlEvents(shadow, this.video);

    // Store speed indicator reference
    this.speedIndicator = window.VSC.ShadowDOMManager.getSpeedIndicator(shadow);

    // Insert into DOM based on site-specific rules
    this.insertIntoDOM(document, wrapper);

    window.VSC.logger.debug('initializeControls End');
    return wrapper;
  }

  /**
   * Insert controller into DOM with site-specific positioning
   * @param {Document} document - Document object
   * @param {HTMLElement} wrapper - Wrapper element to insert
   * @private
   */
  insertIntoDOM(document, wrapper) {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(wrapper);

    // Get site-specific positioning information
    const positioning = window.VSC.siteHandlerManager.getControllerPosition(
      this.parent,
      this.video
    );

    switch (positioning.insertionMethod) {
      case 'beforeParent':
        positioning.insertionPoint.parentElement.insertBefore(fragment, positioning.insertionPoint);
        break;

      case 'afterParent':
        positioning.insertionPoint.parentElement.insertBefore(
          fragment,
          positioning.insertionPoint.nextSibling
        );
        break;

      case 'firstChild':
      default:
        positioning.insertionPoint.insertBefore(fragment, positioning.insertionPoint.firstChild);
        break;
    }

    window.VSC.logger.debug(`Controller inserted using ${positioning.insertionMethod} method`);
  }

  /**
   * Set up event handlers for media events
   * @private
   */
  setupEventHandlers() {
    this.video.addEventListener('ratechange', this.handleRateChange.bind(this), true);
    const mediaEventAction = (event) => {
      // Reset manual edit flag when video starts playing or seeking begins
      // This ensures we start fresh for each video session
      this.manualEdit = false;

      let storedSpeed = this.config.settings.speeds[event.target.currentSrc];

      if (!this.config.settings.rememberSpeed) {
        if (!storedSpeed) {
          window.VSC.logger.info('Overwriting stored speed to 1.0 (rememberSpeed not enabled)');
          storedSpeed = 1.0;
        }
        window.VSC.logger.debug('Setting reset keybinding to fast');
        this.config.setKeyBinding('reset', this.config.getKeyBinding('fast'));
      } else {
        window.VSC.logger.debug('Storing lastSpeed into settings (rememberSpeed enabled)');
        storedSpeed = this.config.settings.lastSpeed;
      }

      window.VSC.logger.info(`Explicitly setting playbackRate to: ${storedSpeed}`);
      this.actionHandler.setSpeed(event.target, storedSpeed);
    };

    // Handle new video loading
    const handleNewVideo = () => {
      this.manualEdit = false; // Reset manual edit flag for new video
      this.applyNewRandomSpeed();
    };

    this.handlePlay = mediaEventAction.bind(this);
    this.handleSeek = mediaEventAction.bind(this);
    this.handleLoadStart = handleNewVideo.bind(this);

    this.video.addEventListener('play', this.handlePlay);
    this.video.addEventListener('seeked', this.handleSeek);
    this.video.addEventListener('loadstart', this.handleLoadStart);
  }

  handleRateChange(event) {
    if (event.detail && event.detail.origin === 'videoSpeed') {
      this.manualEdit = false;
    } else {
      this.manualEdit = true;
    }
  }

  /**
   * Set up mutation observer for src attribute changes
   * @private
   */
  setupMutationObserver() {
    this.targetObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'src' || mutation.attributeName === 'currentSrc')
        ) {
          window.VSC.logger.debug('mutation of A/V element');
          const controller = this.div;
          if (!mutation.target.src && !mutation.target.currentSrc) {
            controller.classList.add('vsc-nosource');
          } else {
            controller.classList.remove('vsc-nosource');
            // Reset manual edit flag when video source changes
            this.manualEdit = false;
            // Apply new random speed when source changes
            this.applyNewRandomSpeed();
          }
        }
      });
    });

    this.targetObserver.observe(this.video, {
      attributeFilter: ['src', 'currentSrc'],
    });
  }

  /**
   * Apply new random speed (for when video source changes)
   * @private
   */
  applyNewRandomSpeed() {
    // Only apply random speed if rememberSpeed is disabled
    if (!this.config.settings.rememberSpeed) {
      const presetSpeeds = [1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3];
      const randomIndex = Math.floor(Math.random() * presetSpeeds.length);
      const targetSpeed = presetSpeeds[randomIndex];

      this.setVideoSpeed(targetSpeed);
      this.setupSpeedListeners(targetSpeed);
    }
  }

  /**
   * Remove controller and clean up
   */
  remove() {
    window.VSC.logger.debug('Removing VideoController');

    // Remove DOM element
    if (this.div && this.div.parentElement) {
      this.div.remove();
    }

    // Remove event listeners
    if (this.handlePlay) {
      this.video.removeEventListener('play', this.handlePlay);
    }
    if (this.handleSeek) {
      this.video.removeEventListener('seeked', this.handleSeek);
    }
    if (this.handleLoadStart) {
      this.video.removeEventListener('loadstart', this.handleLoadStart);
    }

    // Disconnect mutation observer
    if (this.targetObserver) {
      this.targetObserver.disconnect();
    }

    // Remove from tracking
    this.config.removeMediaElement(this.video);

    // Remove reference from video element
    delete this.video.vsc;

    window.VSC.logger.debug('VideoController removed successfully');
  }
}

// Create singleton instance
window.VSC.VideoController = VideoController;

// Global variables available for both browser and testing
