# How to update your Cloudflare Worker

The worker now handles both playlist fetching AND YouTube search.
Your API key lives only in Cloudflare — never in the HTML.

## 1. Deploy the new worker code

Go to https://dash.cloudflare.com → Workers & Pages → your worker (ytctrl)
→ Edit code → paste the contents of `worker.js` → Deploy.

## 2. Add your YouTube API key as a Secret

In the same worker: Settings → Variables → Environment Variables
→ Add variable: Name = `YT_API_KEY`, Value = your YouTube Data API v3 key
→ Toggle it to "Secret" (so it's encrypted and never shown again)
→ Save and Deploy.

Get a free key at https://console.cloud.google.com
→ APIs & Services → Enable YouTube Data API v3
→ Credentials → Create API key

The free quota is 10,000 units/day.

- Each playlist page fetch = 1 unit (fetching 700 songs ≈ 14 units)
- Each search = 100 units (~100 searches/day shared across all friends)

## 3. Push index.html to GitHub

git add index.html
git commit -m "feat: search, playlist switcher, filter — no API key in HTML"
git push

Done. The API key is only in Cloudflare's encrypted environment variables.
Friends using the site never see it.
