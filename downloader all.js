// تحميل من انستا تيك فيس تويتر سناب شات ثيرد ساوند كلاود واستوري انستا  
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية ("izana","uncel shawaza") 
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import axios from 'axios'

const API_BASE = 'https://engez.spcfy.eu/api/v1/download/all'
const SELECT_SEPARATOR = '|'
const CACHE_TTL_MS = 3 * 60 * 1000

const mediaCache = new Map()

function isYouTubeUrl(url) {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//i.test(url)
}

function describeMedia(media, index) {
  const isVideo = media.type === 'video'
  const icon = isVideo ? '🎬' : '🎵'
  const typeLabel = isVideo ? 'فيديو' : 'صوت'
  const quality = media.quality || 'غير معروف'
  return {
    header: `${typeLabel} #${index + 1}`,
    title: `${icon} ${quality}`,
    description: `تحميل ${typeLabel} بجودة ${quality}`
  }
}

async function fetchMediaData(url) {
  const cached = mediaCache.get(url)
  if (cached) {
    if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached
    }
    mediaCache.delete(url)
  }

  const apiUrl = `${API_BASE}?url=${encodeURIComponent(url)}`
  const { data } = await axios.get(apiUrl, { timeout: 30000 })

  if (!data || data.success !== true) {
    throw new Error('لم يتم العثور على نتائج لهذا الرابط')
  }

  const medias = data?.response?.medias
  if (!Array.isArray(medias) || medias.length === 0) {
    throw new Error('لا توجد ميديا متاحة لهذا الرابط')
  }

  const result = {
    title: data.response.title || 'بدون عنوان',
    source: data.response.source || 'غير معروف',
    medias,
    timestamp: Date.now()
  }

  mediaCache.set(url, result)
  return result
}

async function sendSingleMedia(conn, chat, media, title, quoted) {
  const isVideo = media.type === 'video'

  try {
    const fileResponse = await axios.get(media.url, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        Accept: '*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    })

    const buffer = Buffer.from(fileResponse.data)

    if (isVideo) {
      await conn.sendMessage(
        chat,
        {
          video: buffer,
          mimetype: 'video/mp4',
          caption: `╭─❖ *تم التحميل بنجاح* ❖─╮\n│\n│ 📝 *العنوان:* ${title}\n│ 🎬 *الجودة:* ${media.quality || 'غير معروف'}\n│\n╰────────────────╯`
        },
        { quoted }
      )
    } else {
      await conn.sendMessage(
        chat,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          ptt: false
        },
        { quoted }
      )
      await conn.sendMessage(
        chat,
        { text: `╭─❖ *تم التحميل بنجاح* ❖─╮\n│\n│ 📝 *العنوان:* ${title}\n│ 🎵 *الجودة:* ${media.quality || 'غير معروف'}\n│\n╰────────────────╯` },
        { quoted }
      )
    }
  } catch (e) {
    console.error('sendSingleMedia error:', e)
    if (e?.response?.data) {
      console.error('Response body:', e.response.data)
    }
    const status = e?.response?.status
    const statusText = e?.response?.statusText
    const reason = status
      ? `الخادم رفض الطلب (${status}${statusText ? ' - ' + statusText : ''})`
      : (e?.code || e?.message || 'سبب غير معروف')
    await conn.sendMessage(
      chat,
      { text: `❌ فشل تحميل الملف.\n\n📄 السبب: ${reason}\n\nالرابط ممكن يكون منتهي الصلاحية أو الخادم رافض الاتصال، حاول ترسل الرابط تاني.` },
      { quoted }
    )
  }
}

async function sendQualityList(conn, chat, quoted, usedPrefix, command, url, title, source, medias) {
  const rows = medias.map((media, index) => {
    const info = describeMedia(media, index)
    return {
      header: info.header,
      title: info.title,
      description: info.description,
      id: `${usedPrefix}${command} ${url}${SELECT_SEPARATOR}${index}`
    }
  })

  const contentMsg = {
    contentText: `*🔎 اختر الجودة أو نوع الميديا:*\n\n📝 *العنوان:* ${title}\n📡 *المصدر:* ${source}`,
    footerText: '❖ اختر من القايمة تحت للتحميل:',
    buttons: [
      {
        buttonId: `${usedPrefix}تحميل_قايمة`,
        buttonText: { displayText: '📋 قايمة الجودات' },
        type: 1,
        nativeFlowInfo: {
          name: 'single_select',
          paramsJson: JSON.stringify({
            title: '◜⏤͟͞͞ تحميل ˖࣪⃟❄️ الميديا◞•',
            sections: [
              {
                title: '📥 اختر جودة/نوع الميديا',
                highlight_label: `📥 ${medias.length} خيار متاح`,
                rows
              }
            ]
          })
        }
      }
    ],
    headerType: 1
  }

  const waMsg = generateWAMessageFromContent(chat, { buttonsMessage: contentMsg }, { quoted })
  await conn.relayMessage(chat, waMsg.message, { messageId: waMsg.key.id })
}

const handler = async (m, { conn, args, usedPrefix, command }) => {
  const rawInput = args.join(' ').trim()

  if (!rawInput) {
    return conn.sendMessage(
      m.chat,
      {
        text: `╭─❖ *تحميل من أي مصدر* ❖─╮\n│\n│ أرسل الأمر مع الرابط:\n│ ${usedPrefix}${command} <الرابط>\n│\n│ 📌 مثال:\n│ ${usedPrefix}${command} https://example.com/video\n│\n╰────────────────╯`
      },
      { quoted: m }
    )
  }

  const separatorIndex = rawInput.lastIndexOf(SELECT_SEPARATOR)
  const isSelection = separatorIndex !== -1

  const url = isSelection ? rawInput.slice(0, separatorIndex).trim() : rawInput
  const selectedIndex = isSelection ? parseInt(rawInput.slice(separatorIndex + 1).trim(), 10) : null

  if (isYouTubeUrl(url)) {
    return conn.sendMessage(
      m.chat,
      { text: '❌ روابط يوتيوب غير مدعومة.' },
      { quoted: m }
    )
  }

  try {
    if (!isSelection) {
      await conn.sendMessage(m.chat, { text: '⏳ جاري البحث عن الميديا...' }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, { text: '⏳ جاري تحميل الملف المختار...' }, { quoted: m })
    }

    const { title, source, medias } = await fetchMediaData(url)

    if (isSelection) {
      const media = medias[selectedIndex]
      if (!media) {
        return conn.sendMessage(
          m.chat,
          { text: '❌ الاختيار غير موجود، حاول ترسل الرابط تاني.' },
          { quoted: m }
        )
      }
      await sendSingleMedia(conn, m.chat, media, title, m)
      return
    }

    if (medias.length === 1) {
      await sendSingleMedia(conn, m.chat, medias[0], title, m)
    } else {
      await sendQualityList(conn, m.chat, m, usedPrefix, command, url, title, source, medias)
    }
  } catch (e) {
    console.error('تحميل handler error:', e)
    const msg = e?.message || 'حدث خطأ غير متوقع'
    await conn.sendMessage(
      m.chat,
      { text: `❌ ${msg}\n\nتأكد من صحة الرابط وحاول مرة أخرى.` },
      { quoted: m }
    )
  }
}

handler.command = /^(تحميل|حمل|dl)$/i
handler.help = ['تحميل <رابط>']
handler.tags = ['downloader']

export default handler
