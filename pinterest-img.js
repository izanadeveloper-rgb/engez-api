import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'
import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'

// دالة البحث عن صور
async function searchPins(query) {
    try {
        const params = new URLSearchParams({ q: query })
        const response = await axios.get(`${API_BASE}/search/pinimg?${params.toString()}`, {
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

// دالة إنشاء صورة للكاروسيل
async function createImage(url, conn) {
    try {
        const _media_ = await prepareWAMessageMedia({
            image: { url: url }
        }, {
            upload: conn.waUploadToServer
        })
        return _media_.imageMessage
    } catch (e) {
        console.error('❌ فشل تحميل صورة:', e.message)
        return null
    }
}

const FOOTER = '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•'

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '🖼️ *بحث عن صور من Pinterest*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.بينتر-صور cat`\n\n' +
            '📌 *مثال:*\n' +
            '`.بينتر-صور قطط`'
        )
    }

    await m.react('⏳')

    try {
        const results = await searchPins(text)
        if (results.length === 0) {
            throw new Error('لا توجد نتائج')
        }

        // بناء كاروسيل الصور
        let cards = []
        let count = 1

        for (const item of results.slice(0, 10)) {
            try {
                const imageMessage = await createImage(item.image, conn)
                if (!imageMessage) continue

                const uploader = item.uploader
                const username = uploader?.username || 'مجهول'
                const fullName = uploader?.fullName || ''

                const card = {
                    body: proto.Message.InteractiveMessage.Body.fromObject({
                        text: 
                            `🖼️ *صورة ${count++}*\n` +
                            `📝 *العنوان:* ${item.title || 'بدون عنوان'}\n` +
                            `👤 *الناشر:* ${fullName} (@${username})\n` +
                            `${item.description && item.description.trim() !== ' ' ? `📄 *الوصف:* ${item.description.substring(0, 80)}` : ''}`
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({
                        text: FOOTER
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({
                        title: `🖼️ صورة ${count - 1}`,
                        hasMediaAttachment: true,
                        imageMessage: imageMessage
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                        buttons: [
                            {
                                name: "cta_url",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "📌 فتح في Pinterest",
                                    url: item.pinUrl
                                })
                            }
                        ]
                    })
                }
                cards.push(card)
            } catch (e) {
                console.error('❌ خطأ في بناء كارد:', e.message)
            }
        }

        if (cards.length === 0) {
            throw new Error('فشل في بناء نتائج البحث')
        }

        const finalMessage = generateWAMessageFromContent(m.chat, {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: {
                        body: proto.Message.InteractiveMessage.Body.create({
                            text: `🔍 *نتائج البحث عن:* ${text}\n📊 *عدد النتائج:* ${results.length}`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({
                            text: FOOTER
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({
                            hasMediaAttachment: false
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
                            cards
                        })
                    }
                }
            }
        }, {})

        await conn.relayMessage(m.chat, finalMessage.message, { messageId: finalMessage.key.id })
        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['بينتر-صور', 'pinimg', 'pins']
handler.help = ['بينتر-صور <بحث>']
handler.tags = ['search']

export default handler
