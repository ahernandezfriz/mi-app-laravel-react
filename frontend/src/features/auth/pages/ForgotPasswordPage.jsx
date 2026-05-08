import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../../../shared/components/FormField'
import { useAuthValidation } from '../hooks/useAuthValidation'

function ForgotPasswordPage({
  forgotForm,
  setForgotForm,
  onForgotPassword,
  resetForm,
  setResetForm,
  onResetPassword,
  authForm,
  loginForm,
}) {
  const { forgotErrors, resetErrors } = useAuthValidation({
    authForm,
    loginForm,
    forgotForm,
    resetForm,
  })

  return (
    <AuthLayout title="Recuperar contrasena" subtitle="Solicita enlace y luego actualiza tu contrasena.">
      <form onSubmit={onForgotPassword} noValidate>
        <FormField
          id="forgot-email"
          label="Email"
          type="email"
          value={forgotForm.email}
          onChange={(e) => setForgotForm({ email: e.target.value })}
          placeholder="correo@dominio.com"
          error={forgotErrors.email}
          required
        />
        <button className="actionButton w-full" aria-label="Enviar enlace de recuperacion">
          Enviar enlace
        </button>
      </form>

      <h3 className="mb-2 mt-6 text-base font-semibold text-slate-900">Resetear contrasena</h3>
      <form onSubmit={onResetPassword} noValidate>
        <FormField
          id="reset-token"
          label="Token"
          value={resetForm.token}
          onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })}
          placeholder="Token recibido"
          error={resetErrors.token}
          required
        />
        <FormField
          id="reset-email"
          label="Email"
          type="email"
          value={resetForm.email}
          onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
          placeholder="correo@dominio.com"
          error={resetErrors.email}
          required
        />
        <FormField
          id="reset-password"
          label="Nueva contrasena"
          type="password"
          value={resetForm.password}
          onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
          placeholder="Minimo 8 caracteres"
          error={resetErrors.password}
          required
        />
        <FormField
          id="reset-password-confirmation"
          label="Confirmar contrasena"
          type="password"
          value={resetForm.password_confirmation}
          onChange={(e) => setResetForm({ ...resetForm, password_confirmation: e.target.value })}
          placeholder="Repite la contrasena"
          error={resetErrors.password_confirmation}
          required
        />
        <button className="actionButton w-full" aria-label="Resetear contrasena">
          Resetear
        </button>
      </form>

      <div className="mt-6 text-sm">
        <Link to="/login" className="font-medium text-[#6e62e5] hover:text-[#4f45bd]">
          Volver a iniciar sesion
        </Link>
      </div>
    </AuthLayout>
  )
}

export default ForgotPasswordPage
