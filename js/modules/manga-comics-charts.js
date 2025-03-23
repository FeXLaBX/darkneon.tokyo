// manga-comics-charts.js - Module for displaying manga and comics charts
// Similar to TMDB API integration but for manga/comics content

import { ErrorRecovery } from './error-recovery.js';
import { LoadingIndicator } from './loading-indicators.js';
import { PerformanceMonitor } from './performance-monitoring.js';

// Configuration for chart data sources
const chartsConfig = {
  // Cache duration in milliseconds
  cacheTTL: 60 * 60 * 1000, // 1 hour
  
  // Whether to use sample data (true) or attempt API calls (false)
  useSampleData: true, // Set to true for now, change to false when real APIs are implemented
  
  // Sample data to use when APIs are unavailable or for development
  sampleData: {
    manga: [
      { 
        id: 1, 
        title: "Chainsaw Man", 
        author: "Tatsuki Fujimoto", 
        rating: 4.8, 
        cover: "https://placehold.co/90x135/333/ccc?text=Chainsaw+Man",
        category: "Manga"
      },
      { 
        id: 2, 
        title: "Jujutsu Kaisen", 
        author: "Gege Akutami", 
        rating: 4.7, 
        cover: "https://placehold.co/90x135/333/ccc?text=Jujutsu+Kaisen",
        category: "Manga"
      },
      { 
        id: 3, 
        title: "One Piece", 
        author: "Eiichiro Oda", 
        rating: 4.9, 
        cover: "https://placehold.co/90x135/333/ccc?text=One+Piece",
        category: "Manga"
      },
      { 
        id: 4, 
        title: "Spy × Family", 
        author: "Tatsuya Endo", 
        rating: 4.8, 
        cover: "https://placehold.co/90x135/333/ccc?text=Spy+Family",
        category: "Manga"
      },
      { 
        id: 5, 
        title: "My Hero Academia", 
        author: "Kohei Horikoshi", 
        rating: 4.6, 
        cover: "https://placehold.co/90x135/333/ccc?text=My+Hero+Academia",
        category: "Manga"
      }
    ],
    webtoons: [
      { 
        id: 1, 
        title: "Tower of God", 
        author: "SIU", 
        rating: 4.8, 
        cover: "https://placehold.co/90x135/333/ccc?text=Tower+of+God",
        category: "Webtoon"
      },
      { 
        id: 2, 
        title: "Solo Leveling", 
        author: "Chugong", 
        rating: 4.9, 
        cover: "https://placehold.co/90x135/333/ccc?text=Solo+Leveling",
        category: "Webtoon"
      },
      { 
        id: 3, 
        title: "Under the Oak Tree", 
        author: "Kim Soo-ji", 
        rating: 4.7, 
        cover: "https://placehold.co/90x135/333/ccc?text=Under+Oak+Tree",
        category: "Webtoon"
      },
      { 
        id: 4, 
        title: "The Beginning After the End", 
        author: "TurtleMe", 
        rating: 4.7, 
        cover: "https://placehold.co/90x135/333/ccc?text=TBATE",
        category: "Webtoon"
      },
      { 
        id: 5, 
        title: "True Beauty", 
        author: "Yaongyi", 
        rating: 4.6, 
        cover: "https://placehold.co/90x135/333/ccc?text=True+Beauty",
        category: "Webtoon"
      }
    ],
    comics: [
      { 
        id: 1, 
        title: "Batman", 
        author: "Various", 
        rating: 4.7, 
        cover: "https://placehold.co/90x135/333/ccc?text=Batman",
        category: "Comic"
      },
      { 
        id: 2, 
        title: "Saga", 
        author: "Brian K. Vaughan", 
        rating: 4.9, 
        cover: "https://placehold.co/90x135/333/ccc?text=Saga",
        category: "Comic"
      },
      { 
        id: 3, 
        title: "Invincible", 
        author: "Robert Kirkman", 
        rating: 4.8, 
        cover: "https://placehold.co/90x135/333/ccc?text=Invincible",
        category: "Comic"
      },
      { 
        id: 4, 
        title: "Something is Killing the Children", 
        author: "James Tynion IV", 
        rating: 4.6, 
        cover: "https://placehold.co/90x135/333/ccc?text=SIKTC",
        category: "Comic"
      },
      { 
        id: 5, 
        title: "Immortal Hulk", 
        author: "Al Ewing", 
        rating: 4.7, 
        cover: "https://placehold.co/90x135/333/ccc?text=Immortal+Hulk",
        category: "Comic"
      }
    ]
  }
};

