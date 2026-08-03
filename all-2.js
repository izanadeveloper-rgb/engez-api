// كود تحميل من يوتيويب فيس تيك صور يوتيويب (post) 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function downloadMedia(url, source = 'sosmedSaver') {
    const params = new URLSearchParams()
    params.append('url', url)
    params.append('source', source)

    const response = await axios.get(`${API_BASE}/download/all-2?${params.toString()}`, {
        timeout: 60000
    })
    if (!response.data?.success) throw new Error(response.data?.error || 'فشل التحميل')
    return response.data.response
}

const handler = async (m, { conn, text, command }) => {
    if (!text) {
        return m.reply(
            '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•\n\n' +
            '📥 *تحميل من وسائل التواصل*\n\n' +
            '📌 *الأوامر:*\n' +
            '• `.سوشيال <رابط>` - تحميل تلقائي\n' +
            '• `.يوتيوب <رابط>` - تحميل من يوتيوب\n\n' +
            '📌 *مثال:*\n' +
            '`.سوشيال https://vt.tiktok.com/xxx`\n' +
            '`.يوتيوب https://youtube.com/watch?v=xxx`'
        )
    }

    const isYoutube = text.includes('youtube.com') || text.includes('youtu.be')
    const isYoutubePost = text.includes('/post/')
    let source = isYoutube ? 'youtubeCommunity' : 'sosmedSaver'
    
    if (isYoutube && !isYoutubePost) {
        source = 'sosmedSaver'
    }

    await m.react('⏳')
    await m.reply('📥 جاري تحميل الميديا...')

    try {
        const result = await downloadMedia(text, source)

        // بوستات يوتيوب (صور)
        if (isYoutubePost && result.data?.images) {
            let cards = []
            let count = 1

            for (const img of result.data.images) {
                const imageUrl = img.max || img.original
                if (!imageUrl) continue
                
                const _media_ = await prepareWAMessageMedia({
                    image: { url: imageUrl }
                }, {
                    upload: conn.waUploadToServer
                })

                cards.push({
                    body: proto.Message.InteractiveMessage.Body.fromObject({ 
                        text: `📸 *الصورة ${count}/${result.data.images.length}*` 
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.fromObject({ 
                        text: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•' 
                    }),
                    header: proto.Message.InteractiveMessage.Header.fromObject({ 
                        title: `📷 ${count}`,
                        hasMediaAttachment: true, 
                        imageMessage: _media_.imageMessage 
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({ 
                        buttons: [] 
                    })
                })
                count++
            }

            if (cards.length > 0) {
                const finalMessage = generateWAMessageFromContent(m.chat, {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadata: {},
                                deviceListMetadataVersion: 2
                            },
                            interactiveMessage: {
                                body: proto.Message.InteractiveMessage.Body.create({
                                    text: `🖼️ *تم تحميل ${cards.length} صورة*\n📥 المصدر: ${source}`
                                }),
                                footer: proto.Message.InteractiveMessage.Footer.create({
                                    text: '◜⏤͟͟͞͞ 𝐑𝐀𝐆𝐍𝐀 ˖࣪⃟❄️ 𝐁𝐎𝐓◞•'
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
                return
            }
        }

        // فيديو
        if (result.data?.type === 'video' && result.downloadUrl) {
            await conn.sendMessage(m.chat, {
                video: { url: result.downloadUrl },
                caption: `✅ *تم التحميل*\n📥 المصدر: ${source}`
            }, { quoted: m })
            await m.react('✅')
            return
        }

        // صوت
        if (result.data?.type === 'audio' && result.downloadUrl) {
            await conn.sendMessage(m.chat, {
                audio: { url: result.downloadUrl },
                mimetype: 'audio/mpeg'
            }, { quoted: m })
            await m.react('✅')
            return
        }

        // صور من مصادر أخرى
        if (result.data?.medias && result.data.medias.length > 0) {
            for (const media of result.data.medias) {
                if (media.media_type === 'image' && media.resource_url) {
                    await conn.sendMessage(m.chat, {
                        image: { url: media.resource_url },
                        caption: `📸 صورة`
                    }, { quoted: m })
                } else if (media.media_type === 'video' && media.resource_url) {
                    await conn.sendMessage(m.chat, {
                        video: { url: media.resource_url },
                        caption: `🎬 فيديو`
                    }, { quoted: m })
                } else if (media.media_type === 'audio' && media.resource_url) {
                    await conn.sendMessage(m.chat, {
                        audio: { url: media.resource_url },
                        mimetype: 'audio/mpeg'
                    }, { quoted: m })
                }
            }
            await m.react('✅')
            return
        }

        // أي رابط مباشر
        if (result.data?.url) {
            await conn.sendMessage(m.chat, {
                document: { url: result.data.url },
                fileName: result.data?.filename || 'file.mp4',
                caption: `✅ *تم التحميل*\n📥 المصدر: ${source}`
            }, { quoted: m })
            await m.react('✅')
            return
        }

        throw new Error('لم يتم العثور على وسائط للتحميل')

    } catch (e) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${e.message}`)
    }
}

handler.command = ['سوشيال', 'social', 'يوتيوب', 'youtube']
handler.help = ['سوشيال <رابط>', 'يوتيوب <رابط>']
handler.tags = ['downloader']

export default handler
