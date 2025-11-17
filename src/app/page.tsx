"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Bot, User, Loader2, Upload, Image as ImageIcon, Video, Sparkles, Download, Wand2, Grid3x3, ChevronLeft, ChevronRight, CreditCard, LogOut, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface Message {
  role: 'user' | 'assistant'
  content: string
  media?: {
    type: 'image' | 'video'
    url: string
    originalUrl?: string
  }
  carousel?: {
    images: string[]
    currentIndex: number
  }
}

export default function Home() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🎨 Olá! Sou sua IA especializada em edição de mídia para Social Media!\n\nEnvie suas imagens ou vídeos e me diga como quer editar:\n\n✨ Exemplos:\n• "Deixe mais profissional e elegante"\n• "Adicione filtro vintage e texto motivacional"\n• "Faça um thumbnail chamativo para YouTube"\n• "Crie uma arte para Instagram Stories"\n• "Edite para TikTok com efeitos modernos"\n• "Crie um carrossel com essas imagens"\n\nEstou pronta para transformar seu conteúdo! 🚀'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [carouselMode, setCarouselMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      router.push('/login')
      return
    }

    setUser(session.user)

    // Busca créditos do usuário
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('credits')
      .eq('id', session.user.id)
      .single()

    if (profile) {
      setCredits(profile.credits)
    }

    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles(prev => [...prev, ...files])
    
    // Ativa modo carrossel automaticamente se houver múltiplas imagens
    if (files.length > 1 && files.every(f => f.type.startsWith('image'))) {
      setCarouselMode(true)
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    if (uploadedFiles.length <= 2) {
      setCarouselMode(false)
    }
  }

  const navigateCarousel = (messageIndex: number, direction: 'prev' | 'next') => {
    setMessages(prev => prev.map((msg, idx) => {
      if (idx === messageIndex && msg.carousel) {
        const newIndex = direction === 'next' 
          ? (msg.carousel.currentIndex + 1) % msg.carousel.images.length
          : (msg.carousel.currentIndex - 1 + msg.carousel.images.length) % msg.carousel.images.length
        
        return {
          ...msg,
          carousel: {
            ...msg.carousel,
            currentIndex: newIndex
          }
        }
      }
      return msg
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!input.trim() && uploadedFiles.length === 0) || isLoading) return

    // Verifica se tem créditos suficientes
    if (credits <= 0) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Você não tem créditos suficientes! Compre mais créditos para continuar editando.'
      }])
      return
    }

    const userMessage = input.trim()
    const files = [...uploadedFiles]
    setInput('')
    setUploadedFiles([])
    
    // Verifica se é modo carrossel
    const isCarousel = carouselMode && files.length > 1 && files.every(f => f.type.startsWith('image'))
    
    let userMsg: Message

    if (isCarousel) {
      // Cria carrossel
      const carouselUrls = files.map(file => URL.createObjectURL(file))
      userMsg = {
        role: 'user',
        content: userMessage || `📸 Carrossel com ${files.length} imagens`,
        carousel: {
          images: carouselUrls,
          currentIndex: 0
        }
      }
    } else {
      // Cria URLs temporárias para preview
      const mediaUrls = files.map(file => ({
        type: file.type.startsWith('video') ? 'video' as const : 'image' as const,
        url: URL.createObjectURL(file),
        originalUrl: URL.createObjectURL(file)
      }))

      // Adiciona mensagem do usuário com mídia
      userMsg = {
        role: 'user',
        content: userMessage || '📎 Arquivo(s) enviado(s)',
        ...(mediaUrls.length > 0 && { media: mediaUrls[0] })
      }
    }
    
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setCarouselMode(false)

    try {
      // Prepara contexto para a IA
      const mediaContext = files.map(f => ({
        name: f.name,
        type: f.type,
        size: f.size
      }))

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          mediaContext,
          editRequest: userMessage,
          isCarousel
        })
      })

      if (!response.ok) throw new Error('Erro na resposta')

      const data = await response.json()
      
      // Deduz 1 crédito
      const newCredits = credits - 1
      await supabase
        .from('user_profiles')
        .update({ credits: newCredits })
        .eq('id', user.id)

      // Registra a transação
      await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount: -1,
            type: 'usage',
            description: 'Edição de mídia',
          }
        ])

      setCredits(newCredits)
      
      // Adiciona resposta da IA
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.message 
      }])
    } catch (error) {
      console.error('Erro:', error)
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '❌ Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente.' 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-purple-900">
        <div className="text-center">
          <Wand2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-purple-900">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 shadow-lg border-b border-purple-200 dark:border-purple-700">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-2.5 rounded-2xl shadow-lg">
                <Wand2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  IA Editor Social Media
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Edição profissional em segundos
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Créditos */}
              <Button
                onClick={() => router.push('/credits')}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">{credits} créditos</span>
                <span className="sm:hidden">{credits}</span>
              </Button>

              {/* Logout */}
              <Button
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                  <Wand2 className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className={`max-w-[85%] sm:max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                {/* Carrossel */}
                {message.carousel && (
                  <Card className="overflow-hidden border-2 border-purple-200 dark:border-purple-700 shadow-lg">
                    <div className="relative">
                      <img 
                        src={message.carousel.images[message.carousel.currentIndex]} 
                        alt={`Slide ${message.carousel.currentIndex + 1}`}
                        className="w-full h-auto max-h-96 object-cover"
                      />
                      
                      {/* Navegação do Carrossel */}
                      <div className="absolute inset-0 flex items-center justify-between p-4">
                        <Button
                          onClick={() => navigateCarousel(index, 'prev')}
                          className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-auto backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </Button>
                        <Button
                          onClick={() => navigateCarousel(index, 'next')}
                          className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 h-auto backdrop-blur-sm"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </Button>
                      </div>
                      
                      {/* Indicadores */}
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                        {message.carousel.images.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === message.carousel!.currentIndex
                                ? 'bg-white w-6'
                                : 'bg-white/50'
                            }`}
                          />
                        ))}}}}}}}
                      </div>
                      
                      {/* Contador */}
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                        {message.carousel.currentIndex + 1} / {message.carousel.images.length}
                      </div>
                    </div>
                  </Card>
                )}
                
                {/* Mídia única */}
                {message.media && !message.carousel && (
                  <Card className="overflow-hidden border-2 border-purple-200 dark:border-purple-700 shadow-lg">
                    {message.media.type === 'image' ? (
                      <img 
                        src={message.media.url} 
                        alt="Uploaded" 
                        className="w-full h-auto max-h-96 object-cover"
                      />
                    ) : (
                      <video 
                        src={message.media.url} 
                        controls 
                        className="w-full h-auto max-h-96"
                      />
                    )}
                  </Card>
                )}
                
                <Card
                  className={`p-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white border-0 shadow-lg'
                      : 'bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 border-purple-200 dark:border-purple-700 shadow-md'
                  }`}
                >
                  <p className="text-sm sm:text-base whitespace-pre-wrap break-words leading-relaxed">
                    {message.content}
                  </p>
                </Card>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Wand2 className="w-5 h-5 text-white" />
              </div>
              <Card className="p-4 bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 border-purple-200 dark:border-purple-700 shadow-md">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Analisando e editando sua mídia...
                  </span>
                </div>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Upload Preview */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 border-t border-purple-200 dark:border-purple-700">
          <div className="max-w-5xl mx-auto px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2 overflow-x-auto">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Arquivos:
              </span>
              {uploadedFiles.length > 1 && uploadedFiles.every(f => f.type.startsWith('image')) && (
                <Button
                  onClick={() => setCarouselMode(!carouselMode)}
                  className={`${
                    carouselMode 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  } px-3 py-1 h-auto text-xs`}
                >
                  <Grid3x3 className="w-3 h-3 mr-1" />
                  Carrossel
                </Button>
              )}
              {uploadedFiles.map((file, index) => (
                <Badge 
                  key={index}
                  className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 flex items-center gap-2 px-3 py-1"
                >
                  {file.type.startsWith('video') ? (
                    <Video className="w-3 h-3" />
                  ) : (
                    <ImageIcon className="w-3 h-3" />
                  )}
                  <span className="text-xs">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 border-t border-purple-200 dark:border-purple-700 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || credits <= 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
            >
              <Upload className="w-5 h-5" />
            </Button>

            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={credits > 0 ? "Descreva como quer editar sua mídia..." : "Sem créditos - Compre mais!"}
              disabled={isLoading || credits <= 0}
              className="flex-1 bg-gray-50 dark:bg-gray-900 border-purple-300 dark:border-purple-600 focus:ring-2 focus:ring-purple-500"
            />
            
            <Button
              type="submit"
              disabled={isLoading || (!input.trim() && uploadedFiles.length === 0) || credits <= 0}
              className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white px-6 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </Button>
          </form>
          
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              🎨 1 crédito por edição • Carrosséis • Edição profissional com IA
            </p>
            {credits <= 5 && (
              <Button
                onClick={() => router.push('/credits')}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-3 py-1 h-auto"
              >
                <ShoppingCart className="w-3 h-3 mr-1" />
                Comprar Créditos
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
