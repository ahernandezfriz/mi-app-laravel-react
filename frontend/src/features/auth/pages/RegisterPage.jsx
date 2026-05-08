import { Link } from 'react-router-dom'
import AuthLayout from '../components/AuthLayout'
import FormField from '../../../shared/components/FormField'
import { useAuthValidation } from '../hooks/useAuthValidation'

function RegisterPage({
  authForm,
  setAuthForm,
  professions,
  onRegister,
  loginForm,
  forgotForm,
  resetForm,
}) {
  const { registerErrors } = useAuthValidation({
    authForm,
    loginForm,
    forgotForm,
    resetForm,
  })

  return (
    <AuthLayout title="Registro profesional" subtitle="Crea tu cuenta para comenzar a trabajar.">
      <form onSubmit={onRegister} noValidate>
        <FormField
          id="register-name"
          label="Nombre"
          value={authForm.name}
          onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
          placeholder="Nombre completo"
          error={registerErrors.name}
          required
        />
        <FormField
          id="register-rut"
          label="RUT"
          value={authForm.rut}
          onChange={(e) => setAuthForm({ ...authForm, rut: e.target.value })}
          placeholder="11.111.111-1"
          required
        />
        <FormField
          id="register-email"
          label="Email"
          type="email"
          value={authForm.email}
          onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
          placeholder="correo@dominio.com"
          error={registerErrors.email}
          required
        />
        <FormField
          id="register-password"
          label="Contrasena"
          type="password"
          value={authForm.password}
          onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
          placeholder="Minimo 8 caracteres"
          error={registerErrors.password}
          required
        />
        <FormField
          id="register-profession"
          label="Profesion"
          error={registerErrors.profession_id}
          children={(
            <select
              id="register-profession"
              className="fieldInput"
              value={authForm.profession_id}
              onChange={(e) => setAuthForm({ ...authForm, profession_id: e.target.value })}
              aria-invalid={Boolean(registerErrors.profession_id)}
              aria-describedby={registerErrors.profession_id ? 'register-profession-error' : undefined}
              required
            >
              <option value="">Selecciona profesion</option>
              {professions.map((profession) => (
                <option key={profession.id} value={profession.id}>
                  {profession.name}
                </option>
              ))}
            </select>
          )}
        />
        <button className="actionButton actionButtonPrimary w-full" aria-label="Registrar profesional">
          Registrarme
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

export default RegisterPage
