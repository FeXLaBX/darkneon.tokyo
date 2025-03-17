// external-content.js - Updated with TMDB API integration

// Import the TMDB API module
import { TMDBAPI } from './tmdb-api.js';

// Track our initialization state
let isInitialized = false;

export function initializeExternalContent() {
  console.log("Preparing external content initialization...");
  
  // Only initialize once
  if (isInitialized) {
    console.log("External content already initialized");
    return;
  }
  
  // Check if content boxes are already available
  if (window.contentBoxManager && window.contentBoxManager.isReady) {
    console.log("Content boxes are already available, initializing external content immediately");
    executeInitialization();
  } else {
    // Set up the event listener for when content boxes become available
    console.log("Content boxes not ready yet, waiting for contentBoxesReady event");
    window.addEventListener('contentBoxesReady', () => {
      console.log("Received contentBoxesReady event, initializing external content");
      executeInitialization();
    });
    
    // Also set a fallback timeout in case the event doesn't fire
    setTimeout(() => {
      if (!isInitialized && window.contentBoxes && window.contentBoxes.jellyfin) {
        console.log("Fallback initialization triggering for external content");
        executeInitialization();
      } else if (!isInitialized) {
        console.error("Failed to initialize external content - content boxes still not available after timeout");
      }
    }, 3000); // 3 second timeout
  }
}

// Actual initialization logic separated for reuse
function executeInitialization() {
  // Prevent double initialization
  if (isInitialized) return;
  
  console.log("Executing external content initialization");
  
  // Validate content boxes existence
  if (!window.contentBoxes || !window.contentBoxes.jellyfin) {
    console.error("Content boxes object not found or incomplete");
    logContentBoxState();
    return;
  }
  
  // Check if jellyfin content boxes are available
  if (!window.contentBoxes.jellyfin.left || 
      !window.contentBoxes.jellyfin.right || 
      !window.contentBoxes.jellyfin.bottom) {
    console.error("Jellyfin content boxes not fully available");
    logContentBoxState();
    return;
  }
  
  try {
    // Initialize TMDB API if needed
    if (!window.TMDBAPI) {
      console.log("Initializing TMDB API from external-content.js");
      import('./tmdb-api.js').then(module => {
        window.TMDBAPI = module.TMDBAPI;
        module.TMDBAPI.initialize();
        
        // Load movie and TV charts with real data
        loadMovieTVCharts();
      }).catch(error => {
        console.error("Error importing TMDB API module:", error);
        // Fall back to sample data if import fails
        loadMovieTVChartsWithSampleData();
      });
    } else {
      // TMDB API already initialized, load charts directly
      loadMovieTVCharts();
    }
    
    // Load media trailers
    loadMediaTrailers();
    
    // Load media news
    loadMediaNews();
    
    // Mark as initialized
    isInitialized = true;
    console.log("External content successfully initialized");
  } catch (error) {
    console.error("Error during external content initialization:", error);
  }
}

// Helper to log the current state of content boxes
function logContentBoxState() {
  console.log("Content boxes state:", {
    exists: !!window.contentBoxes,
    jellyfinExists: window.contentBoxes ? !!window.contentBoxes.jellyfin : false,
    boxesIfExists: window.contentBoxes && window.contentBoxes.jellyfin ? {
      left: !!window.contentBoxes.jellyfin.left,
      right: !!window.contentBoxes.jellyfin.right,
      bottom: !!window.contentBoxes.jellyfin.bottom
    } : 'N/A'
  });
}

