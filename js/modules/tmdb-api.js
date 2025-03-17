// tmdb-api.js
// Handles requests to The Movie Database (TMDB) API for anime content

import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';
import { CONFIG_PATHS, findValidConfigPath } from './content-core.js';

// Configuration for TMDB API
const tmdbConfig = {
  // Base API URL
  baseUrl: 'https://api.themoviedb.org/3',
  
  // API credentials - will be loaded from api-config.json
  apiKey: '',
  accessToken: '',
  
  // Caching settings
  cacheTTL: 30 * 60 * 1000, // 30 minutes in milliseconds
  
  // API endpoints for anime content
  endpoints: {
    animeMovies: '/discover/movie',
    animeTVShows: '/discover/tv',
    movieDetails: '/movie/',
    tvDetails: '/tv/',
    searchAnime: '/search/multi'
  },
  
  // Image URLs
  imageBaseUrl: 'https://image.tmdb.org/t/p/',
  posterSize: 'w92', // Small poster size for sidebar
  
  // Japanese animation genre ID in TMDB
  animeGenreId: 16, // Animation genre - we'll filter for Japanese content
  
  // Popular anime keywords (used to improve search results)
  animeKeywords: [
    'anime', 
    'japanese animation', 
    'manga', 
    'japan'
  ]
};

// Cache mechanism
const tmdbCache = {
  movies: {
    data: null,
    timestamp: 0
  },
  tvShows: {
    data: null,
    timestamp: 0
  },
  
  set(type, data) {
    this[type] = {
      data: data,
      timestamp: Date.now()
    };
  },
  
  get(type) {
    // Check if cache is valid
    if (this[type].data && (Date.now() - this[type].timestamp) < tmdbConfig.cacheTTL) {
      return this[type].data;
    }
    return null;
  },
  
  isValid(type) {
    return this[type].data && (Date.now() - this[type].timestamp) < tmdbConfig.cacheTTL;
  },
  
  clear() {
    this.movies = { data: null, timestamp: 0 };
    this.tvShows = { data: null, timestamp: 0 };
  }
};

// Load config from api-config.json
async function loadConfig() {
  try {
    const { path, response } = await findValidConfigPath(CONFIG_PATHS.apiConfig);
    
    if (response) {
      const config = await response.json();
      
      // Extract TMDB API credentials from config
      if (config.externalApis && config.externalApis.tmdb) {
        tmdbConfig.apiKey = config.externalApis.tmdb.apiKey || '';
        tmdbConfig.accessToken = config.externalApis.tmdb.accessToken || '';
        console.log("TMDB credentials loaded from api/api-config.json");
      } else {
        console.warn("No TMDB configuration found in api/api-config.json");
      }
    } else {
      console.error("Failed to load api/api-config.json");
    }
  } catch (error) {
    console.error("Error loading config:", error);
  }
}

// Initialize the TMDB API module
export async function initializeTMDB() {
  console.log("Initializing TMDB API module for anime content");
  
  // Load config first
  await loadConfig();
  
  // Validate API credentials
  if (!tmdbConfig.accessToken && !tmdbConfig.apiKey) {
    console.error("TMDB API credentials not configured");
    return false;
  }
  
  // Pre-fetch data to have it ready
  prefetchAnimeData();
  
  return true;
}

// Pre-fetch anime data to have it ready when needed
async function prefetchAnimeData() {
  try {
    // Start with a small delay to not block other initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Fetch in parallel
    const [movies, tvShows] = await Promise.all([
      fetchAnimeMovies(),
      fetchAnimeTVShows()
    ]);
    
    console.log(`Pre-fetched ${movies.length} anime movies and ${tvShows.length} anime TV shows`);
  } catch (error) {
    console.error("Error pre-fetching anime data:", error);
  }
}

