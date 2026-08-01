// كود بحث gif
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

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '🎬 *بحث عن GIFs*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.جيف itachi`\n\n' +
            '📌 *مثال:*\n' +
            '`.جيف ناروتو`'
        )
    }

    await m.react('⏳')

    try {
        const results = await searchGif(text)

        if (results.length === 0) {
            throw new Error('لا توجد نتائج')
        }

        // تصفية الروابط غير الصالحة
        const validResults = results.filter(r => r.url && r.url.startsWith('http'))

        if (validResults.length === 0) {
            throw new Error('لا توجد روابط صالحة')
        }

        // إرسال 5 جيفات عشوائية
        const shuffled = validResults.sort(() => Math.random() - 0.5)
        const selected = shuffled.slice(0, 5)

        for (const gif of selected) {
            await conn.sendMessage(m.chat, {
                video: { url: gif.url },
                gifPlayback: true,
                caption: `🎬 *نتيجة بحث:* ${text}`
            }, { quoted: m })
        }

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['جيف', 'gif']
handler.help = ['جيف <بحث>']
handler.tags = ['tools']

export default handler
