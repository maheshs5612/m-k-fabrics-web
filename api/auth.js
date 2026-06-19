// GitHub OAuth proxy for Decap CMS
// GET /api/auth              → redirect to GitHub
// GET /api/auth?code=...     → exchange code, post token back to CMS

const CLIENT_ID     = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SCOPE         = 'repo,user';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    // Step 1: redirect to GitHub
    const host = req.headers.host;
    const redirectUri = `https://${host}/api/auth?provider=github`;
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPE,
      redirect_uri: redirectUri,
    });
    return res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
  }

  // Step 2: exchange code for token
  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    }),
  });
  const data = await tokenRes.json();

  if (data.error) {
    res.setHeader('Content-Type', 'text/html');
    return res.send(`<!DOCTYPE html><html><body><script>
      window.opener && window.opener.postMessage(
        'authorization:github:error:' + JSON.stringify({message: ${JSON.stringify(data.error_description)}}),
        '*'
      );
      window.close();
    <\/script></body></html>`);
  }

  // Step 3: post token back to CMS opener window
  const token = data.access_token;
  res.setHeader('Content-Type', 'text/html');
  return res.send(`<!DOCTYPE html><html><body><script>
    (function(){
      const msg = 'authorization:github:success:' + JSON.stringify({
        token: ${JSON.stringify(token)},
        provider: 'github'
      });
      window.opener && window.opener.postMessage(msg, '*');
      window.close();
    })();
  <\/script></body></html>`);
}