// Load movie and TV show charts with real TMDB data
async function loadMovieTVCharts() {
  console.log("Loading real anime movie and TV charts from TMDB...");
  
  // Get the movie-tv-charts box for Jellyfin
  const chartBox = window.contentBoxes.jellyfin.left;
  if (!chartBox) {
    console.error("Jellyfin left content box (charts) not found");
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
    // If TMDB API is not available yet, try to import it
    if (!window.TMDBAPI) {
      const module = await import('./tmdb-api.js');
      window.TMDBAPI = module.TMDBAPI;
      module.TMDBAPI.initialize();
    }
    
    // Fetch anime movies and TV shows in parallel
    const [animeMovies, animeTVShows] = await Promise.all([
      window.TMDBAPI.getAnimeMovies(),
      window.TMDBAPI.getAnimeTVShows()
    ]);
    
    console.log(`Fetched ${animeMovies.length} anime movies and ${animeTVShows.length} anime TV shows`);
    
    // Build the HTML content
    let html = '';
    
    // Add anime movies section
    html += '<h4>Top Anime Movies</h4>';
    
    if (animeMovies.length === 0) {
      html += '<div class="no-data-message">No anime movies found</div>';
    } else {
      animeMovies.forEach(movie => {
        const posterUrl = movie.posterPath || 
          window.TMDBAPI.getFallbackPosterUrl(movie.title);
        
        html += `
          <div class="media-chart-item" data-id="${movie.id}" data-type="movie">
            <div class="chart-rank">${movie.rank}</div>
            <div class="chart-poster">
              <img src="${posterUrl}" alt="${movie.title}" 
                onerror="this.src='https://placehold.co/92x138/333/666?text=${encodeURIComponent(movie.title)}'">
            </div>
            <div class="chart-title">
              <div class="chart-title-text">${movie.title}</div>
              <div class="chart-year">${movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A'}</div>
              <div class="chart-rating">★ ${movie.voteAverage?.toFixed(1) || 'N/A'}</div>
            </div>
          </div>
        `;
      });
    }
    
    // Add anime TV shows section
    html += '<h4>Top Anime Series</h4>';
    
    if (animeTVShows.length === 0) {
      html += '<div class="no-data-message">No anime TV shows found</div>';
    } else {
      animeTVShows.forEach(show => {
        const posterUrl = show.posterPath || 
          window.TMDBAPI.getFallbackPosterUrl(show.title);
        
        html += `
          <div class="media-chart-item" data-id="${show.id}" data-type="tv">
            <div class="chart-rank">${show.rank}</div>
            <div class="chart-poster">
              <img src="${posterUrl}" alt="${show.title}" 
                onerror="this.src='https://placehold.co/92x138/333/666?text=${encodeURIComponent(show.title)}'">
            </div>
            <div class="chart-title">
              <div class="chart-title-text">${show.title}</div>
              <div class="chart-year">${show.firstAirDate ? new Date(show.firstAirDate).getFullYear() : 'N/A'}</div>
              <div class="chart-rating">★ ${show.voteAverage?.toFixed(1) || 'N/A'}</div>
            </div>
          </div>
        `;
      });
    }
    
    // Add "Powered by TMDB" attribution
    html += `
      <div class="tmdb-attribution">
        <span>Data provided by </span>
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">The Movie Database</a>
      </div>
    `;
    
    // Update the content
    contentDiv.innerHTML = html;
    
    // Add click event listeners for details
    const chartItems = contentDiv.querySelectorAll('.media-chart-item');
    chartItems.forEach(item => {
      item.addEventListener('click', handleChartItemClick);
    });
    
    console.log("Anime movie and TV charts loaded successfully from TMDB");
    
    // Add custom styles for the enhanced charts
    addMovieTVChartsStyles();
    
  } catch (error) {
    console.error("Error loading anime charts from TMDB:", error);
    
    // Fall back to sample data if API request fails
    loadMovieTVChartsWithSampleData();
  }
}

// Handle clicks on chart items
function handleChartItemClick(event) {
  const item = event.currentTarget;
  const id = item.getAttribute('data-id');
  const type = item.getAttribute('data-type');
  
  console.log(`Clicked on ${type} with ID ${id}`);
  
  // Show details in a modal or popup
  if (window.TMDBAPI) {
    showMediaDetails(id, type);
  }
}

