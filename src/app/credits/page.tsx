"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wand2, CreditCard, Sparkles, Check, Zap, Crown, Rocket } from 'lucide-react'

const CREDIT_PACKAGES = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 50,
    price: 9.90,
    icon: Zap,
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    credits: 150,
    price: 24.90,
    icon: Crown,
    popular: true,
    bonus: 20,
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    credits: 500,
    price: 69.90,
    icon: Rocket,
    popular: false,
    bonus: 100,
  },
]

export default function CreditsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [credits, setCredits] = useState(0)
  const [loading, setLoading] = useState(true)

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

  const handlePurchase = async (packageId: string) => {
    const pkg = CREDIT_PACKAGES.find(p => p.id === packageId)
    if (!pkg || !user) return

    // Aqui você integraria com um gateway de pagamento real (Stripe, Mercado Pago, etc)
    // Por enquanto, vamos simular a compra
    const totalCredits = pkg.credits + (pkg.bonus || 0)
    
    const { error } = await supabase
      .from('user_profiles')
      .update({ credits: credits + totalCredits })
      .eq('id', user.id)

    if (!error) {
      // Registra a transação
      await supabase
        .from('transactions')
        .insert([
          {
            user_id: user.id,
            amount: totalCredits,
            type: 'purchase',
            description: `Compra de ${pkg.name} - ${totalCredits} créditos`,
          }
        ])

      setCredits(credits + totalCredits)
      alert(`✅ Compra realizada! Você ganhou ${totalCredits} créditos!`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <Wand2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-purple-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-4 rounded-3xl shadow-lg inline-block mb-4">
            <CreditCard className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            Comprar Créditos
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Escolha o pacote ideal para suas necessidades
          </p>
          
          {/* Saldo Atual */}
          <Card className="inline-block mt-6 px-6 py-3 bg-white/90 backdrop-blur-lg dark:bg-gray-800/90 border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <span className="text-gray-700 dark:text-gray-300">Saldo atual:</span>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg px-4 py-1">
                {credits} créditos
              </Badge>
            </div>
          </Card>
        </div>

        {/* Pacotes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {CREDIT_PACKAGES.map((pkg) => {
            const Icon = pkg.icon
            const totalCredits = pkg.credits + (pkg.bonus || 0)
            
            return (
              <Card
                key={pkg.id}
                className={`relative p-6 bg-white/90 backdrop-blur-lg dark:bg-gray-800/90 border-2 ${
                  pkg.popular
                    ? 'border-purple-500 shadow-2xl scale-105'
                    : 'border-purple-200 dark:border-purple-700'
                }`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    Mais Popular
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <div className={`inline-block p-3 rounded-2xl mb-4 ${
                    pkg.popular
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    <Icon className={`w-8 h-8 ${
                      pkg.popular ? 'text-white' : 'text-purple-500'
                    }`} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                    {pkg.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      R$ {pkg.price.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>{pkg.credits} créditos</span>
                  </div>
                  {pkg.bonus && (
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
                      <Sparkles className="w-5 h-5" />
                      <span>+ {pkg.bonus} créditos bônus!</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Sem expiração</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Check className="w-5 h-5 text-green-500" />
                    <span>Suporte prioritário</span>
                  </div>
                </div>

                <Button
                  onClick={() => handlePurchase(pkg.id)}
                  className={`w-full py-6 text-lg ${
                    pkg.popular
                      ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white'
                      : 'bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 dark:text-purple-300'
                  }`}
                >
                  <CreditCard className="w-5 h-5 mr-2" />
                  Comprar Agora
                </Button>

                {pkg.bonus && (
                  <p className="text-center text-sm text-purple-600 dark:text-purple-400 mt-3 font-semibold">
                    Total: {totalCredits} créditos
                  </p>
                )}
              </Card>
            )
          })}
        </div>

        {/* Informações Adicionais */}
        <Card className="p-6 bg-white/90 backdrop-blur-lg dark:bg-gray-800/90 border-purple-200 dark:border-purple-700">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            💡 Como funcionam os créditos?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div>
              <h4 className="font-semibold mb-2">✨ Uso de Créditos</h4>
              <ul className="space-y-1 text-sm">
                <li>• 1 crédito = 1 edição de imagem</li>
                <li>• 1 crédito = 1 edição de vídeo</li>
                <li>• 1 crédito = 1 carrossel completo</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">🎁 Vantagens</h4>
              <ul className="space-y-1 text-sm">
                <li>• Créditos nunca expiram</li>
                <li>• Bônus em pacotes maiores</li>
                <li>• Suporte prioritário</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Botão Voltar */}
        <div className="text-center mt-8">
          <Button
            onClick={() => router.push('/')}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300"
          >
            Voltar ao Editor
          </Button>
        </div>
      </div>
    </div>
  )
}
