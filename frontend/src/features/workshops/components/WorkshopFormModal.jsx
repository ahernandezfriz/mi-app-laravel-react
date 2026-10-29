import { useEffect, useRef, useState } from 'react'
import { IconActionButton } from '../../../shared/components/ActionButtonIcons'
import { findWorkshopCourseForYear, workshopCourseLabel, workshopHeldYear } from '../workshopCourseLabel'

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

function FieldLabel({ htmlFor, required = false, children }) {
  return (
    <label className="mb-1 flex flex-wrap items-baseline gap-x-2 text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor={htmlFor}>
      <span>{children}</span>
      <span className={`normal-case tracking-normal ${required ? 'font-semibold text-violet-700' : 'font-medium text-slate-400'}`}>
        {required ? 'Obligatorio' : 'Opcional'}
      </span>
    </label>
  )
}

function FieldMessage({ id, message, type = 'error' }) {
  if (!message) return null
  const styles = type === 'warn'
    ? 'text-amber-800'
    : 'text-red-600'
  return (
    <p id={id} className={`mt-1 text-xs ${styles}`} role="alert">
      {message}
    </p>
  )
}

function fieldClass(hasError, hasWarn = false) {
  if (hasError) return 'fieldInput fieldInputError mb-0'
  if (hasWarn) return 'fieldInput fieldInputWarn mb-0'
  return 'fieldInput mb-0'
}

