// كود تحميل من Spotify 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'

const API = 'https://engez.a7a.online/api/v1/download/spotify'
const TIMEOUT = 120000

async function downloadSpotify(url) {
  const { data } = await axios.get(API, {
    params: { url },
    timeout: TIMEOUT
  })

  if (!data?.success || !data?.response?.downloadUrl) {
    throw new Error(data?.error || data?.response?.error || 'فشل تحميل الأغنية')
  }

  return data.response
}

const handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      { text: 'ارسل رابط أغنية من سبوتيفاي.\nمثال: .spotify https://open.spotify.com/track/xxxx' },
      { quoted: m }
    )
  }

  // تحقق إذا كان الرابط من سبوتيفاي
  if (!text.includes('open.spotify.com') && !text.includes('spotify.com')) {
    return conn.sendMessage(
      m.chat,
      { text: '❌ الرجاء إرسال رابط صحيح من سبوتيفاي' },
      { quoted: m }
    )
  }

  await conn.sendMessage(
    m.chat,
    { text: '⏳ جاري تحميل الأغنية...' },
    { quoted: m }
  )

  try {
    const res = await downloadSpotify(text)

    const caption = `🎵 *${res.title}*\n👤 *${res.author}*\n💿 *${res.album}*\n⏱ *${res.duration}*\n\n📥 جاري الإرسال...`

    // إرسال الأغنية كملف صوتي
    await conn.sendMessage(
      m.chat,
      {
        audio: { url: res.downloadUrl },
        mimetype: 'audio/mpeg',
        fileName: `${res.title} - ${res.author}.mp3`,
        caption: caption
      },
      { quoted: m }
    )

  } catch (e) {
    console.error(e)

    const error =
      e.response?.data?.error ||
      e.response?.data?.message ||
      e.message ||
      'حدث خطأ.'

    await conn.sendMessage(
      m.chat,
      { text: `❌ ${error}` },
      { quoted: m }
    )
  }
}

handler.command = /^(spotify|سبوتي|سبوتيفاي|تحميل اغنية)$/i
handler.help = ['spotify <رابط سبوتيفاي>']
handler.tags = ['download']

export default handler
