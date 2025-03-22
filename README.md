# DARKNEON.TOKYO

![DARKNEON.TOKYO](https://placehold.co/800x200/000/00ff00?text=DARKNEON.TOKYO&font=raleway)

A cyberpunk-themed media portal with a retro-futuristic aesthetic, providing access to various self-hosted media services.

## ✨ Features

- 🌟 Eye-catching cyberpunk interface with neon glow effects and TV static
- 🔒 Stylish authentication screen with Matrix-inspired animations
- 🎬 Integration with Jellyfin media server for videos
- 📚 Integration with Kavita for eBooks and comics
- 🎮 Planned integration with Romm (coming soon)
- 🎞️ Anime trailer player using YouTube API
- 📰 Live anime/entertainment news feed
- 📊 TMDB integration for anime movie and TV show information
- ⚙️ Configuration menu with persistent settings
- 🔄 Session management with timeout

## 🖥️ Demo

*Screenshots coming soon*

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **APIs**:
  - TMDB API for anime content
  - YouTube API for trailers
  - RSS feeds for anime news
- **Self-hosted Services**:
  - Jellyfin (media server)
  - Kavita (eBook/comic server)
  - Romm (planned)

## 🏗️ Project Structure

```
darkneon.tokyo/
├── css/                                    # Stylesheets
│   ├── animations.css                      # Animation definitions
│   ├── config-menu.css                     # Configuration menu styles
│   ├── content.css                         # Content box styles
│   ├── entertainment-news.css              # News feed styles
│   ├── landingpage.css                     # Landing page styles
│   ├── main.css                            # Main application styles
│   ├── tmdb-styles.css                     # TMDB content styles
│   └── version-info.css                    # Version info styles
├── js/                                     # JavaScript files
│   ├── modules/                            # Modular JS components
│   │   ├── animation-handler.js            # Animation control
│   │   ├── anime-trailer-integration.js    # Trailer integration
│   │   ├── anime-trailer-manager.js        # Trailer player
│   │   ├── app-state.js                    # State management
│   │   ├── content-box-manager.js          # Content boxes
│   │   ├── content-core.js                 # Core content handling
│   │   ├── debug-tools.js                  # Debugging utilities
│   │   ├── entertainment-news.js           # News feed
│   │   ├── error-recovery.js               # Error handling
│   │   ├── event-bus.js                    # Event system
│   │   ├── event-handler.js                # Event handling
│   │   ├── jellyfin-api.js                 # Jellyfin integration
│   │   ├── loading-indicators.js           # Loading indicators
│   │   ├── logo-manager.js                 # Logo handling
│   │   ├── mainpage-core.js                # Main page initialization
│   │   ├── performance-monitoring.js       # Performance metrics
│   │   ├── tmdb-api.js                     # TMDB API integration
│   │   └── tmdb-integration.js             # TMDB UI integration
│   ├── config-menu.js                      # Configuration menu
│   ├── landingpage.js                      # Landing page functionality
│   └── version-info.js                     # Version information
├── images/                                 # Image assets
├── sounds/                                 # Sound effects
├── api/                                    # API configuration
│   └── api-config.json                     # API keys and endpoints
├── partials/                               # HTML partials
│   └── version-info.html                   # Version info partial
└── index.html                              # Main HTML file
```

## 🚀 Getting Started

### Prerequisites

- Web server (Apache, Nginx, etc.)
- Self-hosted instances of:
  - Jellyfin
  - Kavita
  - (Optionally) ROMM

### Installation

1. Clone this repository to your web server:
   ```bash
   git clone https://github.com/yourusername/darkneon.tokyo.git
   ```

2. Configure your API keys in `api/api-config.json`:
   ```json
   {
     "jellyfin": {
       "baseUrl": "https://your-jellyfin-instance.com",
       "apiKey": "your-jellyfin-api-key",
       "userId": "your-jellyfin-user-id"
     },
     "externalApis": {
       "youtube": {
         "apiKey": "your-youtube-api-key"
       },
       "tmdb": {
         "apiKey": "your-tmdb-api-key",
         "accessToken": "your-tmdb-access-token"
       }
     }
   }
   ```

3. Update the URLs in the HTML files to point to your instances:
   - Jellyfin: `https://jellyfin.yourdomain.com`
   - Kavita: `https://kavita.yourdomain.com`

4. Deploy to your web server.

## 🔐 Authentication

The default login credentials are:
- Username: `admin`
- Password: `password123`

**Important**: Change these credentials in `js/landingpage.js` for security purposes:

```javascript
const validCredentials = {
    'admin': 'password123' // Replace with your actual credentials
};
```

## ⚙️ Configuration Options

Access the configuration menu by clicking the "CONFIG" button in the bottom right corner:

- **Disable Transition**: Toggle the glitch transition effect on login
- **TV Static Effect**: Toggle the retro TV static overlay
- **TV Static Opacity**: Adjust the opacity of the TV static effect
- **Session Timeout**: Set the session timeout duration in minutes

## 🧩 Modules

### 🎞️ Anime Trailer Player

The trailer player automatically fetches and plays anime trailers from YouTube.

### 📰 Entertainment News

The news feed pulls the latest anime news from various sources:
- Anime News Network
- Crunchyroll
- MyAnimeList
- Tokyo Otaku Mode

### 📊 TMDB Integration

Displays popular anime movies and TV shows with ratings and details.

## 🛣️ Roadmap

- [ ] Mobile responsiveness improvements
- [ ] User account management
- [ ] More integration options for self-hosted services
- [ ] Custom themes
- [ ] Settings export/import
- [ ] Full ROMM integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on this repository.

---

<p align="center">DARKNEON.TOKYO © 2025 FEXLABX</p>