// Show media details in a modal
async function showMediaDetails(id, type) {
  try {
    // Create or get the modal container
    let modalContainer = document.getElementById('tmdb-modal-container');
    
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'tmdb-modal-container';
      document.body.appendChild(modalContainer);
    }
    
    // Show loading state
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
              <div>Loading media details...</div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Show the modal
    modalContainer.style.display = 'flex';
    
    // Add close functionality
    const closeButton = modalContainer.querySelector('.tmdb-modal-close');
    closeButton.addEventListener('click', () => {
      modalContainer.style.display = 'none';
    });
    
    // Close on click outside the modal content
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        modalContainer.style.display = 'none';
      }
    });
    
    // Fetch the details based on the type
    let details;
    if (type === 'movie') {
      details = await window.TMDBAPI.getMovieDetails(id);
    } else if (type === 'tv') {
      details = await window.TMDBAPI.getTVShowDetails(id);
    } else {
      throw new Error(`Unknown media type: ${type}`);
    }
    
    // Create the modal content based on the details
    const posterUrl = details.posterPath || 
      window.TMDBAPI.getFallbackPosterUrl(details.title);
    
    // Video embed code if a trailer is available
    let trailerEmbed = '';
    if (details.trailer && details.trailer.key) {
      trailerEmbed = `
        <div class="tmdb-trailer">
          <iframe 
            width="100%" 
            height="250" 
            src="https://www.youtube.com/embed/${details.trailer.key}" 
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowfullscreen
          ></iframe>
        </div>
      `;
    }
    
    // Format release date or first air date
    const releaseDate = type === 'movie' ? details.releaseDate : details.firstAirDate;
    const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString() : 'N/A';
    
    // Build the modal HTML
    modalContainer.innerHTML = `
      <div class="tmdb-modal">
        <div class="tmdb-modal-content">
          <div class="tmdb-modal-header">
            <button class="tmdb-modal-close">&times;</button>
            <h3>${details.title}</h3>
            ${details.originalTitle !== details.title ? `<h4 class="original-title">${details.originalTitle}</h4>` : ''}
          </div>
          <div class="tmdb-modal-body">
            <div class="tmdb-details-container">
              <div class="tmdb-poster">
                <img src="${posterUrl}" alt="${details.title}" 
                  onerror="this.src='https://placehold.co/300x450/333/666?text=${encodeURIComponent(details.title)}'">
              </div>
              <div class="tmdb-info">
                <div class="tmdb-overview">${details.overview || 'No overview available.'}</div>
                <div class="tmdb-meta">
                  <div><strong>Rating:</strong> ${details.voteAverage?.toFixed(1) || 'N/A'}/10</div>
                  <div><strong>Release Date:</strong> ${formattedDate}</div>
                  ${type === 'movie' ? 
                    `<div><strong>Runtime:</strong> ${details.runtime ? `${details.runtime} min` : 'N/A'}</div>` : 
                    `<div><strong>Seasons:</strong> ${details.numberOfSeasons || 'N/A'}</div>
                     <div><strong>Episodes:</strong> ${details.numberOfEpisodes || 'N/A'}</div>`
                  }
                  <div><strong>Genres:</strong> ${details.genres?.map(g => g.name).join(', ') || 'N/A'}</div>
                </div>
                ${trailerEmbed}
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
    
    // Re-add close functionality
    const updatedCloseButton = modalContainer.querySelector('.tmdb-modal-close');
    updatedCloseButton.addEventListener('click', () => {
      modalContainer.style.display = 'none';
    });
    
    // Re-add click outside to close
    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        modalContainer.style.display = 'none';
      }
    });
    
    // Add escape key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalContainer.style.display === 'flex') {
        modalContainer.style.display = 'none';
      }
    });
    
  } catch (error) {
    console.error(`Error showing details for ${type} ${id}:`, error);
    
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
}

// Add custom styles for movie and TV charts
function addMovieTVChartsStyles() {
  // Check if our styles already exist
  if (document.getElementById('tmdb-charts-styles')) {
    return;
  }
  
  // Create a style element
  const styleElement = document.createElement('style');
  styleElement.id = 'tmdb-charts-styles';
  
  // Add CSS rules
  styleElement.textContent = `
    /* Enhanced media chart item */
    .media-chart-item {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      padding: 8px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.2);
      transition: background-color 0.3s ease, transform 0.2s ease;
      cursor: pointer;
      border-radius: 4px;
    }
    
    .media-chart-item:hover {
      background-color: rgba(0, 255, 0, 0.1);
      transform: translateY(-2px);
      box-shadow: 0 2px 5px rgba(0, 255, 0, 0.2);
    }
    
    .chart-rank {
      font-size: 1.4rem;
      font-weight: bold;
      color: var(--matrix-green);
      width: 30px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .chart-poster {
      width: 46px;
      height: 69px;
      margin-right: 12px;
      flex-shrink: 0;
      border: 1px solid rgba(0, 255, 0, 0.3);
      overflow: hidden;
      transition: all 0.3s ease;
    }
    
    .media-chart-item:hover .chart-poster {
      border-color: var(--matrix-green);
      box-shadow: 0 0 8px rgba(0, 255, 0, 0.5);
    }
    
    .chart-poster img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .chart-title {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .chart-title-text {
      font-weight: bold;
      color: #fff;
    }
    
    .chart-year {
      font-size: 0.8rem;
      color: #aaa;
    }
    
    .chart-rating {
      font-size: 0.9rem;
      color: var(--matrix-green);
    }
    
    .no-data-message {
      color: #aaa;
      font-style: italic;
      padding: 10px 0;
      text-align: center;
    }
    
    /* Loading container */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      color: #aaa;
    }
    
    /* TMDB attribution */
    .tmdb-attribution {
      font-size: 0.8rem;
      color: #aaa;
      text-align: center;
      margin-top: 20px;
      padding-top: 5px;
      border-top: 1px solid rgba(0, 255, 0, 0.2);
    }
    
    .tmdb-attribution a {
      color: var(--matrix-green);
      text-decoration: none;
      transition: color 0.3s ease;
    }
    
    .tmdb-attribution a:hover {
      color: #fff;
      text-decoration: underline;
    }
    
    /* Modal styles */
    #tmdb-modal-container {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      z-index: 500;
      justify-content: center;
      align-items: center;
    }
    
    .tmdb-modal {
      width: 90%;
      max-width: 800px;
      max-height: 90vh;
      background-color: rgba(0, 0, 0, 0.9);
      border: 1px solid var(--matrix-green);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 0 20px rgba(0, 255, 0, 0.3);
    }
    
    .tmdb-modal-content {
      display: flex;
      flex-direction: column;
      height: 100%;
    }
    
    .tmdb-modal-header {
      padding: 15px 20px;
      border-bottom: 1px solid rgba(0, 255, 0, 0.3);
      position: relative;
    }
    
    .tmdb-modal-header h3 {
      margin: 0;
      color: var(--matrix-green);
      font-size: 1.5rem;
    }
    
    .original-title {
      margin: 5px 0 0 0;
      font-size: 1rem;
      color: #aaa;
      font-weight: normal;
    }
    
    .tmdb-modal-close {
      position: absolute;
      top: 15px;
      right: 20px;
      background: none;
      border: none;
      color: var(--matrix-green);
      font-size: 1.5rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    
    .tmdb-modal-close:hover {
      color: #fff;
      transform: scale(1.2);
    }
    
    .tmdb-modal-body {
      padding: 20px;
      overflow-y: auto;
    }
    
    .tmdb-details-container {
      display: flex;
      gap: 20px;
    }
    
    @media (max-width: 600px) {
      .tmdb-details-container {
        flex-direction: column;
      }
    }
    
    .tmdb-poster {
      width: 200px;
      flex-shrink: 0;
      border: 1px solid rgba(0, 255, 0, 0.3);
    }
    
    .tmdb-poster img {
      width: 100%;
      height: auto;
      display: block;
    }
    
    .tmdb-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 15px;
    }
    
    .tmdb-overview {
      line-height: 1.5;
      margin-bottom: 10px;
    }
    
    .tmdb-meta {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .tmdb-trailer {
      margin-top: 15px;
      width: 100%;
    }
    
    .tmdb-modal-footer {
      padding: 10px 20px;
      border-top: 1px solid rgba(0, 255, 0, 0.3);
    }
    
    .error-message {
      color: #ff6b6b;
      text-align: center;
      padding: 20px;
    }
  `;
  
  // Add to document head
  document.head.appendChild(styleElement);
  console.log("Added custom styles for TMDB charts and modals");
}

// Original function as fallback
function loadMovieTVChartsWithSampleData() {
  console.log("Loading sample movie and TV charts (fallback)...");
  
  // For now, use sample data - in a real implementation, this would fetch from an API
  const sampleCharts = {
    movies: [
      { rank: 1, title: "Dune: Part Two" },
      { rank: 2, title: "Poor Things" },
      { rank: 3, title: "The Creator" },
      { rank: 4, title: "Oppenheimer" },
      { rank: 5, title: "Civil War" }
    ],
    tvShows: [
      { rank: 1, title: "The Last of Us" },
      { rank: 2, title: "Shogun" },
      { rank: 3, title: "House of the Dragon" },
      { rank: 4, title: "The Mandalorian" },
      { rank: 5, title: "Fallout" }
    ]
  };
  
  // Get the movie-tv-charts box for Jellyfin
  const chartBox = window.contentBoxes.jellyfin.left;
  if (!chartBox) {
    console.error("Jellyfin left content box (charts) not found");
    return;
  }
  
  const contentDiv = chartBox.querySelector('.content-box-content');
  if (!contentDiv) {
    console.error("Content div not found in chart box");
    return;
  }
  
  let html = '';
  
  // Add notice that we're using sample data
  html += `
    <div style="color: #ff9800; margin-bottom: 15px; text-align: center;">
      ⚠️ Using sample data - TMDB API unavailable
    </div>
  `;
  
  // Add movies section
  html += '<h4>Top Movies</h4>';
  sampleCharts.movies.forEach(movie => {
    html += `
      <div class="media-chart-item">
        <div class="chart-rank">${movie.rank}</div>
        <div class="chart-title">${movie.title}</div>
      </div>
    `;
  });
  
  // Add TV shows section
  html += '<h4>Top TV Shows</h4>';
  sampleCharts.tvShows.forEach(show => {
    html += `
      <div class="media-chart-item">
        <div class="chart-rank">${show.rank}</div>
        <div class="chart-title">${show.title}</div>
      </div>
    `;
  });
  
  // Update the content
  contentDiv.innerHTML = html;
  console.log("Sample movie and TV charts loaded successfully (fallback)");
}

// Load media trailers
function loadMediaTrailers() {
  console.log("Loading media trailers...");
  
  // Sample trailers data - would normally come from an API
  const sampleTrailers = [
    { title: "Gladiator II", thumbnail: "https://placehold.co/280x150/333/666?text=Gladiator+II" },
    { title: "Kingdom of the Planet of the Apes", thumbnail: "https://placehold.co/280x150/333/666?text=Planet+of+the+Apes" },
    { title: "The Penguin", thumbnail: "https://placehold.co/280x150/333/666?text=The+Penguin" }
  ];
  
  // Get the media-trailers box for Jellyfin
  const trailerBox = window.contentBoxes.jellyfin.bottom;
  if (!trailerBox) {
    console.error("Jellyfin bottom content box (trailers) not found");
    return;
  }
  
  const contentDiv = trailerBox.querySelector('.content-box-content');
  if (!contentDiv) {
    console.error("Content div not found in trailer box");
    return;
  }
  
  let html = '';
  
  // Add trailers
  sampleTrailers.forEach(trailer => {
    html += `
      <div class="trailer-container">
        <img src="${trailer.thumbnail}" class="trailer-thumbnail" alt="${trailer.title}">
        <div class="trailer-title">${trailer.title}</div>
      </div>
    `;
  });
  
  // Update the content
  contentDiv.innerHTML = html;
  console.log("Media trailers loaded successfully");
}

// Load media news
function loadMediaNews() {
  console.log("Loading media news...");
  
  // Import and use the entertainment news module
  import('./entertainment-news.js').then(module => {
    console.log("Entertainment news module loaded successfully");
    
    // Use the refactored EntertainmentNews API
    if (module.EntertainmentNews) {
      // The API key setting has been replaced with RSS URL configuration
      // You can set a custom RSS URL if needed:
      // module.EntertainmentNews.setRssUrl('https://your-custom-rss-feed-url');
      
      // Load and display the news
      module.loadAndDisplayEntertainmentNews();
    } else {
      console.warn("EntertainmentNews API not found in module, trying direct function call");
      // Try the direct function as fallback
      if (typeof module.loadAndDisplayEntertainmentNews === 'function') {
        module.loadAndDisplayEntertainmentNews();
      } else {
        console.error("No suitable entertainment news functions found in module");
        loadFallbackMediaNews();
      }
    }
  }).catch(error => {
    console.error("Failed to load entertainment news module:", error);
    // Fall back to the original method if import fails
    loadFallbackMediaNews();
  });
}

// Original news loading as fallback
function loadFallbackMediaNews() {
  console.log("Using fallback news data...");
  
  // Sample news data - would normally come from an API
  const sampleNews = [
    {
      title: "Production Begins on 'The Batman 2'",
      description: "Director Matt Reeves announces filming has started on the highly anticipated sequel.",
      source: "Movie Insider",
      image: "https://placehold.co/100x60/333/666?text=Batman+2"
    },
    {
      title: "Netflix Renews Popular Series for Final Season",
      description: "The streaming giant confirms one more season to wrap up the story.",
      source: "TV Guide",
      image: "https://placehold.co/100x60/333/666?text=Netflix+Series"
    },
    {
      title: "Academy Announces Changes to Oscar Categories",
      description: "New rules will affect eligibility for several major awards next year.",
      source: "Film Journal",
      image: "https://placehold.co/100x60/333/666?text=Oscar+News"
    }
  ];
  
  // Get the media-news box for Jellyfin
  const newsBox = window.contentBoxes.jellyfin.right;
  if (!newsBox) {
    console.error("Jellyfin right content box (news) not found");
    return;
  }
  
  const contentDiv = newsBox.querySelector('.content-box-content');
  if (!contentDiv) {
    console.error("Content div not found in news box");
    return;
  }
  
  let html = '';
  
  // Add fallback indicator
  html += `<div style="font-size: 0.7em; text-align: right; margin-bottom: 8px; color: #aaa;">
    Using sample news data
  </div>`;
  
  // Add news items
  sampleNews.forEach(news => {
    html += `
      <div class="news-item">
        <img src="${news.image}" class="news-image" alt="${news.title}">
        <div class="news-content">
          <div class="news-title">${news.title}</div>
          <div class="news-description">${news.description}</div>
          <div class="news-source">${news.source} (Sample)</div>
        </div>
      </div>
    `;
  });
  
  // Update the content
  contentDiv.innerHTML = html;
  console.log("Fallback media news loaded successfully");
}

// Expose functions for external use
export { loadMovieTVCharts, loadMediaTrailers, loadMediaNews };