// كود انمي بحث وتحميل بجودات
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import axios from 'axios'
import crypto from 'crypto'

const API_BASE = 'https://engez.a7a.online/api/v1'
const SEARCH_ENDPOINT = `${API_BASE}/anime/anime`
const DOWNLOAD_ENDPOINT = `${API_BASE}/download/multi`
const SELECT_SEPARATOR = '|'
const CACHE_TTL_MS = 3 * 60 * 1000

const contextCache = new Map()

function makeToken() {
  return crypto.randomBytes(8).toString('hex')
}

function now() {
  return Date.now()
}

function isExpired(entry) {
  return !entry || (now() - entry.timestamp) > CACHE_TTL_MS
}

function setContext(data) {
  const token = makeToken()
  contextCache.set(token, { ...data, timestamp: now() })
  return token
}

function getContext(token) {
  const entry = contextCache.get(token)
  if (isExpired(entry)) {
    contextCache.delete(token)
    return null
  }
  return entry
}

function clearStaleContexts() {
  const ts = now()
  for (const [token, entry] of contextCache.entries()) {
    if (!entry || (ts - entry.timestamp) > CACHE_TTL_MS) {
      contextCache.delete(token)
    }
  }
}

function isYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(url)
}

function cleanText(text = '') {
  return String(text)
    .replace(/\[?\s*witanime(?:\.com)?\s*\]?/ig, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—:|]+\s*$/g, '')
    .replace(/^\s*[-–—:|]+\s*/g, '')
    .trim()
}

function safeFileName(text = '') {
  return cleanText(text)
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
}

function decodeMaybe(value) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function normalizeSource(server = '', tag = '') {
  const s = String(tag || server || '').toLowerCase().trim()
  if (s === 'mf' || s.includes('mediafire')) return 'mediafire'
  if (s.includes('mega')) return 'mega'
  if (s.includes('gdrive') || s.includes('google drive') || s.includes('drive')) return 'gdrive'
  if (s.includes('mp4upload')) return 'mp4upload'
  return s
}

function describeAnimeItem(item, index) {
  const title = cleanText(item.title || 'بدون عنوان')
  const status = item.status || 'غير معروف'
  const type = item.type || 'غير معروف'
  return {
    header: `أنمي #${index + 1}`,
    title,
    description: `النوع: ${type} • الحالة: ${status}`
  }
}

function describeEpisodeItem(item, index) {
  const number = item.number || String(index + 1)
  const title = cleanText(item.title || `الحلقة ${number}`)
  return {
    header: `حلقة #${number}`,
    title,
    description: `رقم الحلقة: ${number}`
  }
}

function describeLinkItem(item, index) {
  const server = item.server || 'غير معروف'
  const quality = item.quality || 'غير معروف'
  return {
    header: `رابط #${index + 1}`,
    title: `${server} • ${quality}`,
    description: `تحميل من ${server} بجودة ${quality}`
  }
}

async function sendSelectList(conn, chat, quoted, { title, footer, buttonLabel, sections }) {
  const contentMsg = {
    contentText: title,
    footerText: footer,
    buttons: [
      {
        buttonId: 'anime-select',
        buttonText: { displayText: buttonLabel },
        type: 1,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: '◜⏤͟͞͞ أنمي ˖࣪⃟❄️◞•',
            sections
          })
        }
      }
    ],
    headerType: 1
  }

  const waMsg = generateWAMessageFromContent(chat, { buttonsMessage: contentMsg }, { quoted })
  await conn.relayMessage(chat, waMsg.message, { messageId: waMsg.key.id })
}

async function fetchSearchResults(query) {
  clearStaleContexts()

  const apiUrl = `${SEARCH_ENDPOINT}?action=${encodeURIComponent('بحث')}&q=${encodeURIComponent(query)}`
  const { data } = await axios.get(apiUrl, { timeout: 30000 })

  if (!data || data.success !== true) {
    throw new Error('لم يتم العثور على نتائج لهذا البحث')
  }

  if (!Array.isArray(data.response) || data.response.length === 0) {
    throw new Error('لا توجد نتائج مطابقة')
  }

  return data.response
}

