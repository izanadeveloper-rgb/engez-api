// كود رفع ملفات يدعم 9 مصادر
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import FormData from 'form-data'
import { fileTypeFromBuffer } from 'file-type'

const API_BASE = 'https://engez.a7a.online/api/v1'

const SOURCES = {
    '1': 'uguu',
    '2': 'quax',
    '3': 'ezgif',
    '4': 'top4top',
    '5': 'postimages',
    '6': 'videy',
    '7': '8upload',
    '8': 'litterbox',
    '9': 'tmpfiles'
}

const SOURCE_NAMES = {
    'uguu': 'Uguu',
    'quax': 'Quax',
    'ezgif': 'Ezgif',
    'top4top': 'Top4Top',
    'postimages': 'PostImages',
    'videy': 'Videy',
    '8upload': '8Upload',
    'litterbox': 'Litterbox',
    'tmpfiles': 'TmpFiles'
}

async function uploadFile(fileBuffer, source = 'uguu') {
    try {
        const form = new FormData()
        const fileInfo = await fileTypeFromBuffer(fileBuffer)
        const ext = fileInfo?.ext || 'bin'
        form.append('files[]', fileBuffer, `file.${ext}`)

        const uploadRes = await axios.post('https://uguu.se/upload.php', form, {
            headers: { ...form.getHeaders() },
            timeout: 30000
        })

        if (!uploadRes.data?.files?.[0]?.url) {
            throw new Error('فشل رفع الملف إلى Uguu')
        }

        const fileUrl = uploadRes.data.files[0].url

        const params = new URLSearchParams()
        params.append('fileUrl', fileUrl)
        params.append('source', source)

        const response = await axios.get(`${API_BASE}/tools/upload?${params.toString()}`, {
            timeout: 30000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل الرفع')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text }) => {
    const q = m.quoted
    if (!q || !q.mimetype) {
        return m.reply(
            '📤 *رفع ملفات*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• ارد على صورة/فيديو/ملف\n' +
            '• اكتب `.لرابط` فقط للرفع التلقائي\n' +
            '• اكتب `.لرابط 1` للرفع لـ Uguu\n' +
            '• اكتب `.لرابط 2` للرفع لـ Quax\n' +
            '• وهكذا حتى 9\n\n' +
            '📌 *المصادر:*\n' +
            '1- Uguu\n' +
            '2- Quax\n' +
            '3- Ezgif\n' +
            '4- Top4Top\n' +
            '5- PostImages\n' +
            '6- Videy\n' +
            '7- 8Upload\n' +
            '8- Litterbox\n' +
            '9- TmpFiles\n\n' +
            '📌 *الرفع التلقائي:*\n' +
            '• صور → PostImages\n' +
            '• فيديوهات → Videy\n' +
            '• ملفات أخرى → Uguu'
        )
    }

    await m.react('⏳')

    try {
        const buffer = await q.download()
        if (!buffer || buffer.length === 0) {
            throw new Error('فشل تحميل الملف')
        }

        const fileInfo = await fileTypeFromBuffer(buffer)
        const mimeType = fileInfo?.mime || q.mimetype || 'application/octet-stream'

        // تحديد المصدر
        let source
        const selected = text?.trim()

        if (selected && SOURCES[selected]) {
            // مستخدم اختار رقم
            source = SOURCES[selected]
        } else {
            // رفع تلقائي حسب النوع
            if (mimeType.startsWith('image/')) {
                source = 'postimages'
            } else if (mimeType.startsWith('video/')) {
                source = 'videy'
            } else {
                source = 'uguu'
            }
        }

        const result = await uploadFile(buffer, source)

        if (result?.url) {
            const size = result.size || buffer.length
            const sizeFormatted = size > 1024 * 1024 
                ? `${(size / (1024 * 1024)).toFixed(2)} MB`
                : `${(size / 1024).toFixed(2)} KB`

            const sourceName = SOURCE_NAMES[source] || source

            await m.reply(
                `✅ *تم الرفع بنجاح*\n\n` +
                `📦 *الملف:* ${result.fileName || 'ملف'}\n` +
                `📂 *النوع:* ${result.mimeType || mimeType}\n` +
                `📊 *الحجم:* ${sizeFormatted}\n` +
                `📥 *المصدر:* ${sourceName}\n` +
                `🔗 *الرابط:* ${result.url}`
            )

            await m.react('✅')
        } else {
            throw new Error('لم يتم العثور على رابط')
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['لرابط']

export default handler
