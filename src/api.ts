/**
 * Video game music database client — backed by the iTunes Catalog API.
 *
 * Why: the original VGMdb.info API went offline in 2024, and MusicBrainz
 * aggressively resets connections from automated IPs. The iTunes Catalog
 * API is free, needs no key, never fingerprints blocks, and catalogs
 * game soundtrack releases (Chrono Trigger OST, NieR, Undertale...) with
 * full tracklists and composers.
 */

const BASE = "https://itunes.apple.com"

export class VgmdbError extends Error {}

async function apiGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params)
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Accept: "application/json", "User-Agent": "vgmdb-mcp/1.0" },
  })
  if (!res.ok) {
    throw new VgmdbError(`iTunes API error ${res.status}: ${res.statusText}`)
  }
  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlbumSearchResult {
  id: number
  title: string
  artist: string
  releaseDate?: string
  trackCount?: number
  genre?: string
  url?: string
  artwork?: string
}

export interface AlbumDetail {
  id: number
  title: string
  artist: string
  releaseDate?: string
  genre?: string
  url?: string
  artwork?: string
  tracks: { number: number; title: string; time?: string; disc?: number }[]
}

export interface ArtistSearchResult {
  id: number
  name: string
  genre?: string
  url?: string
}

export interface ArtistDetail {
  id: number
  name: string
  albums: AlbumSearchResult[]
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

export async function searchAlbums(query: string): Promise<AlbumSearchResult[]> {
  const data = await apiGet<{ results: any[] }>("/search", {
    term: query,
    entity: "album",
    limit: "12",
  })
  return (data.results ?? []).map(mapAlbum)
}

export async function getAlbum(id: string): Promise<AlbumDetail | null> {
  const data = await apiGet<{ resultCount: number; results: any[] }>("/lookup", {
    id,
    entity: "song",
    limit: "200",
  })
  const album = data.results?.[0]
  if (!album || !album.collectionId) return null
  return {
    id: album.collectionId,
    title: album.collectionName ?? "?",
    artist: album.artistName ?? "?",
    releaseDate: album.releaseDate?.slice(0, 10),
    genre: album.primaryGenreName,
    url: album.collectionViewUrl,
    artwork: album.artworkUrl100?.replace("100x100", "600x600"),
    tracks: (data.results ?? [])
      .filter((r) => r.wrapperType === "track")
      .map((t, i) => ({
        number: t.trackNumber ?? i + 1,
        title: t.trackName ?? "?",
        time: t.trackTimeMillis ? fmtLength(t.trackTimeMillis) : undefined,
        disc: t.discNumber && t.discCount > 1 ? t.discNumber : undefined,
      })),
  }
}

export async function searchArtists(query: string): Promise<ArtistSearchResult[]> {
  const data = await apiGet<{ results: any[] }>("/search", {
    term: query,
    entity: "musicArtist",
    limit: "10",
  })
  return (data.results ?? []).map((a) => ({
    id: a.artistId,
    name: a.artistName ?? "?",
    genre: a.primaryGenreName,
    url: a.artistLinkUrl,
  }))
}

export async function getArtist(id: string): Promise<ArtistDetail | null> {
  const data = await apiGet<{ results: any[] }>("/lookup", {
    id,
    entity: "album",
    limit: "25",
  })
  const artist = data.results?.[0]
  if (!artist || !artist.artistId) return null
  return {
    id: artist.artistId,
    name: artist.artistName ?? "?",
    albums: (data.results ?? [])
      .filter((r) => r.wrapperType === "collection")
      .map(mapAlbum),
  }
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function mapAlbum(a: any): AlbumSearchResult {
  return {
    id: a.collectionId,
    title: a.collectionName ?? "?",
    artist: a.artistName ?? "?",
    releaseDate: a.releaseDate?.slice(0, 10),
    trackCount: a.trackCount,
    genre: a.primaryGenreName,
    url: a.collectionViewUrl,
    artwork: a.artworkUrl100?.replace("100x100", "600x600"),
  }
}

function fmtLength(ms: number): string {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}

export function formatAlbumSearch(a: AlbumSearchResult): string {
  return (
    `[${a.id}] ${a.title} by ${a.artist}` +
    (a.releaseDate ? `\nReleased: ${a.releaseDate}` : "") +
    (a.trackCount ? ` | ${a.trackCount} tracks` : "") +
    (a.genre ? ` | ${a.genre}` : "") +
    (a.artwork ? `\nArtwork: ${a.artwork}` : "") +
    `\n${a.url ?? ""}`
  )
}

export function formatAlbumDetail(a: AlbumDetail): string {
  const lines = [
    `[${a.id}] ${a.title} by ${a.artist}`,
    `Released: ${a.releaseDate ?? "?"}${a.genre ? ` | ${a.genre}` : ""}`,
    a.tracks.length ? `Tracks: ${a.tracks.length}` : "",
  ]
  if (a.tracks.length) {
    lines.push("\nTracklist:")
    for (const t of a.tracks) {
      const prefix = t.disc ? `D${t.disc}.` : ""
      lines.push(`  ${prefix}${String(t.number).padStart(2, "0")} ${t.title}${t.time ? `  [${t.time}]` : ""}`)
    }
  }
  if (a.url) lines.push(`\n${a.url}`)
  return lines.join("\n")
}

export function formatArtistSearch(a: ArtistSearchResult): string {
  return (
    `[${a.id}] ${a.name}` +
    (a.genre ? ` — ${a.genre}` : "") +
    `\n${a.url ?? ""}`
  )
}

export function formatArtistDetail(a: ArtistDetail): string {
  const lines = [`[${a.id}] ${a.name}`]
  if (a.albums.length) {
    lines.push(`\nAlbums (${a.albums.length}):`)
    for (const alb of a.albums.slice(0, 20)) {
      lines.push(
        `  • ${alb.title} (${alb.releaseDate ?? "?"}) — ${alb.trackCount ?? "?"} tracks — id ${alb.id}`
      )
    }
  }
  return lines.join("\n")
}