// Cache system
const chartCache = {
  data: {},
  timestamp: {},
  
  set(key, data) {
    this.data[key] = data;
    this.timestamp[key] = Date.now();
  },
  
  get(key) {
    if (this.data[key] && (Date.now() - this.timestamp[key] < chartsConfig.cacheTTL)) {
      return this.data[key];
    }
    return null;
  },
  
  clear(key = null) {
    if (key) {
      delete this.data[key];
      delete this.timestamp[key];
    } else {
      this.data = {};
      this.timestamp = {};
    }
  }
};

// Initialize module
export async function initializeCharts() {
  console.log("Initializing Manga & Comics Charts module");
  
  try {
    // Pre-fetch data to have it ready
    await Promise.all([
      fetchMangaChart(),
      fetchWebtoonChart(),
      fetchComicChart()
    ]);
    
    return true;
  } catch (error) {
    console.error("Failed to initialize Manga & Comics Charts module:", error);
    return false;
  }
}

// Fetch manga chart data
export async function fetchMangaChart() {
  return ErrorRecovery.retryOperation('fetchMangaChart', async () => {
    LoadingIndicator.startLoading('manga-chart', 'Loading manga chart...');
    PerformanceMonitor.startTiming('fetchMangaChart');
    
    try {
      // Check cache first
      const cached = chartCache.get('manga');
      if (cached) {
        console.log("Using cached manga chart data");
        LoadingIndicator.endLoading('manga-chart');
        return cached;
      }
      
      // If configured to use sample data, return that
      if (chartsConfig.useSampleData) {
        console.log("Using sample manga chart data");
        const data = chartsConfig.sampleData.manga;
        
        // Add rank property based on array position
        data.forEach((item, index) => {
          item.rank = index + 1;
        });
        
        // Cache the data
        chartCache.set('manga', data);
        
        LoadingIndicator.endLoading('manga-chart');
        PerformanceMonitor.endTiming('fetchMangaChart');
        
        return data;
      }
      
      // In a real implementation, we would make API calls here
      // For example to MyAnimeList API, Kitsu API, etc.
      
      // For now, we'll just use the sample data
      const data = chartsConfig.sampleData.manga;
      
      // Add rank property based on array position
      data.forEach((item, index) => {
        item.rank = index + 1;
      });
      
      // Cache the data
      chartCache.set('manga', data);
      
      LoadingIndicator.endLoading('manga-chart');
      PerformanceMonitor.endTiming('fetchMangaChart');
      
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('manga-chart');
      throw error; // Rethrow for retry system
    }
  });
}

// Fetch webtoon chart data
export async function fetchWebtoonChart() {
  return ErrorRecovery.retryOperation('fetchWebtoonChart', async () => {
    LoadingIndicator.startLoading('webtoon-chart', 'Loading webtoon chart...');
    PerformanceMonitor.startTiming('fetchWebtoonChart');
    
    try {
      // Check cache first
      const cached = chartCache.get('webtoons');
      if (cached) {
        console.log("Using cached webtoon chart data");
        LoadingIndicator.endLoading('webtoon-chart');
        return cached;
      }
      
      // If configured to use sample data, return that
      if (chartsConfig.useSampleData) {
        console.log("Using sample webtoon chart data");
        const data = chartsConfig.sampleData.webtoons;
        
        // Add rank property based on array position
        data.forEach((item, index) => {
          item.rank = index + 1;
        });
        
        // Cache the data
        chartCache.set('webtoons', data);
        
        LoadingIndicator.endLoading('webtoon-chart');
        PerformanceMonitor.endTiming('fetchWebtoonChart');
        
        return data;
      }
      
      // In a real implementation, we would make API calls here
      // For example to Webtoon or Tapas API
      
      // For now, we'll just use the sample data
      const data = chartsConfig.sampleData.webtoons;
      
      // Add rank property based on array position
      data.forEach((item, index) => {
        item.rank = index + 1;
      });
      
      // Cache the data
      chartCache.set('webtoons', data);
      
      LoadingIndicator.endLoading('webtoon-chart');
      PerformanceMonitor.endTiming('fetchWebtoonChart');
      
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('webtoon-chart');
      throw error; // Rethrow for retry system
    }
  });
}

