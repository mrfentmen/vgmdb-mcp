import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import {
  VgmdbError,
  formatAlbumDetail,
  formatAlbumSearch,
  formatArtistDetail,
  formatArtistSearch,
  getAlbum,
  getArtist,
  searchAlbums,
  searchArtists,
} from "./api.js"

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] })

export function createServer(): McpServer {
  const server = new McpServer({
    name: "vgmdb-mcp",
    version: "1.0.0",
  })

  server.tool(
    "search_albums",
    "Search for video game soundtrack albums by game or composer name. " +
      "Returns album ids for get_album.",
    { query: z.string().describe("e.g. 'Chrono Trigger OST' or 'NieR soundtrack'") },
    async ({ query }) => {
      try {
        const albums = await searchAlbums(query)
        if (albums.length === 0) return text(`No albums found for "${query}".`)
        return text(
          `Albums matching "${query}":\n` +
            albums.map((a, i) => `${i + 1}. ${formatAlbumSearch(a)}`).join("\n\n")
        )
      } catch (e) {
        return text(errorMessage(e))
      }
    }
  )

  server.tool(
    "get_album",
    "Get full album details: full tracklist with timings, release date, genre.",
    { id: z.string().describe("Album numeric id from search_albums") },
    async ({ id }) => {
      try {
        const album = await getAlbum(id)
        if (!album) return text(`No album with id "${id}".`)
        return text(formatAlbumDetail(album))
      } catch (e) {
        return text(errorMessage(e))
      }
    }
  )

  server.tool(
    "search_artists",
    "Search for video game composers / performers by name.",
    { query: z.string().describe("e.g. 'Yasunori Mitsuda' or 'Nobuo Uematsu'") },
    async ({ query }) => {
      try {
        const artists = await searchArtists(query)
        if (artists.length === 0) return text(`No artists found for "${query}".`)
        return text(
          `Artists matching "${query}":\n` +
            artists.map((a, i) => `${i + 1}. ${formatArtistSearch(a)}`).join("\n")
        )
      } catch (e) {
        return text(errorMessage(e))
      }
    }
  )

  server.tool(
    "get_artist",
    "Get a composer's/artist's discography (albums).",
    { id: z.string().describe("Artist numeric id from search_artists") },
    async ({ id }) => {
      try {
        const artist = await getArtist(id)
        if (!artist) return text(`No artist with id "${id}".`)
        return text(formatArtistDetail(artist))
      } catch (e) {
        return text(errorMessage(e))
      }
    }
  )

  return server
}

function errorMessage(e: unknown): string {
  if (e instanceof VgmdbError) return `Error: ${e.message}`
  if (e instanceof Error) return `Error: ${e.message}`
  return `Error: ${String(e)}`
}
