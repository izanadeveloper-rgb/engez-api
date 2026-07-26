// كود التعرف علي الموسيقي
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

// دالة التعرف على الأغنية
async function identifySong(audioUrl) {
    try {
        const params = new URLSearchParams()
        params.append('audioUrl', audioUrl)

        const response = await axios.get(`${API_BASE}/tools/shazem?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل التعرف على الأغنية')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text }) => {
    // التحقق من وجود ملف صوت أو رابط
    const q = m.quoted
    const isUrl = text?.match(/https?:\/\/\S+\.(mp3|wav|m4a|aac|ogg|flac|opus)/i)

    if (!q?.mimetype?.startsWith('audio/') && !isUrl) {
        return m.reply(
            '🎵 *Shazam - التعرف على الأغاني*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• ارد على ملف صوتي: `.شازام`\n' +
            '• أو استخدم رابط: `.شازام https://example.com/song.mp3`\n\n' +
            '📌 *مثال:*\n' +
            '`.شازام` (يرد على ملف صوتي)'
        )
    }

    await m.react('⏳')

    try {
        let audioUrl = null

        // معالجة الملف المرفق
        if (q?.mimetype?.startsWith('audio/')) {
            const buffer = await q.download()
            if (!buffer || buffer.length === 0) {
                throw new Error('فشل تحميل الملف الصوتي')
            }

            const fileInfo = await fileTypeFromBuffer(buffer)
            const ext = fileInfo?.ext || 'mp3'

            await m.react('📤')
            audioUrl = await uploadToUguu(buffer, ext)
            if (!audioUrl) {
                throw new Error('فشل رفع الملف')
            }
        } else if (isUrl) {
            audioUrl = text.match(/https?:\/\/\S+\.(mp3|wav|m4a|aac|ogg|flac|opus)/i)[0]
        } else {
            throw new Error('لم يتم العثور على ملف صوتي أو رابط')
        }

        await m.react('🔍')

        // التعرف على الأغنية
        const result = await identifySong(audioUrl)

        if (!result) {
            throw new Error('لم يتم التعرف على الأغنية')
        }

        // بناء رسالة النتيجة
        let message = '🎵 *تم التعرف على الأغنية*\n\n'
        message += `🎤 *العنوان:* ${result.title || 'غير معروف'}\n`
        message += `👤 *الفنان:* ${result.artist || 'غير معروف'}\n`
        if (result.album) message += `💿 *الألبوم:* ${result.album}\n`
        if (result.releaseDate) message += `📅 *تاريخ الإصدار:* ${result.releaseDate}\n`
        if (result.genre) message += `🎵 *النوع:* ${result.genre}\n`
        if (result.label) message += `🏷️ *العلامة:* ${result.label}\n`
        if (result.isrc) message += `🔢 *ISRC:* ${result.isrc}\n`

        // إرسال النتيجة مع صورة الغلاف إن وجدت
        if (result.coverArt) {
            await conn.sendMessage(m.chat, {
                image: { url: result.coverArt },
                caption: message
            }, { quoted: m })
        } else {
            await m.reply(message)
        }

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['شازام', 'shazam', 'تعرف']
handler.help = ['شازام <رد على صوت/رابط>']
handler.tags = ['tools']

export default handler
