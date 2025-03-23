// anime-trailer-manager.js
import { EventBus } from './event-bus.js';
import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';

// YouTube API configuration
const youtubeApiConfig = {
  // This will be loaded from your config file or set manually
  apiKey: '', 
  cacheTime: 60 * 60 * 1000, // Cache results for 1 hour (in milliseconds)
  cache: new Map() // Cache for API results
};

// Create a shared YouTube API loader
const YouTubeAPILoader = {
  apiLoaded: false,
  apiLoading: false,
  callbacks: [],
  
  loadAPI() {
    if (this.apiLoaded) {
      return Promise.resolve();
    }
    
    if (this.apiLoading) {
      return new Promise(resolve => {
        this.callbacks.push(resolve);
      });
    }
    
    this.apiLoading = true;
    
    return new Promise(resolve => {
      this.callbacks.push(resolve);
      
      // Create the script tag
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      
      // Define the callback
      window.onYouTubeIframeAPIReady = () => {
        this.apiLoaded = true;
        this.apiLoading = false;
        
        // Call all waiting callbacks
        this.callbacks.forEach(callback => callback());
        this.callbacks = [];
      };
    });
  }
};

// Add API cache mechanism
const ApiCache = {
  // Get cached data if available and not expired
  get(key) {
    if (!youtubeApiConfig.cache.has(key)) return null;
    
    const cached = youtubeApiConfig.cache.get(key);
    const now = Date.now();
    
    // Check if cache is still valid
    if (now - cached.timestamp < youtubeApiConfig.cacheTime) {
      return cached.data;
    }
    
    // Cache expired, remove it
    youtubeApiConfig.cache.delete(key);
    return null;
  },
  
  // Store data in cache
  set(key, data) {
    youtubeApiConfig.cache.set(key, {
      timestamp: Date.now(),
      data
    });
  }
};

// Load YouTube API key from config
async function loadYouTubeApiKey() {
  try {
    // Make a request to your api-config.json file
    const response = await fetch('/api/api-config.json');
    if (!response.ok) return '';
    
    const config = await response.json();
    
    // Check if YouTube API key is available
    if (config.externalApis && config.externalApis.youtube && config.externalApis.youtube.apiKey) {
      return config.externalApis.youtube.apiKey;
    }
    
    return '';
  } catch (error) {
    console.error('Error loading YouTube API key:', error);
    return '';
  }
}

