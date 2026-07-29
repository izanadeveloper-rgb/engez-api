// كود تحقق من رقم 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'

const API_BASE = 'https://engez.a7a.online/api/v1'

async function checkNumber(number) {
    try {
        const params = new URLSearchParams()
        params.append('num', number)

        const response = await axios.get(`${API_BASE}/tools/checknum?${params.toString()}`, {
            timeout: 30000
        })

        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل التحقق')
        }

        return response.data.response
    } catch (error) {
        throw new Error(error.message || 'فشل الاتصال')
    }
}

function formatNumber(num) {
    if (!num) return 'غير معروف'
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const handler = async (m, { conn, text }) => {
    if (!text) {
        return m.reply(
            '📱 *التحقق من رقم واتساب*\n\n' +
            '📌 *الاستخدام:*\n' +
            '• `.رقم 201222784295`\n' +
            '• `.رقم 01222784295`\n\n' +
            '📌 *مثال:*\n' +
            '`.رقم 201234567890`'
        )
    }

    // تنظيف الرقم من أي أحرف غير رقمية
    const cleanNumber = text.replace(/[^0-9]/g, '')

    if (!cleanNumber || cleanNumber.length < 10) {
        return m.reply('❌ *رقم غير صحيح*\nيرجى إدخال رقم صحيح مكون من 10 أرقام على الأقل')
    }

    await m.react('⏳')

    try {
        const result = await checkNumber(cleanNumber)

        let message = '📱 *نتيجة التحقق من الرقم*\n\n'
        message += `📞 *الرقم:* ${result.e164 || result.phone || cleanNumber}\n`
        message += `🌍 *الدولة:* ${result.country || 'غير معروف'}\n`
        message += `🗣️ *اللغة:* ${result.language || 'غير معروف'}\n`
        message += `📊 *الحالة:* ${result.status === 'registered' ? '🟢 مسجل على واتساب' : '🔴 غير مسجل على واتساب'}\n`

        if (result.message) {
            message += `\n📝 *ملاحظة:*\n${result.message}`
        }

        if (result.raw?.summary?.fallback_methods) {
            const methods = result.raw.summary.fallback_methods
            message += `\n\n🔐 *طرق التحقق المتاحة:*\n`
            methods.forEach(method => {
                const methodNames = {
                    'passkey': '🔑 مفتاح مرور',
                    'wa_old': '📱 واتساب قديم',
                    'email_otp': '📧 كود البريد الإلكتروني',
                    'flash': '⚡ فلاش',
                    'sms': '📨 رسالة نصية',
                    'voice': '🎤 مكالمة صوتية'
                }
                message += `• ${methodNames[method] || method}\n`
            })
        }

        await m.reply(message)
        await m.react('✅')

    } catch (error) {
        await m.react('❌')
        return m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

handler.command = ['رقم', 'checknum', 'تحقق-رقم']
handler.help = ['رقم <الرقم>']
handler.tags = ['tools']

export default handler
