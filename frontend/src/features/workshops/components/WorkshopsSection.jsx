import { useEffect, useState } from 'react'
import { ButtonLabel, PlusIcon } from '../../../shared/components/ActionButtonIcons'
import WorkshopFormModal from './WorkshopFormModal'
import {
  defaultHeldOnForWorkshopYear,
  findWorkshopCourseForYear,
  sortNewestFirst,
  workshopCourseKey,
  workshopCourseLabel,
  workshopHeldYear,
} from '../workshopCourseLabel'
import { useFreshRowFlash } from '../useFreshRowFlash'

const PAGE_SIZE = 10

export default function WorkshopsSection({
  workshopCourses,
  levels,
  workshopForm,
  setWorkshopForm,
  onSaveWorkshop,
  onOpenCourse,
  formatDisplayDate,
  savingWorkshop,
  submitError = '',
  onClearSubmitError,
  mediaLibraryItems = [],
}) {
  const [showModal, setShowModal] = useState(false)
  const [lockCourse, setLockCourse] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [freshCourseKey, setFreshCourseKey] = useState(null)
  const { isFlashing, triggerFlash, freshStyle } = useFreshRowFlash()

  useEffect(() => {
    if (!isFlashing) {
      setFreshCourseKey(null)
    }
  }, [isFlashing])

  function resetCreateForm(overrides = {}) {
    setWorkshopForm((prev) => ({
      ...prev,
      name: '',
      objective: '',
      description: '',
      school_level_id: '',
      school_course_id: '',
      file: null,
      media_library_item_id: '',
      urls: [],
      fromExistingCourse: false,
      ...overrides,
    }))
  }

  function onOpenCreateModal() {
    setLockCourse(false)
    resetCreateForm()
    setShowModal(true)
  }

  function onOpenAddForCourse(course) {
    setLockCourse(true)
    resetCreateForm({
      school_level_id: String(course.school_level_id || course.level?.id || ''),
      school_course_id: String(course.id),
      held_on: defaultHeldOnForWorkshopYear(course),
      fromExistingCourse: true,
    })
    setShowModal(true)
  }

  function onOpenExistingCourse(course) {
    setShowModal(false)
    setLockCourse(false)
    onOpenCourse(course)
  }

  async function onSubmit(event, overrides) {
    if (!lockCourse) {
      const alreadyRegistered = Boolean(findWorkshopCourseForYear(
        workshopCourses,
        workshopForm.school_course_id,
        workshopHeldYear(workshopForm.held_on),
      ))
      if (alreadyRegistered) {
        return
      }
    }
    const creatingNewCourse = !lockCourse
    const createdCourseKey = creatingNewCourse
      ? `${workshopForm.school_course_id}-${workshopHeldYear(workshopForm.held_on) || ''}`
      : null
    const saved = await onSaveWorkshop(event, overrides)
    if (saved) {
      setShowModal(false)
      setLockCourse(false)
      if (createdCourseKey) {
        setFreshCourseKey(createdCourseKey)
        triggerFlash()
      }
    }
  }

  const orderedCourses = sortNewestFirst(workshopCourses, 'last_held_on')
  const totalPages = Math.max(1, Math.ceil(orderedCourses.length / PAGE_SIZE))
  const freshIndex = freshCourseKey
    ? orderedCourses.findIndex((course) => workshopCourseKey(course) === freshCourseKey)
    : -1
  const freshPage = freshIndex >= 0 ? Math.floor(freshIndex / PAGE_SIZE) + 1 : 1
  const safePage = Math.min(Math.max(currentPage, 1), totalPages)
  const visiblePage = freshCourseKey && isFlashing ? Math.min(freshPage, totalPages) : safePage
  const pageStart = (visiblePage - 1) * PAGE_SIZE
  const paginatedCourses = orderedCourses.slice(pageStart, pageStart + PAGE_SIZE)

  useEffect(() => {
    if (freshCourseKey && isFlashing && freshPage !== currentPage) {
      setCurrentPage(freshPage)
    }
  }, [freshCourseKey, isFlashing, freshPage, currentPage])

  useEffect(() => {
    if (!isFlashing || !freshCourseKey) return
    const row = document.querySelector(`[data-course-key="${CSS.escape(freshCourseKey)}"]`)
    row?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [isFlashing, freshCourseKey, visiblePage])

  const lockedCourseLabel = workshopCourseLabel(
    findWorkshopCourseForYear(
      workshopCourses,
      workshopForm.school_course_id,
      workshopHeldYear(workshopForm.held_on),
    ) || {
      display_name: workshopCourses.find((course) => String(course.id) === String(workshopForm.school_course_id))?.display_name,
      year: workshopHeldYear(workshopForm.held_on),
    },
  )

  return (
    <section className="sectionCard">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="sectionTitle mb-0">Talleres</h2>
          <p className="mt-1 text-sm text-slate-500">
            Cursos donde ya registraste talleres. El primer taller de un curso nuevo se crea eligiendo Nivel y Curso.
          </p>
        </div>
        <button type="button" className="actionButton actionButtonPrimary" onClick={onOpenCreateModal}>
          <ButtonLabel icon={<PlusIcon />}>Nuevo taller</ButtonLabel>
        </button>
      </div>

      <div className="overflow-x-auto rounded-[5px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-bold text-slate-900">Curso</th>
              <th className="px-3 py-3 text-left font-bold text-slate-900">Última fecha</th>
              <th className="px-3 py-3 text-right font-bold text-slate-900">Opciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orderedCourses.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={3}>
                  Aún no hay talleres. Crea el primero para que el curso quede en este listado.
                </td>
              </tr>
            ) : (
              paginatedCourses.map((course) => {
                const isFresh = isFlashing && workshopCourseKey(course) === freshCourseKey
                return (
                <tr key={workshopCourseKey(course)} data-course-key={workshopCourseKey(course)}>
                  <td className="px-3 py-3 align-middle text-slate-700" style={freshStyle(isFresh, true)}>
                    <button
                      type="button"
                      className="text-left font-semibold text-slate-800 underline-offset-2 hover:text-[#6e62e5] hover:underline"
                      onClick={() => onOpenCourse(course)}
                    >
                      {workshopCourseLabel(course)}
                    </button>
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-700" style={freshStyle(isFresh)}>
                    {formatDisplayDate(course.last_held_on)}
                  </td>
                  <td className="px-3 py-3 align-middle" style={freshStyle(isFresh)}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" className="actionButton" onClick={() => onOpenAddForCourse(course)}>
                        <ButtonLabel icon={<PlusIcon />}>Agregar taller</ButtonLabel>
                      </button>
                      <button type="button" className="actionButton" onClick={() => onOpenCourse(course)}>
                        {`Ver talleres (${course.workshops_count ?? 0})`}
                      </button>
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {orderedCourses.length > PAGE_SIZE && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Página {visiblePage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="actionButton"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={visiblePage === 1}
            >
              Anterior
            </button>
            <button
              type="button"
              className="actionButton"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={visiblePage === totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <WorkshopFormModal
        open={showModal}
        title="Nuevo taller"
        subtitle={lockCourse
          ? `El taller se registrará en ${lockedCourseLabel}.`
          : 'Elige el curso del mismo listado que usas al crear un estudiante.'}
        workshopForm={workshopForm}
        setWorkshopForm={setWorkshopForm}
        levels={levels}
        lockCourse={lockCourse}
        editingWorkshop={null}
        existingCourses={lockCourse ? [] : workshopCourses}
        onOpenExistingCourse={onOpenExistingCourse}
        onClose={() => {
          setShowModal(false)
          setLockCourse(false)
        }}
        onSubmit={onSubmit}
        saving={savingWorkshop}
        submitError={submitError}
        onClearError={onClearSubmitError}
        mediaLibraryItems={mediaLibraryItems}
      />
    </section>
  )
}
