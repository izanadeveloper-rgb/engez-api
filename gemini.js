// كود gemini 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'

// تخزين الجلسات مؤقتاً
const sessions = new Map()

async function chatWithGemini(query, sessionId = null) {
    try {
        const params = new URLSearchParams()
        params.append('q', query)
        if (sessionId) params.append('sessionId', sessionId)

        const response = await axios.get(`${API_BASE}/ai/gemini?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل الاتصال')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text, command }) => {
    // أمر مسح الجلسة
    if (command === 'جيمناي-مسح' || command === 'gemini-clear') {
        const userId = m.sender
        if (sessions.has(userId)) {
            sessions.delete(userId)
            await m.reply('✅ *تم مسح سياق المحادثة*')
        } else {
            await m.reply('ℹ️ *لا توجد جلسة نشطة*')
        }
        return
    }

    // الأمر الرئيسي للدردشة
    if (!text) {
        return m.reply(
            '🤖 *جيمناي AI*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.جيمناي سؤالك`\n' +
            '• `.جيمناي مرحبا`\n\n' +
            '💡 *يحافظ على السياق في المحادثة*\n' +
            '💡 *استخدم `.جيمناي-مسح` لمسح السياق*'
        )
    }

    await m.react('⏳')

    try {
        const userId = m.sender
        let sessionId = sessions.get(userId) || null

        const result = await chatWithGemini(text, sessionId)

        if (result?.reply) {
            if (result.sessionId) {
                sessions.set(userId, result.sessionId)
            }

            await m.reply(`🤖 ${result.reply}`)
            await m.react('✅')
        } else {
            throw new Error('لم يتم العثور على رد')
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['جيمناي', 'gemini', 'جيمناي-مسح', 'gemini-clear']
handler.help = ['جيمناي <سؤال>', 'جيمناي-مسح']
handler.tags = ['ai']

export default handler
