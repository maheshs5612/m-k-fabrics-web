const CLIENT_ID     = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const SCOPE         = 'repo,user';
const REDIRECT_URI  = 'https://m-k-fabrics.vercel.app/api/auth';
const ORIGIN        = 'https://m-k-fabrics.vercel.app';

// Only these GitHub usernames are allowed into the CMS
const ALLOWED_USERS = ['maheshs5612'];

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

  // Exchange code for token
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
    return res.send(errorPage(data.error_description || 'OAuth error'));
  }

  // Verify the GitHub user is in the allowed list
  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${data.access_token}`,
      Accept: 'application/json',
      'User-Agent': 'MK-Fabrics-CMS',
    },
  });
  const user = await userRes.json();

  if (!ALLOWED_USERS.includes(user.login)) {
    return res.send(errorPage(`Access denied. GitHub user "${user.login}" is not authorised to access this admin.`));
  }

  // Authorised — send token back to CMS
  return res.send(successPage(data.access_token));
}

function successPage(token) {
  return `<!DOCTYPE html><html><body><script>
(function() {
  var token = ${JSON.stringify(token)};
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
<\/script></body></html>`;
}

function errorPage(message) {
  return `<!DOCTYPE html><html><body>
<div style="font-family:sans-serif;text-align:center;padding:4rem;color:#c0392b">
  <h2>Access Denied</h2>
  <p>${message}</p>
  <p>Contact the site administrator for access.</p>
</div>
<script>
(function() {
  var receiveMessage = function(e) {
    window.removeEventListener('message', receiveMessage, false);
    e.source.postMessage(
      'authorization:github:error:' + JSON.stringify({message: ${JSON.stringify('')}}),
      e.origin
    );
  };
  window.addEventListener('message', receiveMessage, false);
  window.opener && window.opener.postMessage('authorizing:github', '${ORIGIN}');
})();
<\/script></body></html>`;
}