// Fetch comic chart data
export async function fetchComicChart() {
  return ErrorRecovery.retryOperation('fetchComicChart', async () => {
    LoadingIndicator.startLoading('comic-chart', 'Loading comic chart...');
    PerformanceMonitor.startTiming('fetchComicChart');
    
    try {
      // Check cache first
      const cached = chartCache.get('comics');
      if (cached) {
        console.log("Using cached comic chart data");
        LoadingIndicator.endLoading('comic-chart');
        return cached;
      }
      
      // If configured to use sample data, return that
      if (chartsConfig.useSampleData) {
        console.log("Using sample comic chart data");
        const data = chartsConfig.sampleData.comics;
        
        // Add rank property based on array position
        data.forEach((item, index) => {
          item.rank = index + 1;
        });
        
        // Cache the data
        chartCache.set('comics', data);
        
        LoadingIndicator.endLoading('comic-chart');
        PerformanceMonitor.endTiming('fetchComicChart');
        
        return data;
      }
      
      // In a real implementation, we would make API calls here
      // For example to Comic Vine API
      
      // For now, we'll just use the sample data
      const data = chartsConfig.sampleData.comics;
      
      // Add rank property based on array position
      data.forEach((item, index) => {
        item.rank = index + 1;
      });
      
      // Cache the data
      chartCache.set('comics', data);
      
      LoadingIndicator.endLoading('comic-chart');
      PerformanceMonitor.endTiming('fetchComicChart');
      
      return data;
    } catch (error) {
      LoadingIndicator.endLoading('comic-chart');
      throw error; // Rethrow for retry system
    }
  });
}

