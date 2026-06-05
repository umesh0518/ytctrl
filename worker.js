/**
 * YTctrl Cloudflare Worker
 *
 * Handles two routes:
 *   GET /?list=PLAYLIST_ID          → fetch full YouTube playlist (existing)
 *   GET /search?q=QUERY             → proxy YouTube Data API v3 search
 *
 * Environment variables (set in Cloudflare dashboard → Worker → Settings → Variables):
 *   YT_API_KEY   — your YouTube Data API v3 key (set as a Secret, not plain text)
 *
 * CORS: allows requests from any origin so GitHub Pages can call it.
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // ── Route: YouTube search ──────────────────────────────────────────────
    if (path === "/search") {
      return handleSearch(url, env);
    }

    // ── Route: Playlist fetch (existing behaviour) ─────────────────────────
    const listId = url.searchParams.get("list");
    if (listId) {
      return handlePlaylist(listId, env);
    }

    return json({ error: "Bad request" }, 400);
  },
};

// ─── YouTube Search ────────────────────────────────────────────────────────────
async function handleSearch(url, env) {
  const q = url.searchParams.get("q");
  if (!q) return json({ error: "Missing q" }, 400);

  const key = env.YT_API_KEY;
  if (!key) return json({ error: "API key not configured on worker" }, 500);

  const maxResults = url.searchParams.get("maxResults") || "15";

  const ytUrl =
    "https://www.googleapis.com/youtube/v3/search" +
    "?part=snippet" +
    "&type=video" +
    "&videoCategoryId=10" + // Music category
    "&maxResults=" +
    maxResults +
    "&q=" +
    encodeURIComponent(q) +
    "&key=" +
    encodeURIComponent(key);

  try {
    const resp = await fetch(ytUrl);
    const data = await resp.json();

    if (!resp.ok) {
      // Pass YouTube's error message through (quota exceeded, bad key, etc.)
      const msg = data?.error?.message || "YouTube API error";
      return json({ error: msg }, resp.status);
    }

    // Reshape to a simpler format for the client
    const results = (data.items || [])
      .filter((item) => item.id?.videoId)
      .map((item) => ({
        id: item.id.videoId,
        title: item.snippet?.title || item.id.videoId,
        channel: item.snippet?.channelTitle || "",
        thumb: item.snippet?.thumbnails?.medium?.url || "",
      }));

    return json({ results });
  } catch (e) {
    return json({ error: "Worker search error: " + e.message }, 500);
  }
}

// ─── Playlist Fetch ────────────────────────────────────────────────────────────
async function handlePlaylist(listId, env) {
  const key = env.YT_API_KEY;
  if (!key) return json({ error: "API key not configured on worker" }, 500);

  let tracks = [];
  let pageToken = "";

  try {
    do {
      const ytUrl =
        "https://www.googleapis.com/youtube/v3/playlistItems" +
        "?part=snippet,contentDetails" +
        "&maxResults=50" +
        "&playlistId=" +
        encodeURIComponent(listId) +
        (pageToken ? "&pageToken=" + encodeURIComponent(pageToken) : "") +
        "&key=" +
        encodeURIComponent(key);

      const resp = await fetch(ytUrl);
      const data = await resp.json();

      if (!resp.ok) {
        const msg = data?.error?.message || "YouTube API error";
        // If we already got some tracks, return what we have
        if (tracks.length > 0) break;
        return json({ error: msg }, resp.status);
      }

      for (const item of data.items || []) {
        const vidId =
          item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
        if (!vidId || vidId === "deleted" || vidId === "private") continue;
        tracks.push({
          id: vidId,
          title: item.snippet?.title || null,
          channel: item.snippet?.videoOwnerChannelTitle || null,
        });
      }

      pageToken = data.nextPageToken || "";
    } while (pageToken);

    return json({ tracks });
  } catch (e) {
    // Return empty so client falls back to iframe API
    return json({ tracks: [] });
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
