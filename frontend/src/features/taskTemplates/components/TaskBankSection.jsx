import { useState } from 'react'

export default function TaskBankSection({
  taskTemplateFilters,
  onTaskTemplateFilterChange,
  taskCategories,
  editingTemplateId,
  setEditingTemplateId,
  templateForm,
  setTemplateForm,
  onSaveTemplate,
  taskTemplates,
  onEditTemplate,
  onDeleteTemplate,
  onRestoreTemplate,
  onDuplicateTemplate,
  onToggleFavoriteTemplate,
  onViewTemplateHistory,
  taskHistory,
  formatDisplayDate,
  ratingOptions,
}) {
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  function onOpenCreateTemplateModal() {
    setEditingTemplateId(null)
    setTemplateForm({
      name: '',
      description: '',
      category: '',
      task_category_id: '',
      new_category_name: '',
      is_favorite: false,
      apply_to_pending_sessions: false,
    })
    setShowTemplateModal(true)
  }

  function onOpenEditTemplateModal(template) {
    onEditTemplate(template)
    setShowTemplateModal(true)
  }

  function onCloseTemplateModal() {
    setShowTemplateModal(false)
    setEditingTemplateId(null)
    setTemplateForm({
      name: '',
      description: '',
      category: '',
      task_category_id: '',
      new_category_name: '',
      is_favorite: false,
      apply_to_pending_sessions: false,
    })
  }

  async function onSubmitTemplateForm(event) {
    const saved = await onSaveTemplate(event)
    if (saved) {
      setShowTemplateModal(false)
    }
  }

  function formatTemplateDate(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleDateString('es-CL')
  }

  return (
    <section className="sectionCard">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="sectionTitle mb-0">Banco de tareas</h2>
          <p className="mt-1 text-sm text-slate-500">
            Mostrando <strong>{taskTemplates.length}</strong> tareas con los filtros actuales.
          </p>
        </div>
        <button type="button" className="actionButton actionButtonPrimary" onClick={onOpenCreateTemplateModal}>
          Crear tarea
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <input
          className="fieldInput mb-0"
          placeholder="Buscar tarea por nombre o descripcion"
          value={taskTemplateFilters.q}
          onChange={(e) => onTaskTemplateFilterChange('q', e.target.value)}
        />
        <select
          className="fieldInput mb-0"
          value={taskTemplateFilters.sort}
          onChange={(e) => onTaskTemplateFilterChange('sort', e.target.value)}
        >
          <option value="name">Ordenar por nombre</option>
          <option value="created_at">Ordenar por fecha de creacion</option>
        </select>
        <select
          className="fieldInput mb-0"
          value={taskTemplateFilters.direction}
          onChange={(e) => onTaskTemplateFilterChange('direction', e.target.value)}
        >
          <option value="asc">Ascendente</option>
          <option value="desc">Descendente</option>
        </select>
        <select
          className="fieldInput mb-0"
          value={taskTemplateFilters.category}
          onChange={(e) => onTaskTemplateFilterChange('category', e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {taskCategories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(taskTemplateFilters.favoritesOnly)}
            onChange={(e) => onTaskTemplateFilterChange('favoritesOnly', e.target.checked)}
          />
          Solo favoritas
        </label>
        <label className="flex items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(taskTemplateFilters.recentOnly)}
            onChange={(e) => onTaskTemplateFilterChange('recentOnly', e.target.checked)}
          />
          Solo recientes
        </label>
        <label className="flex items-center gap-2 rounded-[5px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={Boolean(taskTemplateFilters.includeArchived)}
            onChange={(e) => onTaskTemplateFilterChange('includeArchived', e.target.checked)}
          />
          Incluir archivadas
        </label>
      </div>

      <div className="overflow-x-auto rounded-[5px] border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Nombre</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Descripcion</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Categoria</th>
              <th className="px-3 py-3 text-left font-semibold text-slate-600">Creada</th>
              <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {taskTemplates.map((template) => (
              <tr key={template.id} className="hover:bg-slate-50">
                <td className="px-3 py-3 text-slate-700">
                  <div className="flex items-center gap-2">
                    <div>
                      <span>{template.name}</span>
                      <p className="text-xs text-slate-500">
                        Editada: {formatTemplateDate(template.updated_at)}{template.last_editor?.name ? ` por ${template.last_editor.name}` : ''}
                      </p>
                    </div>
                    <span className="relative inline-flex items-center">
                      <span
                        className="group inline-flex h-5 min-w-5 cursor-help items-center justify-center rounded-full border border-slate-300 bg-slate-100 px-1.5 text-xs font-semibold text-slate-600"
                        tabIndex={0}
                        aria-label={`Este recurso se esta utilizando ${template.session_tasks_count ?? 0} veces en sesiones`}
                      >
                        {template.session_tasks_count ?? 0}
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-[5px] bg-slate-900 px-2 py-1 text-xs font-normal text-white shadow-md group-hover:block group-focus-visible:block"
                        >
                          Este recurso se esta utilizando {template.session_tasks_count ?? 0} veces en sesiones
                        </span>
                      </span>
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-700">{template.description || 'Sin descripcion'}</td>
                <td className="px-3 py-3 text-slate-700">{template.category_ref?.name || '-'}</td>
                <td className="px-3 py-3 text-slate-700">{formatTemplateDate(template.created_at)}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="actionButton" onClick={() => onToggleFavoriteTemplate(template)}>
                      {template.is_favorite ? '★ Favorita' : '☆ Favorita'}
                    </button>
                    <button type="button" className="actionButton" onClick={() => onOpenEditTemplateModal(template)}>Editar</button>
                    <button type="button" className="actionButton" onClick={() => onDuplicateTemplate(template.id)}>Duplicar</button>
                    {template.archived_at ? (
                      <button type="button" className="actionButton" onClick={() => onRestoreTemplate(template.id)}>Restaurar</button>
                    ) : (
                      <button type="button" className="actionButton" onClick={() => onDeleteTemplate(template.id)}>Archivar</button>
                    )}
                    <button type="button" className="actionButton" onClick={() => onViewTemplateHistory(template.id)}>Ver historico</button>
                  </div>
                </td>
              </tr>
            ))}
            {taskTemplates.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                  No hay tareas para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showTemplateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onCloseTemplateModal()
            }
          }}
        >
          <div
            className="w-full max-w-2xl rounded-[5px] border border-slate-200 bg-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{editingTemplateId ? 'Editar tarea' : 'Crear tarea'}</h2>
                <p className="mt-1 text-sm text-slate-500">Completa los datos para guardar la tarea en tu banco reutilizable.</p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                onClick={onCloseTemplateModal}
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>
            <form onSubmit={onSubmitTemplateForm}>
              <div className="grid gap-3 px-5 py-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="template-name">
                    Nombre
                  </label>
                  <input
                    id="template-name"
                    className="fieldInput mb-0"
                    placeholder="Nombre de tarea"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="template-description">
                    Descripcion
                  </label>
                  <input
                    id="template-description"
                    className="fieldInput mb-0"
                    placeholder="Descripcion de tarea"
                    value={templateForm.description}
                    onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="template-category">
                    Categoria
                  </label>
                  <select
                    id="template-category"
                    className="fieldInput mb-0"
                    value={templateForm.task_category_id || ''}
                    onChange={(e) => setTemplateForm({ ...templateForm, task_category_id: e.target.value, new_category_name: '' })}
                  >
                    <option value="">Sin categoria</option>
                    {taskCategories.map((category) => (
                      <option key={category.id} value={String(category.id)}>
                        {category.name}
                      </option>
                    ))}
                    <option value="__new__">+ Crear nueva categoría</option>
                  </select>
                </div>
                {templateForm.task_category_id === '__new__' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="template-new-category">
                      Nueva categoría
                    </label>
                    <input
                      id="template-new-category"
                      className="fieldInput mb-0"
                      placeholder="Ej: fonología pragmática"
                      value={templateForm.new_category_name || ''}
                      onChange={(e) => setTemplateForm({ ...templateForm, new_category_name: e.target.value })}
                    />
                  </div>
                )}
                <label className="flex items-start gap-2 rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(templateForm.is_favorite)}
                    onChange={(e) => setTemplateForm({ ...templateForm, is_favorite: e.target.checked })}
                  />
                  <span>Marcar como favorita.</span>
                </label>
                {editingTemplateId && (
                  <label className="flex items-start gap-2 rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="mt-0.5"
                      checked={Boolean(templateForm.apply_to_pending_sessions)}
                      onChange={(e) => setTemplateForm({ ...templateForm, apply_to_pending_sessions: e.target.checked })}
                    />
                    <span>Aplicar cambios de nombre y descripción a sesiones pendientes vinculadas.</span>
                  </label>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                <button type="button" className="actionButton" onClick={onCloseTemplateModal}>
                  Cancelar
                </button>
                <button className="actionButton actionButtonPrimary">
                  {editingTemplateId ? 'Actualizar tarea' : 'Crear tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskHistory.length > 0 && (
        <>
          <h3 className="mt-4 text-base font-semibold text-slate-900">Historico de tarea reutilizable</h3>
          <ul>
            {taskHistory.map((entry) => (
              <li key={entry.id}>
                {entry.session?.treatment_plan?.student?.full_name} - {entry.session?.treatment_plan?.year} - {formatDisplayDate(entry.session?.session_date)}
                {' | '}Calificacion: {ratingOptions.find((option) => option.value === entry.rating)?.label || entry.rating}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
