// 2. COMPREHENSIVE EVENT SYSTEM
// This centralized event system allows components to communicate without direct dependencies

/**
 * Event Bus for system-wide events
 * Provides a central communication mechanism between modules
 */
// event-bus.js
export const EventBus = {
    // List of supported events for documentation and IDE completion
    Events: {
      CONTENT_BOXES_READY: 'contentBoxesReady',
      JELLYFIN_API_READY: 'jellyfinApiReady',
      EXTERNAL_CONTENT_READY: 'externalContentReady',
      ANIMATIONS_READY: 'animationsReady',
      SYSTEM_READY: 'systemReady',
      APP_SELECTED: 'appSelected',
      APP_CLOSED: 'appClosed',
      CONTENT_LOADING: 'contentLoading',
      CONTENT_LOADED: 'contentLoaded',
      CONTENT_ERROR: 'contentError'
    },
    
    // Fire an event with optional data
    emit(eventName, detail = {}) {
      console.log(`EventBus: Emitting ${eventName}`, detail);
      const event = new CustomEvent(eventName, { detail });
      window.dispatchEvent(event);
      
      // Also dispatch to app state if appropriate
      this._updateAppStateFromEvent(eventName, detail);
    },
    
    // Subscribe to an event
    on(eventName, callback) {
      window.addEventListener(eventName, callback);
      return () => window.removeEventListener(eventName, callback); // Return unsubscribe function
    },
    
    // Subscribe to an event once
    once(eventName, callback) {
      const handler = (e) => {
        callback(e);
        window.removeEventListener(eventName, handler);
      };
      window.addEventListener(eventName, handler);
    },
    
    // Update app state based on events
    _updateAppStateFromEvent(eventName, detail) {
      // Only process if AppState exists
      if (!window.AppState) return;
      
      switch(eventName) {
        case this.Events.CONTENT_BOXES_READY:
          window.AppState.setComponentState('contentBoxes', true, true);
          break;
        case this.Events.JELLYFIN_API_READY:
          window.AppState.setComponentState('jellyfinApi', true, true);
          break;
        case this.Events.EXTERNAL_CONTENT_READY:
          window.AppState.setComponentState('externalContent', true, true);
          break;
        case this.Events.ANIMATIONS_READY:
          window.AppState.setComponentState('animations', true, true);
          break;
        case this.Events.APP_SELECTED:
          window.AppState.setActiveApp(detail.appName);
          break;
        case this.Events.APP_CLOSED:
          window.AppState.setActiveApp(null);
          break;
      }
      
      // Check if system is fully ready
      if (window.AppState.isSystemReady() && !window.AppState.initialized) {
        window.AppState.initialized = true;
        this.emit(this.Events.SYSTEM_READY);
      }
    }
  };
  
  // Make it globally available
  window.EventBus = EventBus;