// Update the left content box with chart data
export function updateChartsDisplay() {
  // Get the left content box for Kavita
  const chartBox = window.contentBoxes?.kavita?.left;
  if (!chartBox) {
    console.error("Kavita left content box (charts) not found");
    return;
  }

  const contentDiv = chartBox.querySelector('.content-box-content');
  if (!contentDiv) {
    console.error("Content div not found in chart box");
    return;
  }

  // Start with loading indicator
  contentDiv.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div>Loading manga & comics charts...</div>
    </div>
  `;

  // Fetch all chart data in parallel
  Promise.all([
    fetchMangaChart(),
    fetchWebtoonChart(),
    fetchComicChart()
  ])
  .then(([mangaData, webtoonData, comicData]) => {
    let html = '';
    
    // Add manga chart section
    html += `
      <div class="comic-chart-container manga-chart">
        <h4 class="comic-chart-header">Top Manga
          <button class="refresh-button" title="Refresh Data" onclick="MangaComicsCharts.refreshMangaChart()">↻</button>
        </h4>
    `;
    
    if (!mangaData || mangaData.length === 0) {
      html += '<div class="no-data-message">No manga data available</div>';
    } else {
      mangaData.forEach(item => {
        const coverUrl = item.cover || `https://placehold.co/90x135/333/666?text=${encodeURIComponent(item.title)}`;
        
        html += `
          <div class="comic-chart-item" data-id="${item.id}" data-type="manga">
            <div class="chart-rank">${item.rank}</div>
            <img src="${coverUrl}" class="chart-cover" alt="${item.title}" 
              onerror="this.src='https://placehold.co/45x70/333/666?text=${encodeURIComponent(item.title)}'">
            <div class="chart-info">
              <div class="chart-title">${item.title}</div>
              <div class="chart-author">${item.author}</div>
              <div class="chart-rating">★ ${item.rating.toFixed(1)}</div>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>'; // Close manga section
    
    // Add webtoon chart section
    html += `
      <div class="comic-chart-container webtoon-chart">
        <h4 class="comic-chart-header">Top Webtoons
          <button class="refresh-button" title="Refresh Data" onclick="MangaComicsCharts.refreshWebtoonChart()">↻</button>
        </h4>
    `;
    
    if (!webtoonData || webtoonData.length === 0) {
      html += '<div class="no-data-message">No webtoon data available</div>';
    } else {
      webtoonData.forEach(item => {
        const coverUrl = item.cover || `https://placehold.co/90x135/333/666?text=${encodeURIComponent(item.title)}`;
        
        html += `
          <div class="comic-chart-item" data-id="${item.id}" data-type="webtoon">
            <div class="chart-rank">${item.rank}</div>
            <img src="${coverUrl}" class="chart-cover" alt="${item.title}" 
              onerror="this.src='https://placehold.co/45x70/333/666?text=${encodeURIComponent(item.title)}'">
            <div class="chart-info">
              <div class="chart-title">${item.title}</div>
              <div class="chart-author">${item.author}</div>
              <div class="chart-rating">★ ${item.rating.toFixed(1)}</div>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>'; // Close webtoon section
    
    // Add comic chart section
    html += `
      <div class="comic-chart-container comic-chart">
        <h4 class="comic-chart-header">Top Comics
          <button class="refresh-button" title="Refresh Data" onclick="MangaComicsCharts.refreshComicChart()">↻</button>
        </h4>
    `;
    
    if (!comicData || comicData.length === 0) {
      html += '<div class="no-data-message">No comic data available</div>';
    } else {
      comicData.forEach(item => {
        const coverUrl = item.cover || `https://placehold.co/90x135/333/666?text=${encodeURIComponent(item.title)}`;
        
        html += `
          <div class="comic-chart-item" data-id="${item.id}" data-type="comic">
            <div class="chart-rank">${item.rank}</div>
            <img src="${coverUrl}" class="chart-cover" alt="${item.title}" 
              onerror="this.src='https://placehold.co/45x70/333/666?text=${encodeURIComponent(item.title)}'">
            <div class="chart-info">
              <div class="chart-title">${item.title}</div>
              <div class="chart-author">${item.author}</div>
              <div class="chart-rating">★ ${item.rating.toFixed(1)}</div>
            </div>
          </div>
        `;
      });
    }
    
    html += '</div>'; // Close comic section
    
    // Add data attribution
    html += `
      <div class="data-attribution">
        <span>Sample data for development purposes</span>
      </div>
    `;
    
    // Update the content
    contentDiv.innerHTML = html;
    
    // Add click handlers for items
    const chartItems = contentDiv.querySelectorAll('.comic-chart-item');
    chartItems.forEach(item => {
      item.addEventListener('click', handleChartItemClick);
    });
    
    console.log("Manga & Comics charts loaded successfully");
  })
  .catch(error => {
    console.error("Error loading charts:", error);
    
    // Show error message
    contentDiv.innerHTML = `
      <div class="error-message">
        <p>Sorry, there was an error loading the charts.</p>
        <p>Error: ${error.message}</p>
        <button onclick="MangaComicsCharts.updateChartsDisplay()" class="refresh-button" style="position:static; transform:none; margin-top:10px;">Try Again</button>
      </div>
    `;
  });
}

// Handle clicks on chart items
function handleChartItemClick(event) {
  const item = event.currentTarget;
  const id = item.getAttribute('data-id');
  const type = item.getAttribute('data-type');
  
  console.log(`Clicked on ${type} item with ID ${id}`);
  
  // In a real implementation, we would show details about the item
  // For now, we'll just log it to the console
  
  // Add a visual highlight effect
  item.classList.add('active');
  setTimeout(() => {
    item.classList.remove('active');
  }, 1000);
}