function SavingLabel() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="savingSpinner" aria-hidden="true" />
      <span>
        Guardando
        <span className="savingDots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </span>
    </span>
  )
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
  submitError = '',
  onClearError,
  mediaLibraryItems = [],
}) {
  const [draftUrl, setDraftUrl] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [fileSource, setFileSource] = useState('upload')
  const [libraryQuery, setLibraryQuery] = useState('')
  const wasOpen = useRef(false)

  useEffect(() => {
    if (open && !wasOpen.current) {
      setFileSource(workshopForm.media_library_item_id ? 'library' : 'upload')
      setLibraryQuery('')
      setFieldErrors({})
      setDraftUrl('')
      onClearError?.()
    }
    wasOpen.current = open
  }, [open])

  if (!open) return null

  const selectedLevel = levels.find((level) => String(level.id) === String(workshopForm.school_level_id))
  const availableCourses = selectedLevel?.courses ?? []
  const existingCourse = !lockCourse && workshopForm.school_course_id
    ? findWorkshopCourseForYear(
      existingCourses,
      workshopForm.school_course_id,
      workshopHeldYear(workshopForm.held_on),
    )
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

  function clearField(name) {
    setFieldErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev))
  }

  function updateForm(patch, fieldName) {
    setWorkshopForm({ ...workshopForm, ...patch })
    if (fieldName) clearField(fieldName)
    onClearError?.()
  }

  function handleSubmit(event) {
    event.preventDefault()
    const nextErrors = {}
    if (courseAlreadyRegistered) {
      nextErrors.school_course_id = `${workshopCourseLabel(existingCourse)} ya está en tu listado. Entra a ese curso para registrar otro taller.`
    }
    if (!String(workshopForm.name || '').trim()) {
      nextErrors.name = 'El nombre del taller es obligatorio.'
    }
    if (!lockCourse && !workshopForm.school_level_id) {
      nextErrors.school_level_id = 'El nivel es obligatorio.'
    }
    if (!workshopForm.school_course_id) {
      nextErrors.school_course_id = 'El curso es obligatorio.'
    }
    if (!workshopForm.held_on) {
      nextErrors.held_on = 'La fecha de realización es obligatoria.'
    }
    const nextFileError = getWorkshopFileError(workshopForm.file)
    if (nextFileError) {
      nextErrors.file = nextFileError
    }
    const pendingUrl = draftUrl.trim()
    let nextUrls = urls
    if (pendingUrl) {
      if (!isValidHttpUrl(pendingUrl)) {
        nextErrors.url = 'Ingresa una URL válida, por ejemplo https://ejemplo.cl/recurso.'
      } else if (!urls.includes(pendingUrl)) {
        nextUrls = [...urls, pendingUrl]
        setWorkshopForm({ ...workshopForm, urls: nextUrls })
      }
      if (!nextErrors.url) {
        setDraftUrl('')
      }
    }
    if (Object.values(nextErrors).some(Boolean)) {
      setFieldErrors(nextErrors)
      return
    }
    setFieldErrors({})
    onSubmit(event, { urls: nextUrls })
  }

  function onAddUrl() {
    const nextUrl = draftUrl.trim()
    if (!nextUrl) {
      setFieldErrors((prev) => ({ ...prev, url: 'Ingresa una URL.' }))
      return
    }
    if (!isValidHttpUrl(nextUrl)) {
      setFieldErrors((prev) => ({ ...prev, url: 'Ingresa una URL válida, por ejemplo https://ejemplo.cl/recurso.' }))
      return
    }
    if (urls.some((url) => url === nextUrl)) {
      setFieldErrors((prev) => ({ ...prev, url: 'Esta URL ya fue agregada.' }))
      return
    }
    setWorkshopForm({ ...workshopForm, urls: [...urls, nextUrl] })
    setDraftUrl('')
    clearField('url')
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
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-[5px] border border-slate-200 bg-white shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-4">
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
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
          <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto px-5 py-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <FieldLabel htmlFor="workshop-name" required>Nombre del taller</FieldLabel>
              <input
                id="workshop-name"
                className={fieldClass(Boolean(fieldErrors.name))}
                placeholder="Nombre del taller"
                value={workshopForm.name}
                onChange={(e) => updateForm({ name: e.target.value }, 'name')}
                maxLength={255}
                required
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'workshop-name-error' : undefined}
              />
              <FieldMessage id="workshop-name-error" message={fieldErrors.name} />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="workshop-objective">Objetivo del taller</FieldLabel>
              <input
                id="workshop-objective"
                className="fieldInput mb-0"
                placeholder="Objetivo del taller"
                value={workshopForm.objective}
                onChange={(e) => updateForm({ objective: e.target.value })}
                maxLength={255}
              />
            </div>
            <div className="md:col-span-2">
              <FieldLabel htmlFor="workshop-description">Descripción del taller</FieldLabel>
              <textarea
                id="workshop-description"
                className="fieldInput mb-0 min-h-24"
                rows={4}
                placeholder="Descripción del taller"
                value={workshopForm.description}
                onChange={(e) => updateForm({ description: e.target.value })}
              />
            </div>
            <div className={`md:col-span-2 grid gap-3 ${lockCourse ? '' : 'md:grid-cols-3'}`}>
              {lockCourse ? null : (
                <>
                  <div>
                    <FieldLabel htmlFor="workshop-level" required>Nivel</FieldLabel>
                    <select
                      id="workshop-level"
                      className={fieldClass(Boolean(fieldErrors.school_level_id))}
                      value={workshopForm.school_level_id}
                      onChange={(e) => updateForm({
                        school_level_id: e.target.value,
                        school_course_id: '',
                      }, 'school_level_id')}
                      required
                      aria-invalid={Boolean(fieldErrors.school_level_id)}
                      aria-describedby={fieldErrors.school_level_id ? 'workshop-level-error' : undefined}
                    >
                      <option value="">Selecciona el nivel</option>
                      {levels.map((level) => (
                        <option key={level.id} value={String(level.id)}>{level.display_name}</option>
                      ))}
                    </select>
                    <FieldMessage id="workshop-level-error" message={fieldErrors.school_level_id} />
                  </div>
                  <div>
                    <FieldLabel htmlFor="workshop-course" required>Curso</FieldLabel>
                    <select
                      id="workshop-course"
                      className={fieldClass(Boolean(fieldErrors.school_course_id), courseAlreadyRegistered)}
                      value={workshopForm.school_course_id}
                      onChange={(e) => updateForm({ school_course_id: e.target.value }, 'school_course_id')}
                      required
                      aria-invalid={courseAlreadyRegistered || Boolean(fieldErrors.school_course_id)}
                      aria-describedby={courseAlreadyRegistered || fieldErrors.school_course_id ? 'workshop-course-error' : undefined}
                    >
                      <option value="">Selecciona el curso</option>
                      {availableCourses.map((course) => {
                        const alreadyHasWorkshops = Boolean(findWorkshopCourseForYear(
                          existingCourses,
                          course.id,
                          workshopHeldYear(workshopForm.held_on),
                        ))
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
                          {workshopCourseLabel(existingCourse)} ya está en tu listado y cuenta con {workshopsCount} {workshopsCount === 1 ? 'taller' : 'talleres'}. Entra a ese curso para registrar otro taller.
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
                    ) : (
                      <FieldMessage id="workshop-course-error" message={fieldErrors.school_course_id} />
                    )}
                  </div>
                </>
              )}
              <div>
                <FieldLabel htmlFor="workshop-held-on" required>Fecha de realización</FieldLabel>
                <input
                  id="workshop-held-on"
                  type="date"
                  className={fieldClass(Boolean(fieldErrors.held_on))}
                  value={workshopForm.held_on}
                  onChange={(e) => updateForm({ held_on: e.target.value }, 'held_on')}
                  required
                  aria-invalid={Boolean(fieldErrors.held_on)}
                  aria-describedby={fieldErrors.held_on ? 'workshop-held-on-error' : undefined}
                />
                <FieldMessage id="workshop-held-on-error" message={fieldErrors.held_on} />
              </div>
            </div>
            <div className="md:col-span-2 mt-6">
              <FieldLabel htmlFor={fileSource === 'upload' ? 'workshop-file' : 'workshop-library-search'}>
                Archivo del taller
              </FieldLabel>
              <div className="mb-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`actionButton ${fileSource === 'upload' ? 'actionButtonPrimary' : ''}`}
                  onClick={() => {
                    setFileSource('upload')
                    updateForm({ media_library_item_id: '' })
                  }}
                >
                  Subir archivo
                </button>
                <button
                  type="button"
                  className={`actionButton ${fileSource === 'library' ? 'actionButtonPrimary' : ''}`}
                  onClick={() => {
                    setFileSource('library')
                    updateForm({ file: null }, 'file')
                  }}
                >
                  Buscar en biblioteca
                </button>
              </div>
              {fileSource === 'upload' ? (
                <>
                  <input
                    id="workshop-file"
                    type="file"
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp,.gif,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    className={`${fieldClass(Boolean(fieldErrors.file))} pt-2 text-sm`}
                    onChange={(e) => {
                      const nextFile = e.target.files?.[0] || null
                      setWorkshopForm({ ...workshopForm, file: nextFile, media_library_item_id: '' })
                      setFieldErrors((prev) => ({ ...prev, file: getWorkshopFileError(nextFile) }))
                    }}
                    aria-invalid={Boolean(fieldErrors.file)}
                    aria-describedby={fieldErrors.file ? 'workshop-file-error' : 'workshop-file-help'}
                  />
                  <FieldMessage id="workshop-file-error" message={fieldErrors.file} />
                  <p id="workshop-file-help" className="mt-1 text-xs text-slate-500">
                    El archivo también quedará disponible en Biblioteca de medios.
                  </p>
                </>
              ) : (
                <>
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
                        onClick={() => updateForm({ media_library_item_id: '' })}
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
                              onClick={() => updateForm({
                                media_library_item_id: String(item.id),
                                file: null,
                              }, 'file')}
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
              <FieldLabel htmlFor="workshop-url">URLs del taller</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="workshop-url"
                  className={fieldClass(Boolean(fieldErrors.url))}
                  placeholder="https://ejemplo.cl/recurso"
                  value={draftUrl}
                  onChange={(e) => {
                    setDraftUrl(e.target.value)
                    clearField('url')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      onAddUrl()
                    }
                  }}
                  aria-invalid={Boolean(fieldErrors.url)}
                  aria-describedby={fieldErrors.url ? 'workshop-url-error' : 'workshop-url-help'}
                />
                <button type="button" className="actionButton" onClick={onAddUrl}>
                  Agregar URL
                </button>
              </div>
              <FieldMessage id="workshop-url-error" message={fieldErrors.url} />
              {urls.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {urls.map((url) => (
                    <li key={url} className="flex items-center justify-between gap-2 rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                      <span className="truncate text-slate-700">{url}</span>
                      <IconActionButton
                        variant="delete"
                        label="Eliminar"
                        onClick={() => onRemoveUrl(url)}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p id="workshop-url-help" className="mt-2 text-xs text-slate-500">Puedes agregar enlaces relacionados con el taller.</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            {submitError ? (
              <p className="text-sm text-red-600" role="alert">{submitError}</p>
            ) : (
              <span className="hidden sm:block" />
            )}
            <div className="flex items-center justify-end gap-2">
              <button type="button" className="actionButton" onClick={onClose} disabled={saving}>
                Cancelar
              </button>
              <button
                type="submit"
                className="actionButton actionButtonPrimary inline-flex min-w-[10.5rem] items-center justify-center"
                disabled={saving || courseAlreadyRegistered}
                aria-busy={saving}
              >
                {saving ? <SavingLabel /> : 'Guardar taller'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
