import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import AppRouter from './app/router/AppRouter'
import TaskBankSection from './features/taskTemplates/components/TaskBankSection'
import FeedbackMessage from './shared/components/FeedbackMessage'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const PAGE_SIZE = 10
const initialStudent = {
  full_name: '',
  rut: '',
  student_diagnosis_id: '',
  new_diagnosis_name: '',
  school_level_id: '',
  school_course_id: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_email: '',
}
const ratingOptions = [
  { value: 'con_dificultad', label: 'No lo logra', dot: '🔴' },
  { value: 'por_lograr', label: 'Por lograr', dot: '🟡' },
  { value: 'logrado', label: 'Lo logra', dot: '🟢' },
]
const ratingToScore = {
  con_dificultad: 1,
  por_lograr: 2,
  logrado: 3,
}
const validSections = new Set(['overview', 'profile', 'students', 'studentPlans', 'sessions', 'sessionDetail', 'tasks', 'mediaLibrary'])

function getSectionFromPath(pathname) {
  const cleanPath = String(pathname || '').replace(/\/+$/, '')
  const parts = cleanPath.split('/').filter(Boolean)
  if (parts[0] !== 'dashboard') return 'overview'
  const candidate = parts[1] || 'overview'
  return validSections.has(candidate) ? candidate : 'overview'
}

