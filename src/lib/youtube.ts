// Vídeos do YouTube (SPEC RF-11): o material guarda a URL colada pela pessoa docente e o app
// exibe o vídeo embutido via youtube-nocookie.com.

const ID = /^[A-Za-z0-9_-]{11}$/

const HOSTS_YOUTUBE = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])

/**
 * Extrai o id do vídeo de `youtu.be/ID`, `youtube.com/watch?v=ID`, `youtube.com/shorts/ID`,
 * `youtube.com/embed/ID` (e `/live/ID`). Devolve null se a URL não for de um vídeo do YouTube.
 */
export function idDoYoutube(texto: string): string | null {
  let url: URL
  try {
    url = new URL(texto.trim())
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter(Boolean)
  let id: string | null | undefined

  if (host === 'youtu.be' || host === 'www.youtu.be') {
    id = partes[0]
  } else if (HOSTS_YOUTUBE.has(host)) {
    if (partes[0] === 'watch') id = url.searchParams.get('v')
    else if (['shorts', 'embed', 'live'].includes(partes[0] ?? '')) id = partes[1]
  }

  return id && ID.test(id) ? id : null
}

/** URL do player sem cookies de rastreamento (SPEC §5.5). */
export function urlEmbutida(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}
