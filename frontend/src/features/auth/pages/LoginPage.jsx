import { Link } from 'react-router-dom'
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
          type="password"
          value={loginForm.password}
          onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
          placeholder="Tu contrasena"
          error={loginErrors.password}
          required
        />
        <button className="actionButton actionButtonPrimary w-full" aria-label="Iniciar sesion">
          Ingresar
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link to="/register" className="font-medium text-blue-700 hover:text-blue-900">
          Registrate
        </Link>
        <Link to="/forgot-password" className="font-medium text-blue-700 hover:text-blue-900">
          Olvide la contrasena
        </Link>
      </div>
    </AuthLayout>
  )
}

export default LoginPage
