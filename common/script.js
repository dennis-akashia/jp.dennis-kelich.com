/**
 * Global configuration object loaded from config.json
 * @type {Object|null}
 */
let siteConfig = null;

/**
 * Global projects array loaded from projects.json
 * @type {Array|null}
 */
let projects = null;

/**
 * Global blog posts array loaded from blog.json
 * @type {Array|null}
 */
let blogPosts = null;

/**
 * Global language translations object loaded from lang.json
 * @type {Object|null}
 */
let translations = null;

/**
 * Current page for project pagination
 * @type {number}
 */
let currentProjectPage = 1;

/**
 * Number of projects to display per page
 * @type {number}
 */
const projectsPerPage = 6;

/**
 * Supported languages for the website
 * @type {string[]}
 */
const supportedLanguages = ['de', 'en', 'ja'];

/**
 * Sets the active language for the website
 * Updates elements with data-i18n attributes using translations from lang.json
 * Also handles legacy data-lang attributes for backward compatibility
 * Stores the selection in localStorage for persistence
 * @param {string} lang - Language code (de, en, or ja)
 */
function setLanguage(lang) {
    if (!supportedLanguages.includes(lang)) {
      lang = 'en';
    }
    localStorage.setItem('language', lang);

    // Handle legacy data-lang attributes (for backward compatibility)
    const allElements = document.querySelectorAll('[data-lang]');
    allElements.forEach(el => {
      const elLang = el.getAttribute('data-lang');
      el.hidden = elLang !== lang;
    });
    
    // Apply translations from lang.json using data-i18n attributes
    if (translations) {
      applyTranslations(lang);
    }
    
    // Re-render projects with new language
    if (projects && projects.length > 0) {
      renderProjects(currentProjectPage);
    }
    
    // Re-render blog posts with new language
    if (blogPosts && blogPosts.length > 0) {
      renderBlogPosts();
    }
}

/**
 * Retrieves the saved language preference from localStorage
 * @returns {string|null} The saved language code or null if not set
 */
function getLanguageFromStorage() {
  return localStorage.getItem('language');
}

/**
 * Detects the user's browser language
 * Falls back to 'en' if the browser language is not supported
 * @returns {string} A supported language code (de, en, or ja)
 */
function detectBrowserLanguage() {
    const lang = navigator.language || navigator.userLanguage;
    const shortLang = lang.slice(0, 2).toLowerCase();
  return supportedLanguages.includes(shortLang) ? shortLang : 'en';
}

/**
 * Loads language translations from lang.json
 * @returns {Promise<Object>} The translations object
 */
async function loadTranslations() {
  try {
    // Try multiple possible paths for lang.json
    const possiblePaths = [
      './common/lang.json',
      '../common/lang.json',
      '../../common/lang.json'
    ];
    
    let lastError = null;
    
    for (const langPath of possiblePaths) {
      try {
        const response = await fetch(langPath);
        if (response.ok) {
          translations = await response.json();
          return translations;
        }
      } catch (error) {
        lastError = error;
        // Continue to next path
      }
    }
    
    // If we get here, none of the paths worked
    throw lastError || new Error(`Failed to load translations from paths: ${possiblePaths.join(', ')}`);
  } catch (error) {
    console.error('Error loading translations:', error);
    console.warn('Translations could not be loaded. Ensure lang.json exists in the common directory. Falling back to basic functionality.');
    // Set empty translations object to prevent errors in translation lookups
    translations = {};
    return translations;
  }
}

/**
 * Sanitizes HTML to only allow <br> tags
 * This is a security function to prevent XSS attacks while allowing line breaks
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML with only <br> tags
 */
function sanitizeHtmlAllowBr(html) {
  if (!html) return '';
  
  // First escape all HTML entities by setting as text content
  const div = document.createElement('div');
  div.textContent = html;
  let escaped = div.innerHTML;
  
  // Then restore only <br> and <br/> tags (case-insensitive)
  escaped = escaped.replace(/&lt;br\s*\/?&gt;/gi, '<br>');
  
  return escaped;
}

/**
 * Sanitizes translation HTML to only allow <br> tags
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML with only <br> tags
 */
function sanitizeTranslation(html) {
  return sanitizeHtmlAllowBr(html);
}

/**
 * Applies translations to elements with data-i18n attributes
 * @param {string} lang - Language code (de, en, or ja)
 */