async function fetchEpisodes(animeId) {
  clearStaleContexts()

  const apiUrl = `${SEARCH_ENDPOINT}?action=${encodeURIComponent('حلقات')}&id=${encodeURIComponent(animeId)}`
  const { data } = await axios.get(apiUrl, { timeout: 30000 })

  if (!data || data.success !== true) {
    throw new Error('لم يتم العثور على حلقات لهذا الأنمي')
  }

  const response = data.response
  if (!response || !Array.isArray(response.episodes) || response.episodes.length === 0) {
    throw new Error('لا توجد حلقات متاحة لهذا الأنمي')
  }

  return {
    animeTitle: cleanText(response.animeTitle || 'بدون عنوان'),
    totalEpisodes: response.totalEpisodes || response.episodes.length,
    episodes: response.episodes
  }
}

async function fetchEpisodeLinks(episodeId) {
  clearStaleContexts()

  const apiUrl = `${SEARCH_ENDPOINT}?action=${encodeURIComponent('روابط')}&id=${encodeURIComponent(episodeId)}`
  const { data } = await axios.get(apiUrl, { timeout: 30000 })

  if (!data || data.success !== true) {
    throw new Error('لم يتم العثور على روابط لهذه الحلقة')
  }

  const links = data?.response?.links
  if (!Array.isArray(links) || links.length === 0) {
    throw new Error('لا توجد روابط متاحة لهذه الحلقة')
  }

  return links
}

async function downloadDirectFile(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9'
    }
  })

  return {
    buffer: Buffer.from(response.data),
    headers: response.headers || {}
  }
}

async function sendDownloadedMedia(conn, chat, quoted, {
  directUrl,
  sourceLabel,
  quality,
  animeTitle,
  episodeTitle,
  episodeNumber,
  mimeType,
  ext,
  fileNameFromApi
}) {
  const { buffer } = await downloadDirectFile(directUrl)
  const mime = String(mimeType || '').toLowerCase()

  const cleanAnime = safeFileName(animeTitle || 'Anime')
  const cleanEpisode = safeFileName(episodeTitle || `الحلقة ${episodeNumber || ''}`.trim())
  const cleanQuality = quality ? safeFileName(quality) : ''
  const cleanSource = sourceLabel ? safeFileName(sourceLabel) : ''

  const baseName = [cleanAnime, cleanEpisode, cleanQuality, cleanSource]
    .filter(Boolean)
    .join(' - ')

  const finalExt = (ext || fileNameFromApi?.split('.').pop() || 'bin').replace(/^\./, '')
  const finalFileName = safeFileName(baseName) + '.' + finalExt

  if (mime.startsWith('video/')) {
    await conn.sendMessage(
      chat,
      {
        video: buffer,
        mimetype: mimeType || 'video/mp4',
        caption: `╭─❖ *تم التحميل بنجاح* ❖─╮\n│\n│ 📝 *الأنمي:* ${cleanAnime}\n│ 📺 *الحلقة:* ${cleanEpisode}\n│ ⚙️ *الجودة:* ${quality || 'غير معروف'}\n│ 🌐 *السيرفر:* ${sourceLabel || 'غير معروف'}\n│\n╰────────────────╯`
      },
      { quoted }
    )
    return
  }

  if (mime.startsWith('audio/')) {
    await conn.sendMessage(
      chat,
      {
        audio: buffer,
        mimetype: mimeType || 'audio/mpeg',
        ptt: false
      },
      { quoted }
    )
    await conn.sendMessage(
      chat,
      {
        text: `╭─❖ *تم التحميل بنجاح* ❖─╮\n│\n│ 📝 *الأنمي:* ${cleanAnime}\n│ 📺 *الحلقة:* ${cleanEpisode}\n│ ⚙️ *الجودة:* ${quality || 'غير معروف'}\n│ 🌐 *السيرفر:* ${sourceLabel || 'غير معروف'}\n│\n╰────────────────╯`
      },
      { quoted }
    )
    return
  }

  await conn.sendMessage(
    chat,
    {
      document: buffer,
      mimetype: mimeType || 'application/octet-stream',
      fileName: finalFileName
    },
    { quoted }
  )
}

async function sendSearchResults(conn, m, usedPrefix, query, results) {
  const token = setContext({ type: 'search', query, results })

  const rows = results.slice(0, 20).map((item, index) => {
    const info = describeAnimeItem(item, index)
    return {
      header: info.header,
      title: info.title,
      description: info.description,
      id: `${usedPrefix}انمي search${SELECT_SEPARATOR}${token}${SELECT_SEPARATOR}${index}`
    }
  })

  await sendSelectList(conn, m.chat, m, {
    title: `*🔎 نتائج البحث عن:* ${query}`,
    footer: 'اختر الأنمي المطلوب من القائمة:',
    buttonLabel: '📋 عرض النتائج',
    sections: [
      {
        title: '📥 نتائج البحث',
        highlight_label: `📥 ${rows.length} نتيجة`,
        rows
      }
    ]
  })
}

