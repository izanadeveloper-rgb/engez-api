// كود ai يدعم محادثة مع كل موديلات القوية 
// https://whatsapp.com/channel/0029Vb7Nq294Y9le1aAcTE0D
// تابعو القناة هننشر اكواد تانية "izana,uncel shawaza" 
import axios from 'axios'
import { generateWAMessageFromContent } from '@whiskeysockets/baileys'

const API_BASE = 'https://engez.a7a.online/api/v1'

// كل عنصر هنا يمثل مصدر (model) بيتبع أكتر من موديل فرعي (subModel)
// القايمة دي متفلترة على أساس اختبار فعلي: شيلنا framesuite (كريدت خلص)
// وheck/unlimited/azbry/flatai/roasted/mindgrasp/olabiba/feelbetter (فشل أو رد غريب/غير مفهوم)
const MODELS = [
    {
        id: 'rewind',
        name: 'Rewind AI',
        aliases: ['rewind'],
        subs: [
            { id: 'qwen/qwen-2.5-7b-instruct', aliases: ['qwen'] },
            { id: 'x-ai/grok-4.20', aliases: ['grok'] },
            { id: 'meta-llama/llama-4-scout', aliases: ['llama'] },
            { id: 'anthropic/claude-haiku-4.5', aliases: ['claude'] },
            { id: 'nvidia/nemotron-3-ultra-550b-a55b', aliases: ['nemotron'] },
            { id: 'z-ai/glm-4.7-flash', aliases: ['z'] }
        ],
        default: 'qwen/qwen-2.5-7b-instruct'
    },
    {
        id: 'notrack',
        name: 'Notrack AI',
        aliases: ['notrack'],
        subs: [
            { id: 'C', aliases: [] },
            { id: 'B', aliases: [] },
            { id: 'A', aliases: [] }
        ],
        default: 'C'
    },
    {
        id: 'hotbot',
        name: 'Hotbot GPT-5',
        aliases: ['gpt', 'hotbot'],
        subs: [{ id: 'gpt-5', aliases: [] }],
        default: 'gpt-5'
    },
    {
        id: 'edubrain',
        name: 'Edubrain',
        aliases: ['edubrain'],
        subs: [{ id: 'default', aliases: [] }],
        default: 'default'
    },
    {
        id: 'atomesus',
        name: 'Atomesus',
        aliases: ['atomesus'],
        subs: [{ id: 'default', aliases: [] }],
        default: 'default'
    },
    {
        id: 'originality',
        name: 'Originality AI',
        aliases: ['originality'],
        subs: [
            { id: 'plagiarismchecker', aliases: [] },
            { id: 'aichecker', aliases: [] },
            { id: 'grammarchecker', aliases: [] }
        ],
        default: 'plagiarismchecker'
    },
    {
        id: 'paragraph',
        name: 'Paragraph Generator',
        aliases: ['paragraph'],
        subs: [{ id: 'default', aliases: [] }],
        default: 'default'
    },
    {
        id: 'kloner',
        name: 'Kloner',
        aliases: ['kloner'],
        subs: [{ id: 'default', aliases: [] }],
        default: 'default'
    }
]

// نبني خريطة: كل alias (سواء بتاع model أو sub) يشاور على { model, sub|null }
// sub = null يعني الـ alias ده بتاع الموديل نفسه مش sub معين
function buildAliasIndex() {
    const index = new Map()
    for (const model of MODELS) {
        for (const alias of model.aliases) {
            index.set(alias, { model, sub: null })
        }
        for (const sub of model.subs) {
            for (const alias of sub.aliases) {
                index.set(alias, { model, sub })
            }
        }
    }
    return index
}

const ALIAS_INDEX = buildAliasIndex()

// الشكل الصح للـ request: لازم action=chat + model + subModel + q
// من غير subModel الـ API بيرجع الـ default بتاعه دايمًا (ده اللي كان بيحصل غلط قبل كده)
async function chatWithModel(modelId, subModelId, query, extra = {}) {
    try {
        const params = new URLSearchParams()
        params.append('action', 'chat')
        params.append('model', modelId)
        params.append('subModel', subModelId)
        params.append('q', query)
        for (const [key, value] of Object.entries(extra)) {
            if (value !== undefined && value !== null) {
                params.append(key, value)
            }
        }

        const response = await axios.get(`${API_BASE}/ai/chat-models?${params.toString()}`, {
            timeout: 30000
        })
        if (!response.data?.success) {
            throw new Error(response.data?.error || 'فشل الدردشة')
        }
        return response.data
    } catch (error) {
        throw new Error(error.response?.data?.message || error.message || 'فشل الاتصال')
    }
}