// Refresh manga chart
export async function refreshMangaChart() {
  // Clear cache for manga chart
  chartCache.clear('manga');
  
  // Find and update the refresh button state
  const refreshButton = document.querySelector('.manga-chart .refresh-button');
  if (refreshButton) {
    refreshButton.innerHTML = '<span class="loading-spinner" style="width:12px;height:12px;margin:0;"></span>';
    refreshButton.disabled = true;
  }
  
  try {
    // Fetch new data
    const newData = await fetchMangaChart();
    
    // Update just the manga section
    updateMangaChartSection(newData);
    
    console.log("Manga chart refreshed successfully");
  } catch (error) {
    console.error("Error refreshing manga chart:", error);
    
    // Reset button after error
    if (refreshButton) {
      refreshButton.innerHTML = '↻';
      refreshButton.disabled = false;
    }
  }
}

// Update just the manga chart section
function updateMangaChartSection(data) {
  const mangaContainer = document.querySelector('.manga-chart');
  if (!mangaContainer) {
    console.error("Manga chart container not found");
    return;
  }
  
  // Get the header element
  const header = mangaContainer.querySelector('.comic-chart-header');
  
  // Remove all items
  mangaContainer.innerHTML = '';
  
  // Re-add the header
  mangaContainer.appendChild(header);
  
  // Reset the refresh button
  const refreshButton = header.querySelector('.refresh-button');
  if (refreshButton) {
    refreshButton.innerHTML = '↻';
    refreshButton.disabled = false;
  }
  
  // Add new items
  if (!data || data.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'no-data-message';
    noData.textContent = 'No manga data available';
    mangaContainer.appendChild(noData);
  } else {
    data.forEach(item => {
      const coverUrl = item.cover || `https://placehold.co/90x135/333/666?text=${encodeURIComponent(item.title)}`;
      
      const itemElement = document.createElement('div');
      itemElement.className = 'comic-chart-item';
      itemElement.dataset.id = item.id;
      itemElement.dataset.type = 'manga';
      
      itemElement.innerHTML = `
        <div class="chart-rank">${item.rank}</div>
        <img src="${coverUrl}" class="chart-cover" alt="${item.title}" 
          onerror="this.src='https://placehold.co/45x70/333/666?text=${encodeURIComponent(item.title)}'">
        <div class="chart-info">
          <div class="chart-title">${item.title}</div>
          <div class="chart-author">${item.author}</div>
          <div class="chart-rating">★ ${item.rating.toFixed(1)}</div>
        </div>
      `;
      
      // Add click handler
      itemElement.addEventListener('click', handleChartItemClick);
      
      mangaContainer.appendChild(itemElement);
    });
  }
}

// Refresh webtoon chart
export async function refreshWebtoonChart() {
  // Clear cache for webtoon chart
  chartCache.clear('webtoons');
  
  // Find and update the refresh button state
  const refreshButton = document.querySelector('.webtoon-chart .refresh-button');
  if (refreshButton) {
    refreshButton.innerHTML = '<span class="loading-spinner" style="width:12px;height:12px;margin:0;"></span>';
    refreshButton.disabled = true;
  }
  
  try {
    // Fetch new data
    const newData = await fetchWebtoonChart();
    
    // Update just the webtoon section
    updateWebtoonChartSection(newData);
    
    console.log("Webtoon chart refreshed successfully");
  } catch (error) {
    console.error("Error refreshing webtoon chart:", error);
    
    // Reset button after error
    if (refreshButton) {
      refreshButton.innerHTML = '↻';
      refreshButton.disabled = false;
    }
  }
}

// Update just the webtoon chart section
function updateWebtoonChartSection(data) {
  const webtoonContainer = document.querySelector('.webtoon-chart');
  if (!webtoonContainer) {
    console.error("Webtoon chart container not found");
    return;
  }
  
  // Get the header element
  const header = webtoonContainer.querySelector('.comic-chart-header');
  
  // Remove all items
  webtoonContainer.innerHTML = '';
  
  // Re-add the header
  webtoonContainer.appendChild(header);
  
  // Reset the refresh button
  const refreshButton = header.querySelector('.refresh-button');
  if (refreshButton) {
    refreshButton.innerHTML = '↻';
    refreshButton.disabled = false;
  }
  
  // Add new items
  if (!data || data.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'no-data-message';
    noData.textContent = 'No webtoon data available';
    webtoonContainer.appendChild(noData);
  } else {
    data.forEach(item => {
      const coverUrl = item.cover || `https://placehold.co/90x135/333/666?text=${encodeURIComponent(item.title)}`;
      
      const itemElement = document.createElement('div');
      itemElement.className = 'comic-chart-item';
      itemElement.dataset.id = item.id;
      itemElement.dataset.type = 'webtoon';
      
      itemElement.innerHTML = `
        <div class="chart-rank">${item.rank}</div>
        <img src="${coverUrl}" class="chart-cover" alt="${item.title}" 
          onerror="this.src='https://placehold.co/45x70/333/666?text=${encodeURIComponent(item.title)}'">
        <div class="chart-info">
          <div class="chart-title">${item.title}</div>
          <div class="chart-author">${item.author}</div>
          <div class="chart-rating">★ ${item.rating.toFixed(1)}</div>
        </div>
      `;
      
      // Add click handler
      itemElement.addEventListener('click', handleChartItemClick);
      
      webtoonContainer.appendChild(itemElement);
    });
  }
}

