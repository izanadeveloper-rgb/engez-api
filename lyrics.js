// كود بحث lyrics 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function searchLyrics(query) {
    try {
        const params = new URLSearchParams()
        params.append('query', query)

        const response = await axios.get(`${API_BASE}/tools/lyrics?${params.toString()}`, {
            timeout: 30000
        })
        if (!response.data?.success) throw new Error(response.data?.error || 'فشل البحث عن كلمات الأغنية')
        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '🎵 *البحث عن كلمات الأغنية*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.كلمات <اسم الأغنية>`\n\n' +
            '📌 *مثال:*\n' +
            '`.كلمات 505`'
        )
    }

    await m.react('⏳')

    try {
        const result = await searchLyrics(text)

        if (!result?.lyrics) {
            throw new Error('لم يتم العثور على كلمات')
        }

        let msg = `🎵 *${result.title || 'بدون عنوان'}*\n`
        if (result.artist) msg += `🎤 *الفنان:* ${result.artist}\n\n`
        msg += `📝 *كلمات الأغنية:*\n${result.lyrics}`

        // تقسيم النص الطويل
        if (msg.length > 4000) {
            const parts = []
            let current = ''
            const lines = msg.split('\n')
            
            for (const line of lines) {
                if (current.length + line.length > 3800) {
                    parts.push(current)
                    current = ''
                }
                current += line + '\n'
            }
            if (current) parts.push(current)

            for (const part of parts) {
                await m.reply(part)
            }
        } else {
            await m.reply(msg)
        }

        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['كلمات', 'lyrics', 'اغنية']
handler.help = ['كلمات <اسم الأغنية>']
handler.tags = ['tools']

export default handler