// Execute a request to the TMDB API
async function executeTMDBRequest(endpoint, params = {}) {
  try {
    // Build the URL with query parameters
    const url = new URL(`${tmdbConfig.baseUrl}${endpoint}`);
    
    // Add API key if using key authentication
    if (tmdbConfig.apiKey && !tmdbConfig.accessToken) {
      url.searchParams.append('api_key', tmdbConfig.apiKey);
    }
    
    // Add additional query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    
    const fullUrl = url.toString();
    console.log(`Executing TMDB request: ${fullUrl}`);
    
    // Set up request headers
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add authorization header if using token authentication (preferred)
    if (tmdbConfig.accessToken) {
      headers['Authorization'] = `Bearer ${tmdbConfig.accessToken}`;
    }
    
    // Execute the request
    const response = await fetch(fullUrl, { headers });
    
    if (!response.ok) {
      // Try to get more information about the error
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorDetails = errorData.status_message || JSON.stringify(errorData);
      } catch (e) {
        // If we can't parse the response as JSON, use the status text
        errorDetails = response.statusText;
      }
      
      throw new Error(`TMDB API error (${response.status}): ${errorDetails}`);
    }
    
    // Parse and return the response data
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error executing TMDB request to ${endpoint}:`, error);
    throw error;
  }
}

// Fetch anime movies from TMDB
export async function fetchAnimeMovies() {
  return ErrorRecovery.retryOperation('fetchAnimeMovies', async () => {
    LoadingIndicator.startLoading('tmdb-anime-movies', 'Loading anime movies...');
    PerformanceMonitor.startTiming('fetchAnimeMovies');
    
    try {
      // Check if we have valid cached data
      if (tmdbCache.isValid('movies')) {
        console.log("Using cached anime movies data");
        LoadingIndicator.endLoading('tmdb-anime-movies');
        return tmdbCache.get('movies');
      }
      
      // Parameters for discovering anime movies
      // - Using animation genre ID and Japanese origin
      // - Sorting by popularity
      const params = {
        with_genres: tmdbConfig.animeGenreId,
        with_original_language: 'ja', // Japanese language
        sort_by: 'popularity.desc',
        include_adult: false,
        page: 1
      };
      
      // Execute the request
      const data = await executeTMDBRequest(tmdbConfig.endpoints.animeMovies, params);
      
      // Process the results
      const animeMovies = data.results.slice(0, 10).map((movie, index) => ({
        rank: index + 1,
        id: movie.id,
        title: movie.title,
        originalTitle: movie.original_title,
        releaseDate: movie.release_date,
        voteAverage: movie.vote_average,
        posterPath: movie.poster_path ? 
          `${tmdbConfig.imageBaseUrl}${tmdbConfig.posterSize}${movie.poster_path}` : 
          null
      }));
      
      // Cache the results
      tmdbCache.set('movies', animeMovies);
      
      LoadingIndicator.endLoading('tmdb-anime-movies');
      PerformanceMonitor.endTiming('fetchAnimeMovies');
      
      return animeMovies;
    } catch (error) {
      LoadingIndicator.endLoading('tmdb-anime-movies');
      throw error; // Rethrow for retry system
    }
  });
}

// Fetch anime TV shows from TMDB
export async function fetchAnimeTVShows() {
  return ErrorRecovery.retryOperation('fetchAnimeTVShows', async () => {
    LoadingIndicator.startLoading('tmdb-anime-tvshows', 'Loading anime TV shows...');
    PerformanceMonitor.startTiming('fetchAnimeTVShows');
    
    try {
      // Check if we have valid cached data
      if (tmdbCache.isValid('tvShows')) {
        console.log("Using cached anime TV shows data");
        LoadingIndicator.endLoading('tmdb-anime-tvshows');
        return tmdbCache.get('tvShows');
      }
      
      // Parameters for discovering anime TV shows
      const params = {
        with_genres: tmdbConfig.animeGenreId,
        with_original_language: 'ja', // Japanese language
        sort_by: 'popularity.desc',
        include_adult: false,
        page: 1
      };
      
      // Execute the request
      const data = await executeTMDBRequest(tmdbConfig.endpoints.animeTVShows, params);
      
      // Process the results
      const animeTVShows = data.results.slice(0, 10).map((show, index) => ({
        rank: index + 1,
        id: show.id,
        title: show.name,
        originalTitle: show.original_name,
        firstAirDate: show.first_air_date,
        voteAverage: show.vote_average,
        posterPath: show.poster_path ? 
          `${tmdbConfig.imageBaseUrl}${tmdbConfig.posterSize}${show.poster_path}` : 
          null
      }));
      
      // Cache the results
      tmdbCache.set('tvShows', animeTVShows);
      
      LoadingIndicator.endLoading('tmdb-anime-tvshows');
      PerformanceMonitor.endTiming('fetchAnimeTVShows');
      
      return animeTVShows;
    } catch (error) {
      LoadingIndicator.endLoading('tmdb-anime-tvshows');
      throw error; // Rethrow for retry system
    }
  });
}

// Search for anime content in TMDB
export async function searchAnimeContent(query) {
  return ErrorRecovery.retryOperation('searchAnimeContent', async () => {
    if (!query || query.trim().length === 0) {
      return { movies: [], tvShows: [] };
    }
    
    LoadingIndicator.startLoading('tmdb-search', `Searching for "${query}"...`);
    PerformanceMonitor.startTiming('searchAnimeContent');
    
    try {
      // Parameters for search
      const params = {
        query: query,
        include_adult: false,
        language: 'en-US',
        page: 1
      };
      
      // Execute the search request
      const data = await executeTMDBRequest(tmdbConfig.endpoints.searchAnime, params);
      
      // Filter and categorize the results
      const movies = [];
      const tvShows = [];
      
      data.results.forEach(item => {
        // Filter by media type and build the result object
        if (item.media_type === 'movie') {
          movies.push({
            id: item.id,
            title: item.title,
            originalTitle: item.original_title,
            releaseDate: item.release_date,
            voteAverage: item.vote_average,
            posterPath: item.poster_path ? 
              `${tmdbConfig.imageBaseUrl}${tmdbConfig.posterSize}${item.poster_path}` : 
              null
          });
        } else if (item.media_type === 'tv') {
          tvShows.push({
            id: item.id,
            title: item.name,
            originalTitle: item.original_name,
            firstAirDate: item.first_air_date,
            voteAverage: item.vote_average,
            posterPath: item.poster_path ? 
              `${tmdbConfig.imageBaseUrl}${tmdbConfig.posterSize}${item.poster_path}` : 
              null
          });
        }
      });
      
      LoadingIndicator.endLoading('tmdb-search');
      PerformanceMonitor.endTiming('searchAnimeContent');
      
      return {
        movies: movies.slice(0, 5), // Limit to top 5 results
        tvShows: tvShows.slice(0, 5)
      };
    } catch (error) {
      LoadingIndicator.endLoading('tmdb-search');
      throw error; // Rethrow for retry system
    }
  });
}

// Get details for a specific movie
export async function getMovieDetails(movieId) {
  return ErrorRecovery.retryOperation(`getMovieDetails-${movieId}`, async () => {
    LoadingIndicator.startLoading(`tmdb-movie-${movieId}`, 'Loading movie details...');
    
    try {
      // Execute the request
      const data = await executeTMDBRequest(`${tmdbConfig.endpoints.movieDetails}${movieId}`, {
        append_to_response: 'videos,images'
      });
      
      // Process the result
      const movieDetails = {
        id: data.id,
        title: data.title,
        originalTitle: data.original_title,
        overview: data.overview,
        releaseDate: data.release_date,
        runtime: data.runtime,
        voteAverage: data.vote_average,
        genres: data.genres,
        posterPath: data.poster_path ? 
          `${tmdbConfig.imageBaseUrl}${tmdbConfig.posterSize}${data.poster_path}` : 
          null,
        backdropPath: data.backdrop_path ? 
          `${tmdbConfig.imageBaseUrl}original${data.backdrop_path}` : 
          null,
        // Include trailer if available
        trailer: data.videos && data.videos.results && data.videos.results.length > 0 ?
          data.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube') || 
          data.videos.results[0] : 
          null
      };
      
      LoadingIndicator.endLoading(`tmdb-movie-${movieId}`);
      return movieDetails;
    } catch (error) {
      LoadingIndicator.endLoading(`tmdb-movie-${movieId}`);
      throw error; // Rethrow for retry system
    }
  });
}

// Get details for a specific TV show
export async function getTVShowDetails(tvId) {
  return ErrorRecovery.retryOperation(`getTVShowDetails-${tvId}`, async () => {
    LoadingIndicator.startLoading(`tmdb-tv-${tvId}`, 'Loading TV show details...');
    
    try {
      // Execute the request
      const data = await executeTMDBRequest(`${tmdbConfig.endpoints.tvDetails}${tvId}`, {
        append_to_response: 'videos,images'
      });
      
      // Process the result
      const tvDetails = {
        id: data.id,
        title: data.name,
        originalTitle: data.original_name,
        overview: data.overview,
        firstAirDate: data.first_air_date,
        numberOfSeasons: data.number_of_seasons,
        numberOfEpisodes: data.number_of_episodes,
        voteAverage: data.vote_average,
        genres: data.genres,
        posterPath: data.poster_path ? 
          `${tmdbConfig.imageBaseUrl}${tmdbConfig.posterSize}${data.poster_path}` : 
          null,
        backdropPath: data.backdrop_path ? 
          `${tmdbConfig.imageBaseUrl}original${data.backdrop_path}` : 
          null,
        // Include trailer if available
        trailer: data.videos && data.videos.results && data.videos.results.length > 0 ?
          data.videos.results.find(video => video.type === 'Trailer' && video.site === 'YouTube') || 
          data.videos.results[0] : 
          null
      };
      
      LoadingIndicator.endLoading(`tmdb-tv-${tvId}`);
      return tvDetails;
    } catch (error) {
      LoadingIndicator.endLoading(`tmdb-tv-${tvId}`);
      throw error; // Rethrow for retry system
    }
  });
}

// Clear the cache to force fresh data
export function clearCache() {
  tmdbCache.clear();
  console.log("TMDB cache cleared");
}

// Create a fallback image URL if poster is missing
export function getFallbackPosterUrl(title) {
  // Create a placeholder image with the title text
  return `https://placehold.co/92x138/333/666?text=${encodeURIComponent(title || 'No Image')}`;
}

// Export the API as a single object for easier global access
export const TMDBAPI = {
  initialize: initializeTMDB,
  getAnimeMovies: fetchAnimeMovies,
  getAnimeTVShows: fetchAnimeTVShows,
  searchAnime: searchAnimeContent,
  getMovieDetails: getMovieDetails,
  getTVShowDetails: getTVShowDetails,
  clearCache: clearCache,
  getFallbackPosterUrl: getFallbackPosterUrl
};

// Automatically initialize when imported if window is defined
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initializeTMDB();
    
    // Make the API globally available
    window.TMDBAPI = TMDBAPI;
    
    console.log("TMDB API module initialized for anime content");
  });
}