async function sendEpisodesList(conn, m, usedPrefix, animeTitle, episodes, animeId) {
  const token = setContext({
    type: 'episodes',
    animeTitle,
    animeId,
    episodes
  })

  const rows = episodes.slice(0, 30).map((item, index) => {
    const info = describeEpisodeItem(item, index)
    return {
      header: info.header,
      title: info.title,
      description: info.description,
      id: `${usedPrefix}انمي episode${SELECT_SEPARATOR}${token}${SELECT_SEPARATOR}${index}`
    }
  })

  await sendSelectList(conn, m.chat, m, {
    title: `*📺 الأنمي:* ${animeTitle}\n*🎬 عدد الحلقات:* ${episodes.length}`,
    footer: 'اختر الحلقة المطلوبة من القائمة:',
    buttonLabel: '📋 عرض الحلقات',
    sections: [
      {
        title: '📥 الحلقات المتاحة',
        highlight_label: `📥 ${rows.length} حلقة`,
        rows
      }
    ]
  })
}

async function sendLinksList(conn, m, usedPrefix, animeTitle, episodeTitle, episodeNumber, links, episodeId) {
  const token = setContext({
    type: 'links',
    animeTitle,
    episodeTitle,
    episodeNumber,
    episodeId,
    links
  })

  const rows = links.slice(0, 20).map((item, index) => {
    const info = describeLinkItem(item, index)
    return {
      header: info.header,
      title: info.title,
      description: info.description,
      id: `${usedPrefix}انمي link${SELECT_SEPARATOR}${token}${SELECT_SEPARATOR}${index}`
    }
  })

  await sendSelectList(conn, m.chat, m, {
    title: `*📺 ${animeTitle}*\n*🧩 ${episodeTitle || `الحلقة ${episodeNumber}`}*`,
    footer: 'اختر الجودة أو السيرفر للتحميل:',
    buttonLabel: '📋 عرض الروابط',
    sections: [
      {
        title: '📥 روابط التحميل',
        highlight_label: `📥 ${rows.length} رابط`,
        rows
      }
    ]
  })
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const rawInput = args.join(' ').trim()

  if (!rawInput) {
    return conn.sendMessage(
      m.chat,
      {
        text: `╭─❖ *بحث وحلقات الأنمي* ❖─╮\n│\n│ أرسل اسم الأنمي للبحث:\n│ ${usedPrefix}${command} بoku no hero\n│\n│ أو اختر من القوائم بعد البحث.\n│\n╰────────────────╯`
      },
      { quoted: m }
    )
  }

  const parts = rawInput.split(SELECT_SEPARATOR)
  const action = parts[0]?.trim()?.toLowerCase()

  try {
    if (action === 'search') {
      const token = parts[1]
      const index = parseInt(parts[2], 10)

      const ctx = getContext(token)
      if (!ctx || ctx.type !== 'search') {
        return conn.sendMessage(
          m.chat,
          { text: '❌ انتهت جلسة البحث، أعد إرسال اسم الأنمي.' },
          { quoted: m }
        )
      }

      const selected = ctx.results[index]
      if (!selected) {
        return conn.sendMessage(
          m.chat,
          { text: '❌ الاختيار غير موجود، أعد المحاولة.' },
          { quoted: m }
        )
      }

      await conn.sendMessage(m.chat, { text: '⏳ جاري جلب الحلقات...' }, { quoted: m })

      const animeId = selected.id
      const animeTitle = cleanText(selected.title || 'بدون عنوان')
      const { episodes } = await fetchEpisodes(animeId)
      await sendEpisodesList(conn, m, usedPrefix, animeTitle, episodes, animeId)
      return
    }

    if (action === 'episode') {
      const token = parts[1]
      const index = parseInt(parts[2], 10)

      const ctx = getContext(token)
      if (!ctx || ctx.type !== 'episodes') {
        return conn.sendMessage(
          m.chat,
          { text: '❌ انتهت جلسة الحلقات، أعد اختيار الأنمي.' },
          { quoted: m }
        )
      }

      const episode = ctx.episodes[index]
      if (!episode) {
        return conn.sendMessage(
          m.chat,
          { text: '❌ الحلقة غير موجودة، أعد المحاولة.' },
          { quoted: m }
        )
      }

      await conn.sendMessage(m.chat, { text: '⏳ جاري جلب روابط الحلقة...' }, { quoted: m })

      const animeTitle = cleanText(ctx.animeTitle || 'بدون عنوان')
      const episodeTitle = cleanText(episode.title || `الحلقة ${episode.number || index + 1}`)
      const episodeNumber = episode.number || String(index + 1)
      const links = await fetchEpisodeLinks(episode.id)

      if (links.length === 1) {
        const link = links[0]
        const source = normalizeSource(link.server, link.tag)
        const apiUrl = `${DOWNLOAD_ENDPOINT}?source=${encodeURIComponent(source)}&url=${encodeURIComponent(link.link)}`
        const { data } = await axios.get(apiUrl, { timeout: 30000 })

        if (!data || data.success !== true || !data.response?.downloadUrl) {
          throw new Error('لم يتم الحصول على رابط التحميل المباشر')
        }

        await conn.sendMessage(m.chat, { text: '⏳ جاري تحميل الملف...' }, { quoted: m })

        await sendDownloadedMedia(conn, m.chat, m, {
          directUrl: data.response.downloadUrl,
          sourceLabel: link.server || source,
          quality: link.quality || data.response.quality || '',
          animeTitle,
          episodeTitle,
          episodeNumber,
          mimeType: data.response.mimeType,
          ext: data.response.ext,
          fileNameFromApi: data.response.fileName
        })
        return
      }

      await sendLinksList(conn, m, usedPrefix, animeTitle, episodeTitle, episodeNumber, links, episode.id)
      return
    }

    if (action === 'link') {
      const token = parts[1]
      const index = parseInt(parts[2], 10)

      const ctx = getContext(token)
      if (!ctx || ctx.type !== 'links') {
        return conn.sendMessage(
          m.chat,
          { text: '❌ انتهت جلسة الروابط، أعد اختيار الحلقة.' },
          { quoted: m }
        )
      }

      const linkItem = ctx.links[index]
      if (!linkItem) {
        return conn.sendMessage(
          m.chat,
          { text: '❌ الرابط غير موجود، أعد المحاولة.' },
          { quoted: m }
        )
      }

      const source = normalizeSource(linkItem.server, linkItem.tag)
      const animeTitle = cleanText(ctx.animeTitle || 'بدون عنوان')
      const episodeTitle = cleanText(ctx.episodeTitle || `الحلقة ${ctx.episodeNumber || ''}`.trim())
      const episodeNumber = ctx.episodeNumber || ''
      const apiUrl = `${DOWNLOAD_ENDPOINT}?source=${encodeURIComponent(source)}&url=${encodeURIComponent(linkItem.link)}`
      const { data } = await axios.get(apiUrl, { timeout: 30000 })

      if (!data || data.success !== true || !data.response?.downloadUrl) {
        throw new Error('فشل الحصول على رابط التحميل المباشر')
      }

      await conn.sendMessage(m.chat, { text: '⏳ جاري تحميل الملف...' }, { quoted: m })

      await sendDownloadedMedia(conn, m.chat, m, {
        directUrl: data.response.downloadUrl,
        sourceLabel: linkItem.server || source,
        quality: linkItem.quality || data.response.quality || '',
        animeTitle,
        episodeTitle,
        episodeNumber,
        mimeType: data.response.mimeType,
        ext: data.response.ext,
        fileNameFromApi: data.response.fileName
      })
      return
    }

    if (isYouTubeUrl(rawInput)) {
      return conn.sendMessage(
        m.chat,
        { text: '❌ روابط يوتيوب غير مدعومة هنا.' },
        { quoted: m }
      )
    }

    await conn.sendMessage(m.chat, { text: '⏳ جاري البحث عن الأنمي...' }, { quoted: m })

    const results = await fetchSearchResults(rawInput)
    await sendSearchResults(conn, m, usedPrefix, rawInput, results)
  } catch (e) {
    console.error('anime handler error:', e)
    const msg = e?.response?.data?.error || e?.message || 'حدث خطأ غير متوقع'
    await conn.sendMessage(
      m.chat,
      { text: `❌ ${msg}\n\nتأكد من الاسم وحاول مرة أخرى.` },
      { quoted: m }
    )
  }
}

handler.command = /^(انمي|anime|بحث_انمي|حلقات_انمي|تحميل_انمي)$/i
handler.help = ['انمي <اسم>']
handler.tags = ['downloader']

export default handler
