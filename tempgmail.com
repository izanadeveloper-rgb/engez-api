// كود ايميلات جوجل وهمية
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

// تخزين الجلسات
const sessions = new Map()

async function generateEmail() {
    try {
        const response = await axios.get(`${API_BASE}/tools/email-generator?action=generate`, {
            timeout: 30000
        })
        if (!response.data?.success) throw new Error(response.data?.error || 'فشل توليد البريد')
        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

async function readMessage(email, messageId, session) {
    try {
        const params = new URLSearchParams()
        params.append('action', 'read')
        params.append('email', email)
        params.append('messageId', messageId)
        params.append('session', session)

        const response = await axios.get(`${API_BASE}/tools/email-generator?${params.toString()}`, {
            timeout: 30000
        })
        if (!response.data?.success) throw new Error(response.data?.error || 'فشل قراءة الرسالة')
        return response.data
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

async function refreshMessages(email, session) {
    try {
        const params = new URLSearchParams()
        params.append('action', 'refresh')
        params.append('email', email)
        params.append('session', session)

        const response = await axios.get(`${API_BASE}/tools/email-generator?${params.toString()}`, {
            timeout: 30000
        })
        if (!response.data?.success) throw new Error(response.data?.error || 'فشل تحديث الرسائل')
        return response.data
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

const handler = async (m, { conn, text, command }) => {
    if (command === 'توليد-بريد' || command === 'gen-email') {
        await m.react('⏳')

        try {
            const result = await generateEmail()
            
            let message = '📧 *تم توليد البريد الإلكتروني*\n\n'
            message += `📫 *البريد:* ${result.email}\n`
            message += `📊 *عدد الرسائل:* ${result.messages?.length || 0}\n\n`

            if (result.messages && result.messages.length > 0) {
                message += '📨 *الرسائل:*\n'
                result.messages.forEach((msg, i) => {
                    message += `\n${i + 1}. *من:* ${msg.from || 'غير معروف'}\n`
                    message += `   *الموضوع:* ${msg.subject || 'بدون موضوع'}\n`
                    message += `   *الوقت:* ${msg.time || 'غير معروف'}\n`
                    message += `   *المعرف:* ${msg.messageID || 'N/A'}\n`
                })
            } else {
                message += '📭 *لا توجد رسائل حتى الآن*'
            }

            // تخزين الجلسة للمستخدم
            const userId = m.sender
            sessions.set(userId, {
                email: result.email,
                session: encodeURIComponent(JSON.stringify(result.session)),
                messages: result.messages || []
            })

            await m.reply(message)
            await m.react('✅')

        } catch (error) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${error.message}`)
        }
        return
    }

    if (command === 'قراءة-بريد' || command === 'read-email') {
        if (!text) {
            return m.reply(
                '📨 *قراءة رسالة بريدية*\n\n' +
                '📌 *الاستخدام:*\n' +
                '• `.قراءة-بريد <معرف الرسالة>`\n\n' +
                '📌 *مثال:*\n' +
                '`.قراءة-بريد ADSVPN`'
            )
        }

        const userId = m.sender
        const sessionData = sessions.get(userId)

        if (!sessionData) {
            return m.reply('❌ *لا توجد جلسة نشطة*\nقم بتوليد بريد أولاً: `.توليد-بريد`')
        }

        await m.react('⏳')

        try {
            const messageId = text.trim()
            const result = await readMessage(
                sessionData.email,
                messageId,
                sessionData.session
            )

            if (result?.message) {
                let msg = '📨 *محتوى الرسالة*\n\n'
                msg += `📫 *البريد:* ${sessionData.email}\n`
                msg += `📝 *المحتوى:*\n${result.message}\n`
                await m.reply(msg)
                await m.react('✅')
            } else {
                throw new Error('لم يتم العثور على المحتوى')
            }

        } catch (error) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${error.message}`)
        }
        return
    }

    if (command === 'تحديث-بريد' || command === 'refresh-email') {
        const userId = m.sender
        const sessionData = sessions.get(userId)

        if (!sessionData) {
            return m.reply('❌ *لا توجد جلسة نشطة*\nقم بتوليد بريد أولاً: `.توليد-بريد`')
        }

        await m.react('⏳')

        try {
            const result = await refreshMessages(
                sessionData.email,
                sessionData.session
            )

            if (result?.messages) {
                sessionData.messages = result.messages
                sessions.set(userId, sessionData)

                let msg = '📨 *تم تحديث الرسائل*\n\n'
                msg += `📫 *البريد:* ${sessionData.email}\n`
                msg += `📊 *عدد الرسائل:* ${result.messages.length}\n`

                if (result.messages.length > 0) {
                    msg += '\n📨 *الرسائل:*\n'
                    result.messages.forEach((msgItem, i) => {
                        msg += `\n${i + 1}. *من:* ${msgItem.from || 'غير معروف'}\n`
                        msg += `   *الموضوع:* ${msgItem.subject || 'بدون موضوع'}\n`
                        msg += `   *الوقت:* ${msgItem.time || 'غير معروف'}\n`
                        msg += `   *المعرف:* ${msgItem.messageID || 'N/A'}\n`
                    })
                } else {
                    msg += '\n📭 *لا توجد رسائل جديدة*'
                }

                await m.reply(msg)
                await m.react('✅')
            } else {
                throw new Error('فشل تحديث الرسائل')
            }

        } catch (error) {
            await m.react('❌')
            return m.reply(`❌ *خطأ:* ${error.message}`)
        }
        return
    }

    if (command === 'بريد-مساعدة' || command === 'email-help') {
        return m.reply(
            '📧 *Email Generator - بريد مؤقت*\n\n' +
            '📌 *الأوامر:*\n' +
            '• `.توليد-بريد` - توليد بريد إلكتروني مؤقت\n' +
            '• `.قراءة-بريد <معرف>` - قراءة رسالة\n' +
            '• `.تحديث-بريد` - تحديث قائمة الرسائل\n' +
            '• `.بريد-مساعدة` - عرض هذه المساعدة\n\n' +
            '📌 *مثال:*\n' +
            '`.توليد-بريد`\n' +
            '`.قراءة-بريد ADSVPN`'
        )
    }
}

handler.command = ['توليد-بريد', 'gen-email', 'قراءة-بريد', 'read-email', 'تحديث-بريد', 'refresh-email', 'بريد-مساعدة', 'email-help']
handler.help = ['توليد-بريد', 'قراءة-بريد <معرف>', 'تحديث-بريد', 'بريد-مساعدة']
handler.tags = ['tools']

export default handler