async function sendModelList(conn, chat, quoted, model, query) {
    const sections = [{
        title: `🤖 اختر المصدر لـ ${model.name}`,
        rows: model.subs.map(sub => ({
            title: sub.id.substring(0, 30),
            description: `📋 ${sub.id}`,
            id: `.${model.aliases[0]} ${sub.id}|${query}`
        }))
    }]

    const msg = generateWAMessageFromContent(chat, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: `🤖 *${model.name}*\n📝 *السؤال:* ${query}\n\n👇 اختر المصدر:` },
                    footer: { text: '🤖 AI Models' },
                    nativeFlowMessage: {
                        buttons: [{
                            name: 'single_select',
                            buttonParamsJson: JSON.stringify({
                                title: '📋 اختر مصدر',
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

async function runChat(m, model, subModelId, query) {
    await m.react('⏳')
    try {
        const result = await chatWithModel(model.id, subModelId, query)

        let msg = `🤖 *${model.name}*\n`
        msg += `📋 النموذج: ${result.subModel || subModelId}\n\n`
        msg += `${result.response}`

        await m.reply(msg)
        await m.react('✅')
    } catch (error) {
        await m.react('❌')
        await m.reply(`❌ *خطأ:* ${error.message}`)
    }
}

const handlerModels = async (m) => {
    let msg = '🤖 *قائمة النماذج المتاحة*\n\n'
    for (const model of MODELS) {
        const subAliases = model.subs
            .flatMap(s => s.aliases)
            .filter(Boolean)
        msg += `📌 *${model.name}* (${model.aliases.join(', ')})\n`
        msg += `   📋 المصادر: ${model.subs.map(s => s.id).join(', ')}\n`
        if (subAliases.length) {
            msg += `   🔗 اختصارات مباشرة: ${subAliases.join(', ')}\n`
        }
        msg += `   ⭐ الافتراضي: ${model.default}\n\n`
    }
    await m.reply(msg)
    await m.react('✅')
}

const handler = async (m, { conn, text, command }) => {
    if (command === 'نماذج' || command === 'models') {
        return handlerModels(m)
    }

    if (!text) {
        return m.reply(
            '🤖 *نماذج الدردشة*\n\n' +
            '📌 *الأوامر:*\n' +
            '• `.نماذج` - عرض جميع النماذج\n' +
            '• `.gpt مرحبا` - الدردشة مع GPT\n' +
            '• `.qwen مرحبا` - الدردشة مع Qwen\n' +
            '• `.grok مرحبا` - الدردشة مع Grok\n\n' +
            '📌 *الأسماء المتاحة:*\n' +
            '• gpt, qwen, grok, claude, llama, nemotron, z\n' +
            '• rewind, notrack, hotbot\n' +
            '• edubrain, atomesus, originality, paragraph, kloner'
        )
    }

    const entry = ALIAS_INDEX.get(command)

    if (!entry) {
        return m.reply(`❌ *النموذج "${command}" غير موجود*\n📋 استخدم .نماذج لعرض جميع النماذج`)
    }

    const { model, sub } = entry

    // الـ alias ده بتاع sub-model محدد (زي .z أو .claude) → نفّذ على طول من غير أسئلة
    if (sub) {
        return runChat(m, model, sub.id, text)
    }

    // الـ alias ده بتاع الموديل نفسه (زي .rewind) ومعاه أكتر من مصدر → اعرض قايمة اختيار
    if (model.subs.length > 1) {
        await sendModelList(conn, m.chat, m, model, text)
        return
    }

    // موديل بمصدر واحد بس (زي .gpt) → نفّذ على طول
    return runChat(m, model, model.default, text)
}

const allAliases = []
for (const [alias] of ALIAS_INDEX) {
    allAliases.push(alias)
}

handler.command = ['نماذج', 'models', ...allAliases]

export default handler
