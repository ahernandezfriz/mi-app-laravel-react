import AppFooter from '../../../shared/components/AppFooter'

function AuthLayout({ title, subtitle, feedback, feedbackType = 'info', children }) {
  const feedbackClass =
    feedbackType === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : feedbackType === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-[#d9d7f3] bg-[#eaf7fb] text-[#3f357d]'

  return (
    <main className="appShell flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center p-4">
        <section className="grid w-[90%] max-w-none grid-cols-1 overflow-hidden rounded-[10px] border border-[#d9d7f3] bg-white shadow lg:max-w-[60%] lg:grid-cols-2">
          <aside className="relative hidden bg-[#6e62e5] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-[#ecebff]">Mi App Terapias</p>
              <h1 className="mt-4 text-3xl font-bold leading-tight">Gestion clinica escolar moderna</h1>
              <p className="mt-4 max-w-md text-[#ecebff]">
                Plataforma para profesionales: estudiantes, planes anuales, sesiones, tareas y reportes.
              </p>
            </div>
            <div className="rounded-[10px] border border-white/30 bg-white/10 p-4 text-sm text-white">
              Acceso seguro y flujo de trabajo centralizado.
            </div>
          </aside>

          <section className="p-6 md:p-10">
            <header className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </header>
            {feedback ? (
              <p className={`mb-4 rounded-[10px] border px-3 py-2 text-sm ${feedbackClass}`} role="status" aria-live="polite">
                {feedback}
              </p>
            ) : null}
            {children}
          </section>
        </section>
      </div>
      <AppFooter />
    </main>
  )
}

export default AuthLayout