// Refresh comic chart
export async function refreshComicChart() {
  // Clear cache for comic chart
  chartCache.clear('comics');
  
  // Find and update the refresh button state
  const refreshButton = document.querySelector('.comic-chart .refresh-button');
  if (refreshButton) {
    refreshButton.innerHTML = '<span class="loading-spinner" style="width:12px;height:12px;margin:0;"></span>';
    refreshButton.disabled = true;
  }
  
  try {
    // Fetch new data
    const newData = await fetchComicChart();
    
    // Update just the comic section
    updateComicChartSection(newData);
    
    console.log("Comic chart refreshed successfully");
  } catch (error) {
    console.error("Error refreshing comic chart:", error);
    
    // Reset button after error
    if (refreshButton) {
      refreshButton.innerHTML = '↻';
      refreshButton.disabled = false;
    }
  }
}

// Update just the comic chart section
function updateComicChartSection(data) {
  const comicContainer = document.querySelector('.comic-chart');
  if (!comicContainer) {
    console.error("Comic chart container not found");
    return;
  }
  
  // Get the header element
  const header = comicContainer.querySelector('.comic-chart-header');
  
  // Remove all items
  comicContainer.innerHTML = '';
  
  // Re-add the header
  comicContainer.appendChild(header);
  
  // Reset the refresh button
  const refreshButton = header.querySelector('.refresh-button');
  if (refreshButton) {
    refreshButton.innerHTML = '↻';
    refreshButton.disabled = false;
  }
  
  // Add new items
  if (!data || data.length === 0) {
    const noData = document.createElement('div');
    noData.className = 'no-data-message';
    noData.textContent = 'No comic data available';
    comicContainer.appendChild(noData);
  } else {
    data.forEach(item => {
      const coverUrl = item.cover || `https://placehold.co/90x135/333/666?text=${encodeURIComponent(item.title)}`;
      
      const itemElement = document.createElement('div');
      itemElement.className = 'comic-chart-item';
      itemElement.dataset.id = item.id;
      itemElement.dataset.type = 'comic';
      
      itemElement.innerHTML = `
        <div class="chart-rank">${item.rank}</div>
        <img src="${coverUrl}" class="chart-cover" alt="${item.title}" 
          onerror="this.src='https://placehold.co/45x70/333/666?text=${encodeURIComponent(item.title)}'">
        <div class="chart-info">
          <div class="chart-title">${item.title}</div>
          <div class="chart-author">${item.author}</div>
          <div class="chart-rating">★ ${item.rating.toFixed(1)}</div>
        </div>
      `;
      
      // Add click handler
      itemElement.addEventListener('click', handleChartItemClick);
      
      comicContainer.appendChild(itemElement);
    });
  }
}

// Export the module interface
export const MangaComicsCharts = {
  initialize: initializeCharts,
  updateDisplay: updateChartsDisplay,
  refreshMangaChart,
  refreshWebtoonChart,
  refreshComicChart
};

// Automatically initialize when imported if window is defined
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', async () => {
    // Initialize charts module
    await initializeCharts();
    
    // Make the API globally available
    window.MangaComicsCharts = MangaComicsCharts;
    
    console.log("Manga & Comics Charts module initialized");
  });
}