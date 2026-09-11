import { useState } from 'react'
import WorkshopFormModal from './WorkshopFormModal'

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
  onDownloadWorkshop,
  formatDisplayDate,
  savingWorkshop,
}) {
  const [showModal, setShowModal] = useState(false)

  function prefilledForm(extra = {}) {
    return {
      name: '',
      objective: '',
      description: '',
      held_on: extra.held_on,
      school_level_id: String(selectedWorkshopCourse?.school_level_id || selectedWorkshopCourse?.level?.id || ''),
      school_course_id: String(selectedWorkshopCourse?.id || ''),
      file: null,
      ...extra,
    }
  }

  function onOpenCreateModal() {
    setEditingWorkshopId(null)
    setWorkshopForm((prev) => prefilledForm({ held_on: prev.held_on }))
    setShowModal(true)
  }

  function onOpenEditModal(workshop) {
    onEditWorkshop(workshop)
    setShowModal(true)
  }

  function onCloseModal() {
    setShowModal(false)
    setEditingWorkshopId(null)
    setWorkshopForm((prev) => prefilledForm({ held_on: prev.held_on }))
  }

  async function onSubmit(event) {
    const saved = await onSaveWorkshop(event)
    if (saved) {
      setShowModal(false)
    }
  }

  const editingWorkshop = workshops.find((workshop) => workshop.id === editingWorkshopId) || null

  return (
    <section className="sectionCard">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="sectionTitle mb-0">Talleres de {selectedWorkshopCourse?.display_name || 'curso'}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {selectedWorkshopCourse?.level?.display_name ? `${selectedWorkshopCourse.level.display_name} · ` : ''}
            Historial de talleres realizados en este curso.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="actionButton" onClick={onBackToCourses}>
            Volver a cursos
          </button>
          <button type="button" className="actionButton actionButtonPrimary" onClick={onOpenCreateModal}>
            Nuevo taller
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-[5px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Nombre</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Objetivo</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Descripción</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Fecha</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Material</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workshops.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={6}>
                  Este curso aún no tiene talleres. Crea el primero desde aquí.
                </td>
              </tr>
            ) : (
              workshops.map((workshop) => (
                <tr key={workshop.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 text-slate-700">{workshop.name}</td>
                  <td className="px-3 py-3 text-slate-700">{workshop.objective || 'Sin objetivo'}</td>
                  <td className="px-3 py-3 text-slate-700">{workshop.description || 'Sin descripción'}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDisplayDate(workshop.held_on)}</td>
                  <td className="px-3 py-3 text-slate-700">
                    {workshop.has_material ? (workshop.original_name || workshop.stored_name) : 'Sin archivo'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      {workshop.has_material ? (
                        <button type="button" className="actionButton" onClick={() => onDownloadWorkshop(workshop)}>
                          Descargar
                        </button>
                      ) : null}
                      <button type="button" className="actionButton" onClick={() => onOpenEditModal(workshop)}>
                        Editar
                      </button>
                      <button type="button" className="actionButton" onClick={() => onDeleteWorkshop(workshop.id)}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <WorkshopFormModal
        open={showModal}
        title={editingWorkshopId ? 'Editar taller' : 'Nuevo taller'}
        subtitle={`El taller se registrará en ${selectedWorkshopCourse?.display_name || 'este curso'}.`}
        workshopForm={workshopForm}
        setWorkshopForm={setWorkshopForm}
        levels={levels}
        lockCourse
        editingWorkshop={editingWorkshop}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        saving={savingWorkshop}
      />
    </section>
  )
}
