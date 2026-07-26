// كود مضاد الاباحية 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function uploadToUguu(buffer, ext) {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    form.append('files[]', buffer, `file.${ext}`)

    try {
        const response = await axios.post('https://uguu.se/upload.php', form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 30000
        })

        if (!response.data?.files?.[0]?.url) {
            throw new Error('فشل في رفع الملف')
        }

        return response.data.files[0].url
    } catch (error) {
        throw new Error(`فشل رفع الملف: ${error.message}`)
    }
}

async function checkNSFW(imageUrl) {
    try {
        const params = new URLSearchParams()
        params.append('imageUrl', imageUrl)

        const response = await axios.get(`${API_BASE}/tools/nsfw-checker?${params.toString()}`, {
            timeout: 30000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل فحص الصورة')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

export async function before(m, { conn }) {
    // التحقق من وجود صورة أو ملصق
    if (m.mtype === 'imageMessage' || m.mtype === 'stickerMessage') {
        try {
            // تحميل الملف
            const buffer = await m.download()
            if (!buffer) return

            // استخراج نوع الملف
            const fileInfo = await fileTypeFromBuffer(buffer)
            const ext = fileInfo?.ext || (m.mtype === 'stickerMessage' ? 'webp' : 'jpg')

            // رفع الملف
            const imageUrl = await uploadToUguu(buffer, ext)
            if (!imageUrl) {
                console.error('فشل في رفع الملف')
                return
            }

            // فحص الصورة
            const result = await checkNSFW(imageUrl)

            if (!result || !result.label) {
                console.error('استجابة غير متوقعة:', result)
                return
            }

            const label = result.label.toLowerCase()
            const confidence = parseFloat(result.confidence)

            // التحقق من وجود محتوى غير لائق
            if ((label === 'porn' || label === 'hentai' || label === 'sexy') && confidence >= 50) {
                try {
                    // حذف الرسالة
                    await conn.sendMessage(m.chat, { delete: m.key })
                } catch (err) {
                    console.error('فشل في حذف الرسالة:', err.message)
                }

                // إرسال تحذير
                await conn.reply(m.chat, 
                    `⚠️ *تم حذف المحتوى غير اللائق*\n\n` +
                    `📌 السبب: تم اكتشاف محتوى إباحي\n` +
                    `📊 النسبة: ${result.confidence}\n\n` +
                    `🚫 ممنوع نشر المحتوى الإباحي في المجموعة`, 
                    m
                )
            }

        } catch (e) {
            console.error('⚠️ خطأ أثناء فحص الصورة:', e.message)
        }
    }
}