function applyTranslations(lang) {
  if (!translations) return;
  
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = getTranslation(key, lang);
    
    if (translation) {
      // Check if element should use innerHTML (for HTML content like <br> tags)
      const useHtml = el.hasAttribute('data-i18n-html');
      
      if (useHtml) {
        // Sanitize translation to only allow <br> tags before using innerHTML
        el.innerHTML = sanitizeTranslation(translation);
      } else {
        el.textContent = translation;
      }
    }
  });
  
  // Remove the lang-loading class to show content after translations are applied
  document.documentElement.classList.remove('lang-loading');
}

/**
 * Gets a translation value from the translations object using dot notation
 * @param {string} key - The translation key in dot notation (e.g., "nav.about")
 * @param {string} lang - The language code
 * @returns {string|null} The translated text or null if not found
 */
function getTranslation(key, lang) {
  if (!translations || !key) return null;
  
  const keys = key.split('.');
  let value = translations;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return null;
    }
  }
  
  // If value is an object with language keys, get the specific language
  if (value && typeof value === 'object' && lang in value) {
    return value[lang];
  }
  
  return null;
}

// === Dark Mode Functions ===

/**
 * Updates the dark mode toggle button icon
 * @param {boolean} isDarkMode - Whether dark mode is currently enabled
 */
function updateDarkModeIcon(isDarkMode) {
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    // Show sun icon when in dark mode, moon icon when in light mode
    darkModeToggle.textContent = isDarkMode ? '☀️' : '🌙';
  }
}

/**
 * Applies or removes dark mode styling
 * @param {boolean} enabled - Whether dark mode should be enabled
 */
function applyDarkMode(enabled) {
    if (enabled) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
  }
  updateDarkModeIcon(enabled);
}

/**
 * Toggles dark mode on/off and saves the preference
 * @returns {void}
 */
function toggleDarkMode() {
    const isDark = !document.body.classList.contains('dark-mode');
    document.body.classList.toggle('dark-mode', isDark);
    document.documentElement.classList.toggle('dark-mode', isDark);
  localStorage.setItem('darkMode', isDark ? 'true' : 'false');
  updateDarkModeIcon(isDark);
}

/**
 * Loads and applies the saved dark mode preference from localStorage
 * @returns {void}
 */
function loadDarkModePreference() {
    const darkModeSetting = localStorage.getItem('darkMode');
  applyDarkMode(darkModeSetting === 'true');
}

// === Configuration Loading ===

/**
 * Loads site configuration from config.json
 * @returns {Promise<Object>} The configuration object
 */
async function loadConfig() {
  try {
    // Try multiple possible paths for config.json
    const possiblePaths = [
      './common/config.json',
      '../common/config.json',
      '../../common/config.json'
    ];
    
    let siteConfig = null;
    let lastError = null;
    
    for (const configPath of possiblePaths) {
      try {
        const response = await fetch(configPath);
        if (response.ok) {
          siteConfig = await response.json();
          return siteConfig;
        }
      } catch (error) {
        lastError = error;
        // Continue to next path
      }
    }
    
    // If we get here, none of the paths worked
    throw lastError || new Error(`Failed to load config from paths: ${possiblePaths.join(', ')}`);
  } catch (error) {
    console.error('Error loading configuration:', error);
    // Assign default config to global variable if loading fails
    siteConfig = {
      site: {
        title: "DennisKelich.com",
        footerTitle: "Dennis Kelich InfoHP",
        copyright: "Dennis Kelich"
      },
      urls: {
        impressum: "/impressum/",
        datenschutz: "/datenschutz/",
        contact: "/contact/"
      },
      social: {
        github: "https://github.com/dennis-akashia",
        x: "https://x.com/DennisKelich",
        linkedin: "https://www.linkedin.com/in/dennis-akashia/"
      }
    };
    return siteConfig;
  }
}

/**
 * Applies configuration values to the page
 * Updates all elements with data-config attributes
 */
