import { useEffect, useState } from 'react'

const WORKSHOP_FILE_MAX_BYTES = 10 * 1024 * 1024
const WORKSHOP_FILE_EXTENSIONS = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp', 'gif']

function getWorkshopFileError(file) {
  if (!file) return ''
  const extension = String(file.name || '').split('.').pop()?.toLowerCase()
  if (!WORKSHOP_FILE_EXTENSIONS.includes(extension)) {
    return 'El archivo debe ser un documento o imagen (PDF, PPT, Word, Excel o imagen).'
  }
  if (file.size > WORKSHOP_FILE_MAX_BYTES) {
    return 'El archivo no puede superar 10 MB.'
  }
  return ''
}

function isValidHttpUrl(value) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
  mediaLibraryItems = [],
}) {
  const [draftUrl, setDraftUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [fileError, setFileError] = useState('')
  const [fileSource, setFileSource] = useState('upload')
  const [libraryQuery, setLibraryQuery] = useState('')

  useEffect(() => {
    if (!open) return
    setFileSource(workshopForm.media_library_item_id ? 'library' : 'upload')
    setLibraryQuery('')
    setFileError('')
    setDraftUrl('')
    setUrlError('')
  }, [open])

  if (!open) return null

  const selectedLevel = levels.find((level) => String(level.id) === String(workshopForm.school_level_id))
  const availableCourses = selectedLevel?.courses ?? []
  const existingCourse = !lockCourse && workshopForm.school_course_id
    ? existingCourses.find((course) => String(course.id) === String(workshopForm.school_course_id))
    : null
  const workshopsCount = Number(existingCourse?.workshops_count || 0)
  const courseAlreadyRegistered = Boolean(existingCourse)
  const urls = Array.isArray(workshopForm.urls) ? workshopForm.urls : []
  const selectedLibraryItem = mediaLibraryItems.find(
    (item) => String(item.id) === String(workshopForm.media_library_item_id),
  ) || null
  const libraryResults = mediaLibraryItems.filter((item) => {
    const query = libraryQuery.trim().toLowerCase()
    if (!query) return true
    return [item.title, item.stored_name, item.original_name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  function handleSubmit(event) {
    event.preventDefault()
    if (courseAlreadyRegistered) return
    const nextFileError = getWorkshopFileError(workshopForm.file)
    if (nextFileError) {
      setFileError(nextFileError)
      return
    }
    onSubmit(event)
  }

  function onAddUrl() {
    const nextUrl = draftUrl.trim()
    if (!nextUrl) {
      setUrlError('Ingresa una URL.')
      return
    }
    if (!isValidHttpUrl(nextUrl)) {
      setUrlError('Ingresa una URL válida, por ejemplo https://ejemplo.cl/recurso.')
      return
    }
    if (urls.some((url) => url === nextUrl)) {
      setUrlError('Esta URL ya fue agregada.')
      return
    }
    setWorkshopForm({ ...workshopForm, urls: [...urls, nextUrl] })
    setDraftUrl('')
    setUrlError('')
  }

  function onRemoveUrl(urlToRemove) {
    setWorkshopForm({
      ...workshopForm,
      urls: urls.filter((url) => url !== urlToRemove),
    })
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
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[5px] border border-slate-200 bg-white shadow-2xl"
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
                Nombre del taller
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
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-objective">
                Objetivo del taller
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
                Descripción del taller
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
            <div className={`md:col-span-2 grid gap-3 ${lockCourse ? '' : 'md:grid-cols-3'}`}>
              {lockCourse ? null : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-level">
                      Nivel
                    </label>
                    <select
                      id="workshop-level"
                      className="fieldInput mb-0"
                      value={workshopForm.school_level_id}
                      onChange={(e) => setWorkshopForm({
                        ...workshopForm,
                        school_level_id: e.target.value,
                        school_course_id: '',
                      })}
                      required
                    >
                      <option value="">Selecciona el nivel</option>
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
                      onChange={(e) => setWorkshopForm({ ...workshopForm, school_course_id: e.target.value })}
                      required
                      aria-invalid={courseAlreadyRegistered}
                      aria-describedby={courseAlreadyRegistered ? 'workshop-course-error' : undefined}
                    >
                      <option value="">Selecciona el curso</option>
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
                </>
              )}
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
            </div>
            <div className="md:col-span-2 mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Archivo del taller</p>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`actionButton ${fileSource === 'upload' ? 'actionButtonPrimary' : ''}`}
                  onClick={() => {
                    setFileSource('upload')
                    setWorkshopForm({ ...workshopForm, media_library_item_id: '' })
                  }}
                >
                  Subir archivo
                </button>
                <button
                  type="button"
                  className={`actionButton ${fileSource === 'library' ? 'actionButtonPrimary' : ''}`}
                  onClick={() => {
                    setFileSource('library')
                    setWorkshopForm({ ...workshopForm, file: null })
                    setFileError('')
                  }}
                >
                  Buscar en biblioteca
                </button>
              </div>
              {fileSource === 'upload' ? (
                <>
                  <label className="sr-only" htmlFor="workshop-file">Archivo del taller</label>
                  <input
                    id="workshop-file"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className="fieldInput mb-0 pt-2 text-sm"
                    onChange={(e) => {
                      const nextFile = e.target.files?.[0] || null
                      setFileError(getWorkshopFileError(nextFile))
                      setWorkshopForm({ ...workshopForm, file: nextFile, media_library_item_id: '' })
                    }}
                  />
                  {fileError ? <p className="mt-1 text-xs text-red-600">{fileError}</p> : null}
                  <p className="mt-1 text-xs text-slate-500">
                    El archivo también quedará disponible en Biblioteca de medios.
                  </p>
                </>
              ) : (
                <>
                  <label className="sr-only" htmlFor="workshop-library-search">Buscar en biblioteca de medios</label>
                  <input
                    id="workshop-library-search"
                    className="fieldInput mb-0"
                    placeholder="Buscar por título o nombre de archivo"
                    value={libraryQuery}
                    onChange={(e) => setLibraryQuery(e.target.value)}
                  />
                  {selectedLibraryItem ? (
                    <div className="mt-2 flex items-center justify-between gap-2 rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate text-slate-700">
                        {selectedLibraryItem.title || selectedLibraryItem.stored_name || selectedLibraryItem.original_name}
                      </span>
                      <button
                        type="button"
                        className="actionButton"
                        onClick={() => setWorkshopForm({ ...workshopForm, media_library_item_id: '' })}
                      >
                        Quitar
                      </button>
                    </div>
                  ) : null}
                  <ul className="mt-2 max-h-40 overflow-y-auto rounded-[5px] border border-slate-200">
                    {libraryResults.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-slate-500">
                        {mediaLibraryItems.length === 0
                          ? 'Aún no hay recursos en tu biblioteca.'
                          : 'No hay coincidencias para esa búsqueda.'}
                      </li>
                    ) : (
                      libraryResults.map((item) => {
                        const selected = String(item.id) === String(workshopForm.media_library_item_id)
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                                selected ? 'bg-violet-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                              }`}
                              onClick={() => setWorkshopForm({
                                ...workshopForm,
                                media_library_item_id: String(item.id),
                                file: null,
                              })}
                            >
                              <span className="truncate">{item.title || item.stored_name || item.original_name}</span>
                              <span className="shrink-0 text-xs text-slate-500">{item.stored_name || item.original_name}</span>
                            </button>
                          </li>
                        )
                      })
                    )}
                  </ul>
                </>
              )}
              {editingWorkshop?.has_material && !workshopForm.file && !workshopForm.media_library_item_id ? (
                <p className="mt-2 text-xs text-slate-500">
                  Archivo actual: {editingWorkshop.original_name || editingWorkshop.stored_name}. Elige otro para reemplazarlo.
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2 mt-6">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="workshop-url">
                URLs del taller
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="workshop-url"
                  className="fieldInput mb-0"
                  placeholder="https://ejemplo.cl/recurso"
                  value={draftUrl}
                  onChange={(e) => {
                    setDraftUrl(e.target.value)
                    setUrlError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onAddUrl()
                    }
                  }}
                />
                <button type="button" className="actionButton" onClick={onAddUrl}>
                  Agregar URL
                </button>
              </div>
              {urlError ? <p className="mt-1 text-xs text-red-600">{urlError}</p> : null}
              {urls.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {urls.map((url) => (
                    <li key={url} className="flex items-center justify-between gap-2 rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate text-slate-700">{url}</span>
                      <button type="button" className="actionButton" onClick={() => onRemoveUrl(url)}>
                        Eliminar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Aún no hay URLs asociadas. Agrégalas antes de guardar.</p>
              )}
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
