import { describe, expect, it } from 'vitest'
import { idDoYoutube, urlEmbutida } from './youtube'

const ID = 'dQw4w9WgXcQ'

describe('idDoYoutube', () => {
  it.each([
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=abc123&t=42`,
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?feature=share&v=${ID}&t=10s`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://youtube.com/shorts/${ID}?feature=share`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}`,
    `https://www.youtube.com/live/${ID}`,
    `  https://youtu.be/${ID}  `,
  ])('reconhece %s', (url) => {
    expect(idDoYoutube(url)).toBe(ID)
  })

  it.each([
    '',
    'não é url',
    `youtu.be/${ID}`, // sem protocolo
    `https://vimeo.com/${ID}`,
    `https://youtube.com.golpe.com/watch?v=${ID}`,
    'https://www.youtube.com/watch?v=curto',
    `https://www.youtube.com/watch?v=${ID}xyz`,
    'https://www.youtube.com/watch',
    'https://www.youtube.com/@canal',
    `https://www.youtube.com/playlist?list=${ID}`,
    `javascript:alert(1)//youtu.be/${ID}`,
    `ftp://youtu.be/${ID}`,
  ])('recusa %s', (url) => {
    expect(idDoYoutube(url)).toBeNull()
  })
})

describe('urlEmbutida', () => {
  it('usa o domínio sem cookies', () => {
    expect(urlEmbutida(ID)).toBe(`https://www.youtube-nocookie.com/embed/${ID}`)
  })
})
