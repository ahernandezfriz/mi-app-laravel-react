export default function WorkshopFormModal({
  open,
  title,
  subtitle,
  workshopForm,
  setWorkshopForm,
  levels,
  lockCourse,
  editingWorkshop,
  existingCourses = [],
  onOpenExistingCourse,
  onClose,
  onSubmit,
  saving = false,
}) {
  if (!open) return null

  const selectedLevel = levels.find((level) => String(level.id) === String(workshopForm.school_level_id))
  const availableCourses = selectedLevel?.courses ?? []
  const existingCourse = !lockCourse && workshopForm.school_course_id
    ? existingCourses.find((course) => String(course.id) === String(workshopForm.school_course_id))
    : null
  const workshopsCount = Number(existingCourse?.workshops_count || 0)
  const courseAlreadyRegistered = Boolean(existingCourse)

  function handleSubmit(event) {
    event.preventDefault()
    if (courseAlreadyRegistered) return
    onSubmit(event)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className="w-full max-w-2xl rounded-[5px] border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-name">
                Nombre
              </label>
              <input
                id="workshop-name"
                className="fieldInput mb-0"
                placeholder="Nombre del taller"
                value={workshopForm.name}
                onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-level">
                Nivel
              </label>
              <select
                id="workshop-level"
                className="fieldInput mb-0"
                value={workshopForm.school_level_id}
                disabled={lockCourse}
                onChange={(e) => setWorkshopForm({
                  ...workshopForm,
                  school_level_id: e.target.value,
                  school_course_id: '',
                })}
                required
              >
                <option value="">Nivel</option>
                {levels.map((level) => (
                  <option key={level.id} value={String(level.id)}>{level.display_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-course">
                Curso
              </label>
              <select
                id="workshop-course"
                className={`fieldInput mb-0 ${courseAlreadyRegistered ? 'border-red-400' : ''}`}
                value={workshopForm.school_course_id}
                disabled={lockCourse}
                onChange={(e) => setWorkshopForm({ ...workshopForm, school_course_id: e.target.value })}
                required
                aria-invalid={courseAlreadyRegistered}
                aria-describedby={courseAlreadyRegistered ? 'workshop-course-error' : undefined}
              >
                <option value="">Curso</option>
                {availableCourses.map((course) => {
                  const alreadyHasWorkshops = existingCourses.some((item) => String(item.id) === String(course.id))
                  return (
                    <option key={course.id} value={String(course.id)}>
                      {alreadyHasWorkshops ? `${course.display_name} (ya tiene talleres)` : course.display_name}
                    </option>
                  )
                })}
              </select>
              {courseAlreadyRegistered ? (
                <div id="workshop-course-error" className="mt-2 rounded-[5px] border border-amber-200 bg-amber-50 px-3 py-2" role="alert">
                  <p className="text-xs text-amber-800">
                    Este curso ya está en tu listado y cuenta con {workshopsCount} {workshopsCount === 1 ? 'taller' : 'talleres'}. Entra al curso para registrar otro taller y evita duplicarlo aquí.
                  </p>
                  {onOpenExistingCourse ? (
                    <button
                      type="button"
                      className="actionButton mt-2"
                      onClick={() => onOpenExistingCourse(existingCourse)}
                    >
                      Ir a este curso
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-objective">
                Objetivo
              </label>
              <input
                id="workshop-objective"
                className="fieldInput mb-0"
                placeholder="Objetivo del taller"
                value={workshopForm.objective}
                onChange={(e) => setWorkshopForm({ ...workshopForm, objective: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-description">
                Descripción
              </label>
              <textarea
                id="workshop-description"
                className="fieldInput mb-0 min-h-24"
                rows={4}
                placeholder="Descripción del taller"
                value={workshopForm.description}
                onChange={(e) => setWorkshopForm({ ...workshopForm, description: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-held-on">
                Fecha de realización
              </label>
              <input
                id="workshop-held-on"
                type="date"
                className="fieldInput mb-0"
                value={workshopForm.held_on}
                onChange={(e) => setWorkshopForm({ ...workshopForm, held_on: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-file">
                Material (PPT o PDF)
              </label>
              <input
                id="workshop-file"
                type="file"
                accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="fieldInput mb-0 pt-2 text-sm"
                onChange={(e) => setWorkshopForm({ ...workshopForm, file: e.target.files?.[0] || null })}
              />
              {editingWorkshop?.has_material && !workshopForm.file ? (
                <p className="mt-1 text-xs text-slate-500">
                  Archivo actual: {editingWorkshop.original_name || editingWorkshop.stored_name}. Sube otro para reemplazarlo.
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button type="button" className="actionButton" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="actionButton actionButtonPrimary" disabled={saving || courseAlreadyRegistered}>
              {saving ? 'Guardando…' : 'Guardar taller'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
