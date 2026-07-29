// كود إزالة خلفية 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'

const API_BASE = 'https://engez.a7a.online/api/v1'

// رفع الملف إلى Uguu
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

// دالة إزالة الخلفية
async function removeBackground(imageUrl) {
    try {
        const params = new URLSearchParams()
        params.append('imageUrl', imageUrl)

        const response = await axios.get(`${API_BASE}/tools/removebg?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل إزالة الخلفية')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn }) => {
    // التحقق من وجود صورة
    const q = m.quoted || m
    if (!q.mimetype || !q.mimetype.startsWith('image/')) {
        return m.reply(
            '🖼️ *إزالة خلفية الصورة*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• ارد على صورة: `.ازالة-خلفية`\n\n' +
            '📌 *مثال:*\n' +
            '`.ازالة-خلفية` (يرد على صورة)'
        )
    }

    await m.react('⏳')

    try {
        // تحميل الصورة
        const buffer = await q.download()
        if (!buffer || buffer.length === 0) {
            throw new Error('فشل تحميل الصورة')
        }

        // استخراج نوع الملف
        const fileInfo = await fileTypeFromBuffer(buffer)
        const ext = fileInfo?.ext || 'jpg'

        await m.react('📤')

        // رفع الصورة
        const imageUrl = await uploadToUguu(buffer, ext)
        if (!imageUrl) {
            throw new Error('فشل رفع الصورة')
        }

        await m.react('🔍')

        // إزالة الخلفية
        const result = await removeBackground(imageUrl)

        if (result?.url) {
            // إرسال الصورة بدون خلفية
            await conn.sendMessage(m.chat, {
                image: { url: result.url },
                caption: '✅ *تم إزالة الخلفية بنجاح*'
            }, { quoted: m })

            await m.react('✅')
        } else {
            throw new Error('لم يتم العثور على رابط الصورة')
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['ازالة-خلفية', 'removebg', 'إزالة-الخلفية']
handler.help = ['ازالة-خلفية <رد على صورة>']
handler.tags = ['tools']

export default handler
