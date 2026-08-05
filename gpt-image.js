// كود gpt شات وصور وتعديل 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

const CHAT_API = 'https://engez.a7a.online/api/v1/ai/gpt'
const IMAGE_API = 'https://engez.a7a.online/api/v1/ai/gpt-image'
const TIMEOUT = 120000

async function askAI(question) {
  const { data } = await axios.get(CHAT_API, {
    params: { q: question },
    timeout: TIMEOUT
  })

  if (!data?.success || !data?.response?.success) {
    throw new Error(data?.error || data?.response?.error || 'فشل الحصول على الرد')
  }

  return data.response
}

async function generateImage(prompt) {
  const { data } = await axios.get(IMAGE_API, {
    params: { prompt },
    timeout: TIMEOUT
  })

  if (!data?.success || !data?.response?.url) {
    throw new Error(data?.error || 'فشل توليد الصورة')
  }

  return data.response
}

async function editImage(prompt, imageUrl) {
  const { data } = await axios.get(IMAGE_API, {
    params: {
      action: 'edit',
      prompt,
      imageUrl
    },
    timeout: TIMEOUT
  })

  if (!data?.success || !data?.response?.url) {
    throw new Error(data?.error || 'فشل تعديل الصورة')
  }

  return data.response
}

async function uploadToUguu(buffer, ext = 'jpg') {
  const form = new FormData()
  form.append('files[]', buffer, `image.${ext}`)

  const response = await fetch('https://uguu.se/upload.php', {
    method: 'POST',
    body: form
  })

  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.files?.length || !result.files[0]?.url) {
    throw new Error('فشل رفع الصورة إلى Uguu')
  }

  return result.files[0].url
}

const handler = async (m, { conn, text, command }) => {
  const cmd = String(command || '').toLowerCase().trim()
  const prompt = String(text || '').trim()

  const sendText = (msg) =>
    conn.sendMessage(m.chat, { text: msg }, { quoted: m })

  const sendImage = (url, caption) =>
    conn.sendMessage(
      m.chat,
      { image: { url }, caption },
      { quoted: m }
    )

  try {
    if (cmd === 'gpt' || cmd === 'ai' || cmd === 'شات') {
      if (!prompt) {
        return sendText('اكتب سؤالك بعد الأمر.')
      }

      await sendText('جاري التفكير...')

      const res = await askAI(prompt)
      const message = res.result?.message || res.raw || 'لا يوجد رد.'

      return sendText(`${message}\n\n🤖 GPT`)
    }

    if (cmd === 'gpt-رسم' || cmd === 'رسم') {
      if (!prompt) {
        return sendText('اكتب وصف الصورة بعد الأمر.')
      }

      await sendText('جاري توليد الصورة...')

      const img = await generateImage(prompt)

      return sendImage(img.url, `🎨 ${img.prompt}\n🤖 GPT Image`)
    }

    if (cmd === 'gpt-تعديل' || cmd === 'تعديل') {
      if (!prompt) {
        return sendText('اكتب وصف التعديل بعد الأمر.')
      }

      const quoted = m.quoted || m
      const mime = quoted?.mimetype || quoted?.msg?.mimetype || ''

      if (!/image/i.test(mime)) {
        return sendText('لازم ترد على صورة ثم تكتب وصف التعديل.')
      }

      await sendText('جاري رفع الصورة ثم تعديلها...')

      const media = await quoted.download()
      const buffer = Buffer.isBuffer(media) ? media : Buffer.from(media)
      const { ext = 'jpg' } = (await fileTypeFromBuffer(buffer)) || {}

      const imageUrl = await uploadToUguu(buffer, ext)
      const img = await editImage(prompt, imageUrl)

      return sendImage(img.url, `✅ تم تعديل الصورة\n\n🎨 ${img.prompt}\n🤖 GPT Image`)
    }

    return sendText('الأمر غير معروف.')
  } catch (e) {
    console.error(e)

    const error =
      e?.response?.data?.error ||
      e?.response?.data?.message ||
      e?.message ||
      'حدث خطأ.'

    return sendText(`❌ ${error}`)
  }
}

handler.command = /^(gpt|ai|شات|gpt-رسم|رسم|gpt-تعديل|تعديل)$/i
handler.help = [
  'gpt <سؤال>',
  'gpt-رسم <وصف>',
  'gpt-تعديل <وصف> (رد على صورة)'
]
handler.tags = ['ai']

export default handler
