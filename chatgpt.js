// chatgpt يدعم جلسة وشات وبحث
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'

const API = 'https://engez.a7a.online/api/v1/ai/gpt'
const TIMEOUT = 120000

async function askAI(question) {
  const { data } = await axios.get(API, {
    params: { q: question },
    timeout: TIMEOUT
  })

  if (!data?.success || !data?.response?.success) {
    throw new Error(data?.error || data?.response?.error || 'فشل الحصول على الرد')
  }

  return data.response
}

const handler = async (m, { conn, text }) => {
  if (!text) {
    return conn.sendMessage(
      m.chat,
      { text: 'اكتب سؤالك.' },
      { quoted: m }
    )
  }

  await conn.sendMessage(
    m.chat,
    { text: 'جاري التفكير...' },
    { quoted: m }
  )

  try {
    const res = await askAI(text)

    const message = res.result?.message || res.raw || 'لا يوجد رد.'

    await conn.sendMessage(
      m.chat,
      {
        text: `${message}\n\n🤖 GPT-5.5`
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

handler.command = /^(ai|gpt|ذكاء|شات)$/i
handler.help = ['ai <سؤال>']
handler.tags = ['ai']

export default handler
