const CACHE_NAME = 'toekomst-school-v1';
const STATIC_CACHE = 'toekomst-static-v1';
const DYNAMIC_CACHE = 'toekomst-dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/planning',
  '/dashboard', 
  '/connect',
  '/toekomst_logo.svg',
  '/manifest.json'
];

// API endpoints to cache for offline planning
const PLANNING_API_PATTERNS = [
  /\/api\/planning/,
  /\/api\/workshops/,
  /\/api\/lessons/,
  /planning\.ics/
];

// Install event - cache static files
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Handle different types of requests
  if (STATIC_FILES.includes(url.pathname)) {
    // Static files - cache first strategy
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isPlanningApiRequest(url)) {
    // Planning API - network first with cache fallback
    event.respondWith(networkFirstWithCache(request, DYNAMIC_CACHE));
  } else if (url.pathname.startsWith('/planning') || url.pathname.startsWith('/dashboard')) {
    // Planning pages - cache first with network fallback
    event.respondWith(cacheFirstWithNetworkFallback(request, DYNAMIC_CACHE));
  } else {
    // Other requests - network first
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Check if request is for planning API
function isPlanningApiRequest(url) {
  return PLANNING_API_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Cache first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving from cache:', request.url);
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Cache first failed:', error);
    return new Response('Offline - content not available', { status: 503 });
  }
}

// Network first with cache fallback
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      // Cache planning data for offline access
      cache.put(request, networkResponse.clone());
      console.log('Service Worker: Cached planning data:', request.url);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving cached planning data:', request.url);
      return cachedResponse;
    }
    
    // Return offline planning page for planning requests
    if (request.url.includes('/planning')) {
      return createOfflinePlanningResponse();
    }
    
    return new Response('Offline - geen planning data beschikbaar', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

// Cache first with network fallback
async function cacheFirstWithNetworkFallback(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving page from cache:', request.url);
      // Update cache in background
      fetch(request).then(networkResponse => {
        if (networkResponse.ok) {
          cache.put(request, networkResponse.clone());
        }
      }).catch(() => {});
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return createOfflinePageResponse();
  }
}

// Network first strategy
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && request.url.startsWith('http')) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

// Create offline planning response
function createOfflinePlanningResponse() {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Planning - Offline</title>
      <style>
        body { 
          font-family: system-ui, sans-serif; 
          max-width: 800px; 
          margin: 0 auto; 
          padding: 2rem;
          background: #1d1f20;
          color: #b2b2a2;
        }
        .header { 
          text-align: center; 
          margin-bottom: 2rem;
          color: #3ba39b;
        }
        .offline-notice {
          background: #ffa94d;
          color: #1d1f20;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          text-align: center;
          font-weight: 600;
        }
        .cached-info {
          background: rgba(59, 163, 155, 0.1);
          border: 1px solid rgba(59, 163, 155, 0.3);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1rem;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📅 Mijn Planning - Offline</h1>
      </div>
      
      <div class="offline-notice">
        📶 Geen internetverbinding - Getoond wordt de laatst opgehaalde planning
      </div>
      
      <div class="cached-info">
        <h3>Offline Functionaliteit</h3>
        <p>• Bekijk je laatst gesynchroniseerde planning</p>
        <p>• Navigeer tussen verschillende weergaven</p>
        <p>• Planning wordt automatisch bijgewerkt zodra je weer online bent</p>
      </div>
      
      <div id="cached-planning">
        <p>Controleer je netwerkverbinding om de meest recente planning te zien.</p>
      </div>
      
      <script>
        // Try to load cached planning data
        if ('caches' in window) {
          caches.match('/api/planning').then(response => {
            if (response) {
              response.json().then(data => {
                console.log('Loaded cached planning data:', data);
                // Display cached planning data here
              });
            }
          });
        }
        
        // Check online status
        function updateOnlineStatus() {
          if (navigator.onLine) {
            location.reload();
          }
        }
        
        window.addEventListener('online', updateOnlineStatus);
      </script>
    </body>
    </html>
  `;
  
  return new Response(offlineHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Create offline page response
function createOfflinePageResponse() {
  const offlineHtml = `
    <!DOCTYPE html>
    <html lang="nl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Offline - Toekomst School</title>
      <style>
        body { 
          font-family: system-ui, sans-serif; 
          text-align: center; 
          padding: 2rem;
          background: #1d1f20;
          color: #b2b2a2;
        }
        .logo { height: 4rem; margin-bottom: 2rem; }
        .offline-message { 
          background: #ffa94d; 
          color: #1d1f20;
          padding: 1rem; 
          border-radius: 8px; 
          margin: 2rem 0;
          font-weight: 600;
        }
        .retry-btn {
          background: #3ba39b;
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-size: 1rem;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <img src="/toekomst_logo.svg" alt="Toekomst School" class="logo">
      <h1>📶 Offline</h1>
      <div class="offline-message">
        Geen internetverbinding beschikbaar
      </div>
      <p>Controleer je netwerkverbinding en probeer opnieuw.</p>
      <button class="retry-btn" onclick="location.reload()">🔄 Opnieuw proberen</button>
      
      <script>
        window.addEventListener('online', () => location.reload());
      </script>
    </body>
    </html>
  `;
  
  return new Response(offlineHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Background sync for when connection is restored
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync-planning') {
    console.log('Service Worker: Background syncing planning data');
    event.waitUntil(syncPlanningData());
  }
});

// Sync planning data when online
async function syncPlanningData() {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = await fetch('/api/planning');
    
    if (response.ok) {
      await cache.put('/api/planning', response.clone());
      console.log('Service Worker: Planning data synced');
      
      // Notify clients that data is updated
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'PLANNING_SYNCED' });
      });
    }
  } catch (error) {
    console.log('Service Worker: Sync failed:', error);
  }
}