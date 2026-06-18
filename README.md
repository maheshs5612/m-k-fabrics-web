# M K Fabrics CMS Final

This version is fully wired so the public website reads:
- `content/gallery.json` for gallery items
- `content/contact.json` for contact details

## Publish flow

1. Put this folder in a GitHub repository.
2. Connect the repository to Netlify.
3. Enable Netlify Identity.
4. Set registration to **Invite only**.
5. Enable **Git Gateway**.
6. Visit `/admin/` and log in from your invite email.
7. Update gallery items or contact details.
8. Publish changes from the CMS.

## How it works

- Decap CMS edits the JSON files.
- The public website fetches those JSON files directly.
- Uploaded images go into `uploads/`.
- Visitors can see the gallery, but only invited admins can edit it.

## Best use

This setup is a good fit for around 50 to 100 images.
 
