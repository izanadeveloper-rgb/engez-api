// كود اصوات مشاهير
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

// قائمة الأصوات (الأسماء فقط)
const VOICES = [
    'ميسي',
    'نيمار',
    'مبابي',
    'غوكو',
    'زونغلي',
    'ناهيدا',
    'نامي',
    'يوكي',
    'ايمينيم',
    'رابر',
    'سنوب',
    'دريك',
    'كانيه',
    'مورغان',
    'صموئيل',
    'ذاروك',
    'جوروغان',
    'اندروتيت'
]

async function generateVoice(text, voice) {
    try {
        const params = new URLSearchParams()
        params.append('text', text)
        params.append('voice', voice)

        const response = await axios.get(`${API_BASE}/tools/anime-tts?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل توليد الصوت')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

async function sendVoiceList(conn, chat, quoted, usedPrefix) {
    const sections = [{
        title: '🎙️ أصوات أنمي TTS',
        rows: VOICES.map(name => ({
            title: name,
            description: `🎤 صوت ${name}`,
            id: `${usedPrefix}صوت-أنمي ${name}`
        }))
    }]

    const msg = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: '🗣️ *اختر الصوت المناسب*\n\nاختر صوتاً لتوليد النص الصوتي:' },
                    footer: { text: '🎙️ Anime TTS' },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: '🎙️ اختر صوت',
                                sections
                            })
                        }]
                    }
                }
            }
        }
    }, { userJid: conn.user.jid, quoted })

    await conn.relayMessage(chat, msg.message, { messageId: msg.key.id })
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    // أمر عرض القائمة
    if (command === 'صوت-أنمي' && !text) {
        await sendVoiceList(conn, m.chat, m, usedPrefix)
        return
    }

    // أمر مساعد
    if (command === 'صوت-مساعدة') {
        return m.reply(
            '🗣️ *Anime TTS - الأوامر*\n\n' +
            '📌 *الاستخدام:*\n' +
            `• ${usedPrefix}صوت-أنمي - عرض قائمة الأصوات\n` +
            `• ${usedPrefix}صوت-أنمي ميسي مرحبا - توليد صوت باسم ميسي\n\n` +
            '📌 *الأصوات المتاحة:*\n' +
            VOICES.map(v => `• ${v}`).join('\n') +
            '\n\n📌 *مثال:*\n' +
            `${usedPrefix}صوت-أنمي غوكو السلام عليكم`
        )
    }

    // التحقق من وجود نص
    if (!text) {
        return m.reply(
            '❌ *يرجى إدخال النص*\n\n' +
            '📌 *الاستخدام:*\n' +
            `• ${usedPrefix}صوت-أنمي <اسم الصوت> <النص>\n` +
            `• ${usedPrefix}صوت-أنمي ميسي مرحبا\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}صوت-أنمي غوكو السلام عليكم`
        )
    }

    await m.react('⏳')

    try {
        let voiceName = null
        let textToSpeak = text

        // محاولة استخراج اسم الصوت من بداية النص
        const match = text.match(/^(\S+)\s+(.+)/)
        if (match) {
            const possibleVoice = match[1]
            // التحقق من أن الاسم موجود في قائمة الأصوات
            if (VOICES.includes(possibleVoice)) {
                voiceName = possibleVoice
                textToSpeak = match[2]
            }
        }

        // إذا لم يتم العثور على صوت، استخدام الصوت الافتراضي (ميسي)
        if (!voiceName) {
            voiceName = 'ميسي'
            textToSpeak = text
        }

        const result = await generateVoice(textToSpeak, voiceName)

        if (result?.url) {
            await conn.sendMessage(m.chat, {
                audio: { url: result.url },
                mimetype: 'audio/mpeg',
                fileName: `anime_tts_${voiceName}_${Date.now()}.mp3`,
                caption: `🎙️ *تم توليد الصوت*\n🗣️ الصوت: ${voiceName}\n📝 النص: ${textToSpeak}`
            }, { quoted: m })

            await m.react('✅')
        } else {
            throw new Error('لم يتم العثور على رابط الصوت')
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['صوت-أنمي', 'anime-tts', 'صوت-مساعدة']
handler.help = ['صوت-أنمي <اسم> <نص>', 'صوت-مساعدة']
handler.tags = ['tts', 'ai']

export default handler
