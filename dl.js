import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'

// دالة التحميل من أي مصدر
async function downloadFromSource(source, url) {
    try {
        const params = new URLSearchParams()
        params.append('source', source)
        params.append('url', url)

        const response = await axios.get(`${API_BASE}/download/multi?${params.toString()}`, {
            timeout: 120000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل التحميل')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text, command }) => {
    if (!text) {
        return m.reply(
            '📥 *تحميل من مصادر متعددة*\n\n' +
            '📌 *الأوامر:*\n' +
            '• `.ميديا <رابط>` - تحميل من ميديا فاير\n' +
            '• `.درايف <رابط>` - تحميل من قوقل درايف\n' +
            '• `.ميجا <رابط>` - تحميل من ميجا\n\n' +
            '📌 *مثال:*\n' +
            '`.ميديا https://www.mediafire.com/file/xxx`'
        )
    }

    if (!text.match(/https?:\/\/\S+/)) {
        return m.reply('❌ *رابط غير صحيح*\nيرجى إدخال رابط صحيح')
    }

    await m.react('⏳')

    try {
        // تحديد المصدر حسب الأمر
        let source
        if (command === 'ميديا' || command === 'mediafire') {
            source = 'mediafire'
        } else if (command === 'درايف' || command === 'gdrive') {
            source = 'gdrive'
        } else if (command === 'ميجا' || command === 'mega') {
            source = 'mega'
        } else {
            throw new Error('مصدر غير معروف')
        }

        const result = await downloadFromSource(source, text)

        if (result?.downloadUrl) {
            const caption = 
                `✅ *تم التحميل بنجاح*\n\n` +
                `📦 *المصدر:* ${result.source || source}\n` +
                `📁 *الملف:* ${result.fileName || 'ملف'}\n` +
                `📂 *النوع:* ${result.mimeType || result.ext || 'غير معروف'}\n` +
                `📊 *الحجم:* ${result.fileSize || 'غير معروف'}`

            await conn.sendMessage(m.chat, {
                document: { url: result.downloadUrl },
                mimetype: result.mimeType || 'application/octet-stream',
                fileName: result.fileName || `file.${result.ext || 'bin'}`,
                caption: caption
            }, { quoted: m })

            await m.react('✅')
        } else {
            throw new Error('لم يتم العثور على رابط التحميل')
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['ميديا', 'mediafire', 'درايف', 'gdrive', 'ميجا', 'mega']
handler.help = ['ميديا <رابط>', 'درايف <رابط>', 'ميجا <رابط>']
handler.tags = ['downloader']

export default handler
