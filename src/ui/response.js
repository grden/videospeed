/**
 * Speed Detection Research UI
 * Shows interface for users to report when they notice speed changes
 */

window.VSC = window.VSC || {};

class ResponseReceiver {
  constructor() {
    window.VSC.logger.info('ResponseReceiver constructor called');
    this.isYouTube = window.location.hostname.includes('youtube.com');
    this.MainContainer = null;
    this.isVisible = false;

    window.VSC.logger.info('Is YouTube:', this.isYouTube, 'Hostname:', window.location.hostname);
    window.VSC.logger.info('Current URL:', window.location.href);

    if (this.isYouTube) {
      window.VSC.logger.info('Creating UI for YouTube...');
      this.createUI();
      this.insertUI();
      this.setupNavigationWatcher();
    }
  }

  /**
   * Create the detection UI elements
   */
  createUI() {
    // Main container
    this.MainContainer = document.createElement('div');
    this.MainContainer.id = 'vsc-response-receiver';
    this.MainContainer.style.cssText = `
      background: #f2f2f2;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      display: block;
    `;

    // Title
    const title = document.createElement('div');
    title.textContent = '동영상 배속이 변경된 것을 감지하셨나요?';
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
      color: #333;
      font-size: 16px;
    `;

    // Description
    const description = document.createElement('div');
    description.textContent = '어떻게 알아차리셨는지 간단히 알려주세요.';
    description.style.cssText = `
      margin-bottom: 12px;
      color: #606060;
      line-height: 1.4;
    `;

    // Input field
    this.reasonInputField = document.createElement('input');
    this.reasonInputField.type = 'text';
    this.reasonInputField.placeholder = '동작이 부자연스러움, 말의 속도가 원래 알던 속도와 다름';
    this.reasonInputField.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin-bottom: 12px;
      box-sizing: border-box;
      font-size: 14px;
    `;

    // Button container
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    `;

    // Submit button
    const submitButton = document.createElement('button');
    submitButton.textContent = '제출';
    submitButton.style.cssText = `
      background: #1976d2;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    `;

    // Event listeners
    submitButton.addEventListener('click', () => this.submitDetection());
    this.reasonInputField.addEventListener('focus', () => this.pauseVideo());

    // Enter key support
    this.reasonInputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitDetection();
      }
    });

    // Message area for feedback
    this.messageArea = document.createElement('div');
    this.messageArea.style.cssText = `
      margin-bottom: 12px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      display: none;
    `;

    // Assemble UI
    this.buttonContainer.appendChild(submitButton);

    this.MainContainer.appendChild(title);
    this.MainContainer.appendChild(description);
    this.MainContainer.appendChild(this.reasonInputField);
    this.MainContainer.appendChild(this.messageArea);
    this.MainContainer.appendChild(this.buttonContainer);
  }

  /**
   * Insert UI into YouTube page
   */
  insertUI() {
    const insertIntoPage = () => {
      // Only try to insert on video watch pages
      if (!this.isVideoPage()) {
        window.VSC.logger.info('❌ Not a video page, skipping UI insertion');
        return;
      }

      const relatedElement = document.getElementById('related');
      window.VSC.logger.info('Looking for #related element:', relatedElement);

      if (relatedElement && !document.getElementById('vsc-response-receiver')) {
        relatedElement.parentNode.insertBefore(this.MainContainer, relatedElement);
        window.VSC.logger.info('✅ Response receiver UI inserted into YouTube page');

        window.VSC.logger.debug('Response receiver UI inserted into YouTube page');
      } else if (!relatedElement) {
        window.VSC.logger.info('❌ #related element not found, trying alternative insertion');
        // Try inserting into secondary section as fallback
        const secondaryElement = document.querySelector('#secondary');
        if (secondaryElement && !document.getElementById('vsc-response-receiver')) {
          secondaryElement.insertBefore(this.MainContainer, secondaryElement.firstChild);
          window.VSC.logger.info('✅ Response receiver UI inserted into #secondary');
        }
      }
    };

    // Try to insert immediately
    insertIntoPage();

    // Also watch for DOM changes in case YouTube loads content dynamically
    this.insertObserver = new MutationObserver(() => {
      if (!document.getElementById('vsc-response-receiver')) {
        insertIntoPage();
      }
    });

    this.insertObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Check if current page is a YouTube video page
   */
  isVideoPage() {
    return window.location.pathname === '/watch' || window.location.href.includes('/watch');
  }

  /**
   * Setup navigation watcher for YouTube SPA navigation
   */
  setupNavigationWatcher() {
    // Watch for URL changes (YouTube SPA navigation)
    let currentUrl = window.location.href;

    const checkNavigation = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        window.VSC.logger.info('YouTube navigation detected:', currentUrl);

        // Remove existing UI if present
        const existingUI = document.getElementById('vsc-response-receiver');
        if (existingUI) {
          existingUI.remove();
        }

        // Re-insert UI if on video page
        if (this.isVideoPage()) {
          setTimeout(() => this.insertUI(), 1000); // Wait for page to load
        }
      }
    };

    // Check for navigation changes periodically
    setInterval(checkNavigation, 1000);

    // Also listen for popstate events
    window.addEventListener('popstate', checkNavigation);
  }

  /**
   * Pause the video if the reason input field is focused
   */
  pauseVideo() {
    const video = document.querySelector('video');
    if (video) {
      video.pause();
    }
  }

  /**
   * Show message in the UI
   * @param {string} message - Message to show
   * @param {string} type - Message type: 'success', 'error', 'loading'
   */
  showMessage(message, type) {
    if (!this.messageArea) {
      return;
    }

    this.messageArea.textContent = message;
    this.messageArea.style.display = 'block';

    // Set styling based on message type
    switch (type) {
      case 'success':
        this.messageArea.style.cssText += `
          background: #e8f5e8;
          color: #2e7d32;
          border: 1px solid #c8e6c9;
        `;
        setTimeout(() => this.hideMessageArea(), 3000);
        break;
      case 'error':
        this.messageArea.style.cssText += `
          background: #ffebee;
          color: #c62828;
          border: 1px solid #ffcdd2;
        `;
        break;
      case 'loading':
        this.messageArea.style.cssText += `
          background: #e3f2fd;
          color: #1565c0;
          border: 1px solid #bbdefb;
        `;
        break;
    }
  }

  /**
   * Hide the reason input field
   */
  // hideReasonInput() {
  //   if (this.reasonInputField) {
  //     this.reasonInputField.style.display = 'none';
  //   }
  // }

  /**
   * Hide the message area
   */
  hideMessageArea() {
    if (this.messageArea) {
      this.messageArea.style.display = 'none';
    }
  }

  /**
   * Hide the button container
   */
  // hideButtonContainer() {
  //   if (this.buttonContainer) {
  //     this.buttonContainer.style.display = 'none';
  //   }
  // }

  /**
   * Submit detection data to server
   */
  async submitDetection() {
    const reason = this.reasonInputField.value.trim();

    if (!reason) {
      this.showMessage('이유를 입력해주세요.', 'error');
      return;
    }

    // Show loading state
    this.showMessage('제출 중...', 'loading');

    const detectionData = this.collectDetectionData(reason);

    try {
      // Send data to server
      await this.sendToServer(detectionData);

      // Show success message and reset form
      this.showMessage('성공적으로 제출되었습니다. 감사합니다!', 'success');
      this.reasonInputField.value = '';

      window.VSC.logger.info('Response data submitted successfully');
    } catch (error) {
      window.VSC.logger.error('Failed to submit detection data:', error);
      this.showMessage('제출에 실패했습니다. 다시 시도해주세요.', 'error');
    }
  }

  /**
   * Collect detection data
   */
  collectDetectionData(reason) {
    const video = document.querySelector('video');
    const currentTime = video ? video.currentTime : 0;
    const playbackRate = video ? video.playbackRate : 1.0;

    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);

    return {
      videoUrl: window.location.href,
      playbackRate: playbackRate,
      currentTime: `${minutes}:${seconds.toString().padStart(2, '0')}`,
      reason: reason,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Send data to server (placeholder - replace with actual endpoint)
   */
  async sendToServer(data) {
    if (window.VSC && window.VSC.firebase) {
      await window.VSC.firebase.logResponse(data);
    } else {
      console.error('VSC: Firebase module not found. Cannot log response.');
      // Fallback or error handling
      // For now, just log the data that would be sent
      console.log('Response Data (fallback):', data);
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

// Create global instance
window.VSC.ResponseReceiver = ResponseReceiver;
