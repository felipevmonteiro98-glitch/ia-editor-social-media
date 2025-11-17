"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Wand2, Mail, Lock, Loader2, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Verifica se já está logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isLogin) {
        // Login
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      } else {
        // Cadastro
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        
        // Cria perfil do usuário com créditos iniciais
        if (data.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([
              {
                id: data.user.id,
                email: data.user.email,
                credits: 10, // 10 créditos iniciais grátis
              }
            ])
          
          if (profileError) throw profileError
        }
        
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message || 'Ocorreu um erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-gray-900 dark:to-purple-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/90 backdrop-blur-lg dark:bg-gray-800/90 border-purple-200 dark:border-purple-700 shadow-2xl">
        {/* Logo e Título */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-4 rounded-3xl shadow-lg mb-4">
            <Wand2 className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            IA Editor Social Media
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-center flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            Edição profissional com IA
          </p>
        </div>

        {/* Tabs Login/Cadastro */}
        <div className="flex gap-2 mb-6">
          <Button
            onClick={() => setIsLogin(true)}
            className={`flex-1 ${
              isLogin
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Login
          </Button>
          <Button
            onClick={() => setIsLogin(false)}
            className={`flex-1 ${
              !isLogin
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            Cadastro
          </Button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Lock className="w-4 h-4 inline mr-2" />
              Senha
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full"
            />
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!isLogin && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-lg text-sm">
              🎁 Ganhe 10 créditos grátis ao se cadastrar!
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:from-purple-600 hover:via-pink-600 hover:to-orange-600 text-white py-6 text-lg shadow-lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                {isLogin ? 'Entrar' : 'Criar Conta'}
              </>
            )}
          </Button>
        </form>

        {/* Informações sobre créditos */}
        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
          <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
            💎 Como funcionam os créditos?
          </h3>
          <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
            <li>• 1 crédito = 1 edição de imagem ou vídeo</li>
            <li>• 10 créditos grátis ao se cadastrar</li>
            <li>• Compre mais créditos quando precisar</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
