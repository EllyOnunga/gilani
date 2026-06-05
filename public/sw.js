const CACHE_NAME = 'gilaniai-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  '/favicon.svg',
  '/logo.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip external APIs like Supabase or Google APIs
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Let's implement a Network-First falling back to Cache strategy for documents and assets
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid response, cache a copy of it
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page navigation fails, we can return a friendly offline message response
          if (event.request.mode === 'navigate') {
            return new Response(
              `<!DOCTYPE html>
              <html lang="en">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>Offline — GilaniAI</title>
                <style>
                  body {
                    margin: 0;
                    padding: 0;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    background-color: #fdfbf7;
                    color: #1a1512;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    text-align: center;
                  }
                  .container {
                    max-width: 400px;
                    padding: 32px 24px;
                    border: 1px solid rgba(217, 83, 30, 0.15);
                    border-radius: 20px;
                    background: white;
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.05);
                  }
                  .logo {
                    margin-bottom: 20px;
                    display: flex;
                    justify-content: center;
                  }
                  h1 {
                    font-family: serif;
                    font-size: 24px;
                    margin: 0 0 12px 0;
                    color: #d9531e;
                  }
                  p {
                    font-size: 14px;
                    color: #5c524d;
                    line-height: 1.6;
                    margin: 0 0 24px 0;
                  }
                  button {
                    background-color: #d9531e;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 10px;
                    font-weight: bold;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s, transform 0.1s;
                  }
                  button:hover {
                    background-color: #be4314;
                  }
                  button:active {
                    transform: scale(0.98);
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="logo">
                    <svg width="72" height="72" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="128" height="128" rx="32" fill="#1d1612" stroke="#d9531e" stroke-width="2"/>
                      <path d="M 21 106 Q 41 96 64 111 Q 64 51 64 41 Q 41 26 21 36 Z" fill="#e5dfd9" />
                      <path d="M 107 106 Q 87 96 64 111 Q 64 51 64 41 Q 87 26 107 36 Z" fill="#ede8e3" />
                      <path d="M 61 41 L 67 41 L 67 112 L 61 112 Z" fill="#362d27" />
                      <path d="M 64 36 C 46 58 48 78 64 91 C 80 78 82 58 64 36 Z" fill="#d9531e" />
                      <path d="M 64 48 C 53 66 55 78 64 87 C 73 78 75 66 64 48 Z" fill="#FBBF24" />
                    </svg>
                  </div>
                  <h1>Connection Lost</h1>
                  <p>GilaniAI study helper requires an active internet connection to access study resources and Socratic AI tutoring. Please check your network and try again.</p>
                  <button onclick="window.location.reload()">Retry Connection</button>
                </div>
              </body>
              </html>`,
              {
                headers: { 'Content-Type': 'text/html' }
              }
            );
          }
        });
      })
  );
});
