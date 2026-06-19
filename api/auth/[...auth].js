// GitHub OAuth proxy for Decap CMS
// Routes: GET /api/auth/  → redirect to GitHub
//         GET /api/auth/callback → exchange code for token

const CLIENT_ID     = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SCOPE         = 'repo,user';

export default async function handler(req, res) {
  const { auth } = req.query;
  const action = Array.isArray(auth) ? auth[0] : auth;

  if (action === undefined || action === '') {
    // Step 1 – redirect user to GitHub
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPE,
      redirect_uri: `${process.env.OAUTH_REDIRECT_URI || `https://${req.headers.host}/api/auth/callback`}`,
    });
    return res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
  }

  if (action === 'callback') {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code');

    // Step 2 – exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(400).send(`OAuth error: ${tokenData.error_description}`);
    }

    // Step 3 – post token back to Decap CMS opener window
    const token   = tokenData.access_token;
    const provider = 'github';
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><body><script>
      (function(){
        const msg = JSON.stringify({token:${JSON.stringify(token)},provider:${JSON.stringify(provider)}});
        window.opener && window.opener.postMessage('authorization:github:success:' + msg, '*');
        window.close();
      })();
    <\/script></body></html>`);
  }

  return res.status(404).send('Not found');
}
