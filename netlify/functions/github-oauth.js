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
    console.error('GITHUB_CLIENT_ID present:', !!clientId);
    console.error('GITHUB_CLIENT_SECRET present:', !!clientSecret);
    console.error('ADMIN_GITHUB_USERNAME present:', !!adminUsername);
    
    const missingVars = [];
    if (!clientId) missingVars.push('GITHUB_CLIENT_ID');
    if (!clientSecret) missingVars.push('GITHUB_CLIENT_SECRET');
    if (!adminUsername) missingVars.push('ADMIN_GITHUB_USERNAME');
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Configuration Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #d32f2f;
                margin-top: 0;
              }
              .error-details {
                background: #ffebee;
                border-left: 4px solid #d32f2f;
                padding: 15px;
                margin: 20px 0;
              }
              ul {
                margin: 15px 0;
                padding-left: 20px;
              }
              li {
                margin: 8px 0;
                color: #d32f2f;
                font-weight: 500;
              }
              .help {
                background: #e3f2fd;
                border-left: 4px solid #2196F3;
                padding: 15px;
                margin: 20px 0;
              }
              .help h3 {
                margin-top: 0;
                color: #1976D2;
              }
              code {
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
              }
              a {
                color: #1976D2;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Server Configuration Error</h1>
              <p>GitHub OAuth authentication is not properly configured on this Netlify deployment.</p>
              
              <div class="error-details">
                <strong>Missing Environment Variables:</strong>
                <ul>
                  ${missingVars.map(v => `<li>${v}</li>`).join('')}
                </ul>
              </div>

              <div class="help">
                <h3>🔧 How to Fix</h3>
                <ol>
                  <li>Go to your <a href="https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env" target="_blank">Netlify Environment Variables</a></li>
                  <li>Add the missing variables:
                    <ul>
                      <li><code>GITHUB_CLIENT_ID</code> - Your OAuth App Client ID</li>
                      <li><code>GITHUB_CLIENT_SECRET</code> - Your OAuth App Client Secret (mark as secret)</li>
                      <li><code>ADMIN_GITHUB_USERNAME</code> - Your GitHub username</li>
                    </ul>
                  </li>
                  <li>Redeploy your site or trigger a new deployment</li>
                </ol>
                
                <p><strong>Need to create OAuth App?</strong></p>
                <ol>
                  <li>Go to <a href="https://github.com/settings/developers" target="_blank">GitHub Developer Settings</a></li>
                  <li>Create a new OAuth App with these settings:
                    <ul>
                      <li>Homepage URL: <code>https://silly-speculoos-4afae0.netlify.app</code></li>
                      <li>Callback URL: <code>https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth</code></li>
                    </ul>
                  </li>
                  <li>Copy the Client ID and generate a Client Secret</li>
                  <li>Add them to Netlify environment variables</li>
                </ol>
              </div>

              <p><a href="/pages/admin/index.html">← Return to Admin Page</a></p>
            </div>
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
    console.log('No authorization code provided');
    console.log('Query parameters:', params);
    
    // Check if there's an error from GitHub
    const error = params.error;
    const errorDescription = params.error_description || '';
    const errorUri = params.error_uri || '';
    
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>OAuth Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #f57c00;
                margin-top: 0;
              }
              .error-box {
                background: #fff3e0;
                border-left: 4px solid #f57c00;
                padding: 15px;
                margin: 20px 0;
              }
              code {
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
              }
              .help {
                background: #e3f2fd;
                border-left: 4px solid #2196F3;
                padding: 15px;
                margin: 20px 0;
              }
              a {
                color: #1976D2;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
              ul {
                margin: 10px 0;
                padding-left: 20px;
              }
              li {
                margin: 5px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ Authentication Error</h1>
              ${error ? `
                <div class="error-box">
                  <p><strong>Error:</strong> ${error}</p>
                  ${errorDescription ? `<p><strong>Description:</strong> ${errorDescription}</p>` : ''}
                  ${errorUri ? `<p><a href="${errorUri}" target="_blank">More information</a></p>` : ''}
                </div>
              ` : `
                <p>No authorization code was provided by GitHub OAuth.</p>
              `}
              
              <div class="help">
                <h3>Common Causes</h3>
                <ul>
                  <li><strong>OAuth App Callback URL Mismatch:</strong> The callback URL configured in your GitHub OAuth App doesn't match the actual deployment URL.</li>
                  <li><strong>User Denied Access:</strong> You may have clicked "Cancel" on the GitHub authorization page.</li>
                  <li><strong>Expired/Invalid Request:</strong> The OAuth request may have expired or been corrupted.</li>
                </ul>
                
                <h3>How to Fix</h3>
                <ol>
                  <li>Verify your GitHub OAuth App settings at <a href="https://github.com/settings/developers" target="_blank">GitHub Developer Settings</a></li>
                  <li>Ensure the <strong>Authorization callback URL</strong> is exactly:<br>
                    <code>https://silly-speculoos-4afae0.netlify.app/.netlify/functions/github-oauth</code>
                  </li>
                  <li>Try signing in again from the <a href="/pages/admin/index.html">Admin Page</a></li>
                </ol>
              </div>

              <p><a href="/pages/admin/index.html">← Try Again</a></p>
            </div>
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
      console.log('Access denied for user:', user.login, 'Expected:', adminUsername);
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
                  max-width: 600px;
                  background: rgba(255, 255, 255, 0.1);
                  padding: 40px;
                  border-radius: 12px;
                  backdrop-filter: blur(10px);
                }
                h1 { font-size: 3rem; margin: 0 0 1rem 0; }
                p { font-size: 1.1rem; opacity: 0.95; line-height: 1.6; }
                .icon { font-size: 4rem; margin-bottom: 1rem; }
                .user-info {
                  background: rgba(255, 255, 255, 0.15);
                  padding: 15px;
                  border-radius: 8px;
                  margin: 20px 0;
                }
                code {
                  background: rgba(0, 0, 0, 0.2);
                  padding: 3px 8px;
                  border-radius: 4px;
                  font-family: monospace;
                }
                a {
                  color: white;
                  text-decoration: none;
                  border-bottom: 1px solid rgba(255, 255, 255, 0.5);
                }
                a:hover {
                  border-bottom: 1px solid white;
                }
                .hint {
                  font-size: 0.9rem;
                  opacity: 0.8;
                  margin-top: 20px;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">🚫</div>
                <h1>Access Denied</h1>
                <div class="user-info">
                  <p>You are logged in as <code>${user.login}</code></p>
                  <p>Only <code>${adminUsername}</code> can access this admin area.</p>
                </div>
                <p>This admin area is restricted to authorized accounts only.</p>
                <div class="hint">
                  <p><strong>Are you the site owner?</strong></p>
                  <p>If <code>${user.login}</code> should have access, update the <code>ADMIN_GITHUB_USERNAME</code> environment variable in your Netlify dashboard to match your GitHub username exactly.</p>
                </div>
                <p style="margin-top: 2rem;">
                  <a href="/">← Return to Main Site</a>
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
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: code ? 'present' : 'missing',
      clientId: clientId ? 'present' : 'missing'
    });
    
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/html' },
      body: `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 {
                color: #d32f2f;
                margin-top: 0;
              }
              .error-box {
                background: #ffebee;
                border-left: 4px solid #d32f2f;
                padding: 15px;
                margin: 20px 0;
                word-break: break-word;
              }
              .help {
                background: #e3f2fd;
                border-left: 4px solid #2196F3;
                padding: 15px;
                margin: 20px 0;
              }
              code {
                background: #f5f5f5;
                padding: 2px 6px;
                border-radius: 3px;
                font-family: monospace;
                font-size: 0.9em;
              }
              a {
                color: #1976D2;
                text-decoration: none;
              }
              a:hover {
                text-decoration: underline;
              }
              ul {
                margin: 10px 0;
                padding-left: 20px;
              }
              li {
                margin: 8px 0;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>❌ Authentication Error</h1>
              <p>Failed to authenticate with GitHub.</p>
              
              <div class="error-box">
                <strong>Error Message:</strong>
                <p><code>${err.message}</code></p>
              </div>

              <div class="help">
                <h3>Possible Causes</h3>
                <ul>
                  <li><strong>Invalid OAuth Credentials:</strong> The Client ID or Client Secret may be incorrect.</li>
                  <li><strong>Network Issue:</strong> Unable to connect to GitHub's API.</li>
                  <li><strong>Expired Authorization Code:</strong> The authorization code from GitHub may have expired.</li>
                  <li><strong>GitHub API Error:</strong> GitHub's OAuth service may be experiencing issues.</li>
                </ul>
                
                <h3>How to Fix</h3>
                <ol>
                  <li>Verify your environment variables in <a href="https://app.netlify.com/sites/silly-speculoos-4afae0/configuration/env" target="_blank">Netlify</a>:
                    <ul>
                      <li><code>GITHUB_CLIENT_ID</code> - Should match your OAuth App Client ID</li>
                      <li><code>GITHUB_CLIENT_SECRET</code> - Should match your OAuth App Client Secret</li>
                    </ul>
                  </li>
                  <li>Check your OAuth App settings at <a href="https://github.com/settings/developers" target="_blank">GitHub Developer Settings</a></li>
                  <li>Try regenerating your Client Secret if you suspect it may be incorrect</li>
                  <li>Check the <a href="https://app.netlify.com/sites/silly-speculoos-4afae0/functions" target="_blank">Netlify function logs</a> for more details</li>
                </ol>
              </div>

              <p><a href="/pages/admin/index.html">← Try Again</a></p>
            </div>
          </body>
        </html>
      `
    };
  }
};
