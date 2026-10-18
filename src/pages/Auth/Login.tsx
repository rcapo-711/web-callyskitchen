import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Button } from '../../components/common/Button'

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const Login: React.FC = () => {
  const { login, isLiveConfigured } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirectPath = searchParams.get('redirect') || '/'

  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true)
    setAuthError(null)

    const { error } = await login(values.email, values.password)

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setAuthError('Email atau password salah. Silakan coba lagi.')
      } else {
        setAuthError(error.message || 'Gagal masuk akun.')
      }
      setIsSubmitting(false)
    } else {
      navigate(redirectPath, { replace: true })
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-20">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-cream-300 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-caramel-500 text-white font-black text-xl flex items-center justify-center mx-auto shadow-md">
            CK
          </div>
          <h1 className="text-2xl font-black text-brown-900">Masuk Akun</h1>
          <p className="text-xs text-brown-500">
            Masuk untuk melanjutkan pembelian dan memantau pesanan Anda
          </p>
        </div>

        {authError && (
          <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{authError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400" />
              <input
                type="email"
                placeholder="nama@email.com"
                {...register('email')}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 focus:ring-2 focus:ring-caramel-200 outline-none text-sm text-brown-900"
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-brown-800 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brown-400" />
              <input
                type="password"
                placeholder="Minimal 6 karakter"
                {...register('password')}
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-cream-50 border border-cream-300 focus:bg-white focus:border-caramel-500 focus:ring-2 focus:ring-caramel-200 outline-none text-sm text-brown-900"
              />
            </div>
            {errors.password && (
              <p className="text-xs text-red-600 font-semibold mt-1">{errors.password.message}</p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={isSubmitting}
            variant="primary"
            size="lg"
            className="w-full text-sm font-bold shadow-md mt-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Masuk Sekarang
          </Button>
        </form>

        <div className="text-center pt-2 text-xs text-brown-600">
          Belum punya akun?{' '}
          <Link
            to={`/register${redirectPath !== '/' ? `?redirect=${encodeURIComponent(redirectPath)}` : ''}`}
            className="font-bold text-caramel-600 hover:text-caramel-700 underline"
          >
            Daftar Akun Baru
          </Link>
        </div>

      </div>
    </div>
  )
}
