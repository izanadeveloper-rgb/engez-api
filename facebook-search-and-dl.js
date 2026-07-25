// فيس بحث وتحميل
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent, proto, prepareWAMessageMedia } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

// دالة البحث في فيسبوك
async function searchFacebook(query) {
    try {
        const params = new URLSearchParams({ q: query })
        const response = await axios.get(`${API_BASE}/search/facebook?${params.toString()}`, {
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

// دالة تحميل من فيسبوك
async function downloadFacebook(url) {
    try {
        const params = new URLSearchParams({ url })
        const response = await axios.get(`${API_BASE}/download/facebook?${params.toString()}`, {
            timeout: 60000
        })
        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل التحميل')
        }
        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

// دالة تنسيق الأرقام
function formatNumber(num) {
    if (!num) return '0'
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
}

const FOOTER = '🎬 Facebook Downloader'
const DEFAULT_IMAGE = 'https://i.postimg.cc/w1Ln04gV/upload-1775306108949.jpg'

// دالة إنشاء فيديو للكاروسيل
async function createVideo(url, conn) {
    try {
        const _media_ = await prepareWAMessageMedia({
            video: { url: url }
        }, {
            upload: conn.waUploadToServer
        })
        return _media_.videoMessage
    } catch (e) {
        console.error('❌ فشل تحميل فيديو:', e.message)
        return null
    }
}

// دالة إنشاء صورة للكاروسيل (احتياطي)
async function createImage(url, conn) {
    try {
        const _media_ = await prepareWAMessageMedia({
            image: { url: url || DEFAULT_IMAGE }
        }, {
            upload: conn.waUploadToServer
        })
        return _media_.imageMessage
    } catch (e) {
        const _media_ = await prepareWAMessageMedia({
            image: { url: DEFAULT_IMAGE }
        }, {
            upload: conn.waUploadToServer
        })
        return _media_.imageMessage
    }
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        return m.reply(
            '🎬 *تحميل من فيسبوك*\n\n' +
            '📌 *الأوامر:*\n' +
            `• ${usedPrefix}${command} <رابط> - تحميل فيديو\n` +
            `• ${usedPrefix}${command} <بحث> - بحث عن فيديوهات\n\n` +
            '📌 *مثال:*\n' +
            `${usedPrefix}${command} https://www.facebook.com/reel/xxx\n` +
            `${usedPrefix}${command} anime edit`
        )
    }

    await m.react('⏳')

    try {
        const isUrl = text.includes('facebook.com') || text.includes('fb.com')

        if (isUrl) {
            // ===== معالجة الرابط =====
            const data = await downloadFacebook(text)

            if (!data) {
                throw new Error('لم يتم العثور على فيديو')
            }

            // إرسال الفيديو بجودة HD إن وجدت
            const videoUrl = data.hd || data.sd
            if (videoUrl) {
                await conn.sendMessage(m.chat, {
                    video: { url: videoUrl },
                    caption: `✅ *تم التحميل*\n📺 ${data.title?.substring(0, 80) || 'فيديو فيسبوك'}\n📥 الجودة: ${data.hd ? 'HD' : 'SD'}`
                }, { quoted: m })
                await m.react('✅')
            } else {
                throw new Error('لا يوجد رابط فيديو')
            }

        } else {
            // ===== معالجة البحث =====
            const results = await searchFacebook(text)

            if (results.length === 0) {
                throw new Error('لا توجد نتائج')
            }

            // أخذ أول 3 نتائج فقط
            const topResults = results.slice(0, 3)

            // بناء كاروسيل الفيديوهات
            let cards = []
            let count = 1

            for (const video of topResults) {
                try {
                    // جلب رابط التحميل
                    const downloadData = await downloadFacebook(video.reelUrl)
                    const videoUrl = downloadData?.hd || downloadData?.sd

                    if (!videoUrl) continue

                    const videoMessage = await createVideo(videoUrl, conn)
                    if (!videoMessage) continue

                    const card = {
                        body: proto.Message.InteractiveMessage.Body.fromObject({
                            text: 
                                `🎬 *فيديو ${count++}*\n` +
                                `👤 ${video.creator || 'مجهول'}\n` +
                                `👁️ ${formatNumber(video.views)} مشاهدة\n` +
                                `🔗 ${video.reelUrl}`
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.fromObject({
                            text: FOOTER
                        }),
                        header: proto.Message.InteractiveMessage.Header.fromObject({
                            title: `🎬 فيديو ${count - 1}`,
                            hasMediaAttachment: true,
                            videoMessage: videoMessage
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            buttons: [
                                {
                                    name: "cta_url",
                                    buttonParamsJson: JSON.stringify({
                                        display_text: "📺 فتح على فيسبوك",
                                        url: video.reelUrl
                                    })
                                }
                            ]
                        })
                    }
                    cards.push(card)
                } catch (e) {
                    console.error('❌ خطأ في بناء كارد الفيديو:', e.message)
                }
            }

            if (cards.length === 0) {
                throw new Error('فشل في تحميل الفيديوهات')
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
                                text: `🔍 *نتائج البحث عن:* ${text}\n📊 *عدد النتائج:* ${results.length}\n📥 عرض أول ${cards.length} فيديو`
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
        }

    } catch (error) {
        console.error('❌ خطأ:', error.message)
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['فيس', 'facebook', 'fb']
handler.help = ['فيس <رابط/بحث>']
handler.tags = ['downloader']
handler.limit = true

export default handler
