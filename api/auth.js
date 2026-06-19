const CLIENT_ID     = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SCOPE         = 'repo,user';
const REDIRECT_URI  = 'https://m-k-fabrics.vercel.app/api/auth';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    // Step 1: redirect to GitHub
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPE,
      redirect_uri: REDIRECT_URI,
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
      redirect_uri: REDIRECT_URI,
    }),
  });
  const data = await tokenRes.json();

  if (data.error) {
    const content = `<!DOCTYPE html><html><body><script>
(function(){
  var msg = JSON.stringify({ token: '', provider: 'github', error: '${data.error}' });
  if (window.opener) {
    window.opener.postMessage('authorization:github:error:' + msg, '*');
  }
  window.close();
})();
<\/script></body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.send(content);
  }

  // Step 3: post token back — format Decap CMS v3 expects
  const token = data.access_token;
  const content = `<!DOCTYPE html><html><body><script>
(function(){
  var data = JSON.stringify({ token: '${token}', provider: 'github' });
  if (window.opener) {
    window.opener.postMessage('authorization:github:success:' + data, '*');
  }
  window.close();
})();
<\/script></body></html>`;
  res.setHeader('Content-Type', 'text/html');
  return res.send(content);
}
