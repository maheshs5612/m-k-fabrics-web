const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const galleryDir = path.join(repoRoot, 'content', 'gallery');
const uploadsDir = path.join(repoRoot, 'uploads');
const modelsDir = path.join(uploadsDir, 'models');

function listJsonFiles(dir){
  return fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort();
}

function writeIndexJson(files){
  const idxPath = path.join(galleryDir, 'index.json');
  const content = JSON.stringify(files, null, 2) + '\n';
  fs.writeFileSync(idxPath, content, 'utf8');
}

function loadJson(p){
  try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch(e){ return null }
}

function saveJson(p,obj){
  const content = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(p, content, 'utf8');
}

function basenameNoExt(p){ return path.basename(p).replace(/\.[^.]+$/, ''); }

function sync(){
  if(!fs.existsSync(galleryDir)){
    console.error('content/gallery not found'); process.exit(1);
  }
  const jsonFiles = listJsonFiles(galleryDir).filter(n=>'index.json'!==n);
  writeIndexJson(jsonFiles);
  console.log('Wrote index.json with', jsonFiles.length, 'entries');

  if(!fs.existsSync(modelsDir)){
    console.log('uploads/models does not exist; skipping model mapping');
    return;
  }

  const modelFiles = fs.readdirSync(modelsDir).filter(f=>!/^.git/.test(f));
  const modelLower = modelFiles.map(f=>f.toLowerCase());

  const changed = [];

  jsonFiles.forEach(jf=>{
    const full = path.join(galleryDir, jf);
    const obj = loadJson(full);
    if(!obj) return;
    let fabric = null;
    if(Array.isArray(obj.images) && obj.images.length>0) fabric = obj.images[0];
    else if(obj.image) fabric = obj.image;
    if(!fabric) return;
    const fabricBase = path.basename(fabric).toLowerCase();
    // try to find model file that contains fabric basename
    let matched = null;
    for(let i=0;i<modelFiles.length;i++){
      const m = modelFiles[i];
      if(m.toLowerCase().includes(fabricBase)) { matched = m; break; }
    }
    // fallback: extract leading number token and try match
    if(!matched){
      const numMatch = fabricBase.match(/^([0-9]+)/);
      if(numMatch){
        const num = numMatch[1];
        for(const m of modelFiles){ if(m.toLowerCase().includes(num)) { matched = m; break } }
      }
    }

    if(matched){
      const newPath = '/uploads/models/' + matched;
      if(obj.modelImage !== newPath){ obj.modelImage = newPath; saveJson(full,obj); changed.push(full); console.log('Updated', jf, '->', newPath); }
    }
  });

  if(changed.length>0){
    try{
      execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
      execSync('git config user.name "github-actions[bot]"');
      // Stage files
      execSync('git add content/gallery/*.json content/gallery/index.json uploads/models/*', { stdio: 'inherit' });

      const githubToken = process.env.GITHUB_TOKEN;
      const repoEnv = process.env.GITHUB_REPOSITORY; // owner/repo

      if(githubToken && repoEnv){
        // Create a branch and push, then open a PR
        const branch = `auto-sync/gallery-${Date.now()}`;
        execSync(`git checkout -b ${branch}`, { stdio: 'inherit' });
        execSync('git commit -m "Auto-sync: update content/gallery index and modelImage mappings"', { stdio: 'inherit' });
        execSync(`git push -u origin ${branch}`, { stdio: 'inherit' });

        // Create PR via GitHub API
        try{
          const [owner, repo] = repoEnv.split('/');
          const postData = JSON.stringify({
            title: 'Auto-sync: update content/gallery index and modelImage mappings',
            head: branch,
            base: 'main',
            body: 'This PR was created automatically by the gallery sync workflow to update index.json and modelImage mappings.'
          });

          const https = require('https');
          const options = {
            hostname: 'api.github.com',
            path: `/repos/${owner}/${repo}/pulls`,
            method: 'POST',
            headers: {
              'User-Agent': 'sync-gallery-script',
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
              try{
                const parsed = JSON.parse(data);
                if(parsed && parsed.html_url){
                  console.log('Created PR:', parsed.html_url);
                } else {
                  console.error('PR creation response:', data);
                }
              }catch(err){
                console.error('Failed to parse PR response', err, data);
              }
            });
          });
          req.on('error', (e) => { console.error('PR request error', e); });
          req.write(postData);
          req.end();
        }catch(apiErr){
          console.error('Failed to create PR:', apiErr.message);
        }
      } else {
        // Local fallback: commit to current branch and push
        execSync('git commit -m "Auto-sync: update content/gallery index and modelImage mappings"', { stdio: 'inherit' });
        execSync('git push origin HEAD', { stdio: 'inherit' });
        console.log('Committed and pushed', changed.length, 'files');
      }

    }catch(e){
      console.error('Git commit/push failed:', e.message);
      process.exit(1);
    }
  } else {
    console.log('No gallery JSONs needed updating');
  }
}

sync();