function App() {
  const [status, setStatus] = useState('Inicializando...')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [currentUser, setCurrentUser] = useState(null)
  const [professions, setProfessions] = useState([])
  const [levels, setLevels] = useState([])
  const [students, setStudents] = useState([])
  const [studentDiagnoses, setStudentDiagnoses] = useState([])
  const [authForm, setAuthForm] = useState({
    name: '',
    rut: '',
    email: '',
    password: '',
    profession_id: '',
  })
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [forgotForm, setForgotForm] = useState({ email: '' })
  const [resetForm, setResetForm] = useState({
    token: '',
    email: '',
    password: '',
    password_confirmation: '',
  })
  const [profileForm, setProfileForm] = useState({
    name: '',
    rut: '',
    email: '',
    profession_id: '',
    password: '',
    password_confirmation: '',
  })
  const [studentForm, setStudentForm] = useState(initialStudent)
  const [studentFilters, setStudentFilters] = useState({
    search: '',
    course: '',
    diagnosis: '',
  })
  const [editingId, setEditingId] = useState(null)
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [isStudentModalVisible, setIsStudentModalVisible] = useState(false)
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [isPlanModalVisible, setIsPlanModalVisible] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [isSessionModalVisible, setIsSessionModalVisible] = useState(false)
  const [sessionModalError, setSessionModalError] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [isTaskModalVisible, setIsTaskModalVisible] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [isSuspendModalVisible, setIsSuspendModalVisible] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [plans, setPlans] = useState([])
  const [planForm, setPlanForm] = useState({ year: new Date().getFullYear() })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionRatingSeries, setSessionRatingSeries] = useState([])
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [sessionForm, setSessionForm] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    session_time: '09:00',
    objective: '',
    description: '',
    status: 'pendiente',
  })
  const [taskTemplates, setTaskTemplates] = useState([])
  const [mediaLibraryItems, setMediaLibraryItems] = useState([])
  const [taskCategories, setTaskCategories] = useState([])
  const [taskTemplateFilters, setTaskTemplateFilters] = useState({
    q: '',
    sort: 'name',
    direction: 'asc',
    category: '',
    favoritesOnly: false,
    recentOnly: false,
    includeArchived: false,
  })
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    category: '',
    is_favorite: false,
    apply_to_pending_sessions: false,
  })
  const [editingTemplateId, setEditingTemplateId] = useState(null)
  const [selectedSession, setSelectedSession] = useState(null)
  const [sessionObservation, setSessionObservation] = useState('')
  const [suspensionReason, setSuspensionReason] = useState('estudiante_ausente')
  const [sessionTasks, setSessionTasks] = useState([])
  const [sessionMaterials, setSessionMaterials] = useState([])
  const [sessionMaterialForm, setSessionMaterialForm] = useState({
    title: '',
    media_library_item_id: '',
    file: null,
  })
  const [mediaLibraryForm, setMediaLibraryForm] = useState({
    title: '',
    file: null,
  })
  const [isUploadingSessionMaterial, setIsUploadingSessionMaterial] = useState(false)
  const [taskForm, setTaskForm] = useState({
    task_template_id: '',
    task_template_ids: [],
    name: '',
    description: '',
    rating: 'por_lograr',
  })
  const [taskCreationMode, setTaskCreationMode] = useState('manual')
  const [, setEditingTaskId] = useState(null)
  const [taskHistory, setTaskHistory] = useState([])
  const [todaySessions, setTodaySessions] = useState([])
  const [overviewStats, setOverviewStats] = useState({
    students: 0,
    plans: 0,
    finalizedSessions: 0,
    pendingSessions: 0,
  })
  const [studentsPage, setStudentsPage] = useState(1)
  const [plansPage, setPlansPage] = useState(1)
  const [sessionsPage, setSessionsPage] = useState(1)
  const [activeSection, setActiveSectionState] = useState(() => getSectionFromPath(window.location.pathname))
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' })
  const healthUrl = useMemo(() => `${apiBaseUrl}/health`, [])

  const setActiveSection = useCallback((nextSection) => {
    setActiveSectionState(nextSection)
    if (!token) return
    if (!validSections.has(nextSection)) return
    const nextPath = `/dashboard/${nextSection}`
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
  }, [token])

  const api = useCallback(async (path, options = {}) => {
    const { skipAuth = false, headers: optionHeaders, ...fetchOptions } = options
    const sendAuth = Boolean(token && !skipAuth)
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData

    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...fetchOptions,
      headers: {
        Accept: 'application/json',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(sendAuth ? { Authorization: `Bearer ${token}` } : {}),
        ...(optionHeaders || {}),
      },
    })

    if (response.status === 204) {
      return null
    }

    const responseText = await response.text()
    let data = {}
    if (responseText) {
      try {
        data = JSON.parse(responseText)
      } catch {
        throw new Error(response.ok ? 'Respuesta inválida del servidor.' : `Error del servidor (${response.status}).`)
      }
    }

    if (response.status === 401) {
      if (sendAuth) {
        localStorage.removeItem('token')
        setToken('')
        setCurrentUser(null)
      }
      throw new Error(data.message || 'Sesión expirada. Inicia sesión nuevamente.')
    }

    if (!response.ok) {
      const validationDetail = data.errors && typeof data.errors === 'object'
        ? Object.values(data.errors).flat().filter(Boolean).join(' ')
        : ''
      throw new Error(data.message || validationDetail || 'Error en solicitud')
    }

    return data
  }, [token])

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(healthUrl)
      const data = await res.json()
      setStatus(`API ${data.status}`)
    } catch {
      setStatus('API no disponible')
    }
  }, [healthUrl])

  const loadCatalogs = useCallback(async () => {
    try {
      const [professionData, levelData] = await Promise.all([
        api('/professions'),
        api('/school-levels'),
      ])
      setProfessions(professionData)
      setLevels(levelData)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadStudents = useCallback(async () => {
    try {
      const data = await api('/students')
      setStudents(data)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadOverviewStats = useCallback(async () => {
    if (!token) {
      setOverviewStats({
        students: 0,
        plans: 0,
        finalizedSessions: 0,
        pendingSessions: 0,
      })
      return
    }

    if (students.length === 0) {
      setOverviewStats({
        students: 0,
        plans: 0,
        finalizedSessions: 0,
        pendingSessions: 0,
      })
      return
    }

    try {
      const plansByStudent = await Promise.all(
        students.map(async (student) => ({
          studentId: student.id,
          plans: await api(`/students/${student.id}/treatment-plans`),
        })),
      )

      const allPlans = plansByStudent.flatMap((entry) => entry.plans.map((plan) => ({ studentId: entry.studentId, plan })))

      const sessionsByPlan = await Promise.all(
        allPlans.map(async ({ studentId, plan }) =>
          api(`/students/${studentId}/treatment-plans/${plan.id}/sessions`),
        ),
      )

      const allSessions = sessionsByPlan.flat()
      const finalizedSessions = allSessions.filter((session) => session.status === 'finalizada').length
      const pendingSessions = allSessions.filter((session) => session.status !== 'finalizada').length

      setOverviewStats({
        students: students.length,
        plans: allPlans.length,
        finalizedSessions,
        pendingSessions,
      })
    } catch {
      setOverviewStats((prev) => ({
        ...prev,
        students: students.length,
      }))
    }
  }, [api, students, token])

  const loadStudentDiagnoses = useCallback(async () => {
    try {
      const data = await api('/student-diagnoses')
      setStudentDiagnoses(data)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadCurrentUser = useCallback(async () => {
    try {
      const data = await api('/auth/me')
      setCurrentUser(data || null)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadTaskTemplates = useCallback(async () => {
    try {
      const searchParams = new URLSearchParams()
      if (taskTemplateFilters.q.trim()) {
        searchParams.set('q', taskTemplateFilters.q.trim())
      }
      if (taskTemplateFilters.category) {
        searchParams.set('category_id', taskTemplateFilters.category)
      }
      if (taskTemplateFilters.favoritesOnly) {
        searchParams.set('favorites_only', '1')
      }
      if (taskTemplateFilters.recentOnly) {
        searchParams.set('recent_only', '1')
      }
      if (taskTemplateFilters.includeArchived) {
        searchParams.set('include_archived', '1')
      }
      searchParams.set('sort', taskTemplateFilters.sort)
      searchParams.set('direction', taskTemplateFilters.direction)
      const data = await api(`/task-templates?${searchParams.toString()}`)
      setTaskTemplates(data)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api, taskTemplateFilters])

  const loadTaskCategories = useCallback(async () => {
    try {
      const data = await api('/task-categories')
      setTaskCategories(data)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadMediaLibraryItems = useCallback(async () => {
    try {
      const data = await api('/media-library')
      setMediaLibraryItems(data)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const onTaskTemplateFilterChange = useCallback((field, value) => {
    setTaskTemplateFilters((prev) => ({ ...prev, [field]: value }))
  }, [])

  useEffect(() => {
    const init = async () => {
      await checkHealth()
      await loadCatalogs()
    }
    init()
  }, [checkHealth, loadCatalogs])

  useEffect(() => {
    const load = async () => {
      if (token) {
        await Promise.all([
          loadStudents(),
          loadTaskTemplates(),
          loadTaskCategories(),
          loadMediaLibraryItems(),
          loadStudentDiagnoses(),
          loadCurrentUser(),
        ])
      }
    }
    load()
  }, [token, loadStudents, loadTaskTemplates, loadTaskCategories, loadMediaLibraryItems, loadStudentDiagnoses, loadCurrentUser])

  useEffect(() => {
    if (!currentUser) {
      setProfileForm({
        name: '',
        rut: '',
        email: '',
        profession_id: '',
        password: '',
        password_confirmation: '',
      })
      return
    }

    setProfileForm({
      name: currentUser.name || '',
      rut: currentUser.rut || '',
      email: currentUser.email || '',
      profession_id: currentUser.profession_id ? String(currentUser.profession_id) : '',
      password: '',
      password_confirmation: '',
    })
  }, [currentUser])

  useEffect(() => {
    const onPopState = () => {
      setActiveSectionState(getSectionFromPath(window.location.pathname))
    }

    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (!token) return
    const sectionFromPath = getSectionFromPath(window.location.pathname)
    setActiveSectionState(sectionFromPath)
    const normalizedPath = `/dashboard/${sectionFromPath}`
    if (window.location.pathname !== normalizedPath) {
      window.history.replaceState({}, '', normalizedPath)
    }
  }, [token])

  useEffect(() => {
    // Permite animar salida antes de desmontar visualmente el modal.
    if (showStudentModal) {
      setIsStudentModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsStudentModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showStudentModal])

  useEffect(() => {
    // Permite animar salida antes de desmontar visualmente el modal de planes.
    if (showPlanModal) {
      setIsPlanModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsPlanModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showPlanModal])

  useEffect(() => {
    // Permite animar salida antes de desmontar visualmente el modal de sesiones.
    if (showSessionModal) {
      setIsSessionModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsSessionModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showSessionModal])

  useEffect(() => {
    // Permite animar salida antes de desmontar visualmente el modal de tareas.
    if (showTaskModal) {
      setIsTaskModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsTaskModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showTaskModal])

  useEffect(() => {
    // Permite animar salida antes de desmontar visualmente el modal de suspensión.
    if (showSuspendModal) {
      setIsSuspendModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsSuspendModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showSuspendModal])

  useEffect(() => {
    if (!toast.show) return

    const timer = setTimeout(() => {
      setToast((current) => ({ ...current, show: false }))
    }, 3200)

    return () => clearTimeout(timer)
  }, [toast.show])

  useEffect(() => {
    if (!showStudentModal) return

    // Cierra modal con tecla Escape.
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowStudentModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showStudentModal])

  useEffect(() => {
    if (!showPlanModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowPlanModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showPlanModal])

  useEffect(() => {
    setStudentsPage(1)
  }, [studentFilters.search, studentFilters.course, studentFilters.diagnosis])

  useEffect(() => {
    setPlansPage(1)
  }, [selectedStudent?.id, plans.length])

  useEffect(() => {
    setSessionsPage(1)
  }, [selectedPlan?.id, sessions.length])

  useEffect(() => {
    if (!showSessionModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowSessionModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showSessionModal])

  useEffect(() => {
    if (!showTaskModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowTaskModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showTaskModal])

  useEffect(() => {
    if (!showSuspendModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowSuspendModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showSuspendModal])

  useEffect(() => {
    async function buildSessionRatingSeries() {
      if (!selectedStudent || !selectedPlan || sessions.length === 0) {
        setSessionRatingSeries([])
        return
      }

      try {
        const series = await Promise.all(
          sessions.map(async (session) => {
            const tasks = await api(
              `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${session.id}/tasks`,
            )
            const ratedTasks = tasks.filter((task) => task.rating && ratingToScore[task.rating])
            const averageScore = ratedTasks.length
              ? ratedTasks.reduce((acc, task) => acc + ratingToScore[task.rating], 0) / ratedTasks.length
              : null
            const performancePercent = averageScore !== null ? Math.round(((averageScore - 1) / 2) * 100) : null

            return {
              sessionId: session.id,
              sessionDate: session.session_date,
              averageScore,
              performancePercent,
            }
          }),
        )
        setSessionRatingSeries(series)
      } catch {
        setSessionRatingSeries([])
      }
    }

    if (activeSection === 'sessions') {
      buildSessionRatingSeries()
    }
  }, [activeSection, api, selectedPlan, selectedStudent, sessions])

  useEffect(() => {
    async function loadTodaySessions() {
      if (!token) {
        setTodaySessions([])
        return
      }

      try {
        const sessionsByDay = await api('/sessions/today')
        setTodaySessions(sessionsByDay)
      } catch {
        setTodaySessions([])
      }
    }

    loadTodaySessions()
  }, [api, token, sessions, plans, students])

  useEffect(() => {
    async function refreshDashboardData() {
      if (!token || activeSection !== 'overview') return
      await Promise.all([loadStudents(), loadTaskTemplates()])
    }

    refreshDashboardData()
  }, [activeSection, loadStudents, loadTaskTemplates, token])

  useEffect(() => {
    if (!token || activeSection !== 'overview') return
    loadOverviewStats()
  }, [activeSection, loadOverviewStats, token, students.length])

  async function onRegister(e) {
    e.preventDefault()
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(authForm),
        skipAuth: true,
      })
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setStatus('Registro correcto')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onLogin(e) {
    e.preventDefault()
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(loginForm), skipAuth: true })
      localStorage.setItem('token', data.token)
      setToken(data.token)
      setCurrentUser(data.user || null)
      setStatus('Login correcto')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onForgotPassword(e) {
    e.preventDefault()
    try {
      const data = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(forgotForm),
        skipAuth: true,
      })
      setStatus(data.message || 'Si el email existe, se envio el enlace.')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onResetPassword(e) {
    e.preventDefault()
    try {
      const data = await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(resetForm),
        skipAuth: true,
      })
      setStatus(data.message || 'Contrasena actualizada.')
      setResetForm({ token: '', email: '', password: '', password_confirmation: '' })
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSaveProfile(e) {
    e.preventDefault()

    if (!currentUser) return

    try {
      const payload = {
        name: profileForm.name,
        rut: profileForm.rut,
        email: profileForm.email,
        profession_id: Number(profileForm.profession_id),
        password: profileForm.password || null,
        password_confirmation: profileForm.password_confirmation || null,
      }

      const updatedUser = await api('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      setCurrentUser(updatedUser || null)
      setProfileForm((prev) => ({
        ...prev,
        password: '',
        password_confirmation: '',
      }))
      setStatus('Perfil actualizado correctamente')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onLogout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem('token')
      setToken('')
      setCurrentUser(null)
      setStudents([])
      setTaskTemplates([])
      setMediaLibraryItems([])
      setTaskCategories([])
      setStudentDiagnoses([])
    }
  }

  async function onSaveTemplate(e) {
    e.preventDefault()
    const path = editingTemplateId ? `/task-templates/${editingTemplateId}` : '/task-templates'
    const method = editingTemplateId ? 'PUT' : 'POST'
    try {
      let taskCategoryId = templateForm.task_category_id || null
      if (taskCategoryId === '__new__') {
        taskCategoryId = null
      }
      const newCategoryName = (templateForm.new_category_name || '').trim()
      if (newCategoryName) {
        const newCategory = await api('/task-categories', {
          method: 'POST',
          body: JSON.stringify({ name: newCategoryName }),
        })
        taskCategoryId = newCategory.id
      }

      const savedTemplate = await api(path, {
        method,
        body: JSON.stringify({
          ...templateForm,
          task_category_id: taskCategoryId,
        }),
      })
      setTemplateForm({
        name: '',
        description: '',
        task_category_id: '',
        new_category_name: '',
        is_favorite: false,
        apply_to_pending_sessions: false,
      })
      setEditingTemplateId(null)
      await Promise.all([loadTaskTemplates(), loadTaskCategories()])
      if (editingTemplateId && templateForm.apply_to_pending_sessions) {
        setStatus(`Tarea reutilizable guardada. Se actualizaron ${savedTemplate.updated_pending_sessions_count ?? 0} tareas en sesiones pendientes.`)
      } else {
        setStatus('Tarea reutilizable guardada')
      }
      return true
    } catch (error) {
      setStatus(error.message)
      return false
    }
  }

  function onEditTemplate(template) {
    setEditingTemplateId(template.id)
    setTemplateForm({
      name: template.name,
      description: template.description || '',
      task_category_id: template.task_category_id ? String(template.task_category_id) : '',
      new_category_name: '',
      is_favorite: Boolean(template.is_favorite),
      apply_to_pending_sessions: false,
    })
  }

  async function onDeleteTemplate(templateId) {
    if (!window.confirm('Archivar tarea reutilizable?')) return
    try {
      await api(`/task-templates/${templateId}`, { method: 'DELETE' })
      await loadTaskTemplates()
      setTaskHistory([])
      setStatus('Tarea reutilizable archivada')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onRestoreTemplate(templateId) {
    try {
      await api(`/task-templates/${templateId}/restore`, { method: 'POST' })
      await loadTaskTemplates()
      setStatus('Tarea restaurada')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDuplicateTemplate(templateId) {
    try {
      await api(`/task-templates/${templateId}/duplicate`, { method: 'POST' })
      await loadTaskTemplates()
      setStatus('Tarea duplicada')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onToggleFavoriteTemplate(template) {
    try {
      await api(`/task-templates/${template.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: template.name,
          description: template.description || '',
          task_category_id: template.task_category_id || null,
          is_favorite: !template.is_favorite,
          apply_to_pending_sessions: false,
        }),
      })
      await loadTaskTemplates()
      setStatus('Favorito actualizado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onViewTemplateHistory(templateId) {
    try {
      const data = await api(`/task-templates/${templateId}/history`)
      setTaskHistory(data)
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSaveStudent(e) {
    e.preventDefault()
    const path = editingId ? `/students/${editingId}` : '/students'
    const method = editingId ? 'PUT' : 'POST'

    const isCreating = !editingId
    let diagnosisIdRaw = studentForm.student_diagnosis_id
    if (diagnosisIdRaw === '__new__') {
      diagnosisIdRaw = ''
    }
    const newDiagnosisName = (studentForm.new_diagnosis_name || '').trim()

    if (!diagnosisIdRaw && !newDiagnosisName) {
      const message = 'Selecciona un diagnóstico o crea uno nuevo.'
      setStatus(message)
      if (isCreating) {
        setToast({ show: true, type: 'error', message })
      }
      return
    }

    try {
      let studentDiagnosisId = diagnosisIdRaw ? Number(diagnosisIdRaw) : null
      if (newDiagnosisName) {
        const created = await api('/student-diagnoses', {
          method: 'POST',
          body: JSON.stringify({ name: newDiagnosisName }),
        })
        studentDiagnosisId = created.id
      }

      if (!studentDiagnosisId) {
        const message = 'Selecciona un diagnóstico o crea uno nuevo.'
        setStatus(message)
        if (isCreating) {
          setToast({ show: true, type: 'error', message })
        }
        return
      }

      const payload = {
        full_name: studentForm.full_name,
        rut: studentForm.rut,
        student_diagnosis_id: studentDiagnosisId,
        school_level_id: Number(studentForm.school_level_id),
        school_course_id: Number(studentForm.school_course_id),
        guardian_name: studentForm.guardian_name,
        guardian_phone: studentForm.guardian_phone,
        guardian_email: studentForm.guardian_email,
      }

      await api(path, { method, body: JSON.stringify(payload) })
      setStudentForm(initialStudent)
      setEditingId(null)
      setShowStudentModal(false)
      await Promise.all([loadStudents(), loadStudentDiagnoses()])
      setStatus('Estudiante guardado')
      if (isCreating) {
        setToast({
          show: true,
          type: 'success',
          message: 'Estudiante registrado correctamente.',
        })
      }
    } catch (error) {
      setStatus(error.message)
      if (isCreating) {
        setToast({
          show: true,
          type: 'error',
          message: error.message || 'No se pudo registrar el estudiante.',
        })
      }
    }
  }

  async function onDeleteStudent(id) {
    if (!window.confirm('Eliminar estudiante?')) return
    try {
      await api(`/students/${id}`, { method: 'DELETE' })
      await loadStudents()
    } catch (error) {
      setStatus(error.message)
    }
  }

  function onEditStudent(student) {
    setEditingId(student.id)
    setShowStudentModal(true)
    setStudentForm({
      full_name: student.full_name,
      rut: student.rut,
      student_diagnosis_id: student.student_diagnosis_id ? String(student.student_diagnosis_id) : '__new__',
      new_diagnosis_name: student.student_diagnosis_id ? '' : (student.current_diagnosis || ''),
      school_level_id: String(student.school_level_id),
      school_course_id: String(student.school_course_id),
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      guardian_email: student.guardian_email,
    })
  }

  function onOpenCreateStudentModal() {
    setEditingId(null)
    setStudentForm(initialStudent)
    setShowStudentModal(true)
  }

  async function onSelectStudent(student) {
    setSelectedStudent(student)
    setSelectedPlan(null)
    setSessions([])
    setActiveSection('studentPlans')
    try {
      const data = await api(`/students/${student.id}/treatment-plans`)
      setPlans(data)
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onCreatePlan(e) {
    e.preventDefault()
    if (!selectedStudent) return

    try {
      await api(`/students/${selectedStudent.id}/treatment-plans`, {
        method: 'POST',
        body: JSON.stringify({ year: Number(planForm.year) }),
      })
      await onSelectStudent(selectedStudent)
      setShowPlanModal(false)
      setStatus('Plan anual creado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDeletePlan(planId) {
    if (!selectedStudent) return
    if (!window.confirm('Eliminar plan anual?')) return

    try {
      await api(`/students/${selectedStudent.id}/treatment-plans/${planId}`, { method: 'DELETE' })
      await onSelectStudent(selectedStudent)
      setStatus('Plan eliminado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDownloadPlanConsolidatedPdf(planId) {
    if (!selectedStudent) return
    try {
      const response = await fetch(
        `${apiBaseUrl}/students/${selectedStudent.id}/treatment-plans/${planId}/consolidated-pdf`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo generar PDF consolidado')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `plan-${planId}-consolidado.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('PDF consolidado descargado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSelectPlan(plan) {
    if (!selectedStudent) return
    setSelectedPlan(plan)
    setActiveSection('sessions')
    setEditingSessionId(null)
    setSelectedSession(null)
    setSessionTasks([])
    setSessionMaterials([])
    setEditingTaskId(null)
    setTaskForm({
      task_template_id: '',
      task_template_ids: [],
      name: '',
      description: '',
      rating: 'por_lograr',
    })
    setTaskCreationMode('manual')
    setSessionForm({
      session_date: new Date().toISOString().slice(0, 10),
      session_time: '09:00',
      objective: '',
      description: '',
      status: 'pendiente',
    })
    try {
      const data = await api(`/students/${selectedStudent.id}/treatment-plans/${plan.id}/sessions`)
      setSessions(data)
      if (data.length > 0) {
        await onSelectSession(data[0])
      } else {
        setSelectedSession(null)
        setSessionTasks([])
        setSessionMaterials([])
      }
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSaveSession(e) {
    e.preventDefault()
    if (!selectedStudent || !selectedPlan) return
    const isEditing = Boolean(editingSessionId)
    const path = isEditing
      ? `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${editingSessionId}`
      : `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions`

    try {
      setSessionModalError('')
      const savedSession = await api(path, { method: isEditing ? 'PUT' : 'POST', body: JSON.stringify(sessionForm) })
      await onSelectPlan(selectedPlan)
      if (savedSession?.id) {
        await onSelectSession(savedSession)
      }
      setShowSessionModal(false)
      setStatus(isEditing ? 'Sesion actualizada' : 'Sesion creada')
    } catch (error) {
      setSessionModalError(error.message || 'No fue posible guardar la sesión.')
      setStatus(error.message)
    }
  }

  function onEditSession(session) {
    setEditingSessionId(session.id)
    setSessionModalError('')
    setShowSessionModal(true)
    setSessionForm({
      session_date: session.session_date,
      session_time: session.session_time ? String(session.session_time).slice(0, 5) : '09:00',
      objective: session.objective,
      description: session.description || '',
      status: session.status === 'draft' ? 'pendiente' : session.status,
    })
  }

  function onOpenCreateSessionModal() {
    setEditingSessionId(null)
    setSessionModalError('')
    setSessionForm({
      session_date: new Date().toISOString().slice(0, 10),
      session_time: '09:00',
      objective: '',
      description: '',
      status: 'pendiente',
    })
    setShowSessionModal(true)
  }

  async function onDeleteSession(sessionId) {
    if (!selectedStudent || !selectedPlan) return
    if (!window.confirm('Eliminar sesion?')) return
    try {
      await api(`/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      await onSelectPlan(selectedPlan)
      setStatus('Sesion eliminada')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDownloadSessionPdf(sessionId) {
    if (!selectedStudent || !selectedPlan) return
    try {
      const response = await fetch(
        `${apiBaseUrl}/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${sessionId}/pdf`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo generar PDF de sesion')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sesion-${sessionId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('PDF de sesion descargado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSendSessionReport(sessionId) {
    if (!selectedStudent || !selectedPlan) return
    try {
      const data = await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${sessionId}/send-report`,
        { method: 'POST' },
      )
      setStatus(data.message || 'Informe enviado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSelectSession(session) {
    if (!selectedStudent || !selectedPlan) return
    setSelectedSession(session)
    setActiveSection('sessionDetail')
    setEditingTaskId(null)
    setTaskForm({
      task_template_id: '',
      name: '',
      description: '',
      rating: 'por_lograr',
    })
    setSessionObservation(session.general_observation || '')
    setSuspensionReason('estudiante_ausente')
    setSessionMaterialForm({ title: '', media_library_item_id: '', file: null })
    setShowTaskModal(false)
    setTaskCreationMode('manual')

    try {
      const [tasksData, materialsData] = await Promise.all([
        api(`/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${session.id}/tasks`),
        api(`/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${session.id}/materials`),
      ])
      setSessionTasks(tasksData)
      setSessionMaterials(materialsData)
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onUploadSessionMaterial(e) {
    e.preventDefault()
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    const formData = new FormData()
    const selectedLibraryItemId = sessionMaterialForm.media_library_item_id
      ? Number(sessionMaterialForm.media_library_item_id)
      : null

    if (selectedLibraryItemId) {
      formData.append('media_library_item_id', String(selectedLibraryItemId))
      if (sessionMaterialForm.title.trim()) {
        formData.append('title', sessionMaterialForm.title.trim())
      }
    } else {
      if (!sessionMaterialForm.file) {
        setStatus('Selecciona un recurso de la biblioteca o sube un archivo.')
        return
      }

      const title = sessionMaterialForm.title.trim() || sessionMaterialForm.file.name
      formData.append('title', title)
      formData.append('file', sessionMaterialForm.file)
    }

    try {
      setIsUploadingSessionMaterial(true)
      await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}/materials`,
        {
          method: 'POST',
          body: formData,
        },
      )
      setSessionMaterialForm({ title: '', media_library_item_id: '', file: null })
      await Promise.all([onSelectSession(selectedSession), loadMediaLibraryItems()])
      setStatus('Material complementario cargado')
    } catch (error) {
      setStatus(error.message)
    } finally {
      setIsUploadingSessionMaterial(false)
    }
  }

  async function onDeleteSessionMaterial(materialId) {
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    if (!window.confirm('Eliminar material complementario de la sesión?')) return
    try {
      await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}/materials/${materialId}`,
        { method: 'DELETE' },
      )
      await onSelectSession(selectedSession)
      setStatus('Material eliminado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDownloadSessionMaterial(material) {
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    try {
      const response = await fetch(
        `${apiBaseUrl}/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}/materials/${material.id}/download`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo descargar el material')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = material.media_item?.stored_name || material.original_name || `material-${material.id}`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('Material descargado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onUploadMediaLibraryItem(e) {
    e.preventDefault()
    if (!mediaLibraryForm.file) {
      setStatus('Selecciona un archivo para subir a la biblioteca.')
      return
    }

    const formData = new FormData()
    if (mediaLibraryForm.title.trim()) {
      formData.append('title', mediaLibraryForm.title.trim())
    }
    formData.append('file', mediaLibraryForm.file)

    try {
      await api('/media-library', {
        method: 'POST',
        body: formData,
      })
      setMediaLibraryForm({ title: '', file: null })
      await loadMediaLibraryItems()
      setStatus('Recurso guardado en biblioteca')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDeleteMediaLibraryItem(item) {
    const confirmation = window.confirm(
      `Eliminar "${item.stored_name}" de la biblioteca?\n\nAdvertencia: se eliminará en todas las sesiones donde esté vinculado.`,
    )
    if (!confirmation) return

    try {
      await api(`/media-library/${item.id}`, { method: 'DELETE' })
      await Promise.all([loadMediaLibraryItems(), selectedSession ? onSelectSession(selectedSession) : Promise.resolve()])
      setStatus('Recurso eliminado de biblioteca y sesiones vinculadas')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onDownloadMediaLibraryItem(item) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/media-library/${item.id}/download`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo descargar el recurso')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.stored_name || item.original_name || `media-${item.id}`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('Recurso descargado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSaveSessionTask(e) {
    e.preventDefault()
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    const path = `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}/tasks`
    try {
      if (taskCreationMode === 'import' && taskForm.task_template_ids.length > 0) {
        const selectedTemplates = taskTemplates.filter((template) =>
          taskForm.task_template_ids.includes(String(template.id)),
        )
        await Promise.all(selectedTemplates.map((template) => api(path, {
          method: 'POST',
          body: JSON.stringify({
            task_template_id: template.id,
            name: template.name,
            description: template.description,
            rating: null,
          }),
        })))
      } else {
        const payload = {
          task_template_id:
            taskCreationMode === 'import' && taskForm.task_template_id ? Number(taskForm.task_template_id) : null,
          name: taskForm.name,
          description: taskForm.description,
          // Se crea sin evaluación aplicada; la calificación se registra después en la sesión.
          rating: null,
        }
        await api(path, { method: 'POST', body: JSON.stringify(payload) })
      }
      await onSelectSession(selectedSession)
      setShowTaskModal(false)
      setEditingTaskId(null)
      setTaskCreationMode('manual')
      setStatus('Tarea agregada a sesion')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onChangeSessionTaskRating(task, nextRating) {
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    try {
      await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}/tasks/${task.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: task.name,
            description: task.description || '',
            rating: nextRating || null,
          }),
        },
      )
      await onSelectSession(selectedSession)
      setStatus('Calificacion actualizada')
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onUpdateSessionState({ status, generalObservation }, successMessage) {
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    try {
      const updatedSession = await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            session_date: selectedSession.session_date,
            session_time: selectedSession.session_time || '09:00',
            objective: selectedSession.objective,
            description: selectedSession.description || null,
            general_observation: generalObservation,
            status,
          }),
        },
      )
      setSelectedSession(updatedSession)
      setSessionObservation(updatedSession.general_observation || '')
      await onSelectPlan(selectedPlan)
      await onSelectSession(updatedSession)
      setActiveSection('sessionDetail')
      setStatus(successMessage)
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onFinalizeSession() {
    if (!selectedSession) return
    await onUpdateSessionState(
      { status: 'finalizada', generalObservation: sessionObservation || null },
      'Sesion finalizada',
    )
  }

  async function onReopenSession() {
    if (!selectedSession) return
    await onUpdateSessionState(
      { status: 'pendiente', generalObservation: sessionObservation || null },
      'Sesion habilitada para edicion',
    )
  }

  async function onSuspendSession() {
    if (!selectedSession) return
    const suspensionLabel =
      suspensionReason === 'estudiante_ausente' ? 'Estudiante ausente' : 'Actividad escolar/suspension'
    const generalObservationWithReason = [
      sessionObservation?.trim() || null,
      `Motivo de suspension: ${suspensionLabel}`,
    ]
      .filter(Boolean)
      .join('\n\n')
    await onUpdateSessionState(
      { status: 'suspendida', generalObservation: generalObservationWithReason },
      'Sesion suspendida',
    )
    setShowSuspendModal(false)
  }

  async function onDeleteSessionTask(taskId) {
    if (!selectedStudent || !selectedPlan || !selectedSession) return
    if (!window.confirm('Eliminar tarea de la sesion?')) return
    try {
      await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}/tasks/${taskId}`,
        { method: 'DELETE' },
      )
      await onSelectSession(selectedSession)
      setStatus('Tarea eliminada de la sesion')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function onTemplateMultiSelectionChange(templateIds) {
    const selectedIds = Array.from(templateIds)
    const previewTemplate = taskTemplates.find((item) => String(item.id) === String(selectedIds[0]))
    setTaskForm({
      ...taskForm,
      task_template_ids: selectedIds,
      task_template_id: selectedIds[0] || '',
      name: previewTemplate ? previewTemplate.name : '',
      description: previewTemplate?.description || '',
    })
  }

  function onOpenCreateTaskModal() {
    setEditingTaskId(null)
    setTaskCreationMode('manual')
    setTaskForm({
      task_template_id: '',
      task_template_ids: [],
      name: '',
      description: '',
      rating: 'por_lograr',
    })
    setShowTaskModal(true)
  }

  function onOpenImportTaskModal() {
    setEditingTaskId(null)
    setTaskCreationMode('import')
    setTaskForm({
      task_template_id: '',
      task_template_ids: [],
      name: '',
      description: '',
      rating: 'por_lograr',
    })
    setShowTaskModal(true)
  }

  async function onOpenTodaySession(todaySessionItem) {
    const { student, plan, session } = todaySessionItem
    await onSelectStudent(student)
    await onSelectPlan(plan)
    await onSelectSession(session)
  }

  const selectedLevel = levels.find((level) => String(level.id) === String(studentForm.school_level_id))
  const availableCourses = selectedLevel?.courses ?? []
  const studentCourseOptions = useMemo(() => {
    const uniqueCourses = new Map()
    students.forEach((student) => {
      const name = student.course?.display_name
      if (name && !uniqueCourses.has(name)) {
        uniqueCourses.set(name, name)
      }
    })
    return Array.from(uniqueCourses.keys()).sort((a, b) => a.localeCompare(b))
  }, [students])
  const filteredStudents = useMemo(() => {
    const search = studentFilters.search.trim().toLowerCase()
    const diagnosis = studentFilters.diagnosis.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch = !search || [
        student.full_name,
        student.rut,
        student.guardian_name,
        student.guardian_email,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))

      const matchesCourse = !studentFilters.course || (student.course?.display_name || '') === studentFilters.course

      const diagnosisLabel = (student.student_diagnosis?.name || student.current_diagnosis || '').toLowerCase()
      const matchesDiagnosis = !diagnosis || diagnosisLabel.includes(diagnosis)

      return matchesSearch && matchesCourse && matchesDiagnosis
    })
  }, [students, studentFilters])
  const studentsTotalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))
  const safeStudentsPage = Math.min(studentsPage, studentsTotalPages)
  const paginatedStudents = useMemo(() => {
    const start = (safeStudentsPage - 1) * PAGE_SIZE
    return filteredStudents.slice(start, start + PAGE_SIZE)
  }, [filteredStudents, safeStudentsPage])
  const plansTotalPages = Math.max(1, Math.ceil(plans.length / PAGE_SIZE))
  const safePlansPage = Math.min(plansPage, plansTotalPages)
  const paginatedPlans = useMemo(() => {
    const start = (safePlansPage - 1) * PAGE_SIZE
    return plans.slice(start, start + PAGE_SIZE)
  }, [plans, safePlansPage])
  const sessionsTotalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE))
  const safeSessionsPage = Math.min(sessionsPage, sessionsTotalPages)
  const paginatedSessions = useMemo(() => {
    const start = (safeSessionsPage - 1) * PAGE_SIZE
    return sessions.slice(start, start + PAGE_SIZE)
  }, [sessions, safeSessionsPage])
  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return '-'
    const [year, month, day] = String(dateValue).split('-')
    if (!year || !month || !day) return dateValue
    return `${day}-${month}-${year}`
  }
  const formatDisplayTime = (timeValue) => {
    if (!timeValue) return '--:--'
    return String(timeValue).slice(0, 5)
  }
  const currentYear = new Date().getFullYear()
  const todayDate = new Date().toISOString().slice(0, 10)
  const finalizedSessionsCount = sessions.filter((session) => session.status === 'finalizada').length
  const pendingSessionsCount = sessions.filter((session) => session.status !== 'finalizada').length
  const sortedTodaySessions = useMemo(
    () =>
      [...todaySessions].sort((a, b) => {
        const first = a.session.session_time || '23:59'
        const second = b.session.session_time || '23:59'
        return first.localeCompare(second)
      }),
    [todaySessions],
  )
  const totalSessionsCount = sessions.length
  const suspendedSessions = sessions.filter((session) => session.status === 'suspendida')
  const sessionsUntilToday = sessions.filter((session) => session.session_date <= todayDate)
  const finalizedSessionsUntilToday = sessionsUntilToday.filter((session) => session.status === 'finalizada').length
  const absentSuspensionsUntilToday = sessionsUntilToday.filter(
    (session) =>
      session.status === 'suspendida' &&
      (session.general_observation || '').toLowerCase().includes('estudiante ausente'),
  ).length
  const assistanceBase = finalizedSessionsUntilToday + absentSuspensionsUntilToday
  const attendancePercent = assistanceBase > 0 ? Math.round((finalizedSessionsUntilToday / assistanceBase) * 100) : 0
  const suspensionPercent = assistanceBase > 0 ? 100 - attendancePercent : 0
  const suspensionByAbsent = suspendedSessions.filter((session) =>
    (session.general_observation || '').toLowerCase().includes('estudiante ausente'),
  ).length
  const suspensionBySchool = suspendedSessions.filter((session) =>
    (session.general_observation || '').toLowerCase().includes('actividad escolar/suspension'),
  ).length
  const unknownSuspensionReason = Math.max(suspendedSessions.length - suspensionByAbsent - suspensionBySchool, 0)
  const attendancePieConic = `conic-gradient(#10b981 0% ${attendancePercent}%, #f59e0b ${attendancePercent}% 100%)`
  const suspendedTotal = suspendedSessions.length
  const suspendedAbsentPercent = suspendedTotal > 0 ? Math.round((suspensionByAbsent / suspendedTotal) * 100) : 0
  const suspendedSchoolPercent = suspendedTotal > 0 ? Math.round((suspensionBySchool / suspendedTotal) * 100) : 0
  const suspendedUnknownPercent = Math.max(100 - suspendedAbsentPercent - suspendedSchoolPercent, 0)
  const suspensionPieConic = `conic-gradient(
    #ef4444 0% ${suspendedAbsentPercent}%,
    #8b5cf6 ${suspendedAbsentPercent}% ${suspendedAbsentPercent + suspendedSchoolPercent}%,
    #94a3b8 ${suspendedAbsentPercent + suspendedSchoolPercent}% 100%
  )`
  const displaySessionStatus = (status) => (status === 'draft' ? 'pendiente' : status)
  const getSuspensionReasonLabel = (generalObservation) => {
    const normalized = (generalObservation || '').toLowerCase()
    if (normalized.includes('estudiante ausente')) return 'ausente'
    if (normalized.includes('actividad escolar/suspension')) return 'actividad escolar'
    return ''
  }
  const displaySessionStatusLabel = (session) => {
    const status = displaySessionStatus(session?.status)
    if (status !== 'suspendida') return status
    const reason = getSuspensionReasonLabel(session?.general_observation)
    return reason ? `suspendida (${reason})` : 'suspendida'
  }
  const apiOrigin = apiBaseUrl.replace(/\/api\/?$/, '')
  const getStoragePublicUrl = (storagePath) => {
    if (!storagePath) return ''
    const encodedPath = String(storagePath)
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')
    return `${apiOrigin}/storage/${encodedPath}`
  }
  const renderMediaPreview = (item) => {
    const mimeType = (item.mime_type || '').toLowerCase()
    const fileName = (item.stored_name || item.original_name || '').toLowerCase()
    const imageUrl = getStoragePublicUrl(item.storage_path)

    if (mimeType.startsWith('image/') && imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={item.title || item.stored_name || 'Imagen'}
          className="h-10 w-10 rounded-[5px] border border-slate-200 object-cover"
          loading="lazy"
        />
      )
    }

    const isPpt = mimeType.includes('presentation') || mimeType.includes('powerpoint') || fileName.endsWith('.ppt') || fileName.endsWith('.pptx')
    if (isPpt) {
      return (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-orange-200 bg-orange-50 text-xs font-bold text-orange-700">
          PPT
        </span>
      )
    }

    const isDoc = mimeType.includes('word') || fileName.endsWith('.doc') || fileName.endsWith('.docx')
    if (isDoc) {
      return (
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-fuchsia-200 bg-fuchsia-50 text-xs font-bold text-fuchsia-800">
          DOC
        </span>
      )
    }

    return (
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-[5px] border border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
        FILE
      </span>
    )
  }
  const chartWidth = 720
  const chartHeight = 220
  const chartPadding = 28
  const plottedSeries = sessionRatingSeries.filter((entry) => entry.averageScore !== null)
  const chartPoints = plottedSeries.map((entry, index) => {
    const x =
      chartPadding +
      (plottedSeries.length > 1
        ? (index / (plottedSeries.length - 1)) * (chartWidth - chartPadding * 2)
        : (chartWidth - chartPadding * 2) / 2)
    const normalized = ((entry.averageScore - 1) / 2) * (chartHeight - chartPadding * 2)
    const y = chartHeight - chartPadding - normalized
    return { ...entry, x, y }
  })
  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const renderPagination = (currentPage, totalPages, onPrev, onNext) => (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>
        Página {currentPage} de {totalPages}
      </span>
      <div className="flex items-center gap-2">
        <button type="button" className="actionButton" onClick={onPrev} disabled={currentPage === 1}>
          Anterior
        </button>
        <button type="button" className="actionButton" onClick={onNext} disabled={currentPage === totalPages}>
          Siguiente
        </button>
      </div>
    </div>
  )

  return (
    <AppRouter
      token={token}
      authProps={{
        authForm,
        setAuthForm,
        loginForm,
        setLoginForm,
        forgotForm,
        setForgotForm,
        resetForm,
        setResetForm,
        professions,
        onRegister,
        onLogin,
        onForgotPassword,
        onResetPassword,
      }}
    >
      <main className={token ? 'min-h-screen w-full' : 'appShell'}>
        {toast.show && (
          <div className="fixed right-4 top-4 z-[60]">
            <div
              className={`min-w-[280px] rounded-[5px] border px-4 py-3 text-sm shadow-lg ${
                toast.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
              role="alert"
              aria-live="assertive"
            >
              {toast.message}
            </div>
          </div>
        )}
        {!token && (
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-slate-700"><strong>Estado de la API</strong></p>
            <FeedbackMessage message={status} />
          </div>
        )}

      {token && (
        <section className="w-full">
          <header className="w-full bg-[#6e62e5] px-4 py-3 text-white md:px-6">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-white/15 text-sm font-bold text-white">
                  MT
                </div>
                <div>
                  <p className="text-sm font-semibold">Mi App Terapias</p>
                  <p className="text-xs text-[#ecebff]">Dashboard profesional</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentUser && (
                  <div className="group relative">
                    <button
                      type="button"
                      className="px-1 py-1 text-left text-sm font-semibold text-white/95 underline-offset-4 transition hover:text-white hover:underline"
                      aria-haspopup="menu"
                      aria-label="Abrir menú de usuario"
                    >
                      {currentUser.name}
                    </button>
                    <div
                      role="menu"
                      className="invisible absolute right-0 z-50 mt-1 w-48 rounded-[5px] border border-slate-200 bg-white py-1 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        onClick={() => setActiveSection('profile')}
                      >
                        Editar perfil
                      </button>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        onClick={onLogout}
                      >
                        Cerrar sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="grid min-h-[calc(100vh-76px)] w-full grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="border-r border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Menu</h2>
              <div className="flex flex-col gap-2">
                <button
                  className={`sidebarNavItem ${activeSection === 'overview' ? 'sidebarNavItemActive' : ''}`}
                  onClick={() => setActiveSection('overview')}
                >
                  <span className="sidebarNavItemContent">
                    <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 20V10" strokeLinecap="round" />
                      <path d="M10 20V4" strokeLinecap="round" />
                      <path d="M16 20v-7" strokeLinecap="round" />
                      <path d="M22 20v-4" strokeLinecap="round" />
                    </svg>
                    <span>Dashboard</span>
                  </span>
                </button>
                <button
                  className={`sidebarNavItem ${activeSection === 'profile' ? 'sidebarNavItemActive' : ''}`}
                  onClick={() => setActiveSection('profile')}
                >
                  <span className="sidebarNavItemContent">
                    <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c1.8-3.2 5-5 8-5s6.2 1.8 8 5" strokeLinecap="round" />
                    </svg>
                    <span>Mi perfil</span>
                  </span>
                </button>
                <button
                  className={`sidebarNavItem ${activeSection === 'students' ? 'sidebarNavItemActive' : ''}`}
                  onClick={() => setActiveSection('students')}
                >
                  <span className="sidebarNavItemContent">
                    <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m2 10 10-5 10 5-10 5-10-5Z" />
                      <path d="M6 12v4c0 1.8 2.7 3 6 3s6-1.2 6-3v-4" />
                    </svg>
                    <span>Estudiantes</span>
                  </span>
                </button>
                {selectedStudent && (
                  <button
                    className={`sidebarNavItem ${activeSection === 'studentPlans' ? 'sidebarNavItemActive' : ''}`}
                    onClick={() => setActiveSection('studentPlans')}
                  >
                    <span className="sidebarNavItemContent">
                      <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                      </svg>
                      <span>Planes de tratamiento del estudiante</span>
                    </span>
                  </button>
                )}
                {selectedPlan && (
                  <button
                    className={`sidebarNavItem ${activeSection === 'sessions' ? 'sidebarNavItemActive' : ''}`}
                    onClick={() => setActiveSection('sessions')}
                  >
                    <span className="sidebarNavItemContent">
                      <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                      </svg>
                      <span>Sesiones</span>
                    </span>
                  </button>
                )}
                {selectedSession && (
                  <button
                    className={`sidebarNavItem ${activeSection === 'sessionDetail' ? 'sidebarNavItemActive' : ''}`}
                    onClick={() => setActiveSection('sessionDetail')}
                  >
                    <span className="sidebarNavItemContent">
                      <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <path d="M14 4h6v6" />
                        <path d="M20 4 11 13" strokeLinecap="round" />
                      </svg>
                      <span>Sesión activa</span>
                    </span>
                  </button>
                )}
                <button
                  className={`sidebarNavItem ${activeSection === 'tasks' ? 'sidebarNavItemActive' : ''}`}
                  onClick={() => setActiveSection('tasks')}
                >
                  <span className="sidebarNavItemContent">
                    <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Banco de tareas</span>
                  </span>
                </button>
                <button
                  className={`sidebarNavItem ${activeSection === 'mediaLibrary' ? 'sidebarNavItemActive' : ''}`}
                  onClick={() => setActiveSection('mediaLibrary')}
                >
                  <span className="sidebarNavItemContent">
                    <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="9" cy="10" r="1.5" />
                      <path d="m6 17 4-4 3 3 3-2 2 3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>Biblioteca de medios</span>
                  </span>
                </button>
              </div>
            </aside>

            <main className="space-y-4 bg-[#f3f4f6] p-4 md:p-6">
              {selectedStudent && ['studentPlans'].includes(activeSection) && (
                <section className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                  <h2 className="text-base font-semibold text-slate-900">Contexto activo</h2>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-3">
                    <p><strong>Estudiante:</strong> {selectedStudent.full_name}</p>
                    <p><strong>Curso:</strong> {selectedStudent.course?.display_name || 'Sin curso'}</p>
                    <p><strong>RUT:</strong> {selectedStudent.rut}</p>
                    <p><strong>Apoderado:</strong> {selectedStudent.guardian_name}</p>
                    {selectedPlan && (
                      <>
                        <p><strong>Plan de tratamiento:</strong> {selectedPlan.year}</p>
                        <p><strong>Diagnóstico del plan de tratamiento:</strong> {selectedPlan.diagnosis_snapshot}</p>
                      </>
                    )}
                    {selectedSession && activeSection === 'sessionDetail' && (
                      <>
                        <p><strong>Sesión:</strong> {formatDisplayDate(selectedSession.session_date)}</p>
                        <p><strong>Objetivo sesión:</strong> {selectedSession.objective}</p>
                        <p className="xl:col-span-3">
                          <strong>Descripción sesión:</strong> {selectedSession.description || 'Sin descripción'}
                        </p>
                      </>
                    )}
                  </div>
                </section>
              )}

              {activeSection === 'overview' && (
                <>
                  <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <article className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecebff] text-[#6e62e5]" aria-hidden="true">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="m2 10 10-5 10 5-10 5-10-5Z" />
                            <path d="M6 12v4c0 1.8 2.7 3 6 3s6-1.2 6-3v-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{overviewStats.students} registrados</p>
                          <p className="text-sm font-semibold text-slate-900">Estudiantes</p>
                        </div>
                      </div>
                    </article>
                    <article className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f8e9fc] text-[#c026d3]" aria-hidden="true">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{overviewStats.plans} activos - {currentYear}</p>
                          <p className="text-sm font-semibold text-slate-900">Planes de tratamiento</p>
                        </div>
                      </div>
                    </article>
                    <article className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7fb] text-cyan-700" aria-hidden="true">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{overviewStats.finalizedSessions} completadas</p>
                          <p className="text-sm font-semibold text-slate-900">Sesiones finalizadas</p>
                        </div>
                      </div>
                    </article>
                    <article className="rounded-[10px] border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ecebff] text-violet-700" aria-hidden="true">
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="5" width="18" height="16" rx="2" />
                            <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">{overviewStats.pendingSessions} por gestionar</p>
                          <p className="text-sm font-semibold text-slate-900">Sesiones pendientes</p>
                        </div>
                      </div>
                    </article>
                  </section>

                  <section className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="text-base font-semibold text-slate-900">Resumen operativo</h2>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                      <div className="rounded-[5px] bg-slate-50 p-3 text-sm text-slate-700">
                        Biblioteca de tareas: <strong>{taskTemplates.length}</strong>
                      </div>
                      <div className="rounded-[5px] bg-slate-50 p-3 text-sm text-slate-700">
                        Historico de tareas: <strong>{taskHistory.length}</strong>
                      </div>
                      <div className="rounded-[5px] bg-slate-50 p-3 text-sm text-slate-700">
                        Sesiones del plan de tratamiento activo: <strong>{sessions.length}</strong>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-base font-semibold text-slate-900">Sesiones para hoy</h2>
                      <span className="text-xs text-slate-500">{formatDisplayDate(new Date().toISOString().slice(0, 10))}</span>
                    </div>
                    {sortedTodaySessions.length === 0 ? (
                      <p className="text-sm text-slate-500">No hay sesiones agendadas para hoy.</p>
                    ) : (
                      <div className="overflow-x-auto rounded-[5px] border border-slate-200">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Estudiante</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Hora</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Curso</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Plan</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Objetivo</th>
                              <th className="px-3 py-2 text-left font-semibold text-slate-600">Estado</th>
                              <th className="px-3 py-2 text-right font-semibold text-slate-600">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {sortedTodaySessions.map((item) => (
                              <tr key={`${item.student.id}-${item.plan.id}-${item.session.id}`} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-slate-700">{item.student.full_name}</td>
                                <td className="px-3 py-2 text-slate-700">{formatDisplayTime(item.session.session_time)}</td>
                                <td className="px-3 py-2 text-slate-700">{item.student.course?.display_name || 'Sin curso'}</td>
                                <td className="px-3 py-2 text-slate-700">{item.plan.year}</td>
                                <td className="px-3 py-2 text-slate-700">{item.session.objective}</td>
                                <td className="px-3 py-2">
                                  <span className={`rounded-[5px] px-2 py-1 text-xs font-semibold ${
                                    displaySessionStatus(item.session.status) === 'finalizada'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : displaySessionStatus(item.session.status) === 'suspendida'
                                        ? 'bg-rose-100 text-rose-700'
                                        : 'bg-amber-100 text-amber-700'
                                  }`}>
                                    {displaySessionStatusLabel(item.session)}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {(() => {
                                    const sessionStatus = displaySessionStatus(item.session.status)
                                    const actionLabel = sessionStatus === 'pendiente'
                                      ? 'Realizar sesión'
                                      : sessionStatus === 'finalizada'
                                        ? 'Ver resultados'
                                        : 'Ver sesión'
                                    const icon = sessionStatus === 'pendiente'
                                      ? (
                                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                          <rect x="3" y="5" width="18" height="16" rx="2" />
                                          <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                                          <path d="m10 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )
                                      : sessionStatus === 'finalizada'
                                        ? (
                                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path d="M4 19h16" strokeLinecap="round" />
                                            <path d="M7 15l3-3 3 2 4-5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        )
                                        : (
                                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                            <path d="M2.2 12c1.2-4 4.9-7 9.8-7s8.6 3 9.8 7c-1.2 4-4.9 7-9.8 7s-8.6-3-9.8-7Z" />
                                            <circle cx="12" cy="12" r="3" />
                                          </svg>
                                        )
                                    return (
                                  <button
                                    className="rounded-[5px] border border-slate-300 bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                                    onClick={() => onOpenTodaySession(item)}
                                  >
                                    <span className="inline-flex items-center gap-1.5">
                                      {icon}
                                      <span>{actionLabel}</span>
                                    </span>
                                  </button>
                                    )
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )}

              {activeSection === 'profile' && (
                <section className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Mi perfil</h2>
                      <p className="mt-1 text-sm text-slate-500">Actualiza tus datos personales y profesionales.</p>
                    </div>
                    {currentUser && (
                      <span className="rounded-[5px] border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                        Rol: {currentUser.role || '-'}
                      </span>
                    )}
                  </div>
                  {currentUser ? (
                    <form onSubmit={onSaveProfile} className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-name">Nombre</label>
                        <input
                          id="profile-name"
                          className="fieldInput mb-0"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-rut">RUT</label>
                        <input
                          id="profile-rut"
                          className="fieldInput mb-0"
                          value={profileForm.rut}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, rut: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-email">Email</label>
                        <input
                          id="profile-email"
                          type="email"
                          className="fieldInput mb-0"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-profession">Profesión</label>
                        <select
                          id="profile-profession"
                          className="fieldInput mb-0"
                          value={profileForm.profession_id}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, profession_id: e.target.value }))}
                        >
                          <option value="">Selecciona profesión</option>
                          {professions.map((profession) => (
                            <option key={profession.id} value={profession.id}>{profession.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-password">Nueva contraseña (opcional)</label>
                        <input
                          id="profile-password"
                          type="password"
                          className="fieldInput mb-0"
                          placeholder="Dejar vacío para mantener actual"
                          value={profileForm.password}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-password-confirmation">Confirmar nueva contraseña</label>
                        <input
                          id="profile-password-confirmation"
                          type="password"
                          className="fieldInput mb-0"
                          value={profileForm.password_confirmation}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, password_confirmation: e.target.value }))}
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end">
                        <button type="submit" className="actionButton actionButtonPrimary">
                          Guardar cambios
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">No fue posible cargar los datos de perfil.</p>
                  )}
                </section>
              )}

            {activeSection === 'tasks' && (
              <TaskBankSection
                taskTemplateFilters={taskTemplateFilters}
                onTaskTemplateFilterChange={onTaskTemplateFilterChange}
                taskCategories={taskCategories}
                editingTemplateId={editingTemplateId}
                setEditingTemplateId={setEditingTemplateId}
                templateForm={templateForm}
                setTemplateForm={setTemplateForm}
                onSaveTemplate={onSaveTemplate}
                taskTemplates={taskTemplates}
                onEditTemplate={onEditTemplate}
                onDeleteTemplate={onDeleteTemplate}
                onRestoreTemplate={onRestoreTemplate}
                onDuplicateTemplate={onDuplicateTemplate}
                onToggleFavoriteTemplate={onToggleFavoriteTemplate}
                onViewTemplateHistory={onViewTemplateHistory}
                taskHistory={taskHistory}
                formatDisplayDate={formatDisplayDate}
                ratingOptions={ratingOptions}
              />
            )}

            {activeSection === 'mediaLibrary' && (
              <section className="sectionCard">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="sectionTitle mb-0">Biblioteca de medios</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Reutiliza recursos sin volver a subirlos en cada sesión.
                    </p>
                  </div>
                </div>

                <form onSubmit={onUploadMediaLibraryItem} className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-[1.3fr_1fr_auto]">
                  <input
                    className="fieldInput mb-0"
                    placeholder="Título del recurso (opcional)"
                    value={mediaLibraryForm.title}
                    onChange={(e) => setMediaLibraryForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <input
                    type="file"
                    className="fieldInput mb-0"
                    onChange={(e) => setMediaLibraryForm((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                  />
                  <button type="submit" className="actionButton actionButtonPrimary">
                    Subir a biblioteca
                  </button>
                </form>

                <div className="overflow-x-auto rounded-[5px] border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Vista previa</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Título</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Archivo</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Uso en sesiones</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600">Opciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mediaLibraryItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                            Aún no hay recursos en tu biblioteca.
                          </td>
                        </tr>
                      )}
                      {mediaLibraryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 text-slate-700">{renderMediaPreview(item)}</td>
                          <td className="px-3 py-2 text-slate-700">{item.title}</td>
                          <td className="px-3 py-2 text-slate-700">{item.stored_name || item.original_name}</td>
                          <td className="px-3 py-2 text-slate-700">{item.session_materials_count || 0}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button type="button" className="actionButton" onClick={() => onDownloadMediaLibraryItem(item)}>
                                Descargar
                              </button>
                              <button type="button" className="actionButton" onClick={() => onDeleteMediaLibraryItem(item)}>
                                Eliminar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeSection === 'students' && (
              <>
                <section className="sectionCard">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="sectionTitle mb-0">Estudiantes</h2>
                    <button className="actionButton actionButtonPrimary" onClick={onOpenCreateStudentModal}>
                      Registrar estudiante
                    </button>
                  </div>
                  <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <input
                      className="fieldInput mb-0"
                      placeholder="Buscar por nombre, RUT o apoderado"
                      value={studentFilters.search}
                      onChange={(e) => setStudentFilters((prev) => ({ ...prev, search: e.target.value }))}
                    />
                    <select
                      className="fieldInput mb-0"
                      value={studentFilters.course}
                      onChange={(e) => setStudentFilters((prev) => ({ ...prev, course: e.target.value }))}
                    >
                      <option value="">Curso: todos</option>
                      {studentCourseOptions.map((courseName) => (
                        <option key={courseName} value={courseName}>{courseName}</option>
                      ))}
                    </select>
                    <input
                      className="fieldInput mb-0"
                      placeholder="Filtrar por diagnóstico"
                      value={studentFilters.diagnosis}
                      onChange={(e) => setStudentFilters((prev) => ({ ...prev, diagnosis: e.target.value }))}
                    />
                  </div>
                  <div className="overflow-x-auto rounded-[5px] border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Estudiante</th>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Curso</th>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Diagnóstico</th>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Apoderado</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredStudents.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                              No hay estudiantes para los filtros seleccionados.
                            </td>
                          </tr>
                        )}
                        {paginatedStudents.map((student) => (
                          <tr key={student.id} className="hover:bg-slate-50">
                            <td className="px-3 py-3">
                              <p className="font-medium text-slate-900">{student.full_name}</p>
                              <p className="text-xs text-slate-500">RUT: {student.rut}</p>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{student.course?.display_name || 'Sin curso'}</td>
                            <td className="px-3 py-3 text-slate-700">{student.student_diagnosis?.name || student.current_diagnosis}</td>
                            <td className="px-3 py-3">
                              <p className="text-slate-700">{student.guardian_name}</p>
                              <p className="text-xs text-slate-500">{student.guardian_email}</p>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  className="rounded-[5px] border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-xs font-medium text-fuchsia-800 transition hover:bg-fuchsia-100"
                                  onClick={() => onEditStudent(student)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M12 20h9" strokeLinecap="round" />
                                      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" strokeLinejoin="round" />
                                    </svg>
                                    <span>Editar</span>
                                  </span>
                                </button>
                                <button
                                  className="rounded-[5px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                  onClick={() => onSelectStudent(student)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <rect x="4" y="4" width="16" height="16" rx="2" />
                                      <path d="M8 8h8M8 12h8M8 16h5" strokeLinecap="round" />
                                    </svg>
                                    <span>Planes de tratamiento</span>
                                  </span>
                                </button>
                                <button
                                  className="rounded-[5px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                  onClick={() => onDeleteStudent(student.id)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M3 6h18" strokeLinecap="round" />
                                      <path d="M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinejoin="round" />
                                    </svg>
                                    <span>Eliminar</span>
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {filteredStudents.length > PAGE_SIZE && renderPagination(
                    safeStudentsPage,
                    studentsTotalPages,
                    () => setStudentsPage((prev) => Math.max(1, prev - 1)),
                    () => setStudentsPage((prev) => Math.min(studentsTotalPages, prev + 1)),
                  )}

                </section>
              </>
            )}
            {activeSection === 'studentPlans' && selectedStudent && (
              <section className="sectionCard">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="sectionTitle mb-0">Planes de tratamiento del estudiante</h2>
                  <div className="flex items-center gap-2">
                    <button className="actionButton actionButtonPrimary" onClick={() => setShowPlanModal(true)}>
                      Crear plan de tratamiento
                    </button>
                    <button className="actionButton" onClick={() => setActiveSection('students')}>
                      Volver a estudiantes
                    </button>
                  </div>
                </div>

                <section className="rounded-[5px] border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-lg font-semibold text-slate-900">Información del estudiante</h3>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-3">
                    <p><strong>Nombre:</strong> {selectedStudent.full_name}</p>
                    <p><strong>RUT:</strong> {selectedStudent.rut}</p>
                    <p><strong>Curso:</strong> {selectedStudent.course?.display_name || 'Sin curso'}</p>
                    <p><strong>Diagnóstico actual:</strong> {selectedStudent.current_diagnosis}</p>
                    <p><strong>Apoderado:</strong> {selectedStudent.guardian_name}</p>
                    <p><strong>Correo apoderado:</strong> {selectedStudent.guardian_email}</p>
                  </div>
                </section>

                <div className="overflow-x-auto rounded-[5px] border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Año</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Diagnóstico snapshot</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {plans.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-slate-500">
                            No hay planes de tratamiento registrados para este estudiante.
                          </td>
                        </tr>
                      )}
                      {paginatedPlans.map((plan) => (
                        <tr key={plan.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 font-medium text-slate-900">{plan.year}</td>
                          <td className="px-3 py-3 text-slate-700">{plan.diagnosis_snapshot}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                className="rounded-[5px] border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-xs font-medium text-fuchsia-800 transition hover:bg-fuchsia-100"
                                onClick={() => onSelectPlan(plan)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <rect x="3" y="5" width="18" height="16" rx="2" />
                                    <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                                  </svg>
                                  <span>Sesiones</span>
                                </span>
                              </button>
                              <button
                                className="rounded-[5px] border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-100"
                                onClick={() => onDownloadPlanConsolidatedPdf(plan.id)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                                    <path d="M14 3v5h5M8 14h8M8 18h5" strokeLinecap="round" />
                                  </svg>
                                  <span>PDF</span>
                                </span>
                              </button>
                              <button
                                className="rounded-[5px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                onClick={() => onDeletePlan(plan.id)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M3 6h18" strokeLinecap="round" />
                                    <path d="M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinejoin="round" />
                                  </svg>
                                  <span>Eliminar</span>
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {plans.length > PAGE_SIZE && renderPagination(
                  safePlansPage,
                  plansTotalPages,
                  () => setPlansPage((prev) => Math.max(1, prev - 1)),
                  () => setPlansPage((prev) => Math.min(plansTotalPages, prev + 1)),
                )}

              </section>
            )}
            {activeSection === 'sessions' && selectedStudent && selectedPlan && (
              <section className="sectionCard">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="sectionTitle mb-0">Sesiones del plan de tratamiento {selectedPlan.year}</h2>
                  <div className="flex items-center gap-2">
                    <button className="actionButton actionButtonPrimary" onClick={onOpenCreateSessionModal}>
                      Crear sesión
                    </button>
                    <button className="actionButton" onClick={() => setActiveSection('studentPlans')}>
                      Volver a planes de tratamiento
                    </button>
                  </div>
                </div>

                <section className="rounded-[5px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <article className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm lg:col-span-1">
                      <h3 className="text-base font-semibold text-slate-900">Información del estudiante</h3>
                      <div className="mt-3 space-y-2 text-sm text-slate-700">
                        <p><strong>Nombre:</strong> {selectedStudent.full_name}</p>
                        <p><strong>Curso:</strong> {selectedStudent.course?.display_name || 'Sin curso'}</p>
                        <p><strong>Diagnóstico:</strong> {selectedStudent.current_diagnosis}</p>
                        <p><strong>Apoderado:</strong> {selectedStudent.guardian_name}</p>
                        <p><strong>Correo:</strong> {selectedStudent.guardian_email}</p>
                        <p><strong>Teléfono:</strong> {selectedStudent.guardian_phone || 'Sin teléfono'}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Asistencia</p>
                          <div className="mt-2 flex items-center gap-3">
                            <div className="relative h-20 w-20 rounded-full" style={{ background: attendancePieConic }}>
                              <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                            </div>
                            <div className="space-y-1 text-xs text-slate-700">
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Asistencia: <strong>{attendancePercent}%</strong></p>
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Inasistencia: <strong>{suspensionPercent}%</strong></p>
                              <p className="pt-1 text-slate-500">Base: {finalizedSessionsUntilToday}/{assistanceBase || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivos de suspensión</p>
                          {suspendedTotal === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">Sin sesiones suspendidas.</p>
                          ) : (
                            <div className="mt-2 flex items-center gap-3">
                              <div className="relative h-20 w-20 rounded-full" style={{ background: suspensionPieConic }}>
                                <div className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
                              </div>
                              <div className="space-y-1 text-xs text-slate-700">
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Ausente: <strong>{suspensionByAbsent}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Actividad: <strong>{suspensionBySchool}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />Sin motivo: <strong>{unknownSuspensionReason}</strong></p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>

                    <article className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
                      <h3 className="text-base font-semibold text-slate-900">Gráfico de sesiones</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Rendimiento porcentual por sesión basado en las calificaciones de tareas.
                      </p>
                      <div className="mt-4 rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                        {chartPoints.length > 0 ? (
                          <div className="overflow-x-auto">
                            <svg
                              className="session-chart min-w-[640px]"
                              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                              role="img"
                              aria-label="Gráfico lineal de promedio de calificaciones por sesión"
                            >
                              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" strokeWidth="1" />
                              <line x1={chartPadding} y1={chartPadding} x2={chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" strokeWidth="1" />
                              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#fde68a" strokeWidth="1" strokeDasharray="4 4" />
                              <line x1={chartPadding} y1={chartHeight / 2} x2={chartWidth - chartPadding} y2={chartHeight / 2} stroke="#fde68a" strokeWidth="1" strokeDasharray="4 4" />
                              <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} stroke="#fde68a" strokeWidth="1" strokeDasharray="4 4" />
                              <polyline
                                className="session-chart-line"
                                fill="none"
                                stroke="#a21caf"
                                strokeWidth="2.5"
                                points={polylinePoints}
                              />
                              {chartPoints.map((point) => (
                                <g key={point.sessionId}>
                                  <circle
                                    className="session-chart-point"
                                    cx={point.x}
                                    cy={point.y}
                                    r="5.5"
                                    fill="#a21caf"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                  >
                                    <title>{`${point.sessionDate}: ${point.performancePercent}%`}</title>
                                  </circle>
                                  <text x={point.x} y={chartHeight - 8} textAnchor="middle" fontSize="10" fill="#475569">
                                    {formatDisplayDate(point.sessionDate)}
                                  </text>
                                </g>
                              ))}
                              <text x={8} y={chartPadding + 2} fontSize="10" fill="#475569">100%</text>
                              <text x={8} y={chartHeight / 2 + 2} fontSize="10" fill="#475569">50%</text>
                              <text x={8} y={chartHeight - chartPadding + 2} fontSize="10" fill="#475569">0%</text>
                            </svg>
                          </div>
                        ) : (
                          <div className="flex min-h-[180px] items-center justify-center text-sm text-slate-500">
                            Sin calificaciones registradas para graficar.
                          </div>
                        )}
                      </div>
                    </article>
                  </div>

                  <p className="mt-4 rounded-[5px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                    Sesiones finalizadas: <strong>{finalizedSessionsCount}</strong> - Sesiones pendientes: <strong>{pendingSessionsCount}</strong>
                  </p>
                </section>

                <div className="overflow-x-auto rounded-[5px] border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Fecha</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Objetivo</th>
                        <th className="px-3 py-3 text-left font-semibold text-slate-600">Estado</th>
                        <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                            No hay sesiones registradas para este plan de tratamiento.
                          </td>
                        </tr>
                      )}
                      {paginatedSessions.map((session) => (
                        <tr key={session.id} className="hover:bg-slate-50">
                          <td className="px-3 py-3 text-slate-700">{formatDisplayDate(session.session_date)}</td>
                          <td className="px-3 py-3 text-slate-700">{session.objective}</td>
                          <td className="px-3 py-3">
                            <span className={`rounded-[5px] px-2 py-1 text-xs font-semibold ${
                              displaySessionStatus(session.status) === 'finalizada'
                                ? 'bg-emerald-100 text-emerald-700'
                                : displaySessionStatus(session.status) === 'suspendida'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {displaySessionStatusLabel(session)}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap justify-end gap-2">
                              <button
                                className="rounded-[5px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                                onClick={() => onSelectSession(session)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M2.2 12c1.2-4 4.9-7 9.8-7s8.6 3 9.8 7c-1.2 4-4.9 7-9.8 7s-8.6-3-9.8-7Z" />
                                    <circle cx="12" cy="12" r="3" />
                                  </svg>
                                  <span>Ver sesión</span>
                                </span>
                              </button>
                              <button
                                className="rounded-[5px] border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-xs font-medium text-fuchsia-800 transition hover:bg-fuchsia-100"
                                onClick={() => onEditSession(session)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                    <path d="M12 20h9" strokeLinecap="round" />
                                    <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" strokeLinejoin="round" />
                                  </svg>
                                  <span>Editar</span>
                                </span>
                              </button>
                              {displaySessionStatus(session.status) === 'finalizada' && (
                                <button
                                  className="rounded-[5px] border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-100"
                                  onClick={() => onDownloadSessionPdf(session.id)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
                                      <path d="M14 3v5h5M8 14h8M8 18h5" strokeLinecap="round" />
                                    </svg>
                                    <span>PDF</span>
                                  </span>
                                </button>
                              )}
                              {displaySessionStatus(session.status) === 'pendiente' && (
                                <button
                                  className="rounded-[5px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                  onClick={() => onDeleteSession(session.id)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M3 6h18" strokeLinecap="round" />
                                      <path d="M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinejoin="round" />
                                    </svg>
                                    <span>Eliminar</span>
                                  </span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {sessions.length > PAGE_SIZE && renderPagination(
                  safeSessionsPage,
                  sessionsTotalPages,
                  () => setSessionsPage((prev) => Math.max(1, prev - 1)),
                  () => setSessionsPage((prev) => Math.min(sessionsTotalPages, prev + 1)),
                )}

              </section>
            )}
            {activeSection === 'sessionDetail' && selectedStudent && selectedPlan && selectedSession && (
              <section className="sectionCard">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="sectionTitle mb-0">Sesión del {formatDisplayDate(selectedSession.session_date)}</h2>
                    {selectedSession.status === 'finalizada' && (
                      <span className="rounded-[5px] border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                        Sesión finalizada
                      </span>
                    )}
                  </div>
                  <button className="actionButton cursor-pointer" onClick={() => setActiveSection('sessions')}>
                    Volver a sesiones
                  </button>
                </div>

                <section className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-base font-semibold text-slate-900">Información general</h4>
                  <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-slate-700 lg:grid-cols-2">
                    <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Sesión</p>
                      <div className="space-y-2">
                        <p><strong>Fecha:</strong> {formatDisplayDate(selectedSession.session_date)}</p>
                        <p><strong>Estado:</strong> {selectedSession.status}</p>
                        <p><strong>Objetivo:</strong> {selectedSession.objective}</p>
                        <p><strong>Descripción:</strong> {selectedSession.description || 'Sin descripción'}</p>
                      </div>
                    </div>
                    <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Estudiante</p>
                      <div className="space-y-2">
                        <p><strong>Nombre:</strong> {selectedStudent.full_name}</p>
                        <p><strong>Curso:</strong> {selectedStudent.course?.display_name || 'Sin curso'}</p>
                        <p><strong>RUT:</strong> {selectedStudent.rut}</p>
                        <p><strong>Plan de tratamiento:</strong> {selectedPlan.year}</p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className={`mt-4 rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                  selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                }`}>
                  <h4 className="text-base font-semibold text-slate-900">Crear tarea para la sesión</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Primero crea o importa la tarea. La calificación se aplica cuando el profesional la ejecuta con el estudiante.
                  </p>
                  {selectedSession.status === 'finalizada' && (
                    <p className="mt-2 rounded-[5px] border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      Contenido bloqueado: la sesión está finalizada.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`actionButton actionButtonPrimary ${
                        selectedSession.status === 'finalizada' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      }`}
                      onClick={onOpenCreateTaskModal}
                      disabled={selectedSession.status === 'finalizada'}
                    >
                      Crear tarea
                    </button>
                    <button
                      type="button"
                      className={`actionButton ${
                        selectedSession.status === 'finalizada' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                      }`}
                      onClick={onOpenImportTaskModal}
                      disabled={selectedSession.status === 'finalizada'}
                    >
                      Importar tarea
                    </button>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-[5px] border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Tarea</th>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Descripción</th>
                          <th className="px-3 py-3 text-left font-semibold text-slate-600">Calificación</th>
                          <th className="px-3 py-3 text-right font-semibold text-slate-600">Opciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sessionTasks.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                              Esta sesión no tiene tareas creadas.
                            </td>
                          </tr>
                        )}
                        {sessionTasks.map((task) => (
                          <tr key={task.id} className="hover:bg-slate-50">
                            <td className="px-3 py-3 text-slate-700">{task.name}</td>
                            <td className="px-3 py-3 text-slate-700">{task.description || 'Sin descripción'}</td>
                            <td className="px-3 py-3 text-slate-700">
                              <select
                                className={`fieldInput mb-0 min-w-[210px] ${
                                  selectedSession.status === 'finalizada' ? 'cursor-not-allowed bg-slate-100 text-slate-500' : 'cursor-pointer'
                                }`}
                                value={task.rating || ''}
                                onChange={(e) => onChangeSessionTaskRating(task, e.target.value)}
                                aria-label={`Calificacion de ${task.name}`}
                                disabled={selectedSession.status === 'finalizada'}
                              >
                                <option value="">Calificar</option>
                                {ratingOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.dot} {option.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button
                                  className="cursor-pointer rounded-[5px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                  onClick={() => onDeleteSessionTask(task.id)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M3 6h18" strokeLinecap="round" />
                                      <path d="M8 6V4h8v2M6 6l1 14h10l1-14" strokeLinejoin="round" />
                                    </svg>
                                    <span>Eliminar</span>
                                  </span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className={`mt-4 rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                  selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                }`}>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Observación general de la sesión
                  </label>
                  <textarea
                    className={`fieldInput mb-0 min-h-24 ${
                      selectedSession.status === 'finalizada' ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''
                    }`}
                    placeholder="Observaciones generales de la sesión..."
                    value={sessionObservation}
                    onChange={(e) => setSessionObservation(e.target.value)}
                    disabled={selectedSession.status === 'finalizada'}
                  />
                </section>

                <section className={`mt-4 rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                  selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                }`}>
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Material complementario en sesión
                  </h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Puedes reutilizar recursos desde tu biblioteca o subir uno nuevo desde tu PC.
                  </p>

                  <form onSubmit={onUploadSessionMaterial} className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1.2fr_1fr_auto]">
                    <input
                      className={`fieldInput mb-0 ${selectedSession.status === 'finalizada' ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                      placeholder="Título del material (opcional)"
                      value={sessionMaterialForm.title}
                      onChange={(e) => setSessionMaterialForm((prev) => ({ ...prev, title: e.target.value }))}
                      disabled={selectedSession.status === 'finalizada'}
                    />
                    <select
                      className={`fieldInput mb-0 ${selectedSession.status === 'finalizada' ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                      value={sessionMaterialForm.media_library_item_id}
                      onChange={(e) => setSessionMaterialForm((prev) => ({ ...prev, media_library_item_id: e.target.value, file: null }))}
                      disabled={selectedSession.status === 'finalizada'}
                    >
                      <option value="">Biblioteca: seleccionar recurso</option>
                      {mediaLibraryItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.stored_name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="file"
                      className={`fieldInput mb-0 ${selectedSession.status === 'finalizada' ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''}`}
                      onChange={(e) => setSessionMaterialForm((prev) => ({ ...prev, file: e.target.files?.[0] || null, media_library_item_id: '' }))}
                      disabled={selectedSession.status === 'finalizada'}
                    />
                    <button
                      type="submit"
                      className="actionButton actionButtonPrimary"
                      disabled={selectedSession.status === 'finalizada' || isUploadingSessionMaterial}
                    >
                      {isUploadingSessionMaterial ? 'Subiendo...' : 'Subir material'}
                    </button>
                  </form>

                  <div className="mt-3 overflow-x-auto rounded-[5px] border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Título</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Archivo</th>
                          <th className="px-3 py-2 text-left font-semibold text-slate-600">Peso</th>
                          <th className="px-3 py-2 text-right font-semibold text-slate-600">Opciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sessionMaterials.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                              No hay material complementario cargado en esta sesión.
                            </td>
                          </tr>
                        )}
                        {sessionMaterials.map((material) => (
                          <tr key={material.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-slate-700">{material.title}</td>
                            <td className="px-3 py-2 text-slate-700">{material.media_item?.stored_name || material.original_name}</td>
                            <td className="px-3 py-2 text-slate-700">{Math.max(1, Math.round((material.size_bytes || 0) / 1024))} KB</td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap justify-end gap-2">
                                <button type="button" className="actionButton" onClick={() => onDownloadSessionMaterial(material)}>
                                  Descargar
                                </button>
                                <button
                                  type="button"
                                  className="actionButton"
                                  onClick={() => onDeleteSessionMaterial(material.id)}
                                  disabled={selectedSession.status === 'finalizada'}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="mt-4 flex flex-wrap items-center gap-2">
                  {selectedSession.status === 'finalizada' ? (
                    <button type="button" className="actionButton actionButtonPrimary cursor-pointer" onClick={onReopenSession}>
                      Volver a editar
                    </button>
                  ) : (
                    <button type="button" className="actionButton actionButtonPrimary cursor-pointer" onClick={onFinalizeSession}>
                      Finalizar sesión
                    </button>
                  )}
                  {selectedSession.status !== 'finalizada' && (
                    <button type="button" className="actionButton cursor-pointer" onClick={() => setShowSuspendModal(true)}>
                      Suspender sesión
                    </button>
                  )}
                  {selectedSession.status === 'finalizada' && (
                    <button
                      type="button"
                      className="actionButton cursor-pointer"
                      onClick={() => onDownloadSessionPdf(selectedSession.id)}
                    >
                      Generar PDF
                    </button>
                  )}
                </section>
              </section>
            )}
            {isTaskModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showTaskModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowTaskModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-xl rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showTaskModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {taskCreationMode === 'import' ? 'Importar tarea' : 'Crear tarea'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {taskCreationMode === 'import'
                          ? 'Selecciona una plantilla y ajusta los datos antes de guardar.'
                          : 'Registra nombre y descripción de la tarea para esta sesión.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowTaskModal(false)}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={onSaveSessionTask}>
                    <div className="space-y-3 px-5 py-4">
                      {taskCreationMode === 'import' && (
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Plantillas (selección múltiple)
                          </label>
                          <select
                            className="fieldInput mb-0"
                            multiple
                            value={taskForm.task_template_ids}
                            onChange={(e) => {
                              const selectedValues = Array.from(e.target.selectedOptions).map((option) => option.value)
                              onTemplateMultiSelectionChange(selectedValues)
                            }}
                          >
                            {taskTemplates.map((template) => (
                              <option key={template.id} value={template.id}>{template.name}</option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-slate-500">Mantén presionada la tecla Ctrl para seleccionar varias.</p>
                        </div>
                      )}

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Nombre
                        </label>
                        <input
                          className="fieldInput mb-0"
                          placeholder="Nombre de tarea"
                          value={taskForm.name}
                          onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Descripción
                        </label>
                        <input
                          className="fieldInput mb-0"
                          placeholder="Descripción"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        />
                      </div>

                      {taskCreationMode === 'import' && taskForm.task_template_ids.length > 0 && (
                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vista previa</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">{taskForm.name || 'Sin nombre'}</p>
                          <p className="mt-1 text-sm text-slate-700">{taskForm.description || 'Sin descripción'}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            Se importarán {taskForm.task_template_ids.length} tareas a la sesión.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                      <button type="button" className="actionButton" onClick={() => setShowTaskModal(false)}>
                        Cancelar
                      </button>
                      <button className="actionButton actionButtonPrimary">Guardar tarea</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {isSuspendModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showSuspendModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowSuspendModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showSuspendModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Suspender sesión</h2>
                      <p className="mt-1 text-sm text-slate-500">Selecciona el motivo de suspensión.</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowSuspendModal(false)}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Motivo
                    </label>
                    <select
                      className="fieldInput mb-0"
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                    >
                      <option value="estudiante_ausente">Estudiante ausente</option>
                      <option value="actividad_escolar_suspension">Actividad escolar/suspensión</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button type="button" className="actionButton" onClick={() => setShowSuspendModal(false)}>
                      Cancelar
                    </button>
                    <button type="button" className="actionButton actionButtonPrimary" onClick={onSuspendSession}>
                      Confirmar suspensión
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isPlanModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showPlanModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowPlanModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-xl rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showPlanModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Crear plan de tratamiento</h2>
                      <p className="mt-1 text-sm text-slate-500">Define el año académico para el nuevo plan de tratamiento.</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowPlanModal(false)}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={onCreatePlan}>
                    <div className="px-5 py-4">
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="plan-year">Año</label>
                      <input
                        id="plan-year"
                        className="fieldInput mb-0"
                        type="number"
                        min="2000"
                        max="2100"
                        value={planForm.year}
                        onChange={(e) => setPlanForm({ year: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                      <button type="button" className="actionButton" onClick={() => setShowPlanModal(false)}>
                        Cancelar
                      </button>
                      <button className="actionButton actionButtonPrimary">Crear plan de tratamiento</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {isSessionModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showSessionModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowSessionModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-2xl rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showSessionModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{editingSessionId ? 'Editar sesión' : 'Crear sesión'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Completa los datos principales de la sesión.</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowSessionModal(false)}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={onSaveSession}>
                    <div className="grid gap-3 px-5 py-4">
                      {sessionModalError && (
                        <p className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 md:col-span-2">
                          {sessionModalError}
                        </p>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="session-date">Fecha</label>
                        <input
                          id="session-date"
                          className="fieldInput mb-0"
                          type="date"
                          value={sessionForm.session_date}
                          onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="session-time">Hora</label>
                        <input
                          id="session-time"
                          className="fieldInput mb-0"
                          type="time"
                          value={sessionForm.session_time}
                          onChange={(e) => setSessionForm({ ...sessionForm, session_time: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="session-objective">Objetivo</label>
                        <input
                          id="session-objective"
                          className="fieldInput mb-0"
                          placeholder="Objetivo de la sesión"
                          value={sessionForm.objective}
                          onChange={(e) => setSessionForm({ ...sessionForm, objective: e.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="session-description">Descripción</label>
                        <input
                          id="session-description"
                          className="fieldInput mb-0"
                          placeholder="Descripción"
                          value={sessionForm.description}
                          onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                      <button type="button" className="actionButton" onClick={() => setShowSessionModal(false)}>
                        Cancelar
                      </button>
                      <button className="actionButton actionButtonPrimary">
                        {editingSessionId ? 'Actualizar sesión' : 'Crear sesión'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {isStudentModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showStudentModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowStudentModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-3xl rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showStudentModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">{editingId ? 'Editar estudiante' : 'Registrar estudiante'}</h2>
                      <p className="mt-1 text-sm text-slate-500">Completa los datos del estudiante y su contacto de apoderado.</p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowStudentModal(false)}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={onSaveStudent}>
                    <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-full-name">Nombre completo</label>
                        <input id="student-full-name" className="fieldInput mb-0" placeholder="Nombre completo" value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-rut">RUT</label>
                        <input id="student-rut" className="fieldInput mb-0" placeholder="11.111.111-1" value={studentForm.rut} onChange={(e) => setStudentForm({ ...studentForm, rut: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-diagnosis">Diagnóstico actual</label>
                        <select
                          id="student-diagnosis"
                          className="fieldInput mb-0"
                          value={studentForm.student_diagnosis_id || ''}
                          onChange={(e) => setStudentForm({ ...studentForm, student_diagnosis_id: e.target.value, new_diagnosis_name: '' })}
                        >
                          <option value="">Seleccionar diagnóstico</option>
                          {studentDiagnoses.map((d) => (
                            <option key={d.id} value={String(d.id)}>{d.name}</option>
                          ))}
                          <option value="__new__">+ Crear nuevo diagnóstico</option>
                        </select>
                      </div>
                      {studentForm.student_diagnosis_id === '__new__' && (
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-new-diagnosis">Nuevo diagnóstico</label>
                          <input
                            id="student-new-diagnosis"
                            className="fieldInput mb-0"
                            placeholder="Ej: TEL expresivo leve"
                            value={studentForm.new_diagnosis_name}
                            onChange={(e) => setStudentForm({ ...studentForm, new_diagnosis_name: e.target.value })}
                          />
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-level">Nivel</label>
                        <select id="student-level" className="fieldInput mb-0" value={studentForm.school_level_id} onChange={(e) => setStudentForm({ ...studentForm, school_level_id: e.target.value, school_course_id: '' })}>
                          <option value="">Nivel</option>
                          {levels.map((l) => <option key={l.id} value={l.id}>{l.display_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-course">Curso</label>
                        <select id="student-course" className="fieldInput mb-0" value={studentForm.school_course_id} onChange={(e) => setStudentForm({ ...studentForm, school_course_id: e.target.value })}>
                          <option value="">Curso</option>
                          {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="guardian-name">Nombre apoderado</label>
                        <input id="guardian-name" className="fieldInput mb-0" placeholder="Nombre apoderado" value={studentForm.guardian_name} onChange={(e) => setStudentForm({ ...studentForm, guardian_name: e.target.value })} />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="guardian-phone">Teléfono apoderado</label>
                        <input id="guardian-phone" className="fieldInput mb-0" placeholder="Teléfono apoderado" value={studentForm.guardian_phone} onChange={(e) => setStudentForm({ ...studentForm, guardian_phone: e.target.value })} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="guardian-email">Email apoderado</label>
                        <input id="guardian-email" className="fieldInput mb-0" placeholder="Email apoderado" value={studentForm.guardian_email} onChange={(e) => setStudentForm({ ...studentForm, guardian_email: e.target.value })} />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                      <button type="button" className="actionButton" onClick={() => setShowStudentModal(false)}>
                        Cancelar
                      </button>
                      <button className="actionButton actionButtonPrimary">{editingId ? 'Actualizar' : 'Crear'}</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            </main>
          </div>
        </section>
      )}
      </main>
    </AppRouter>
  )
}

export default App
