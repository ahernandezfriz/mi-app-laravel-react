import FormField from '../../../shared/components/FormField'
import { useAuthValidation } from '../hooks/useAuthValidation'

function AuthPage({
  authForm,
  setAuthForm,
  loginForm,
  setLoginForm,
  forgotForm,
  setForgotForm,
  resetForm,
  setResetForm,
  professions,
  onRegister,
  onLogin,
  onForgotPassword,
  onResetPassword,
}) {
  const { registerErrors, loginErrors, forgotErrors, resetErrors } = useAuthValidation({
    authForm,
    loginForm,
    forgotForm,
    resetForm,
  })

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="Autenticacion">
      <article className="sectionCard">
        <h2 className="sectionTitle">Registro profesional</h2>
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
      </article>

      <article className="sectionCard">
        <h2 className="sectionTitle">Iniciar sesion</h2>
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

        <h3 className="mb-2 mt-6 text-base font-semibold text-slate-900">Recuperar contrasena</h3>
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
      </article>
    </section>
  )
}

export default AuthPage
