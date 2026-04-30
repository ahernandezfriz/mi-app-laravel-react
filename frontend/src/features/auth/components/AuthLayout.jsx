function AuthLayout({ title, subtitle, children }) {
  return (
    <main className="appShell flex min-h-screen items-center justify-center">
      <section className="grid w-[90%] max-w-none grid-cols-1 overflow-hidden rounded-[5px] border border-slate-200 bg-white shadow lg:max-w-[60%] lg:grid-cols-2">
        <aside className="relative hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-blue-100">Mi App Terapias</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight">Gestion clinica escolar moderna</h1>
            <p className="mt-4 max-w-md text-blue-100">
              Plataforma para profesionales: estudiantes, planes anuales, sesiones, tareas y reportes.
            </p>
          </div>
          <div className="rounded-[5px] border border-white/30 bg-white/10 p-4 text-sm text-blue-50">
            Acceso seguro y flujo de trabajo centralizado.
          </div>
        </aside>

        <section className="p-6 md:p-10">
          <header className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </header>
          {children}
        </section>
      </section>
    </main>
  )
}

export default AuthLayout