function applyConfig() {
  if (!siteConfig) return;

  // Update site title
  const titleElements = document.querySelectorAll('[data-config="site.title"]');
  titleElements.forEach(el => {
    el.textContent = siteConfig.site.title;
  });

  // Update footer title
  const footerTitleElements = document.querySelectorAll('[data-config="site.footerTitle"]');
  footerTitleElements.forEach(el => {
    el.textContent = siteConfig.site.footerTitle;
  });

  // Update copyright
  const copyrightElements = document.querySelectorAll('[data-config="site.copyright"]');
  copyrightElements.forEach(el => {
    el.textContent = siteConfig.site.copyright;
  });

  // Update links (impressum, datenschutz, contact)
  const linkElements = document.querySelectorAll('[data-config-href]');
  linkElements.forEach(el => {
    const configKey = el.getAttribute('data-config-href');
    const keys = configKey.split('.');
    let value = siteConfig;
    for (const key of keys) {
      value = value[key];
      if (value === undefined || value === null) break;
    }
    if (value !== undefined && value !== null) {
      el.href = value;
    }
  });

  // Update social links
  const socialElements = document.querySelectorAll('[data-config-social]');
  socialElements.forEach(el => {
    const socialKey = el.getAttribute('data-config-social');
    if (siteConfig.social && siteConfig.social[socialKey]) {
      el.href = siteConfig.social[socialKey];
    }
  });
}

// === Projects Loading and Rendering ===

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Validates if a URL is safe (http, https protocol, or relative path)
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe
 */
function isValidUrl(url) {
  if (!url) return false;
  
  // Allow relative URLs (starting with ./ or ../ or /)
  if (url.startsWith('./') || url.startsWith('../') || url.startsWith('/')) {
    return true;
  }
  
  // Validate absolute URLs
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/**
 * Sanitizes description HTML to only allow <br> tags
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML with only <br> tags
 */
function sanitizeDescription(html) {
  return sanitizeHtmlAllowBr(html);
}

/**
 * Loads projects from projects.json
 * @returns {Promise<Array>} The projects array
 */
async function loadProjects() {
  try {
    // Try multiple possible paths for projects.json
    const possiblePaths = [
      './common/projects.json',
      '../common/projects.json',
      '../../common/projects.json'
    ];
    
    let lastError = null;
    
    for (const projectsPath of possiblePaths) {
      try {
        const response = await fetch(projectsPath);
        if (response.ok) {
          projects = await response.json();
          return projects;
        }
      } catch (error) {
        lastError = error;
        // Continue to next path
      }
    }
    
    // If we get here, none of the paths worked
    throw lastError || new Error(`Failed to load projects from paths: ${possiblePaths.join(', ')}`);
  } catch (error) {
    console.error('Error loading projects:', error);
    projects = [];
    return projects;
  }
}

/**
 * Loads blog posts from blog.json
 * @returns {Promise<Array>} The blog posts array
 */
async function loadBlogPosts() {
  try {
    // Try multiple possible paths for blog.json
    const possiblePaths = [
      './common/blog.json',
      '../common/blog.json',
      '../../common/blog.json'
    ];
    
    let lastError = null;
    
    for (const blogPath of possiblePaths) {
      try {
        const response = await fetch(blogPath);
        if (response.ok) {
          blogPosts = await response.json();
          return blogPosts;
        }
      } catch (error) {
        lastError = error;
        // Continue to next path
      }
    }
    
    // If we get here, none of the paths worked
    throw lastError || new Error(`Failed to load blog posts from paths: ${possiblePaths.join(', ')}`);
  } catch (error) {
    console.error('Error loading blog posts:', error);
    blogPosts = [];
    return blogPosts;
  }
}

/**
 * Validates if a slug is safe for use in URLs
 * Only allows alphanumeric characters, hyphens, and underscores
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if slug is safe
 */
function isValidSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  // Only allow alphanumeric, hyphens, and underscores
  return /^[a-zA-Z0-9_-]+$/.test(slug);
}

/**
 * Renders blog posts on the homepage
 * Shows the latest 4 posts with summaries
 */
