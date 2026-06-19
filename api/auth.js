const CLIENT_ID     = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SCOPE         = 'repo,user';
const REDIRECT_URI  = 'https://m-k-fabrics.vercel.app/api/auth';
const ORIGIN        = 'https://m-k-fabrics.vercel.app';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPE,
      redirect_uri: REDIRECT_URI,
    });
    return res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
  }

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

  res.setHeader('Content-Type', 'text/html');

  if (data.error || !data.access_token) {
    return res.send(`<!DOCTYPE html><html><body><script>
(function() {
  var receiveMessage = function(e) {
    window.removeEventListener('message', receiveMessage, false);
    e.source.postMessage(
      'authorization:github:error:' + JSON.stringify({message:${JSON.stringify(data.error_description || 'OAuth error')}}),
      e.origin
    );
  };
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '${ORIGIN}');
})();
<\/script></body></html>`);
  }

  return res.send(`<!DOCTYPE html><html><body><script>
(function() {
  var token = ${JSON.stringify(data.access_token)};
  var receiveMessage = function(e) {
    window.removeEventListener('message', receiveMessage, false);
    e.source.postMessage(
      'authorization:github:success:' + JSON.stringify({token: token, provider: 'github'}),
      e.origin
    );
  };
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '${ORIGIN}');
})();
<\/script></body></html>`);
}
