/**
 * Theme Management
 * Veylora - Connect • Create • Share
 */

export function initializeTheme() {
  const theme = localStorage.getItem('theme') || 'dark';
  
  if (theme === 'light') {
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
  }
  
  updateThemeToggle(theme);
}

function updateThemeToggle(theme) {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.innerHTML = theme === 'light' ? '☀️' : '🌙';
  }
}

export function toggleTheme() {
  const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  localStorage.setItem('theme', newTheme);
  initializeTheme();
  
  return newTheme;
}

export function getTheme() {
  return localStorage.getItem('theme') || 'dark';
}
