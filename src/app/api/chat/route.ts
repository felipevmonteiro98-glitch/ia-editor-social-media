import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

// Configuração do cliente OpenAI com fallback
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'sk-placeholder'
})

export async function POST(request: NextRequest) {
  try {
    // Verifica se a chave da API está configurada
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-placeholder') {
      return NextResponse.json(
        { error: '⚠️ Configure a variável OPENAI_API_KEY nas configurações de ambiente para usar o chat com IA.' },
        { status: 500 }
      )
    }

    const { messages, mediaContext, editRequest } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Mensagens inválidas' },
        { status: 400 }
      )
    }

    // Sistema especializado em edição de mídia para social media
    const systemPrompt = `Você é uma IA especialista em edição de mídia para Social Media, com conhecimento profundo em:

🎨 EDIÇÃO PROFISSIONAL:
- Design gráfico e composição visual
- Filtros, efeitos e correção de cores
- Tipografia e hierarquia visual
- Tendências de design para redes sociais

📱 PLATAFORMAS:
- Instagram (Feed, Stories, Reels)
- TikTok (vídeos curtos, trends)
- YouTube (thumbnails, shorts)
- Facebook, Twitter, LinkedIn

✨ CAPACIDADES:
- Sugerir edições específicas e detalhadas
- Recomendar filtros, cores e estilos
- Criar conceitos visuais profissionais
- Otimizar para engajamento

🎯 SEU PAPEL:
Quando o usuário enviar mídia e pedir edição, você deve:
1. Analisar o tipo de conteúdo e objetivo
2. Sugerir edições ESPECÍFICAS e DETALHADAS
3. Recomendar ferramentas e técnicas
4. Dar instruções passo a passo claras
5. Focar em resultados profissionais e modernos

IMPORTANTE: 
- Seja específico nas sugestões (cores exatas, posicionamento, tamanhos)
- Considere tendências atuais de design
- Priorize legibilidade e impacto visual
- Adapte para a plataforma de destino
- Seja criativo mas profissional

Responda sempre em português brasileiro, de forma clara e prática.`

    // Adiciona contexto de mídia se houver
    let contextMessage = ''
    if (mediaContext && mediaContext.length > 0) {
      contextMessage = `\n\n📎 MÍDIA ENVIADA:\n${mediaContext.map((m: any) => 
        `- ${m.name} (${m.type}, ${(m.size / 1024 / 1024).toFixed(2)}MB)`
      ).join('\n')}`
      
      if (editRequest) {
        contextMessage += `\n\n🎯 SOLICITAÇÃO DE EDIÇÃO:\n"${editRequest}"`
      }
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        ...messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content + (msg.role === 'user' && contextMessage ? contextMessage : '')
        }))
      ],
      temperature: 0.8,
      max_tokens: 2000
    })

    const assistantMessage = completion.choices[0]?.message?.content || 
      '❌ Desculpe, não consegui gerar uma resposta. Tente novamente.'

    return NextResponse.json({ message: assistantMessage })
  } catch (error) {
    console.error('Erro na API:', error)
    return NextResponse.json(
      { error: 'Erro ao processar sua solicitação. Verifique se a chave da OpenAI está configurada.' },
      { status: 500 }
    )
  }
}
