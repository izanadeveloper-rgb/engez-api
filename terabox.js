// كود تحميل من تيرا بوكس
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

const API_BASE = 'https://engez.a7a.online/api/v1/download/terabox'

async function fetchTeraboxData(url) {
    try {
        const params = new URLSearchParams({ url })
        const response = await axios.get(`${API_BASE}?${params.toString()}`, {
            timeout: 60000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل جلب البيانات')
        }

        return response.data
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

async function downloadFile(fileUrl, filePath) {
    const response = await axios.get(fileUrl, {
        responseType: 'stream',
        timeout: 300000,
        maxRedirects: 5,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    })
    await pipeline(response.data, createWriteStream(filePath))
}

function formatSize(bytes) {
    if (!bytes) return '0 B'
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`
}

function getFileExtension(filename) {
    const ext = path.extname(filename).toLowerCase()
    return ext || '.bin'
}

function getMimeType(ext) {
    const mimeTypes = {
        '.mp4': 'video/mp4',
        '.mkv': 'video/x-matroska',
        '.avi': 'video/x-msvideo',
        '.mov': 'video/quicktime',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.txt': 'text/plain',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav'
    }
    return mimeTypes[ext] || 'application/octet-stream'
}

async function prepareAndSendFile(conn, chat, file, quoted) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'terabox-'))
    const id = crypto.randomBytes(6).toString('hex')
    const ext = getFileExtension(file.name)
    const fileName = file.name || `file_${id}${ext}`
    const filePath = path.join(tmpDir, fileName)

    try {
        await downloadFile(file.downloadUrl, filePath)
        const buffer = await fs.readFile(filePath)
        const mimeType = getMimeType(ext)

        const caption = `📦 *${file.name}*\n📊 *الحجم:* ${file.sizeFormatted || formatSize(file.size)}\n📂 *النوع:* ${file.type || 'غير معروف'}${file.duration ? `\n⏱️ *المدة:* ${file.duration}` : ''}${file.quality ? `\n🎬 *الجودة:* ${file.quality}` : ''}`

        if (file.type === 'video' || ext === '.mp4' || ext === '.mkv' || ext === '.avi') {
            await conn.sendMessage(chat, {
                video: buffer,
                mimetype: mimeType,
                caption: caption
            }, { quoted })
        } else if (file.type === 'audio' || ext === '.mp3' || ext === '.wav') {
            await conn.sendMessage(chat, {
                audio: buffer,
                mimetype: 'audio/mpeg',
                ptt: false,
                caption: caption
            }, { quoted })
        } else if (file.type === 'pdf' || ext === '.pdf') {
            await conn.sendMessage(chat, {
                document: buffer,
                mimetype: 'application/pdf',
                fileName: fileName,
                caption: caption
            }, { quoted })
        } else {
            await conn.sendMessage(chat, {
                document: buffer,
                mimetype: mimeType,
                fileName: fileName,
                caption: caption
            }, { quoted })
        }

    } catch (error) {
        throw new Error(`فشل تحميل الملف: ${error.message}`)
    } finally {
        await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
}

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '📦 *تحميل من تيرا بوكس*\n\n' +
            'أرسل الرابط مع الأمر:\n' +
            '`.تيرا https://1024terabox.com/s/xxx`\n\n' +
            'يدعم الروابط من:\n' +
            '• 1024terabox.com\n' +
            '• terabox.app\n' +
            '• terabox.com'
        )
    }

    if (!text.includes('terabox') && !text.includes('1024terabox')) {
        return m.reply('❌ *رابط غير صحيح*\nيرجى إدخال رابط من تيرا بوكس')
    }

    await m.react('⏳')

    try {
        const data = await fetchTeraboxData(text)

        if (!data.files || data.files.length === 0) {
            throw new Error('لا توجد ملفات في هذا الرابط')
        }

        const files = data.files

        if (files.length === 1) {
            // ملف واحد فقط - تحميل مباشر
            await m.reply(`📥 جاري تحميل: ${files[0].name}\n📊 الحجم: ${files[0].sizeFormatted || formatSize(files[0].size)}`)
            await prepareAndSendFile(conn, m.chat, files[0], m)
            await m.react('✅')
        } else {
            // عدة ملفات - عرض قائمة
            const sections = [{
                title: '📁 الملفات',
                rows: files.map((file, index) => ({
                    title: file.name.substring(0, 40),
                    description: `📊 ${file.sizeFormatted || formatSize(file.size)} | 📂 ${file.type || 'غير معروف'}`,
                    id: `.تيرا-تحميل ${index}|${text}`
                }))
            }]

            const msg = generateWAMessageFromContent(m.chat, {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: `📁 *${files.length} ملف موجود*\n\nاختر الملف للتحميل:` },
                            footer: { text: '📦 TeraBox Downloader' },
                            nativeFlowMessage: {
                                buttons: [{
                                    name: 'single_select',
                                    buttonParamsJson: JSON.stringify({
                                        title: '📋 اختر ملف',
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
        }

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

const handlerDownload = async (m, { conn, text }) => {
    if (!text) return

    const [index, url] = text.split('|')
    if (!index || !url) return

    await m.react('⏳')

    try {
        const data = await fetchTeraboxData(url)
        const files = data.files || []
        const fileIndex = parseInt(index)

        if (fileIndex >= files.length) {
            throw new Error('الملف غير موجود')
        }

        const file = files[fileIndex]
        await m.reply(`📥 جاري تحميل: ${file.name}\n📊 الحجم: ${file.sizeFormatted || formatSize(file.size)}`)
        await prepareAndSendFile(conn, m.chat, file, m)
        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['تيرا', 'terabox']
handlerDownload.command = ['تيرا-تحميل']

export default handler
