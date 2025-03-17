// tmdb-integration.js
// Integration script for TMDB anime data in the darkneon.tokyo project

import { TMDBAPI } from './tmdb-api.js';
import { EventBus } from './event-bus.js';

// Main integration object
const TMDBIntegration = {
  // Track initialization state
  initialized: false,
  
  // Initialize the integration
  initialize() {
    if (this.initialized) return;
    
    console.log("Initializing TMDB Integration...");
    
    // Load necessary styles
    this.loadStyles();
    
    // Initialize the TMDB API
    TMDBAPI.initialize();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Mark as initialized
    this.initialized = true;
    
    // Make it globally accessible
    window.TMDBIntegration = this;
    
    console.log("TMDB Integration initialized successfully");
    return this;
  },
  
  // Load custom styles for TMDB content
  loadStyles() {
    // Check if our styles already exist
    if (document.getElementById('tmdb-anime-styles')) {
      return;
    }
    
    // Create a link element to load the styles
    const linkElement = document.createElement('link');
    linkElement.id = 'tmdb-anime-styles';
    linkElement.rel = 'stylesheet';
    linkElement.href = 'css/tmdb-styles.css'; // Adjust path as needed
    
    // Add to document head
    document.head.appendChild(linkElement);
    console.log("TMDB styles loaded");
  },
  
  // Helper functions for modal animations
  showModal(modalContainer) {
    // First make it visible but with opacity 0
    modalContainer.style.display = 'flex';
    
    // Force a reflow before applying the transition
    void modalContainer.offsetWidth;
    
    // Then fade it in
    modalContainer.style.opacity = '1';
    modalContainer.classList.add('visible');
  },
  
  hideModal(modalContainer) {
    // First fade it out
    modalContainer.style.opacity = '0';
    modalContainer.classList.remove('visible');
    
    // After transition completes, hide it
    setTimeout(() => {
      modalContainer.style.display = 'none';
    }, 800); // Same as the CSS transition duration
  },
  
  // Set up event listeners for the application
  setupEventListeners() {
    // Listen for app selection events
    EventBus.on(EventBus.Events.APP_SELECTED, this.handleAppSelection.bind(this));
    
    // Listen for content boxes ready event
    window.addEventListener('contentBoxesReady', () => {
      console.log("Content boxes ready, pre-fetching TMDB data");
      TMDBAPI.getAnimeMovies().catch(err => console.warn("Pre-fetch movies error:", err));
      TMDBAPI.getAnimeTVShows().catch(err => console.warn("Pre-fetch TV shows error:", err));
    });
    
    console.log("TMDB event listeners set up");
  },
  
  // Handle app selection event
  handleAppSelection(event) {
    const appName = event.detail?.appName;
    
    if (appName === 'jellyfin') {
      console.log("Jellyfin app selected, loading anime content from TMDB");
      
      // Wait a short moment for animations to start
      setTimeout(() => {
        this.loadAnimeContent();
      }, 300);
    }
  },
  
  // Load anime content into the left content box
  async loadAnimeContent() {
    const chartBox = window.contentBoxes?.jellyfin?.left;
    if (!chartBox) {
      console.error("Jellyfin left content box not found");
      return;
    }
    
    const contentDiv = chartBox.querySelector('.content-box-content');
    if (!contentDiv) {
      console.error("Content div not found in chart box");
      return;
    }
    
    // Show loading state
    contentDiv.innerHTML = `
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <div>Loading anime charts...</div>
      </div>
    `;
    
    try {
      // Fetch anime movies and TV shows in parallel
      const [animeMovies, animeTVShows] = await Promise.all([
        TMDBAPI.getAnimeMovies(),
        TMDBAPI.getAnimeTVShows()
      ]);
      
      console.log(`Loaded ${animeMovies.length} anime movies and ${animeTVShows.length} anime TV shows`);
      
      // Build the HTML content
      let html = '';
      
      // Add anime movies section
      html += `
        <div class="tmdb-content-section">
          <h4>Top Anime Movies
            <button class="tmdb-refresh-button" title="Refresh Data" onclick="event.stopPropagation(); window.TMDBIntegration.refreshMovies()">↻</button>
          </h4>
      `;
      
      if (animeMovies.length === 0) {
        html += '<div class="no-data-message">No anime movies found</div>';
      } else {
        animeMovies.forEach(movie => {
          const posterUrl = movie.posterPath || 
            TMDBAPI.getFallbackPosterUrl(movie.title);
          
          const releaseYear = movie.releaseDate ? 
            new Date(movie.releaseDate).getFullYear() : 'N/A';
          
          html += `
            <div class="media-chart-item" data-id="${movie.id}" data-type="movie">
              <div class="chart-rank">${movie.rank}</div>
              <div class="chart-poster">
                <img src="${posterUrl}" alt="${movie.title}" 
                  onerror="this.src='https://placehold.co/92x138/333/666?text=${encodeURIComponent(movie.title)}'">
              </div>
              <div class="chart-title">
                <div class="chart-title-text">${movie.title}</div>
                <div class="chart-year">${releaseYear}</div>
                <div class="chart-rating">${movie.voteAverage?.toFixed(1) || 'N/A'}</div>
              </div>
            </div>
          `;
        });
      }
      
      html += '</div>'; // Close movies section
      
      // Add anime TV shows section
      html += `
        <div class="tmdb-content-section">
          <h4>Top Anime Series
            <button class="tmdb-refresh-button" title="Refresh Data" onclick="event.stopPropagation(); window.TMDBIntegration.refreshTVShows()">↻</button>
          </h4>
      `;
      
      if (animeTVShows.length === 0) {
        html += '<div class="no-data-message">No anime TV shows found</div>';
      } else {
        animeTVShows.forEach(show => {
          const posterUrl = show.posterPath || 
            TMDBAPI.getFallbackPosterUrl(show.title);
          
          const firstAirYear = show.firstAirDate ? 
            new Date(show.firstAirDate).getFullYear() : 'N/A';
          
          html += `
            <div class="media-chart-item" data-id="${show.id}" data-type="tv">
              <div class="chart-rank">${show.rank}</div>
              <div class="chart-poster">
                <img src="${posterUrl}" alt="${show.title}" 
                  onerror="this.src='https://placehold.co/92x138/333/666?text=${encodeURIComponent(show.title)}'">
              </div>
              <div class="chart-title">
                <div class="chart-title-text">${show.title}</div>
                <div class="chart-year">${firstAirYear}</div>
                <div class="chart-rating">${show.voteAverage?.toFixed(1) || 'N/A'}</div>
              </div>
            </div>
          `;
        });
      }
      
      html += '</div>'; // Close TV shows section
      
      // Add TMDB attribution
      html += `
        <div class="tmdb-attribution">
          <span>Anime data provided by </span>
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">The Movie Database</a>
        </div>
      `;
      
      // Update the content
      contentDiv.innerHTML = html;
      
      // Add click handlers for detailed view
      contentDiv.querySelectorAll('.media-chart-item').forEach(item => {
        item.addEventListener('click', this.handleItemClick.bind(this));
      });
      
      console.log("Anime content loaded successfully");
    } catch (error) {
      console.error("Error loading anime content:", error);
      
      // Show error state
      contentDiv.innerHTML = `
        <div class="error-message">
          <p>Sorry, there was an error loading anime data.</p>
          <p>Error: ${error.message}</p>
          <button class="tmdb-refresh-button" style="position:static; transform:none; margin-top:10px;" 
            onclick="event.stopPropagation(); window.TMDBIntegration.loadAnimeContent()">Try Again</button>
        </div>
      `;
    }
  },
  
  // Handle clicks on chart items
  async handleItemClick(event) {
    // Important: Stop event propagation immediately to prevent app closing
    event.stopPropagation();
    
    const item = event.currentTarget;
    const id = item.getAttribute('data-id');
    const type = item.getAttribute('data-type');
    
    console.log(`Clicked on ${type} with ID ${id}`);
    
    // Show loading state on the clicked item
    const originalContent = item.innerHTML;
    item.innerHTML = `
      <div class="loading-spinner" style="margin:auto;"></div>
    `;
    
    try {
      // Create or get the modal container
      let modalContainer = document.getElementById('tmdb-modal-container');
      
      if (!modalContainer) {
        modalContainer = document.createElement('div');
        modalContainer.id = 'tmdb-modal-container';
        document.body.appendChild(modalContainer);
      }
      
      // Show loading state in modal
      modalContainer.innerHTML = `
        <div class="tmdb-modal">
          <div class="tmdb-modal-content">
            <div class="tmdb-modal-header">
              <button class="tmdb-modal-close">&times;</button>
              <h3>Loading Details...</h3>
            </div>
            <div class="tmdb-modal-body">
              <div class="loading-container">
                <div class="loading-spinner"></div>
                <div>Loading anime details...</div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Show the modal with animation
      this.showModal(modalContainer);
      
      // Add close functionality
      const closeButton = modalContainer.querySelector('.tmdb-modal-close');
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop propagation to prevent other handlers
        this.hideModal(modalContainer);
      });
      
      // Close on click outside the modal content
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
          this.hideModal(modalContainer);
        }
      });
      
      // Fetch the details based on the type
      let details;
      if (type === 'movie') {
        details = await TMDBAPI.getMovieDetails(id);
      } else if (type === 'tv') {
        details = await TMDBAPI.getTVShowDetails(id);
      } else {
        throw new Error(`Unknown media type: ${type}`);
      }
      
      // Restore the original content of the item
      item.innerHTML = originalContent;
      
      // Add a glitch effect to the clicked item to show it's active
      item.classList.add('glitch');
      setTimeout(() => {
        item.classList.remove('glitch');
      }, 3000);
      
      // Create the modal content based on the details
      const posterUrl = details.posterPath || 
        TMDBAPI.getFallbackPosterUrl(details.title);
      
      // Format release date or first air date
      const releaseDate = type === 'movie' ? details.releaseDate : details.firstAirDate;
      const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString() : 'N/A';
      
      // Build the modal HTML with modified layout
      modalContainer.innerHTML = `
        <div class="tmdb-modal">
          <div class="tmdb-modal-content">
            <div class="tmdb-modal-header">
              <button class="tmdb-modal-close">&times;</button>
              <h3>${details.title}</h3>
              ${details.originalTitle !== details.title ? `<h4 class="original-title">${details.originalTitle}</h4>` : ''}
            </div>
            <div class="tmdb-modal-body">
              <!-- Full-width overview and metadata section -->
              <div class="tmdb-full-width-section">
                <!-- Overview section -->
                <div class="tmdb-overview">${details.overview || 'No overview available.'}</div>
                
                <!-- Metadata section with lighter font -->
                <div class="tmdb-meta-full">
                  <div><strong>Rating:</strong> ${details.voteAverage?.toFixed(1) || 'N/A'}/10</div>
                  <div><strong>Release Date:</strong> ${formattedDate}</div>
                  ${type === 'movie' ? 
                    `<div><strong>Runtime:</strong> ${details.runtime ? `${details.runtime} min` : 'N/A'}</div>` : 
                    `<div><strong>Seasons:</strong> ${details.numberOfSeasons || 'N/A'}</div>
                     <div><strong>Episodes:</strong> ${details.numberOfEpisodes || 'N/A'}</div>`
                  }
                  <div><strong>Genres:</strong> ${details.genres?.map(g => g.name).join(', ') || 'N/A'}</div>
                </div>
              </div>
              
              <!-- Side-by-side poster and trailer container -->
              <div class="tmdb-media-container">
                <!-- Poster container - 1/3 width -->
                <div class="tmdb-poster-container">
                  <img src="${posterUrl}" alt="${details.title}" 
                    onerror="this.src='${TMDBAPI.getFallbackPosterUrl(details.title)}'">
                </div>
                
                <!-- Trailer container - 2/3 width -->
                <div class="tmdb-trailer-container">
                  ${details.trailer && details.trailer.key ? 
                    `<div class="tmdb-trailer">
                      <iframe 
                        width="100%" 
                        height="100%" 
                        src="https://www.youtube.com/embed/${details.trailer.key}" 
                        frameborder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowfullscreen
                      ></iframe>
                      <div class="tmdb-trailer-label">Trailer</div>
                    </div>` : 
                    `<div class="tmdb-no-trailer">
                      <div class="tmdb-no-trailer-content">
                        <div class="tmdb-no-trailer-icon">¯\\_(ツ)_/¯</div>
                        <div class="tmdb-no-trailer-text">No trailer available for this title</div>
                      </div>
                    </div>`
                  }
                </div>
              </div>
            </div>
            <div class="tmdb-modal-footer">
              <div class="tmdb-attribution">
                Data provided by <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">The Movie Database</a>
              </div>
            </div>
          </div>
        </div>
      `;
      
      // Re-add close functionality with animation
      const updatedCloseButton = modalContainer.querySelector('.tmdb-modal-close');
      updatedCloseButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Stop propagation to prevent other handlers
        this.hideModal(modalContainer);
      });
      
      // Re-add click outside to close with animation
      modalContainer.addEventListener('click', (e) => {
        if (e.target === modalContainer) {
          this.hideModal(modalContainer);
        }
      });
      
      // Add escape key to close with animation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modalContainer.style.display === 'flex') {
          this.hideModal(modalContainer);
        }
      });
    } catch (error) {
      console.error(`Error showing details for ${type} ${id}:`, error);
      
      // Restore the original content of the item
      item.innerHTML = originalContent;
      
      // Show error in modal
      const modalContainer = document.getElementById('tmdb-modal-container');
      if (modalContainer) {
        const modalBody = modalContainer.querySelector('.tmdb-modal-body');
        if (modalBody) {
          modalBody.innerHTML = `
            <div class="error-message">
              <p>Sorry, there was an error loading the details.</p>
              <p>Error: ${error.message}</p>
            </div>
          `;
        }
      }
    }
  },
  
  // Refresh movie data
  async refreshMovies() {
    console.log("Refreshing anime movies data...");
    
    // Find the refresh button and add loading state
    const refreshButton = document.querySelector('.tmdb-content-section:first-child .tmdb-refresh-button');
    if (refreshButton) {
      refreshButton.classList.add('loading');
      refreshButton.disabled = true;
    }
    
    try {
      // Clear the cache to force a fresh request
      TMDBAPI.clearCache();
      
      // Fetch new data
      const animeMovies = await TMDBAPI.getAnimeMovies();
      
      console.log(`Refreshed data with ${animeMovies.length} anime movies`);
      
      // Reload all content to ensure everything is in sync
      this.loadAnimeContent();
    } catch (error) {
      console.error("Error refreshing anime movies:", error);
      
      // Show error alert
      alert(`Error refreshing movies: ${error.message}`);
      
      // Reset the button
      if (refreshButton) {
        refreshButton.classList.remove('loading');
        refreshButton.disabled = false;
      }
    }
  },
  
  // Refresh TV show data
  async refreshTVShows() {
    console.log("Refreshing anime TV shows data...");
    
    // Find the refresh button and add loading state
    const refreshButton = document.querySelector('.tmdb-content-section:nth-child(2) .tmdb-refresh-button');
    if (refreshButton) {
      refreshButton.classList.add('loading');
      refreshButton.disabled = true;
    }
    
    try {
      // Clear the cache to force a fresh request
      TMDBAPI.clearCache();
      
      // Fetch new data
      const animeTVShows = await TMDBAPI.getAnimeTVShows();
      
      console.log(`Refreshed data with ${animeTVShows.length} anime TV shows`);
      
      // Reload all content to ensure everything is in sync
      this.loadAnimeContent();
    } catch (error) {
      console.error("Error refreshing anime TV shows:", error);
      
      // Show error alert
      alert(`Error refreshing TV shows: ${error.message}`);
      
      // Reset the button
      if (refreshButton) {
        refreshButton.classList.remove('loading');
        refreshButton.disabled = false;
      }
    }
  }
};

// Create a simple search functionality for anime content
TMDBIntegration.search = async function(query) {
  if (!query || query.trim().length === 0) {
    console.warn("Empty search query");
    return;
  }
  
  console.log(`Searching for anime: "${query}"`);
  
  try {
    const results = await TMDBAPI.searchAnime(query);
    
    console.log(`Found ${results.movies.length} movies and ${results.tvShows.length} TV shows matching "${query}"`);
    
    return results;
  } catch (error) {
    console.error(`Search error for "${query}":`, error);
    throw error;
  }
};

// Export the TMDBIntegration object
export { TMDBIntegration };

// Initialize the integration when the module is imported
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    TMDBIntegration.initialize();
  });
}