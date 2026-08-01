// كود بحث وتحميل روايات من asrud 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import fs from 'fs/promises'
import { createWriteStream } from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { pipeline } from 'stream/promises'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function searchAsrud(query) {
    try {
        const params = new URLSearchParams()
        params.append('action', 'بحث')
        params.append('q', query)
        params.append('limit', '10')

        const response = await axios.get(`${API_BASE}/reading/asrud?${params.toString()}`, {
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

async function getStoryDetails(url) {
    try {
        const params = new URLSearchParams()
        params.append('action', 'تفاصيل')
        params.append('url', url)

        const response = await axios.get(`${API_BASE}/reading/asrud?${params.toString()}`, {
            timeout: 30000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل جلب التفاصيل')
        }

        return response.data
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

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

async function downloadToFile(fileUrl, filePath) {
    const response = await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 120000,
        maxRedirects: 5,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
            'Referer': 'https://www.mediafire.com/'
        }
    })
    await pipeline(response.data, createWriteStream(filePath))
}

function detectFileType(buffer) {
    const h = buffer.subarray(0, 4)
    if (h[0] === 0x25 && h[1] === 0x50 && h[2] === 0x44 && h[3] === 0x46) {
        return { ext: 'pdf', mimetype: 'application/pdf' }
    }
    if (h[0] === 0x50 && h[1] === 0x4b) {
        return { ext: 'zip', mimetype: 'application/zip' }
    }
    return { ext: 'pdf', mimetype: 'application/pdf' }
}

function buildFileName(rawTitle, ext) {
    const clean = (rawTitle || 'ملف').replace(/\.(pdf|zip)$/i, '').trim()
    return `${clean}.${ext}`
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
    if (command === 'اختيار-اسرد' || command === 'asrud-select') {
        if (!text) return
        const url = decodeURIComponent(text.trim())
        await m.react('⏳')

        try {
            const data = await getStoryDetails(url)
            if (!data) throw new Error('فشل جلب تفاصيل الرواية')

            let caption = `📖 *${data.title}*\n\n`
            caption += `✍️ *الكاتب:* ${data.author || 'غير معروف'}\n\n`
            caption += `📝 *الوصف:*\n${data.description?.substring(0, 500) || 'لا يوجد وصف'}...\n\n`
            caption += `🔗 *الرابط:*\n${data.url}`

            if (data.image && data.image !== 'https://i.postimg.cc/w1Ln04gV/upload-1775306108949.jpg') {
                await conn.sendMessage(m.chat, {
                    image: { url: data.image },
                    caption: caption
                }, { quoted: m })
            } else {
                await m.reply(caption)
            }

            if (data.downloadUrl) {
                await m.reply('⏳ جاري تحميل الملف...')

                const result = await downloadMediaFire(data.downloadUrl)

                if (result?.download) {
                    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'asrud-'))
                    const id = crypto.randomBytes(6).toString('hex')
                    const filePath = path.join(tmpDir, `${id}.bin`)

                    await downloadToFile(result.download, filePath)
                    const buffer = await fs.readFile(filePath)
                    const { ext, mimetype } = detectFileType(buffer)
                    const fileName = buildFileName(result.filename, ext)

                    const fileCaption =
                        `✅ *تم التحميل بنجاح*\n\n` +
                        `📁 *الملف:* ${result.filename || 'ملف'}\n` +
                        `📊 *الحجم:* ${result.size || 'غير معروف'}`

                    await conn.sendMessage(m.chat, {
                        document: buffer,
                        mimetype: mimetype,
                        fileName: fileName,
                        caption: fileCaption
                    }, { quoted: m })

                    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
                } else {
                    await m.reply('⚠️ لم يتم العثور على رابط التحميل')
                }
            } else {
                await m.reply('⚠️ لا يوجد رابط تحميل لهذه الرواية')
            }

            await m.react('✅')
        } catch (error) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${error.message}`)
        }
        return
    }

    if (command === 'ميديا' || command === 'mediafire') {
        if (!text) {
            return m.reply(
                '📥 *تحميل من MediaFire*\n\n' +
                '📌 *الاستخدام:*\n' +
                `• ${usedPrefix}ميديا <رابط>\n\n` +
                '📌 *مثال:*\n' +
                `${usedPrefix}ميديا https://www.mediafire.com/file/xxx`
            )
        }

        if (!text.includes('mediafire.com')) {
            return m.reply('❌ *رابط غير صحيح*\nيرجى إدخال رابط من MediaFire')
        }

        await m.react('⏳')

        try {
            const result = await downloadMediaFire(text)

            if (result?.download) {
                const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mediafire-'))
                const id = crypto.randomBytes(6).toString('hex')
                const filePath = path.join(tmpDir, `${id}.bin`)

                await m.reply('⏳ جاري تحميل الملف...')

                await downloadToFile(result.download, filePath)
                const buffer = await fs.readFile(filePath)
                const { ext, mimetype } = detectFileType(buffer)
                const fileName = buildFileName(result.filename, ext)

                const caption =
                    `✅ *تم التحميل بنجاح*\n\n` +
                    `📁 *الملف:* ${result.filename || 'ملف'}\n` +
                    `📊 *الحجم:* ${result.size || 'غير معروف'}`

                await conn.sendMessage(m.chat, {
                    document: buffer,
                    mimetype: mimetype,
                    fileName: fileName,
                    caption: caption
                }, { quoted: m })

                await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})

                await m.react('✅')
            } else {
                throw new Error('لم يتم العثور على رابط التحميل')
            }

        } catch (error) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${error.message}`)
        }
        return
    }

    if (command === 'اسرد' || command === 'asrud') {
        if (!text) {
            return m.reply(
                '📚 *البحث في موقع أسرد*\n\n' +
                '📌 *الاستخدام:*\n' +
                `• ${usedPrefix}اسرد خطأ واحد\n\n` +
                '📌 *مثال:*\n' +
                `${usedPrefix}اسرد رواية حب`
            )
        }

        await m.react('⏳')

        try {
            const results = await searchAsrud(text)
            if (results.length === 0) throw new Error('لا توجد نتائج')

            const sections = [{
                title: '📚 النتائج',
                rows: results.slice(0, 10).map((item) => ({
                    title: item.title.substring(0, 40),
                    description: `✍️ ${item.author || 'غير معروف'}`,
                    id: `${usedPrefix}اختيار-اسرد ${encodeURIComponent(item.url)}`
                }))
            }]

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: `🔍 *نتائج البحث عن:* ${text}\n📊 *عدد النتائج:* ${results.length}\n\n👇 اختر الرواية:` },
                            footer: { text: '📚 Asrud Reader' },
                            nativeFlowMessage: {
                                buttons: [{
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '📋 اختر رواية',
                                        sections
                                    })
                                }]
                            }
                        }
                    }
                }
            }, { userJid: conn.user.jid, quoted: m })

            await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
            await m.react('✅')

        } catch (error) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${error.message}`)
        }
        return
    }
}

handler.command = ['اسرد', 'asrud', 'اختيار-اسرد', 'asrud-select', 'ميديا', 'mediafire']
handler.help = ['اسرد <بحث>', 'اختيار-اسرد <رابط>', 'ميديا <رابط>']
handler.tags = ['reading', 'downloader']

export default handler
