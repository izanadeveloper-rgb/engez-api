// كود بحث ستيكر متحرك
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function searchGif(query) {
    try {
        const params = new URLSearchParams()
        params.append('q', query)

        const response = await axios.get(`${API_BASE}/tools/gif-search?${params.toString()}`, {
            timeout: 30000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل البحث')
        }

        return response.data.results || []
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

async function sendSticker(conn, chat, gifUrl, quoted) {
    try {
        await conn.sendMessage(chat, {
            sticker: { url: gifUrl },
            mimetype: 'video/mp4',
            fileLength: 0,
            seconds: 0
        }, { quoted })
        return true
    } catch (error) {
        console.error('Sticker error:', error.message)
        return false
    }
}

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '🎬 *بحث وإرسال ملصق متحرك (Sticker)*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.ملصق itachi`\n\n' +
            '📌 *مثال:*\n' +
            '`.ملصق ناروتو`'
        )
    }

    await m.react('⏳')

    try {
        const results = await searchGif(text)

        if (results.length === 0) {
            throw new Error('لا توجد نتائج')
        }

        const validResults = results.filter(r => r.url && r.url.startsWith('http'))

        if (validResults.length === 0) {
            throw new Error('لا توجد روابط صالحة')
        }

        const shuffled = validResults.sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, 5)

        let sent = 0
        for (const gif of selected) {
            const success = await sendSticker(conn, m.chat, gif.url, m)
            if (success) sent++
        }

        if (sent === 0) {
            throw new Error('فشل إرسال الملصقات')
        }

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['ملصق', 'sticker']
handler.help = ['ملصق <بحث>']
handler.tags = ['sticker']

export default handler
