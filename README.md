# Super Secret Sound Station

Static 8-bit radio player for Cloudflare Pages.

Upload this folder's contents to the repository root. Cloudflare Pages settings:

- Framework preset: None
- Build command: `exit 0`
- Build output directory: `.`
- Root directory: blank

If the direct HTTPS radio URL is unavailable, change the audio `src` in `index.html` to `/radio` and deploy as a Cloudflare Pages project so `functions/radio.js` is enabled.
