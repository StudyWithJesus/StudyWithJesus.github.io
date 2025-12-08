/**
 * Netlify Function: log-fingerprint
 * Receives fingerprint data and creates a GitHub issue
 * 
 * Required Environment Variables:
 * - GITHUB_TOKEN: Personal access token with 'repo' scope
 * 
 * Optional Environment Variables:
 * - GITHUB_REPO: Repository in format 'owner/repo' (default: StudyWithJesus/StudyWithJesus.github.io)
 */

const https = require('https');

/**
 * Create a GitHub issue with the fingerprint data
 */
function createGitHubIssue(token, repo, payload, clientIp) {
  return new Promise((resolve, reject) => {
    const [owner, repoName] = repo.split('/');
    
    const displayName = payload.name ? `**Display Name:** ${payload.name}\n` : '';
    
    const issueBody = `## Fingerprint Log Entry

**Timestamp:** ${payload.ts}
**URL:** ${payload.url}
**Client IP:** ${clientIp || 'unknown'} *(tracked for information only, not used for blocking)*
${displayName}
### Fingerprint Data
- **Hash (SHA-256):** \`${payload.fp}\`
- **User Agent:** ${payload.ua}
- **Language:** ${payload.lang}
- **Timezone Offset:** ${payload.tz} minutes
- **Page URL:** ${payload.url}

### Blacklist Instructions
To blacklist this fingerprint (device/display name), use the Fingerprint Admin dashboard or manually add to \`assets/whitelist-fingerprint.js\`:

\`\`\`javascript
const manuallyBlockedFingerprints = [
  '${payload.fp}', // ${payload.name || 'User'} - IP: ${clientIp} (info only)
];
\`\`\`

**Note:** Only the fingerprint (device ID) is used for blocking. IP addresses are tracked for information purposes only and do NOT affect access control.

---
*This issue was automatically created by the fingerprint logger. IP address is tracked for information only.*
`;

    const titleName = payload.name ? ` (${payload.name})` : '';
    const issueData = JSON.stringify({
      title: `Fingerprint Log: ${payload.fp.substring(0, 8)}...${titleName} at ${new Date(payload.ts).toLocaleString()}`,
      body: issueBody,
      labels: ['fingerprint-log']
    });

    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: `/repos/${owner}/${repoName}/issues`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(issueData),
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Netlify-Function-Fingerprint-Logger'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201) {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (err) {
            reject(new Error('Failed to parse GitHub API response'));
          }
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(issueData);
    req.end();
  });
}

/**
 * Netlify Function Handler
 */
exports.handler = async (event, context) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'POST'
      },
      body: JSON.stringify({ error: 'Method not allowed. Use POST.' })
    };
  }

  // Parse request body
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON payload' })
    };
  }

  // Validate required fields
  const requiredFields = ['fp', 'ua', 'lang', 'tz', 'ts', 'url'];
  for (const field of requiredFields) {
    if (!(field in payload)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Missing required field: ${field}` })
      };
    }
  }

  // Check for required environment variable
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.error('GITHUB_TOKEN environment variable is not set');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Server configuration error. GITHUB_TOKEN not set.' 
      })
    };
  }

  // Get repository (default or from env)
  const githubRepo = process.env.GITHUB_REPO || 'StudyWithJesus/StudyWithJesus.github.io';

  // Get client IP from headers
  const clientIp = event.headers['x-forwarded-for'] || 
                   event.headers['x-real-ip'] || 
                   event.headers['client-ip'] || 
                   'unknown';

  // Create GitHub issue
  try {
    const issue = await createGitHubIssue(githubToken, githubRepo, payload, clientIp);
    
    return {
      statusCode: 201,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        issueUrl: issue.html_url,
        issueNumber: issue.number
      })
    };
  } catch (err) {
    console.error('Failed to create GitHub issue:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: 'Failed to log fingerprint',
        message: err.message 
      })
    };
  }
};
