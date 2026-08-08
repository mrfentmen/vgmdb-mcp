# vgmdb mcp

Video game music database. Search game OSTs, composers, and full tracklists.

> The original VGMdb.info API went offline in 2024, and MusicBrainz
> resets connections from script IPs, this server is backed by the
> **iTunes Catalog API** (free, no key, no fingerprint blocking), which
> catalogs game soundtracks with full tracklists and composers.

## Tools

- `search_albums`, find game soundtrack albums ("Chrono Trigger OST")
- `get_album`, full tracklist with timings, artwork, Apple Music link
- `search_artists`, find composers ("Yasunori Mitsuda")
- `get_artist`, a composer's discography

## Run

```bash
npm install && npm run build && node dist/index.js
```

## Example

> "Give me the Chrono Trigger OST tracklist"
> `search_albums("Chrono Trigger OST")` → `get_album(324080907)`