// Trailer Manager Factory - Creates trailer manager instances for different apps
export const createTrailerManager = (appName, sourceType) => {
  // Define default sources for different apps (as fallback)
  const defaultSources = {
    'jellyfin': {
      type: 'jikan',
      endpoint: 'https://api.jikan.moe/v4/top/anime?filter=airing&limit=25'
    },
    'kavita': {
      type: 'youtube-api',
      channelId: 'UCxPCparZBUQT1RSVNuQTVOA', // The Omnibus Collector channel ID
      maxResults: 10,
      fallbackVideos: [  // Used if API fails or key isn't available
        {
          id: 'lIjOQ4VhTv0',
          title: 'Omnibus Collector: Modern Comic Book Collected Editions Still Needed'
        },
        {
          id: 'lbLFfB6ywMQ',
          title: 'Omnibus Collector: Awesome X-Men Announcements'
        }
      ]
    },
    'romm': {
      type: 'youtube-api',
      channelId: 'UCJx5KP-pCUmL9eZUv-mIcNw', // Example: Retro Game Corps
      maxResults: 10,
      fallbackVideos: [  // Used if API fails or key isn't available
        {
          id: 'HKLc9hG9SzU',
          title: 'Retro Game Music Compilation'
        },
        {
          id: 'CY0KbjArksg',
          title: 'Best Gaming Animation Compilation'
        }
      ]
    }
  };

  // If sourceType is provided, override the default
  let source = sourceType ? { type: sourceType } : defaultSources[appName];
  
  if (!source) {
    console.error(`No source configuration for app: ${appName}`);
    return null;
  }
  
  // Create a trailer manager instance
  const instance = {
    // Configuration
    appName,
    sourceType: source.type,
    sourceConfig: source,
    
    // State
    trailers: [],
    currentIndex: 0,
    initialized: false,
    isPlaying: false,
    player: null,
    playerElement: null,
    
    // Initialize the trailer manager
    async initialize() {
      console.log(`Initializing trailer manager for ${this.appName}`);
      
      if (this.initialized) return this;
      
      // Try to load configuration from yt-config.json
      try {
        const configSource = await this.loadChannelConfig();
        if (configSource) {
          console.log(`Loaded channel configuration for ${this.appName} from yt-config.json`);
          this.sourceConfig = configSource;
          this.sourceType = configSource.type;
        }
      } catch (error) {
        console.warn(`Error loading channel configuration from yt-config.json: ${error.message}`);
        console.log('Using default configuration');
      }
      
      // Fetch trailers based on source type
      if (this.sourceType === 'jikan') {
        await this.fetchAnimeTrailers();
      } else if (this.sourceType === 'youtube-api') {
        await this.fetchAnimeTrailers();
      }
      
      this.initialized = true;
      return this;
    },
    
    // Load channel configuration from yt-config.json
    async loadChannelConfig() {
      // Make a request to the yt-config.json file
      try {
        const response = await fetch('/youtube/yt-config.json');
        if (!response.ok) {
          console.warn('Could not load yt-config.json, falling back to default configuration');
          return null;
        }
        
        const config = await response.json();
        
        // Check if configuration is available for this app
        if (config && config[this.appName]) {
          return config[this.appName];
        }
        
        return null;
      } catch (error) {
        console.error('Error loading YouTube channel configuration:', error);
        return null;
      }
    },
    
    // Fetch YouTube channel videos using the API
    async fetchYouTubeChannelVideos() {
      try {
        // Check cache first
        const cacheKey = `youtube-${this.sourceConfig.channelId}`;
        const cachedData = ApiCache.get(cacheKey);
        
        if (cachedData) {
          console.log(`Using cached YouTube data for ${this.appName}`);
          return cachedData;
        }
        
        // Load API key if not already loaded
        if (!youtubeApiConfig.apiKey) {
          youtubeApiConfig.apiKey = await loadYouTubeApiKey();
        }
        
        // If no API key is available, use fallback videos
        if (!youtubeApiConfig.apiKey) {
          console.warn(`No YouTube API key available for ${this.appName}, using fallback videos`);
          return this.sourceConfig.fallbackVideos || [];
        }
        
        const channelId = this.sourceConfig.channelId;
        const maxResults = this.sourceConfig.maxResults || 10;
        
        // First get the channel's uploads playlist ID
        const channelResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${youtubeApiConfig.apiKey}`
        );
        
        if (!channelResponse.ok) {
          throw new Error(`Failed to fetch channel data: ${channelResponse.status}`);
        }
        
        const channelData = await channelResponse.json();
        
        if (!channelData.items || channelData.items.length === 0) {
          throw new Error('Channel not found');
        }
        
        const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
        
        // Now get the videos from the uploads playlist
        const videosResponse = await fetch(
          `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${maxResults}&playlistId=${uploadsPlaylistId}&key=${youtubeApiConfig.apiKey}`
        );
        
        if (!videosResponse.ok) {
          throw new Error(`Failed to fetch videos: ${videosResponse.status}`);
        }
        
        const videosData = await videosResponse.json();
        
        // Process the video data
        const videos = videosData.items.map(item => ({
          id: item.snippet.resourceId.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
          publishedAt: item.snippet.publishedAt
        }));
        
        // Cache the results
        ApiCache.set(cacheKey, videos);
        
        return videos;
      } catch (error) {
        console.error(`Error fetching YouTube videos for ${this.appName}:`, error);
        // Fall back to predefined videos if available
        return this.sourceConfig.fallbackVideos || [];
      }
    },
    
    // Fetch trailers for anime or YouTube channels
    async fetchAnimeTrailers() {
      try {
        const operationKey = `fetch-trailers-${this.appName}`;
        LoadingIndicator.startLoading(operationKey, `Loading trailers for ${this.appName}...`);
        
        // Reset trailers array
        this.trailers = [];
        
        // Handle different source types
        if (this.sourceType === 'jikan') {
          // Use endpoint from config or default
          const endpoint = this.sourceConfig.endpoint || 'https://api.jikan.moe/v4/top/anime?limit=25';
          
          // Fetch data
          const response = await fetch(endpoint);
          if (!response.ok) {
            throw new Error(`Failed to fetch anime data: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Filter out entries without trailers
          const animeWithTrailers = data.data.filter(anime => 
            anime.trailer && 
            anime.trailer.youtube_id && 
            anime.trailer.url
          );
          
          // Store the trailer data
          this.trailers = animeWithTrailers.map(anime => ({
            id: anime.mal_id,
            title: anime.title,
            youtubeid: anime.trailer.youtube_id,
            url: anime.trailer.url,
            image: anime.trailer.images?.maximum_image_url || anime.images.jpg.large_image_url,
            played: false
          }));
        } 
        else if (this.sourceType === 'youtube-api') {
          // Fetch videos from YouTube API
          const videos = await this.fetchYouTubeChannelVideos();
          
          // Convert to trailer format
          this.trailers = videos.map((video, index) => ({
            id: `youtube-${index}-${video.id}`,
            title: video.title,
            youtubeid: video.id,
            url: `https://www.youtube.com/watch?v=${video.id}`,
            image: video.thumbnail || `https://img.youtube.com/vi/${video.id}/maxresdefault.jpg`,
            played: false
          }));
        }
        
        console.log(`Fetched ${this.trailers.length} trailers for ${this.appName}`);
        
        LoadingIndicator.endLoading(operationKey);
        return this.trailers;
      } catch (error) {
        console.error(`Error fetching trailers for ${this.appName}:`, error);
        LoadingIndicator.endLoading(`fetch-trailers-${this.appName}`);
        return [];
      }
    },
    
    // Show the trailer player in the designated box
    async showTrailerPlayer() {
      console.log("showTrailerPlayer called");
      
      // Make sure we have trailers
      if (this.trailers.length === 0) {
        console.log(`No trailers available for ${this.appName}`);
        return;
      }
      
      // Get the box for this app
      const contentBoxes = window.contentBoxes?.[this.appName] || {};
      const trailerBox = contentBoxes.bottom;
      
      if (!trailerBox) {
        console.error(`Trailer box not found for ${this.appName}`);
        return;
      }
      
      console.log("Found trailer box, setting up UI");
      
      // Clear existing content
      const contentDiv = trailerBox.querySelector('.content-box-content');
      if (!contentDiv) {
        console.error('Content div not found in trailer box');
        return;
      }
      
      // Hide the content box header
      const headerElement = trailerBox.querySelector('.content-box-header');
      if (headerElement) {
        headerElement.style.display = 'none';
      }
      
      // Set the entire container to take full height with no padding or margins
      trailerBox.style.padding = '0';
      trailerBox.style.margin = '0';
      trailerBox.style.overflow = 'hidden'; // Keep original overflow setting
      
      // Set content div to take full height and remove padding
      contentDiv.style.height = '100%';
      contentDiv.style.padding = '0';
      contentDiv.style.margin = '0';
      contentDiv.style.position = 'relative';
      
      // Create player container with unique ID
      const playerId = `youtube-player-${this.appName}`;
      this.playerElement = playerId;
      
      // Get current trailer
      const currentTrailer = this.trailers[this.currentIndex];
      
      // Create a div for our player without any navigation buttons
      contentDiv.innerHTML = `
        <div style="position: relative; width: 100%; height: 100%; overflow: hidden; background: black;">
          <!-- Title element -->
          <div id="trailer-title-${this.appName}" style="position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: var(--matrix-green); padding: 5px 10px; border-radius: 5px; font-size: 14px; z-index: 1000; opacity: 0; transition: opacity 0.3s; max-width: 80%; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${currentTrailer.title}</div>
          
          <!-- Player container -->
          <div id="${playerId}" style="width: 100%; height: 100%;"></div>
        </div>
      `;
      
      // Store reference to title element
      this.titleElement = document.getElementById(`trailer-title-${this.appName}`);
      
      // Show title on container hover
      contentDiv.addEventListener('mouseenter', () => {
        if (this.titleElement) {
          this.titleElement.style.opacity = '1';
        }
      });
      
      contentDiv.addEventListener('mouseleave', () => {
        if (this.titleElement) {
          this.titleElement.style.opacity = '0';
        }
      });
      
      // Wait for YouTube API to load
      console.log("Waiting for YouTube API to load");
      await YouTubeAPILoader.loadAPI();
      console.log("YouTube API loaded, creating player");
      
      // Create YouTube player
      this.createYouTubePlayer();
      
      // Add standalone buttons if you want to use that approach
      // Uncomment the line below after adding the addStandaloneButtons function
      this.addStandaloneButtons();
    },
    
    // Function to add standalone navigation buttons
    addStandaloneButtons() {
      // Make sure we have an active app and trailers
      if (!this.appName || this.trailers.length === 0) return;
      
      // Get the trailer box
      const contentBoxes = window.contentBoxes?.[this.appName] || {};
      const trailerBox = contentBoxes.bottom;
      if (!trailerBox) return;
      
      // Find or create button container
      let buttonContainer = document.getElementById(`trailer-nav-${this.appName}`);
      
      // If it already exists, clear it
      if (buttonContainer) {
        buttonContainer.innerHTML = '';
      } else {
        // Create the container
        buttonContainer = document.createElement('div');
        buttonContainer.id = `trailer-nav-${this.appName}`;
        buttonContainer.style.position = 'absolute';
        buttonContainer.style.top = '0';
        buttonContainer.style.left = '0';
        buttonContainer.style.width = '100%';
        buttonContainer.style.height = '100%';
        buttonContainer.style.pointerEvents = 'none'; // Let clicks pass through to underlying elements
        buttonContainer.style.zIndex = '1001';
        buttonContainer.style.opacity = '0'; // Start hidden for fade in
        buttonContainer.style.transition = 'opacity 0.5s ease'; // Add transition for fading
        
        // Add it to the body where it won't affect layout
        document.body.appendChild(buttonContainer);
      }
      
      // Create previous button
      const prevButton = document.createElement('button');
      prevButton.className = 'standalone-nav-button prev-button';
      prevButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="white"/>
        </svg>
      `;
      
      // Create next button
      const nextButton = document.createElement('button');
      nextButton.className = 'standalone-nav-button next-button';
      nextButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="white"/>
        </svg>
      `;
      
      // Style the buttons
      const commonButtonStyle = `
        position: absolute;
        width: 50px;
        height: 50px;
        background: rgba(0,0,0,0.7);
        color: white;
        border: 2px solid var(--matrix-green);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.5s ease, transform 0.3s ease, left 0.5s ease-out;
        pointer-events: auto;
      `;
      
      prevButton.style.cssText = commonButtonStyle;
      nextButton.style.cssText = commonButtonStyle;
      
      // Position buttons based on trailer box position
      const updateButtonPositions = (initialPosition = false) => {
        const rect = trailerBox.getBoundingClientRect();
        
        // Position in the middle of left and right sides
        const centerY = rect.top + rect.height / 2;
        
        if (initialPosition) {
          // Initial positions - offscreen for animation
          prevButton.style.top = `${centerY - 25}px`; // Center vertically
          prevButton.style.left = `${rect.left - 80}px`; // Start offscreen to the left
          
          nextButton.style.top = `${centerY - 25}px`; // Center vertically
          nextButton.style.left = `${rect.right + 30}px`; // Start offscreen to the right
        } else {
          // Final positions - at the edges
          prevButton.style.top = `${centerY - 25}px`; // Center vertically
          prevButton.style.left = `${rect.left - 25}px`; // Touch left edge
          
          nextButton.style.top = `${centerY - 25}px`; // Center vertically
          nextButton.style.left = `${rect.right - 25}px`; // Touch right edge
        }
      };
      
      // Add buttons to container
      buttonContainer.appendChild(prevButton);
      buttonContainer.appendChild(nextButton);
      
      // Position buttons initially offscreen
      updateButtonPositions(true);
      
      // Update positions on window resize
      window.addEventListener('resize', () => updateButtonPositions(false));
      
      // Add event listeners
      prevButton.addEventListener('mouseenter', () => {
        prevButton.style.opacity = '1';
        prevButton.style.transform = 'scale(1.1)';
      });
      
      prevButton.addEventListener('mouseleave', () => {
        prevButton.style.opacity = '0.7';
        prevButton.style.transform = 'scale(1)';
      });
      
      prevButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playPrevTrailer();
      });
      
      nextButton.addEventListener('mouseenter', () => {
        nextButton.style.opacity = '1';
        nextButton.style.transform = 'scale(1.1)';
      });
      
      nextButton.addEventListener('mouseleave', () => {
        nextButton.style.opacity = '0.7';
        nextButton.style.transform = 'scale(1)';
      });
      
      nextButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.playNextTrailer();
      });
      
      // Store references and cleanup function
      this.standaloneButtons = {
        container: buttonContainer,
        prevButton,
        nextButton,
        updatePositions: updateButtonPositions
      };
      
      // Set up an interval to update positions as the page animates
      const positionInterval = setInterval(updateButtonPositions, 100);
      setTimeout(() => clearInterval(positionInterval), 2000); // Stop after 2 seconds
      
      // Animate buttons in from the sides with proper sequence
      // First make container visible
      setTimeout(() => {
        buttonContainer.style.opacity = '1';
        
        // After a very short delay, make buttons visible but still offscreen
        setTimeout(() => {
          prevButton.style.opacity = '0.7';
          nextButton.style.opacity = '0.7';
          
          // After buttons are visible, animate them to final positions
          setTimeout(() => {
            updateButtonPositions(false);
          }, 50);
        }, 50);
      }, 200);
      
      return { prevButton, nextButton, updatePositions: updateButtonPositions };
    },
    
    // Function to fade out standalone buttons
    fadeOutStandaloneButtons() {
      // Check if we're already in the process of removing buttons
      if (this._fadingOutButtons) return;
      
      try {
        if (this.standaloneButtons && this.standaloneButtons.container) {
          this._fadingOutButtons = true;
          const { container, prevButton, nextButton } = this.standaloneButtons;
          
          // Create a forced cleanup function that runs regardless of animation status
          const forceCleanup = () => {
            try {
              if (this.standaloneButtons) {
                // Remove event listener safely
                try {
                  window.removeEventListener('resize', this.standaloneButtons.updatePositions);
                } catch (e) {
                  console.error('Error removing event listener:', e);
                }
                
                // Remove container from DOM if it still exists
                if (container && container.parentNode) {
                  container.parentNode.removeChild(container);
                }
                
                // Clear references
                this.standaloneButtons = null;
              }
              this._fadingOutButtons = false;
            } catch (e) {
              console.error('Error in forced cleanup:', e);
              this._fadingOutButtons = false;
            }
          };
          
          // Set a fallback timeout to ensure elements are always removed eventually
          const fallbackTimer = setTimeout(forceCleanup, 2000);
          
          // Immediately set buttons to transition mode to prevent interaction
          if (container) container.style.pointerEvents = 'none';
          
          if (prevButton && nextButton) {
            try {
              // First slightly reduce opacity to indicate button is transitioning out
              prevButton.style.opacity = '0.5';
              nextButton.style.opacity = '0.5';
              
              // Get the content box for positioning - with safety checks
              const contentBoxes = window.contentBoxes?.[this.appName] || {};
              const trailerBox = contentBoxes.bottom;
              
              // Calculate final positions - do it immediately so we're not dependent on trailerBox later
              let leftTargetPosition = '-80px';
              let rightTargetPosition = 'calc(100vw + 30px)';
              
              if (trailerBox) {
                try {
                  const rect = trailerBox.getBoundingClientRect();
                  leftTargetPosition = `${rect.left - 80}px`;
                  rightTargetPosition = `${rect.right + 30}px`;
                } catch (e) {
                  console.error('Error getting rect:', e);
                  // Continue with fallback positions
                }
              }
              
              // After a short delay, animate buttons off-screen
              setTimeout(() => {
                try {
                  // Move buttons off-screen in their respective directions
                  prevButton.style.left = leftTargetPosition; // Move left button off-screen to the left
                  nextButton.style.left = rightTargetPosition; // Move right button off-screen to the right
                  
                  // Fade buttons completely after they start moving
                  setTimeout(() => {
                    try {
                      prevButton.style.opacity = '0';
                      nextButton.style.opacity = '0';
                    } catch (e) {
                      console.warn('Error fading buttons completely:', e);
                    }
                  }, 50);
                } catch (e) {
                  console.warn('Error moving buttons off-screen:', e);
                }
              }, 50);
            } catch (e) {
              console.error('Error animating buttons:', e);
            }
          }
          
          // Fade out container slightly after buttons start animating
          setTimeout(() => {
            try {
              if (container) container.style.opacity = '0';
            } catch (e) {
              console.warn('Error fading container:', e);
            }
          }, 100);
          
          // Remove after all animations complete
          setTimeout(() => {
            try {
              clearTimeout(fallbackTimer); // Clear fallback timer if normal cleanup works
              forceCleanup();
            } catch (e) {
              console.error('Error in cleanup:', e);
              forceCleanup(); // Try forced cleanup again
            }
          }, 600); // Slightly reduced to ensure it happens before any other animations might start
        }
      } catch (e) {
        console.error('Error in fadeOutStandaloneButtons:', e);
        this._fadingOutButtons = false;
      }
    },

    // Create YouTube player
    createYouTubePlayer() {
      // Get current trailer
      const trailer = this.trailers[this.currentIndex];
      if (!trailer) return;
      
      console.log(`Creating YouTube player for video ID: ${trailer.youtubeid}`);
      
      // Create YouTube player with native controls
      this.player = new YT.Player(this.playerElement, {
        height: '100%',
        width: '100%',
        videoId: trailer.youtubeid,
        playerVars: {
          autoplay: 1,
          controls: 1, // Enable YouTube native controls
          showinfo: 0,
          rel: 0,
          modestbranding: 1,
          fs: 0, // Disable fullscreen button
          playsinline: 1, // Force inline playback
          wmode: 'transparent',
          iv_load_policy: 3, // Hide annotations
          origin: window.location.origin
        },
        events: {
          'onReady': (event) => {
            console.log("YouTube player is ready");
            this.onPlayerReady(event);
          },
          'onStateChange': (event) => {
            console.log(`Player state changed: ${event.data}`);
            this.onPlayerStateChange(event);
          },
          'onError': (event) => {
            console.error(`Player error: ${event.data}`);
            this.onPlayerError(event);
          }
        }
      });
    },
    
    
    // Player ready event handler
    onPlayerReady(event) {
      // Set initial volume
      event.target.setVolume(50);
      console.log("Player ready, volume set");
      
      // Already set the title in the HTML
      // Mark as played
      this.trailers[this.currentIndex].played = true;
      this.isPlaying = true;
    },
    
    // Player state change event handler
    onPlayerStateChange(event) {
      // When a video ends, play the next one
      if (event.data === YT.PlayerState.ENDED) {
        this.playNextTrailer();
      }
    },
    
    // Player error event handler
    onPlayerError(event) {
      console.error(`YouTube player error in ${this.appName}:`, event.data);
      // Try to play next trailer
      setTimeout(() => this.playNextTrailer(), 1000);
    },
    
    // Update the trailer info display
    updateTrailerInfo() {
      // Find the trailer box for this app
      const contentBoxes = window.contentBoxes?.[this.appName] || {};
      const trailerBox = contentBoxes.bottom;
      if (!trailerBox) return;
      
      const trailer = this.trailers[this.currentIndex];
      const titleElement = trailerBox.querySelector('.trailer-title');
      
      if (titleElement && trailer) {
        // Set title text directly with no HTML
        titleElement.textContent = trailer.title;
        
        // Get the trailer info element
        const trailerInfo = trailerBox.querySelector('.trailer-info');
        if (trailerInfo) {
          // Make sure trailer info is properly styled
          trailerInfo.style.position = 'absolute';
          trailerInfo.style.top = '5px';
          trailerInfo.style.left = '0';
          trailerInfo.style.right = '0';
          trailerInfo.style.margin = '0 auto';
          trailerInfo.style.textAlign = 'center';
          trailerInfo.style.width = 'fit-content';
          trailerInfo.style.minWidth = '100px';
          trailerInfo.style.maxWidth = '60%';
          trailerInfo.style.zIndex = '9999';
          trailerInfo.style.fontSize = '0.7rem';
          trailerInfo.style.padding = '2px 5px';
          trailerInfo.style.background = 'rgba(0, 0, 0, 0.7)';
          trailerInfo.style.borderRadius = '4px';
          
          // Set initial state to hidden
          trailerInfo.style.opacity = '0';
          
          // Add hover event listeners to show/hide on hover
          const animePlayer = trailerBox.querySelector('.anime-trailer-player');
          if (animePlayer) {
            animePlayer.addEventListener('mouseenter', () => {
              trailerInfo.style.opacity = '1';
            });
            animePlayer.addEventListener('mouseleave', () => {
              trailerInfo.style.opacity = '0';
            });
          }
        }
      }
    },
    
    // Play the current trailer
    playCurrentTrailer() {
      const trailer = this.trailers[this.currentIndex];
      if (!trailer || !this.player) return;
      
      console.log(`Playing trailer: ${trailer.title}`);
      
      // Load and play the trailer
      this.player.loadVideoById(trailer.youtubeid);
      
      // Update trailer title
      if (this.titleElement) {
        this.titleElement.textContent = trailer.title;
      }
      
      // Mark as played
      this.trailers[this.currentIndex].played = true;
    },
    
    // Play the next trailer
    playNextTrailer() {
      console.log("playNextTrailer called");
      
      // Find unplayed trailers
      const unplayed = this.trailers.filter(t => !t.played);
      
      // If all trailers have been played, reset played status
      if (unplayed.length === 0) {
        this.trailers.forEach(t => t.played = false);
        // Except the current one
        this.trailers[this.currentIndex].played = true;
        
        // Find a new trailer different from the current one
        const nextIndex = (this.currentIndex + 1) % this.trailers.length;
        this.currentIndex = nextIndex;
        console.log(`Playing next trailer (all seen), index: ${nextIndex}`);
      } else {
        // Find a random unplayed trailer
        const randomUnplayed = unplayed[Math.floor(Math.random() * unplayed.length)];
        const nextIndex = this.trailers.findIndex(t => t.id === randomUnplayed.id);
        this.currentIndex = nextIndex;
        console.log(`Playing random unplayed trailer, index: ${nextIndex}`);
      }
      
      // Play the next trailer
      this.playCurrentTrailer();
    },
    
    // Play the previous trailer
    playPrevTrailer() {
      console.log("playPrevTrailer called");
      
      // Simply go back one
      this.currentIndex = (this.currentIndex - 1 + this.trailers.length) % this.trailers.length;
      console.log(`Playing previous trailer, index: ${this.currentIndex}`);
      
      // Play the previous trailer
      this.playCurrentTrailer();
    },
    
    // Clean up resources with proper sequencing
    cleanup() {
      console.log("Cleaning up trailer player");
      
      // Create local reference to player to avoid race conditions
      const player = this.player;
      
      // Begin by fading out standalone buttons
      this.fadeOutStandaloneButtons();
      
      // Set this.player to null immediately to prevent double cleanup attempts
      this.player = null;
      this.isPlaying = false;
      
      // Wait a short delay to allow button animation to start
      setTimeout(() => {
        // Then stop and destroy the player using our local reference
        if (player && typeof player.stopVideo === 'function') {
          try {
            player.stopVideo();
            player.destroy();
          } catch (e) {
            console.warn("Error stopping YouTube player:", e);
          }
        }
        
        // Clear references to elements
        this.titleElement = null;
        this.prevButton = null;
        this.nextButton = null;
      }, 150); // Short delay allows button animations to start properly
    }
  };
  
  return instance;
};

// Trailer manager registry - keeps track of all trailer managers
const trailerManagers = new Map();

// Get or create a trailer manager for an app
export const getTrailerManager = (appName, sourceType) => {
  if (trailerManagers.has(appName)) {
    return trailerManagers.get(appName);
  }
  
  const manager = createTrailerManager(appName, sourceType);
  if (manager) {
    trailerManagers.set(appName, manager);
  }
  
  return manager;
};

// Export a function to clean up all trailer managers
export const cleanupAllTrailerManagers = () => {
  trailerManagers.forEach(manager => {
    manager.cleanup();
  });
};