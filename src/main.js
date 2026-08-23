import { initializeApp } from './app.js';
import { initializeTheme } from './theme.js';
import { initializeAuthenticationUI } from './pages/authentication.js';
import { setupOfflineSupport } from './offline/offline-manager.js';

// Initialize theme
initializeTheme();

// Setup offline support
setupOfflineSupport();

// Initialize application
initializeApp();

// Bootstrap authentication UI
document.addEventListener('DOMContentLoaded', () => {
  initializeAuthenticationUI();
});
