/**
 * Netlify Function: GitHub OAuth Callback
 * Handles GitHub OAuth authentication for admin access
 * 
 * Required Environment Variables:
 * - GITHUB_CLIENT_ID: OAuth App Client ID
 * - GITHUB_CLIENT_SECRET: OAuth App Client Secret
 * - ADMIN_GITHUB_USERNAME: Your GitHub username (e.g., 'StudyWithJesus')
 */

const https = require('https');

/**
 * Exchange OAuth code for access token
 */
function exchangeCodeForToken(code, clientId, clientSecret) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    });

    const options = {
      hostname: 'github.com',
      port: 443,
      path: '/login/oauth/access_token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Accept': 'application/json',
        'User-Agent': 'Netlify-Function-OAuth'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.access_token) {
            resolve(response.access_token);
          } else {
            reject(new Error(`GitHub OAuth error: ${response.error_description || 'Unknown error'}`));
          }
        } catch (err) {
          reject(new Error('Failed to parse GitHub OAuth response'));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

/**
 * Get GitHub user info
 */
function getGitHubUser(accessToken) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/user',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Netlify-Function-OAuth'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const user = JSON.parse(data);
            resolve(user);
          } catch (err) {
            reject(new Error('Failed to parse GitHub user response'));
          }
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // Only accept GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Get environment variables
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const adminUsername = process.env.ADMIN_GITHUB_USERNAME;

  if (!clientId || !clientSecret || !adminUsername) {
    console.error('Missing required environment variables');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
          <head><title>Configuration Error</title></head>
          <body>
            <h1>Server Configuration Error</h1>
            <p>GitHub OAuth is not properly configured. Please set the required environment variables:</p>
            <ul>
              <li>GITHUB_CLIENT_ID</li>
              <li>GITHUB_CLIENT_SECRET</li>
              <li>ADMIN_GITHUB_USERNAME</li>
            </ul>
          </body>
        </html>
      `
    };
  }

  // Parse query parameters
  const params = event.queryStringParameters || {};
  const code = params.code;
  const state = params.state;
  const returnTo = params.return_to || '/pages/admin/index.html';

  if (!code) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Error</title></head>
          <body>
            <h1>Authentication Error</h1>
            <p>No authorization code provided.</p>
            <p><a href="/pages/admin/index.html">Return to Admin</a></p>
          </body>
        </html>
      `
    };
  }

  try {
    // Exchange code for access token
    const accessToken = await exchangeCodeForToken(code, clientId, clientSecret);

    // Get user information
    const user = await getGitHubUser(accessToken);

    // Check if user is authorized admin
    if (user.login.toLowerCase() !== adminUsername.toLowerCase()) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'text/html' },
        body: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Access Denied</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  min-height: 100vh;
                  margin: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  text-align: center;
                  padding: 20px;
                }
                .container {
                  max-width: 500px;
                }
                h1 { font-size: 3rem; margin: 0 0 1rem 0; }
                p { font-size: 1.2rem; opacity: 0.9; }
                .icon { font-size: 4rem; margin-bottom: 1rem; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">🚫</div>
                <h1>Access Denied</h1>
                <p>You are logged in as <strong>${user.login}</strong>.</p>
                <p>This admin area is restricted to authorized accounts only.</p>
                <p style="margin-top: 2rem; font-size: 0.9rem;">
                  <a href="/" style="color: white;">← Return to Main Site</a>
                </p>
              </div>
            </body>
          </html>
        `
      };
    }

    // User is authorized - create session token
    const sessionData = {
      username: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url,
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    // Redirect to admin page with session token
    return {
      statusCode: 302,
      headers: {
        'Location': `${returnTo}?session=${sessionToken}`,
        'Set-Cookie': `admin_session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`
      },
      body: ''
    };

  } catch (err) {
    console.error('GitHub OAuth error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
          <head><title>Authentication Error</title></head>
          <body>
            <h1>Authentication Error</h1>
            <p>Failed to authenticate with GitHub: ${err.message}</p>
            <p><a href="/pages/admin/index.html">Try Again</a></p>
          </body>
        </html>
      `
    };
  }
};
