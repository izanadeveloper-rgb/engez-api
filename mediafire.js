import axios from 'axios'
import { fileTypeFromBuffer } from 'file-type'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function downloadMediaFire(url) {
    try {
        const params = new URLSearchParams()
        params.append('url', url)

        const response = await axios.get(`${API_BASE}/download/mediafire?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل التحميل')
        }

        return response.data.data
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '📥 *تحميل من MediaFire*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.ميديا <رابط>`\n\n' +
            '📌 *مثال:*\n' +
            '`.ميديا https://www.mediafire.com/file/xxx`'
        )
    }

    if (!text.includes('mediafire.com')) {
        return m.reply('❌ *رابط غير صحيح*\nيرجى إدخال رابط من MediaFire')
    }

    await m.react('⏳')

    try {
        const result = await downloadMediaFire(text)

        if (!result?.download) {
            throw new Error('لم يتم العثور على رابط التحميل')
        }

        // تحميل الملف لتحديد نوعه
        const fileRes = await axios.get(result.download, {
            responseType: 'arraybuffer',
            timeout: 60000,
            maxRedirects: 5
        })

        const buffer = Buffer.from(fileRes.data)
        const fileInfo = await fileTypeFromBuffer(buffer)

        // تحديد الامتداد الصحيح
        let ext = 'bin'
        let mimeType = 'application/octet-stream'

        if (fileInfo) {
            ext = fileInfo.ext
            mimeType = fileInfo.mime
        } else {
            // محاولة استخراج الامتداد من اسم الملف
            const filename = result.filename || ''
            const extMatch = filename.match(/\.([^.]+)$/)
            if (extMatch) {
                ext = extMatch[1]
                const mimeMap = {
                    'pdf': 'application/pdf',
                    'zip': 'application/zip',
                    'rar': 'application/x-rar-compressed',
                    '7z': 'application/x-7z-compressed',
                    'mp4': 'video/mp4',
                    'mkv': 'video/x-matroska',
                    'avi': 'video/x-msvideo',
                    'mp3': 'audio/mpeg',
                    'wav': 'audio/wav',
                    'jpg': 'image/jpeg',
                    'jpeg': 'image/jpeg',
                    'png': 'image/png',
                    'gif': 'image/gif'
                }
                if (mimeMap[ext]) {
                    mimeType = mimeMap[ext]
                }
            }
        }

        // اختيار نوع الإرسال المناسب
        const isVideo = ['mp4', 'mkv', 'avi', 'mov'].includes(ext)
        const isAudio = ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'].includes(ext)
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)
        const isPdf = ext === 'pdf'

        let caption = `✅ *تم التحميل بنجاح*\n\n`
        caption += `📁 *الملف:* ${result.filename || 'ملف'}\n`
        caption += `📊 *الحجم:* ${result.size || 'غير معروف'}\n`
        caption += `📂 *النوع:* ${mimeType}\n`
        caption += `🔖 *الامتداد:* ${ext}`

        if (isVideo) {
            await conn.sendMessage(m.chat, {
                video: buffer,
                mimetype: mimeType,
                caption: caption
            }, { quoted: m })
        } else if (isAudio) {
            await conn.sendMessage(m.chat, {
                audio: buffer,
                mimetype: mimeType,
                ptt: false,
                caption: caption
            }, { quoted: m })
        } else if (isImage) {
            await conn.sendMessage(m.chat, {
                image: buffer,
                mimetype: mimeType,
                caption: caption
            }, { quoted: m })
        } else {
            // مستندات (pdf, zip, ...)
            await conn.sendMessage(m.chat, {
                document: buffer,
                mimetype: mimeType,
                fileName: result.filename || `file.${ext}`,
                caption: caption
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['ميديا', 'mediafire']
handler.help = ['ميديا <رابط>']
handler.tags = ['downloader']

export default handler
