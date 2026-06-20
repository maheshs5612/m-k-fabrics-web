# M K Fabrics

Premium fabric showcase website with a CMS-powered gallery, hosted on **Vercel**.

## Tech stack

- **Frontend** — plain HTML/CSS/JS (`index.html`)
- **CMS** — [Decap CMS](https://decapcms.org/) at `/admin/`
- **Auth** — GitHub OAuth via Vercel serverless function (`api/auth/[...auth].js`)
- **Hosting** — Vercel (`vercel.json`)

## Structure

```
├── index.html              # Public website
├── vercel.json             # Vercel routing config
├── admin/
│   ├── index.html          # Decap CMS entry point
│   └── config.yml          # CMS collections & field definitions
├── api/
│   └── auth/
│       └── [...auth].js    # GitHub OAuth handler (login + callback)
├── content/
│   ├── contact.json        # Contact details (edited via CMS)
│   └── gallery/            # One JSON file per gallery item (managed by CMS)
└── uploads/                # Uploaded fabric images
```

## Adding gallery items

1. Go to `/admin/` and log in with your GitHub account.
2. Click **Gallery → New Gallery Item**.
3. Fill in Title, Category, optional Note, and upload an Image.
4. Save and publish — the item appears on the site immediately.

## Environment variables (Vercel)

| Variable | Description |
|---|---|
| `OAUTH_CLIENT_ID` | GitHub OAuth App client ID |
| `OAUTH_CLIENT_SECRET` | GitHub OAuth App client secret |

## Notes

- Gallery images are stored in `uploads/` and committed to the repo.
- This setup comfortably handles ~50–100 images.
