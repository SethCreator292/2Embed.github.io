import './style.css';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SUPABASE_ANON_KEY
);

const app = document.querySelector('#app');

function generateShortCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function createShortUrl(originalUrl, title = '') {
  const shortCode = generateShortCode();

  const { data, error } = await supabase
    .from('urls')
    .insert([
      {
        short_code: shortCode,
        original_url: originalUrl,
        title: title || null
      }
    ])
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === '23505') {
      return createShortUrl(originalUrl, title);
    }
    throw error;
  }

  return data;
}

async function getUrlByShortCode(shortCode) {
  const { data, error } = await supabase
    .from('urls')
    .select('*')
    .eq('short_code', shortCode)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function incrementClicks(shortCode) {
  const { error } = await supabase.rpc('increment_clicks', {
    p_short_code: shortCode
  });

  if (error) {
    const url = await getUrlByShortCode(shortCode);
    if (url) {
      await supabase
        .from('urls')
        .update({ clicks: url.clicks + 1 })
        .eq('short_code', shortCode);
    }
  }
}

async function getRecentUrls() {
  const { data, error } = await supabase
    .from('urls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) throw error;
  return data;
}

function renderApp() {
  const currentPath = window.location.pathname;
  const shortCode = currentPath.substring(1);

  if (shortCode && shortCode !== '') {
    handleRedirect(shortCode);
    return;
  }

  app.innerHTML = `
    <div class="container">
      <header>
        <h1>Sound Effects.org</h1>
        <p class="tagline">Shorten your URLs instantly</p>
      </header>

      <div class="shortener-card">
        <form id="urlForm">
          <div class="form-group">
            <label for="originalUrl">Enter your long URL</label>
            <input
              type="url"
              id="originalUrl"
              placeholder="https://example.com/very/long/url/path"
              required
            />
          </div>
          <div class="form-group">
            <label for="title">Title (optional)</label>
            <input
              type="text"
              id="title"
              placeholder="My awesome link"
            />
          </div>
          <button type="submit" class="btn-primary">Shorten URL</button>
        </form>

        <div id="result" class="result hidden">
          <h3>Your shortened URL:</h3>
          <div class="url-display">
            <input type="text" id="shortUrl" readonly />
            <button id="copyBtn" class="btn-secondary">Copy</button>
          </div>
          <div class="url-info">
            <p><strong>Original:</strong> <span id="originalUrlDisplay"></span></p>
            <p><strong>Clicks:</strong> <span id="clicksDisplay">0</span></p>
          </div>
        </div>
      </div>

      <div class="recent-urls">
        <h2>Recent URLs</h2>
        <div id="urlsList" class="urls-list">
          <div class="loading">Loading...</div>
        </div>
      </div>
    </div>
  `;

  setupEventListeners();
  loadRecentUrls();
}

function setupEventListeners() {
  const form = document.querySelector('#urlForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const originalUrl = document.querySelector('#originalUrl').value;
    const title = document.querySelector('#title').value;
    const submitBtn = form.querySelector('button[type="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating...';

    try {
      const data = await createShortUrl(originalUrl, title);
      const shortUrl = `${window.location.origin}/${data.short_code}`;

      document.querySelector('#shortUrl').value = shortUrl;
      document.querySelector('#originalUrlDisplay').textContent = originalUrl;
      document.querySelector('#clicksDisplay').textContent = data.clicks;
      document.querySelector('#result').classList.remove('hidden');

      document.querySelector('#copyBtn').addEventListener('click', () => {
        const shortUrlInput = document.querySelector('#shortUrl');
        shortUrlInput.select();
        navigator.clipboard.writeText(shortUrl);

        const copyBtn = document.querySelector('#copyBtn');
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = 'Copy';
        }, 2000);
      });

      loadRecentUrls();
    } catch (error) {
      alert('Error creating short URL: ' + error.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Shorten URL';
    }
  });
}

async function loadRecentUrls() {
  const urlsList = document.querySelector('#urlsList');

  try {
    const urls = await getRecentUrls();

    if (urls.length === 0) {
      urlsList.innerHTML = '<p class="no-urls">No URLs yet. Create your first one!</p>';
      return;
    }

    urlsList.innerHTML = urls.map(url => `
      <div class="url-item">
        <div class="url-item-content">
          <div class="url-item-header">
            ${url.title ? `<h4>${url.title}</h4>` : ''}
            <a href="/${url.short_code}" target="_blank" class="short-link">
              ${window.location.host}/${url.short_code}
            </a>
          </div>
          <p class="original-url">${url.original_url}</p>
          <div class="url-meta">
            <span class="clicks">${url.clicks} clicks</span>
            <span class="date">${new Date(url.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    urlsList.innerHTML = '<p class="error">Error loading URLs</p>';
  }
}

async function handleRedirect(shortCode) {
  app.innerHTML = `
    <div class="redirect-container">
      <div class="spinner"></div>
      <p>Redirecting...</p>
    </div>
  `;

  try {
    const url = await getUrlByShortCode(shortCode);

    if (!url) {
      app.innerHTML = `
        <div class="error-container">
          <h1>404</h1>
          <p>Short URL not found</p>
          <a href="/" class="btn-primary">Go Home</a>
        </div>
      `;
      return;
    }

    await incrementClicks(shortCode);
    window.location.href = url.original_url;
  } catch (error) {
    app.innerHTML = `
      <div class="error-container">
        <h1>Error</h1>
        <p>Failed to redirect: ${error.message}</p>
        <a href="/" class="btn-primary">Go Home</a>
      </div>
    `;
  }
}

renderApp();