function renderBlogPosts() {
  if (!blogPosts || blogPosts.length === 0) return;
  
  const blogPostsContainer = document.querySelector('.blog-posts');
  if (!blogPostsContainer) return;
  
  // Clear existing content
  blogPostsContainer.innerHTML = '';
  
  // Show maximum 4 blog posts
  const postsToShow = blogPosts.slice(0, 4);
  
  // Get current language for date formatting
  const currentLang = localStorage.getItem('language') || detectBrowserLanguage();
  const localeMap = { 'de': 'de-DE', 'en': 'en-US', 'ja': 'ja-JP' };
  const locale = localeMap[currentLang] || 'de-DE';
  
  // Render each blog post
  postsToShow.forEach(post => {
    // Validate required fields
    if (!post.title || !post.slug || !post.date || !post.summary) return;
    
    // Validate slug to prevent path traversal attacks
    if (!isValidSlug(post.slug)) {
      console.warn(`Invalid blog post slug: ${post.slug}`);
      return;
    }
    
    const article = document.createElement('article');
    article.className = 'blog-post';
    
    // Validate and format date
    const dateObj = new Date(post.date);
    if (isNaN(dateObj.getTime())) {
      console.warn(`Invalid date for blog post: ${post.date}`);
      return;
    }
    
    const formattedDate = dateObj.toLocaleDateString(locale, { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    });
    
    // Build the blog post link with validated slug
    const blogLink = `./blog/${escapeHtml(post.slug)}/`;
    
    // Create HTML content
    let html = `<a href='${blogLink}'><h3>${escapeHtml(post.title)}</h3></a>`;
    html += `<p>${escapeHtml(post.summary)}</p>`;
    html += `<small>${escapeHtml(formattedDate)}</small>`;
    
    article.innerHTML = html;
    blogPostsContainer.appendChild(article);
  });
}

/**
 * Renders projects for the current page
 * @param {number} page - The page number to render (1-based)
 */
function renderProjects(page = 1) {
  if (!projects || projects.length === 0) return;
  
  const projectGrid = document.querySelector('.project-grid');
  if (!projectGrid) return;
  
  // Clear existing content
  projectGrid.innerHTML = '';
  
  // Calculate pagination
  const startIndex = (page - 1) * projectsPerPage;
  const endIndex = startIndex + projectsPerPage;
  const projectsToShow = projects.slice(startIndex, endIndex);
  
  // Get current language
  const currentLang = localStorage.getItem('language') || detectBrowserLanguage();
  
  // Render each project
  projectsToShow.forEach(project => {
    const projectCard = document.createElement('div');
    projectCard.className = 'project-card';
    
    let html = '';
    
    // Add image if available (with escaped alt text), otherwise add placeholder
    if (project.image) {
      const escapedTitle = escapeHtml(project.title);
      html += `<div class='project-image-wrapper'><img src='${escapeHtml(project.image)}' alt='${escapedTitle}'></div>`;
    } else {
      // Add CSS placeholder for projects without images
      html += `<div class='project-image-placeholder'><span class='placeholder-icon'>📄</span></div>`;
    }
    
    // Add title (escaped)
    html += `<b>${escapeHtml(project.title)}</b><br>`;
    
    // Add description (with language support and sanitization)
    // Sanitize to only allow <br> tags for security
    if (typeof project.description === 'object' && project.description) {
      // Try current language, then German, then English, then any available language
      const desc = project.description[currentLang] || 
                   project.description['de'] || 
                   project.description['en'] || 
                   Object.values(project.description)[0] || '';
      html += sanitizeDescription(desc);
    } else if (typeof project.description === 'string') {
      html += sanitizeDescription(project.description);
    }
    html += '<br>';
    
    // Add website link if available (with URL validation)
    if (project.website && isValidUrl(project.website)) {
      const websiteText = currentLang === 'de' ? 'Webseite' : currentLang === 'ja' ? 'ウェブサイト' : 'Website';
      html += `<a href='${escapeHtml(project.website)}' target='_blank'>${escapeHtml(websiteText)}</a>`;
      
      // Add blog post link if available (with URL validation)
      if (project.blogPost && isValidUrl(project.blogPost)) {
        const blogText = currentLang === 'de' ? 'Blog Beitrag' : currentLang === 'ja' ? 'ブログ記事' : 'Blog Post';
        html += ` | <a href='${escapeHtml(project.blogPost)}' target='_blank'>${escapeHtml(blogText)}</a>`;
      }
    }
    
    projectCard.innerHTML = html;
    projectGrid.appendChild(projectCard);
  });
  
  // Render pagination controls if needed
  renderPagination(page);
}

/**
 * Renders pagination controls
 * @param {number} currentPage - The current page number
 */
