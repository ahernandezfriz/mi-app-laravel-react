import { Link } from 'react-router-dom'
import { useState } from 'react'
import AuthLayout from '../components/AuthLayout'
import FormField from '../../../shared/components/FormField'
import { useAuthValidation } from '../hooks/useAuthValidation'

function LoginPage({
  loginForm,
  setLoginForm,
  onLogin,
  authForm,
  forgotForm,
  resetForm,
}) {
  const [showPassword, setShowPassword] = useState(false)
  const { loginErrors } = useAuthValidation({
    authForm,
    loginForm,
    forgotForm,
    resetForm,
  })

  return (
    <AuthLayout title="Iniciar sesion" subtitle="Accede con tu correo y contrasena.">
      <form onSubmit={onLogin} noValidate>
        <FormField
          id="login-email"
          label="Email"
          type="email"
          value={loginForm.email}
          onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
          placeholder="correo@dominio.com"
          error={loginErrors.email}
          required
        />
        <FormField
          id="login-password"
          label="Contrasena"
          error={loginErrors.password}
        >
          <div className="relative">
            <input
              id="login-password"
              className="fieldInput pr-11"
              type={showPassword ? 'text' : 'password'}
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              placeholder="Tu contrasena"
              required
              aria-invalid={Boolean(loginErrors.password)}
              aria-describedby={loginErrors.password ? 'login-password-error' : undefined}
            />
            <span
              role="button"
              tabIndex={0}
              className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center text-slate-500 hover:text-slate-700"
              aria-label="Mantener presionado para ver contrasena"
              onMouseDown={(event) => {
                event.preventDefault()
                setShowPassword(true)
              }}
              onMouseUp={() => setShowPassword(false)}
              onMouseLeave={() => setShowPassword(false)}
              onTouchStart={() => setShowPassword(true)}
              onTouchEnd={() => setShowPassword(false)}
              onTouchCancel={() => setShowPassword(false)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setShowPassword(true)
                }
              }}
              onKeyUp={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setShowPassword(false)
                }
              }}
            >
              {showPassword ? (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.58 10.58A2 2 0 0014 12" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.88 5.09A10.94 10.94 0 0112 4.91c4.78 0 8.71 2.98 9.82 7.09a10.66 10.66 0 01-4.04 5.45M6.61 6.61A10.66 10.66 0 002.18 12c1.11 4.11 5.04 7.09 9.82 7.09 1.8 0 3.5-.42 4.99-1.17" />
                </svg>
              ) : (
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.18 12C3.29 7.89 7.22 4.91 12 4.91S20.71 7.89 21.82 12c-1.11 4.11-5.04 7.09-9.82 7.09S3.29 16.11 2.18 12z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </span>
          </div>
        </FormField>
        <button className="actionButton actionButtonPrimary w-full" aria-label="Iniciar sesion">
          Ingresar
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link to="/register" className="font-medium text-[#6e62e5] hover:text-[#4f45bd]">
          Registrate
        </Link>
        <Link to="/forgot-password" className="font-medium text-[#6e62e5] hover:text-[#4f45bd]">
          Olvide la contrasena
        </Link>
      </div>
    </AuthLayout>
  )
}

export default LoginPage
