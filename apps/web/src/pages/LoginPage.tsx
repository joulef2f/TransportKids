import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bus } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})
const registerSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  companyName: z.string().min(1, 'Nom de société requis'),
})
type LoginForm = z.infer<typeof loginSchema>
type RegisterForm = z.infer<typeof registerSchema>

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })
  const registerForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const handleLogin = async (data: LoginForm) => {
    setIsLoading(true)
    try {
      const res = await api.auth.login(data.email, data.password)
      login(res.accessToken, res.refreshToken, res.user)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.body?.error || 'Connexion impossible')
    } finally { setIsLoading(false) }
  }

  const handleRegister = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      const res = await api.auth.register(data.email, data.password, data.companyName)
      login(res.accessToken, res.refreshToken, res.user)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.body?.error || 'Inscription impossible')
    } finally { setIsLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: '#060910',
        backgroundImage: 'radial-gradient(ellipse at 30% 50%, rgba(0,212,255,0.07) 0%, transparent 60%), radial-gradient(ellipse at 70% 20%, rgba(168,85,247,0.07) 0%, transparent 60%)',
      }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', boxShadow: '0 0 40px rgba(0,212,255,0.35)' }}>
            <Bus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif', background: 'linear-gradient(135deg, #00d4ff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TransportKids Pro
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte entreprise'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(10,15,28,0.85)', border: '1px solid rgba(0,212,255,0.15)', backdropFilter: 'blur(12px)', boxShadow: '0 0 40px rgba(0,0,0,0.5), 0 0 80px rgba(0,212,255,0.05)' }}>

          {mode === 'login' ? (
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5">
              <div>
                <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</Label>
                <Input className="mt-1.5" type="email" placeholder="admin@example.com" {...loginForm.register('email')} />
                {loginForm.formState.errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{loginForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mot de passe</Label>
                <Input className="mt-1.5" type="password" placeholder="••••••••" {...loginForm.register('password')} />
                {loginForm.formState.errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{loginForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-10" isLoading={isLoading}>Se connecter</Button>
              <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Pas de compte ?{' '}
                <button type="button" onClick={() => setMode('register')} style={{ color: '#00d4ff' }} className="hover:underline">
                  S'inscrire
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-5">
              <div>
                <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nom de la société</Label>
                <Input className="mt-1.5" placeholder="Transport Dupont SAS" {...registerForm.register('companyName')} />
                {registerForm.formState.errors.companyName && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{registerForm.formState.errors.companyName.message}</p>}
              </div>
              <div>
                <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</Label>
                <Input className="mt-1.5" type="email" placeholder="admin@example.com" {...registerForm.register('email')} />
                {registerForm.formState.errors.email && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{registerForm.formState.errors.email.message}</p>}
              </div>
              <div>
                <Label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mot de passe</Label>
                <Input className="mt-1.5" type="password" placeholder="••••••••" {...registerForm.register('password')} />
                {registerForm.formState.errors.password && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{registerForm.formState.errors.password.message}</p>}
              </div>
              <Button type="submit" className="w-full h-10" isLoading={isLoading}>Créer mon compte</Button>
              <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Déjà un compte ?{' '}
                <button type="button" onClick={() => setMode('login')} style={{ color: '#00d4ff' }} className="hover:underline">
                  Se connecter
                </button>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
