// كود بحث فيديوهات بينتريست 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'
import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'
const PINTEREST_ENDPOINT = `${API_BASE}/search/pinterest`
const FOOTER = '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•'
const MAX_CARDS = 3
const MAX_TRIED = 10
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36'

function shuffleArray(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatSize(bytes) {
  if (!bytes || bytes === 0) return '—'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

async function searchPins(query) {
  const apiUrl = `${PINTEREST_ENDPOINT}?action=${encodeURIComponent('بحث')}&q=${encodeURIComponent(query)}`
  const { data } = await axios.get(apiUrl, { timeout: 30000 })

  if (!data || data.success !== true) {
    throw new Error('فشل البحث في Pinterest')
  }

  const results = data.response?.results
  if (!Array.isArray(results) || results.length === 0) {
    throw new Error('لا توجد نتائج فيديو لهذا البحث')
  }

  return results
}

// ─── يستدعي endpoint التحميل، بيمرر كل البيانات المتاحة من نتيجة
// البحث (videoUrl, hlsUrl, videoSignature) عشان الـ API يقدر يوصل
// لأفضل مسار من غير ما يضطر يقع على المسارات الهشة (صفحة الـ pin أو
// klickpin) اللي بتتفعل بس لو مفيش بيانات كافية.
async function resolveDownloadUrl(pin) {
  const params = new URLSearchParams({
    action: 'تحميل',
    pinUrl: pin.pin_url
  })
  if (pin.video_url) params.set('videoUrl', pin.video_url)
  if (pin.hls_url) params.set('hlsUrl', pin.hls_url)
  if (pin.video_signature) params.set('videoSignature', pin.video_signature)

  const apiUrl = `${PINTEREST_ENDPOINT}?${params.toString()}`
  const { data } = await axios.get(apiUrl, { timeout: 30000 })

  if (!data || data.success !== true || !data.response?.downloadUrl) {
    throw new Error(data?.error || 'فشل الحصول على رابط التحميل المباشر')
  }

  return data.response.downloadUrl
}

async function downloadVideoBuffer(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'user-agent': UA },
    timeout: 60000,
    maxRedirects: 5
  })
  return Buffer.from(res.data)
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`${FOOTER}\n\n📌 *مثال الاستخدام:*\n${usedPrefix + command} قطط`)
  }

  await m.react('🔍')
  const waitMsg = await conn.reply(m.chat, '🔍 جاري البحث في Pinterest ...', m)

  let pins
  try {
    pins = await searchPins(text)
  } catch (e) {
    try { await conn.sendMessage(m.chat, { delete: waitMsg.key }) } catch (err) {}
    await m.react('❌')
    return m.reply(`❌ ${e.message}`)
  }

  try { await conn.sendMessage(m.chat, { delete: waitMsg.key }) } catch (e) {}
  const waitMsg2 = await conn.reply(m.chat, '⏳ جاري تحميل الفيديوهات ...', m)

  shuffleArray(pins)

  const cards = []
  let tried = 0

  for (let i = 0; i < pins.length && cards.length < MAX_CARDS; i++) {
    if (tried >= MAX_TRIED) break
    tried++
    const pin = pins[i]
    try {
      const downloadUrl = await resolveDownloadUrl(pin)
      const videoBuffer = await downloadVideoBuffer(downloadUrl)
      if (!videoBuffer || videoBuffer.length < 50000) continue

      const { videoMessage } = await prepareWAMessageMedia(
        { video: videoBuffer },
        { upload: conn.waUploadToServer }
      )

      const sizeText = formatSize(videoBuffer.length)
      const title = (pin.title || 'بدون عنوان').slice(0, 80)

      cards.push({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: title }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: `📦 ${sizeText} | ${FOOTER}` }),
        header: {
          title,
          hasMediaAttachment: true,
          videoMessage
        },
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
          buttons: [{
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: 'عرض في Pinterest',
              url: pin.pin_url
            })
          }]
        })
      })
    } catch (e) {
      console.error(`[pinterest-carousel] خطأ في معالجة Pin ${i}:`, e.message)
    }
  }

  try { await conn.sendMessage(m.chat, { delete: waitMsg2.key }) } catch (e) {}

  if (cards.length === 0) {
    await m.react('❌')
    return conn.reply(m.chat, '❌ لم أتمكن من تحميل أي فيديوهات، جرب كلمة أخرى.', m)
  }

  const msg = generateWAMessageFromContent(
    m.chat,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            body: proto.Message.InteractiveMessage.Body.create({
              text: `🎬 *نتائج البحث عن:* ${text}`
            }),
            footer: proto.Message.InteractiveMessage.Footer.create({
              text: `📊 عدد النتائج: ${cards.length} | ${FOOTER}`
            }),
            header: proto.Message.InteractiveMessage.Header.create({
              hasMediaAttachment: false
            }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards })
          }
        }
      }
    },
    { quoted: m }
  )

  await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
  await m.react('✅')
}

handler.help = ['pinterestvideo', 'بينتو']
handler.tags = ['downloader']
handler.command = /^(بينتر-فيديو|بينترف|pinterestvideo|pvv|بينتو)$/i

export default handler
