import { useState } from 'react'
import WorkshopFormModal from './WorkshopFormModal'

export default function WorkshopsSection({
  workshopCourses,
  levels,
  workshopForm,
  setWorkshopForm,
  onSaveWorkshop,
  onOpenCourse,
  formatDisplayDate,
  savingWorkshop,
  mediaLibraryItems = [],
}) {
  const [showModal, setShowModal] = useState(false)
  const [lockCourse, setLockCourse] = useState(false)

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
      fromExistingCourse: true,
    })
    setShowModal(true)
  }

  function onOpenExistingCourse(course) {
    setShowModal(false)
    setLockCourse(false)
    onOpenCourse(course)
  }

  async function onSubmit(event) {
    if (!lockCourse) {
      const alreadyRegistered = workshopCourses.some(
        (course) => String(course.id) === String(workshopForm.school_course_id),
      )
      if (alreadyRegistered) {
        return
      }
    }
    const saved = await onSaveWorkshop(event)
    if (saved) {
      setShowModal(false)
      setLockCourse(false)
    }
  }

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
          Nuevo taller
        </button>
      </div>

      <div className="overflow-x-auto rounded-[5px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Curso</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Nivel</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Talleres</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Última fecha</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workshopCourses.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-500" colSpan={5}>
                  Aún no hay talleres. Crea el primero para que el curso quede en este listado.
                </td>
              </tr>
            ) : (
              workshopCourses.map((course) => (
                <tr key={course.id} className="hover:bg-slate-50">
                  <td className="px-3 py-3 text-slate-700">{course.display_name}</td>
                  <td className="px-3 py-3 text-slate-700">{course.level?.display_name || '-'}</td>
                  <td className="px-3 py-3 text-slate-700">{course.workshops_count ?? 0}</td>
                  <td className="px-3 py-3 text-slate-700">{formatDisplayDate(course.last_held_on)}</td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" className="actionButton" onClick={() => onOpenAddForCourse(course)}>
                        Agregar taller
                      </button>
                      <button type="button" className="actionButton" onClick={() => onOpenCourse(course)}>
                        Ver talleres
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
        title="Nuevo taller"
        subtitle={lockCourse
          ? `El taller se registrará en ${workshopCourses.find((course) => String(course.id) === String(workshopForm.school_course_id))?.display_name || 'este curso'}.`
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
        mediaLibraryItems={mediaLibraryItems}
      />
    </section>
  )
}
