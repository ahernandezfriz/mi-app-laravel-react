import { useEffect, useState } from 'react'
import { BackIcon, ButtonLabel, IconActionButton, PlusIcon, ViewIcon } from '../../../shared/components/ActionButtonIcons'
import WorkshopFormModal from './WorkshopFormModal'
import { defaultHeldOnForWorkshopYear, sortNewestFirst, workshopCourseLabel } from '../workshopCourseLabel'
import { useFreshRowFlash } from '../useFreshRowFlash'

const PAGE_SIZE = 10

export default function WorkshopCourseSection({
  selectedWorkshopCourse,
  workshops,
  levels,
  workshopForm,
  setWorkshopForm,
  editingWorkshopId,
  setEditingWorkshopId,
  onBackToCourses,
  onSaveWorkshop,
  onEditWorkshop,
  onDeleteWorkshop,
  onViewWorkshop,
  formatDisplayDate,
  savingWorkshop,
  submitError = '',
  onClearSubmitError,
  mediaLibraryItems = [],
}) {
  const [showModal, setShowModal] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const { isFlashing, triggerFlash, freshStyle } = useFreshRowFlash()

  useEffect(() => {
    setCurrentPage(1)
  }, [selectedWorkshopCourse?.id, selectedWorkshopCourse?.year])

  function prefilledForm(extra = {}) {
    return {
      name: '',
      objective: '',
      description: '',
      held_on: extra.held_on || defaultHeldOnForWorkshopYear(selectedWorkshopCourse),
      school_level_id: String(selectedWorkshopCourse?.school_level_id || selectedWorkshopCourse?.level?.id || ''),
      school_course_id: String(selectedWorkshopCourse?.id || ''),
      file: null,
      media_library_item_id: '',
      urls: [],
      fromExistingCourse: true,
      ...extra,
    }
  }

  function onOpenCreateModal() {
    setEditingWorkshopId(null)
    setWorkshopForm(prefilledForm())
    setShowModal(true)
  }

  function onOpenEditModal(workshop) {
    onEditWorkshop(workshop)
    setShowModal(true)
  }

  function onCloseModal() {
    setShowModal(false)
    setEditingWorkshopId(null)
    setWorkshopForm(prefilledForm())
  }

  async function onSubmit(event, overrides) {
    const wasCreate = !editingWorkshopId
    const saved = await onSaveWorkshop(event, overrides)
    if (saved) {
      setShowModal(false)
      setCurrentPage(1)
      if (wasCreate) {
        triggerFlash()
      }
    }
  }

  const editingWorkshop = workshops.find((workshop) => workshop.id === editingWorkshopId) || null
  const orderedWorkshops = sortNewestFirst(workshops, 'held_on')
  const courseTitle = workshopCourseLabel(selectedWorkshopCourse, orderedWorkshops)
  const totalPages = Math.max(1, Math.ceil(orderedWorkshops.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const pageStart = (safePage - 1) * PAGE_SIZE
  const paginatedWorkshops = orderedWorkshops.slice(pageStart, pageStart + PAGE_SIZE)

  return (
    <section className="sectionCard">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="sectionTitle mb-0">Talleres de {courseTitle}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Historial de talleres realizados en {courseTitle}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="actionButton" onClick={onBackToCourses}>
            <ButtonLabel icon={<BackIcon />}>Volver a cursos</ButtonLabel>
          </button>
          <button type="button" className="actionButton actionButtonPrimary" onClick={onOpenCreateModal}>
            <ButtonLabel icon={<PlusIcon />}>Nuevo taller</ButtonLabel>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[5px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-bold text-slate-900">Nombre</th>
              <th className="px-3 py-3 text-left font-bold text-slate-900">Objetivo</th>
              <th className="px-3 py-3 text-left font-bold text-slate-900">Fecha de realización</th>
              <th className="px-3 py-3 text-right font-bold text-slate-900">Opciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orderedWorkshops.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={4}>
                  Este curso aún no tiene talleres. Crea el primero desde aquí.
                </td>
              </tr>
            ) : (
              paginatedWorkshops.map((workshop, index) => {
                const isFresh = isFlashing && safePage === 1 && index === 0
                return (
                <tr key={workshop.id}>
                  <td className="px-3 py-3 align-middle text-slate-700" style={freshStyle(isFresh, true)}>
                    <button
                      type="button"
                      className="text-left font-semibold text-slate-800 underline-offset-2 hover:text-[#6e62e5] hover:underline"
                      onClick={() => onViewWorkshop(workshop)}
                    >
                      {workshop.name}
                    </button>
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-700" style={freshStyle(isFresh)}>
                    {workshop.objective || 'Sin objetivo'}
                  </td>
                  <td className="px-3 py-3 align-middle text-slate-700" style={freshStyle(isFresh)}>
                    {formatDisplayDate(workshop.held_on)}
                  </td>
                  <td className="px-3 py-3 align-middle" style={freshStyle(isFresh)}>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        className="actionButton actionButtonView"
                        onClick={() => onViewWorkshop(workshop)}
                      >
                        <ButtonLabel icon={<ViewIcon />}>Ver taller</ButtonLabel>
                      </button>
                      <IconActionButton
                        variant="edit"
                        label="Editar"
                        onClick={() => onOpenEditModal(workshop)}
                      />
                      <IconActionButton
                        variant="delete"
                        label="Eliminar"
                        onClick={() => onDeleteWorkshop(workshop)}
                      />
                    </div>
                  </td>
                </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {orderedWorkshops.length > PAGE_SIZE && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Página {safePage} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="actionButton"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safePage === 1}
            >
              Anterior
            </button>
            <button
              type="button"
              className="actionButton"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safePage === totalPages}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      <WorkshopFormModal
        open={showModal}
        title={editingWorkshopId ? 'Editar taller' : 'Nuevo taller'}
        subtitle={`El taller se registrará en ${courseTitle}.`}
        workshopForm={workshopForm}
        setWorkshopForm={setWorkshopForm}
        levels={levels}
        lockCourse
        editingWorkshop={editingWorkshop}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        saving={savingWorkshop}
        submitError={submitError}
        onClearError={onClearSubmitError}
        mediaLibraryItems={mediaLibraryItems}
      />
    </section>
  )
}
