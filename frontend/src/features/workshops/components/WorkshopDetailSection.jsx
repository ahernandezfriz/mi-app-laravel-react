import { useState } from 'react'
import WorkshopFormModal from './WorkshopFormModal'

function formatFileSize(bytes) {
  const size = Number(bytes || 0)
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export default function WorkshopDetailSection({
  workshop,
  formatDisplayDate,
  onBack,
  onEditWorkshop,
  onDeleteWorkshop,
  onDownloadWorkshop,
  workshopForm,
  setWorkshopForm,
  levels,
  editingWorkshopId,
  setEditingWorkshopId,
  onSaveWorkshop,
  savingWorkshop,
  mediaLibraryItems = [],
}) {
  const [showModal, setShowModal] = useState(false)
  const urls = Array.isArray(workshop.urls) ? workshop.urls : []
  const courseName = workshop.course?.display_name || 'Sin curso'
  const levelName = workshop.course?.level?.display_name || ''
  const courseLine = [courseName, levelName].filter(Boolean).join(' · ')
  const heldOn = formatDisplayDate(workshop.held_on)

  function onOpenEditModal() {
    onEditWorkshop(workshop)
    setShowModal(true)
  }

  function onCloseModal() {
    setShowModal(false)
    setEditingWorkshopId(null)
  }

  async function onSubmit(event) {
    const saved = await onSaveWorkshop(event)
    if (saved) {
      setShowModal(false)
    }
  }

  async function onConfirmDelete() {
    const deleted = await onDeleteWorkshop(workshop.id)
    if (deleted) {
      onBack()
    }
  }

  return (
    <section className="space-y-4">
      <section className="sectionCard">
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="actionButton" onClick={onBack}>
            Volver a talleres
          </button>
          <button type="button" className="actionButton" onClick={onOpenEditModal}>
            Editar
          </button>
          <button type="button" className="actionButton" onClick={onConfirmDelete}>
            Eliminar
          </button>
        </div>

        <p className="text-sm text-slate-500">
          {courseLine} · {heldOn}
        </p>
        <h2 className="sectionTitle mb-0 mt-1">{workshop.name}</h2>

        <div className="mt-4 space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objetivo</h3>
            <p className="mt-1 text-sm text-slate-700">{workshop.objective || 'Sin objetivo'}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{workshop.description || 'Sin descripción'}</p>
          </div>
        </div>

        <hr className="my-5 border-slate-200" />

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">URLs</h3>
        {urls.length === 0 ? (
          <p className="text-sm text-slate-500">Este taller no tiene URLs asociadas.</p>
        ) : (
          <ul className="space-y-2">
            {urls.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-sm font-medium text-[#6e62e5] underline-offset-2 hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        )}

        <hr className="my-5 border-slate-200" />

        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Archivos</h3>
        {workshop.has_material ? (
          <div className="flex flex-col gap-3 rounded-[5px] border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">{workshop.original_name || workshop.stored_name}</p>
              <p className="mt-1 text-xs text-slate-500">
                {[workshop.mime_type, formatFileSize(workshop.size_bytes)].filter(Boolean).join(' · ')}
              </p>
            </div>
            <button type="button" className="actionButton actionButtonPrimary" onClick={() => onDownloadWorkshop(workshop)}>
              Descargar
            </button>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Este taller no tiene un archivo adjunto.</p>
        )}
      </section>

      <WorkshopFormModal
        open={showModal}
        title="Editar taller"
        subtitle={`El taller se registrará en ${courseName}.`}
        workshopForm={workshopForm}
        setWorkshopForm={setWorkshopForm}
        levels={levels}
        lockCourse
        editingWorkshop={workshop}
        onClose={onCloseModal}
        onSubmit={onSubmit}
        saving={savingWorkshop}
        mediaLibraryItems={mediaLibraryItems}
      />
    </section>
  )
}
