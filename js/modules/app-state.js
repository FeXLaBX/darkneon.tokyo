// 1. CENTRALIZED STATE MANAGEMENT
// This provides a central place to manage application state

/**
 * Centralized state management
 * Helps track and debug application state across modules
 */
// app-state.js
export const AppState = {
    // Core state
    initialized: false,
    activePage: 'landing', // 'landing', 'main'
    activeApp: null, // 'jellyfin', 'kavita', 'romm'
    
    // Component states
    components: {
      contentBoxes: { initialized: false, ready: false },
      jellyfinApi: { initialized: false, ready: false },
      externalContent: { initialized: false, ready: false },
      animations: { initialized: false, ready: false }
    },
    
    // Set component state
    setComponentState(component, initialized, ready) {
      if (!this.components[component]) {
        this.components[component] = { initialized: false, ready: false };
      }
      
      this.components[component].initialized = initialized;
      this.components[component].ready = ready;
      
      // Dispatch state change event
      this.dispatchStateChange({
        type: 'componentState',
        component,
        initialized,
        ready
      });
    },
    
    // Set active app
    setActiveApp(app) {
      this.activeApp = app;
      this.dispatchStateChange({
        type: 'activeApp',
        app
      });
    },
    
    // Set active page
    setActivePage(page) {
      this.activePage = page;
      this.dispatchStateChange({
        type: 'activePage',
        page
      });
    },
    
    // Check if system is fully ready
    isSystemReady() {
      return Object.values(this.components).every(component => component.ready);
    },
    
    // Dispatch state change event
    dispatchStateChange(detail) {
      const event = new CustomEvent('appStateChange', { detail });
      window.dispatchEvent(event);
    },
    
    // Debug method to log current state
    logState() {
      console.log('AppState:', {
        initialized: this.initialized,
        activePage: this.activePage,
        activeApp: this.activeApp,
        components: {...this.components},
        systemReady: this.isSystemReady()
      });
    }
  };
  
  // Make it globally available
  window.AppState = AppState;