function renderPagination(currentPage) {
  if (!projects || projects.length <= projectsPerPage) {
    // No pagination needed
    const existingPagination = document.querySelector('.pagination-controls');
    if (existingPagination) {
      existingPagination.remove();
    }
    return;
  }
  
  const totalPages = Math.ceil(projects.length / projectsPerPage);
  const projectSection = document.getElementById('projects');
  if (!projectSection) return;
  
  // Remove existing pagination controls
  let paginationDiv = document.querySelector('.pagination-controls');
  if (!paginationDiv) {
    paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    projectSection.appendChild(paginationDiv);
  }
  
  // Clear and rebuild pagination
  paginationDiv.innerHTML = '';
  
  // Previous button
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '←';
    prevBtn.className = 'pagination-btn';
    prevBtn.onclick = () => changePage(currentPage - 1);
    paginationDiv.appendChild(prevBtn);
  }
  
  // Windowed page numbers for better UX with many pages
  // Show: First page, pages around current (±2), last page, with ellipsis
  const pageWindow = 2; // Show 2 pages on each side of current page
  
  let lastShownPage = 0; // Track last shown page to determine when to add ellipsis
  
  for (let i = 1; i <= totalPages; i++) {
    // Always show first page, last page, and pages near current page
    const showPage = i === 1 || 
                     i === totalPages || 
                     (i >= currentPage - pageWindow && i <= currentPage + pageWindow);
    
    if (showPage) {
      // Add ellipsis if there's a gap from the last shown page
      if (lastShownPage > 0 && i > lastShownPage + 1) {
        const ellipsis = document.createElement('span');
        ellipsis.textContent = '...';
        ellipsis.className = 'pagination-ellipsis';
        paginationDiv.appendChild(ellipsis);
      }
      
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = 'pagination-btn' + (i === currentPage ? ' active' : '');
      pageBtn.onclick = () => changePage(i);
      paginationDiv.appendChild(pageBtn);
      
      lastShownPage = i;
    }
  }
  
  // Next button
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '→';
    nextBtn.className = 'pagination-btn';
    nextBtn.onclick = () => changePage(currentPage + 1);
    paginationDiv.appendChild(nextBtn);
  }
}

/**
 * Changes the current project page
 * @param {number} page - The page number to switch to
 */
function changePage(page) {
  currentProjectPage = page;
  renderProjects(page);
  
  // Scroll to projects section
  const projectSection = document.getElementById('projects');
  if (projectSection) {
    projectSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// === Page Initialization ===

/**
 * Initializes the page on load:
 * - Loads configuration
 * - Loads language translations
 * - Sets up language based on saved preference or browser language
 * - Loads dark mode preference
 * - Sets up event listeners
 * - Initializes accordion functionality
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Load configuration first
  await loadConfig();
  applyConfig();

  // Load translations
  await loadTranslations();

  // Load and render projects
  await loadProjects();
  renderProjects(currentProjectPage);

  // Load and render blog posts
  await loadBlogPosts();
  renderBlogPosts();

  const savedLang = getLanguageFromStorage();
  const initialLang = savedLang || detectBrowserLanguage();
  setLanguage(initialLang);

  loadDarkModePreference();

  // Event Listener for Dark Mode Button
  const darkModeToggle = document.getElementById('darkModeToggle');
  if (darkModeToggle) {
    darkModeToggle.addEventListener('click', toggleDarkMode);
  }
  
  // Initialize accordion if present
  initAccordion();
});

// === Scroll Progress Bar ===

/**
 * Updates the scroll progress bar and back-to-top button visibility
 * Called on window scroll event
 * @returns {void}
 */
function myFunction() {
  var winScroll = document.body.scrollTop || document.documentElement.scrollTop;
  var height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
  var scrolled = (winScroll / height) * 100;
  document.getElementById("myBar").style.width = scrolled + "%";

  var mybutton = document.getElementById("myBtn");
  if (document.body.scrollTop > 500 || document.documentElement.scrollTop > 500) {
    mybutton.style.display = "block";
  } else {
    mybutton.style.display = "none";
  }
}

// Attach scroll event listener
window.onscroll = function() {
  myFunction();
};

/**
 * Scrolls to the top of the document
 * Used by the back-to-top button
 * @returns {void}
 */
function topFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}

// === Accordion Functionality ===

/**
 * Initializes accordion functionality
 * Sets up click handlers for accordion headers
 */
function initAccordion() {
  const accordionHeaders = document.querySelectorAll('.accordion-header');
  
  accordionHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const accordionItem = this.parentElement;
      const isActive = accordionItem.classList.contains('active');
      
      // Close all accordion items
      document.querySelectorAll('.accordion-item').forEach(item => {
        item.classList.remove('active');
      });
      
      // Open clicked item if it wasn't active
      if (!isActive) {
        accordionItem.classList.add('active');
      }
    });
  });
  
  // Open first accordion item by default
  const firstItem = document.querySelector('.accordion-item');
  if (firstItem) {
    firstItem.classList.add('active');
  }
}