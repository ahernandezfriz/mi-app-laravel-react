import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import AppRouter from './app/router/AppRouter'
import TaskBankSection from './features/taskTemplates/components/TaskBankSection'
import WorkshopsSection from './features/workshops/components/WorkshopsSection'
import WorkshopCourseSection from './features/workshops/components/WorkshopCourseSection'
import WorkshopDetailSection from './features/workshops/components/WorkshopDetailSection'
import FeedbackMessage from './shared/components/FeedbackMessage'
import StudentContextCard from './shared/components/StudentContextCard'
import SessionContextCard from './shared/components/SessionContextCard'
import IndicatorDonut from './shared/components/IndicatorDonut'
import AppFooter from './shared/components/AppFooter'
import SessionsDayCalendar from './shared/components/SessionsDayCalendar'
import DashboardScheduledSessions from './features/dashboard/components/DashboardScheduledSessions'
import { monthYearFromISODate, toLocalISODate } from './shared/utils/date'
import { formatExactAge, getBirthDateValidationError } from './shared/utils/exactAge'
import { formatRut, getRutValidationError, normalizeRutInput } from './shared/utils/rut'
import {
  buildSuspensionObservation,
  getSuspensionReasonDisplayLabel,
  getSuspensionReasonShortLabel,
  parseSuspensionReasonValue,
  sessionHasSuspensionReason,
  SUSPENSION_REASON_OPTIONS,
} from './shared/utils/suspensionReason'

const apiBaseUrl = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:8080/api' : '/api')
const PAGE_SIZE = 10

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

function emptyWorkshopForm(overrides = {}) {
  return {
    name: '',
    objective: '',
    description: '',
    held_on: toLocalISODate(),
    school_level_id: '',
    school_course_id: '',
    file: null,
    media_library_item_id: '',
    urls: [],
    fromExistingCourse: false,
    ...overrides,
  }
}

const initialStudent = {
  full_name: '',
  rut: '',
  birth_date: '',
  diagnosis_ids: [],
  diagnosis_picker: '',
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

function normalizeSessionTime(value) {
  if (!value) return '09:00'
  const match = String(value).trim().match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : '09:00'
}
const validSections = new Set(['overview', 'profile', 'students', 'studentPlans', 'sessions', 'sessionDetail', 'tasks', 'mediaLibrary', 'workshops', 'workshopCourse', 'workshopDetail'])
const APP_BASE = '/app'

function getSectionFromPath(pathname) {
  const cleanPath = String(pathname || '').replace(/\/+$/, '')
  const parts = cleanPath.split('/').filter(Boolean)
  // Acepta /app/dashboard/... y (legacy) /dashboard/...
  const dashboardIdx = parts[0] === 'app' && parts[1] === 'dashboard'
    ? 1
    : parts[0] === 'dashboard'
      ? 0
      : -1
  if (dashboardIdx < 0) return 'overview'
  const candidate = parts[dashboardIdx + 1] || 'overview'
  return validSections.has(candidate) ? candidate : 'overview'
}

function dashboardPath(section) {
  return `${APP_BASE}/dashboard/${section}`
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
  const [suspendModalError, setSuspendModalError] = useState('')
  const [isSuspendingSession, setIsSuspendingSession] = useState(false)
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
    objective: '',
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
  const [workshopCourses, setWorkshopCourses] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [selectedWorkshopCourse, setSelectedWorkshopCourse] = useState(null)
  const [selectedWorkshop, setSelectedWorkshop] = useState(null)
  const [workshopForm, setWorkshopForm] = useState(() => emptyWorkshopForm())
  const [editingWorkshopId, setEditingWorkshopId] = useState(null)
  const [savingWorkshop, setSavingWorkshop] = useState(false)
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
  const [scheduledSessions, setScheduledSessions] = useState([])
  const [dashboardSelectedDate, setDashboardSelectedDate] = useState(() => toLocalISODate())
  const [dashboardCalendarMonth, setDashboardCalendarMonth] = useState(() => monthYearFromISODate(toLocalISODate()))
  const [sessionCountsByDate, setSessionCountsByDate] = useState({})
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
  const [authFeedback, setAuthFeedback] = useState('')
  const [authFeedbackType, setAuthFeedbackType] = useState('info')
  const [studentFormErrors, setStudentFormErrors] = useState({})
  const [isSavingStudent, setIsSavingStudent] = useState(false)
  const healthUrl = useMemo(() => `${apiBaseUrl}/health`, [])

  const setActiveSection = useCallback((nextSection) => {
    setActiveSectionState(nextSection)
    if (!token) return
    if (!validSections.has(nextSection)) return
    const nextPath = dashboardPath(nextSection)
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }
  }, [token])

  const api = useCallback(async (path, options = {}) => {
    const { skipAuth = false, headers: optionHeaders, timeoutMs = 20000, ...fetchOptions } = options
    const sendAuth = Boolean(token && !skipAuth)
    const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const requestedMethod = String(fetchOptions.method || 'GET').toUpperCase()
    const overrideMethod = ['PUT', 'PATCH', 'DELETE'].includes(requestedMethod) ? requestedMethod : null
    const requestMethod = overrideMethod ? 'POST' : requestedMethod
    const requestPath = overrideMethod
      ? `${path}${path.includes('?') ? '&' : '?'}_method=${overrideMethod}`
      : path

    let response
    try {
      response = await fetch(`${apiBaseUrl}${requestPath}`, {
        ...fetchOptions,
        method: requestMethod,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
          ...(overrideMethod ? { 'X-HTTP-Method-Override': overrideMethod } : {}),
          ...(sendAuth ? { Authorization: `Bearer ${token}` } : {}),
          ...(optionHeaders || {}),
        },
      })
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error('El servidor no respondió a tiempo. Revisa que la API esté disponible.')
      }
      throw new Error('No se pudo conectar con la API. Verifica que los servicios estén levantados.')
    } finally {
      clearTimeout(timeoutId)
    }

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
      throw new Error(validationDetail || data.message || 'Error en solicitud')
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

  const loadWorkshopCourses = useCallback(async () => {
    try {
      const data = await api('/workshop-courses')
      setWorkshopCourses(data)
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadWorkshops = useCallback(async (courseId) => {
    if (!courseId) {
      setWorkshops([])
      return
    }
    try {
      const data = await api(`/workshops?school_course_id=${courseId}`)
      setWorkshops(data)
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
          loadWorkshopCourses(),
          loadStudentDiagnoses(),
          loadCurrentUser(),
        ])
      }
    }
    load()
  }, [token, loadStudents, loadTaskTemplates, loadTaskCategories, loadMediaLibraryItems, loadWorkshopCourses, loadStudentDiagnoses, loadCurrentUser])

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
      rut: formatRut(currentUser.rut || ''),
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
    const normalizedPath = dashboardPath(sectionFromPath)
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
            const status = session.status === 'draft' ? 'pendiente' : session.status
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
              status,
              suspensionReason: status === 'suspendida'
                ? parseSuspensionReasonValue(session.general_observation)
                : null,
              suspensionLabel: status === 'suspendida'
                ? (getSuspensionReasonDisplayLabel(session.general_observation) || 'Sin motivo')
                : '',
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
    async function loadScheduledSessions() {
      if (!token) {
        setScheduledSessions([])
        return
      }

      try {
        const sessionsByDay = await api(`/sessions/today?date=${dashboardSelectedDate}`)
        setScheduledSessions(sessionsByDay)
      } catch {
        setScheduledSessions([])
      }
    }

    loadScheduledSessions()
  }, [api, token, dashboardSelectedDate, sessions, plans, students])

  useEffect(() => {
    async function loadCalendarCounts() {
      if (!token || activeSection !== 'overview') {
        return
      }

      try {
        const counts = await api(
          `/sessions/calendar-counts?year=${dashboardCalendarMonth.year}&month=${dashboardCalendarMonth.month}`,
        )
        setSessionCountsByDate(counts)
      } catch {
        setSessionCountsByDate({})
      }
    }

    loadCalendarCounts()
  }, [activeSection, api, dashboardCalendarMonth, token, sessions, plans, students])

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

  useEffect(() => {
    if (!token || !['workshops', 'workshopCourse', 'workshopDetail'].includes(activeSection)) return
    loadWorkshopCourses()
  }, [activeSection, loadWorkshopCourses, token])

  useEffect(() => {
    if (!token || (activeSection !== 'workshopCourse' && activeSection !== 'workshopDetail')) return
    if (!selectedWorkshopCourse) {
      setActiveSection('workshops')
      return
    }
    loadWorkshops(selectedWorkshopCourse.id)
  }, [activeSection, loadWorkshops, selectedWorkshopCourse, setActiveSection, token])

  useEffect(() => {
    if (!token || activeSection !== 'workshopDetail') return
    if (!selectedWorkshop) {
      setActiveSection(selectedWorkshopCourse ? 'workshopCourse' : 'workshops')
    }
  }, [activeSection, selectedWorkshop, selectedWorkshopCourse, setActiveSection, token])

  async function onRegister(e) {
    e.preventDefault()
    const name = authForm.name.trim()
    const rut = formatRut(authForm.rut)
    const email = authForm.email.trim()
    const password = authForm.password
    const professionId = Number(authForm.profession_id)

    if (name.length < 3) {
      notifyAuth('El nombre debe tener al menos 3 caracteres.', 'error')
      return
    }
    const rutError = getRutValidationError(rut)
    if (rutError) {
      notifyAuth(rutError, 'error')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      notifyAuth('Ingresa un correo valido.', 'error')
      return
    }
    if (password.length < 8) {
      notifyAuth('La contrasena debe tener al menos 8 caracteres.', 'error')
      return
    }
    if (!professionId) {
      notifyAuth('Selecciona una profesion.', 'error')
      return
    }

    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          rut,
          email,
          password,
          profession_id: professionId,
        }),
        skipAuth: true,
      })
      localStorage.setItem('token', data.token)
      setCurrentUser(data.user || null)
      setAuthFeedback('')
      notifyUser('Registro correcto. Bienvenido.', 'success')
      setToken(data.token)
    } catch (error) {
      notifyAuth(error.message || 'No se pudo completar el registro.', 'error')
    }
  }

  async function onLogin(e) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginForm.email.trim())) {
      notifyAuth('Ingresa un correo valido.', 'error')
      return
    }
    if (loginForm.password.length < 6) {
      notifyAuth('La contrasena es obligatoria.', 'error')
      return
    }

    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginForm.email.trim(),
          password: loginForm.password,
        }),
        skipAuth: true,
      })
      localStorage.setItem('token', data.token)
      setCurrentUser(data.user || null)
      setAuthFeedback('')
      notifyUser('Login correcto', 'success')
      setToken(data.token)
    } catch (error) {
      notifyAuth(error.message || 'No se pudo iniciar sesion.', 'error')
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
      notifyAuth(data.message || 'Si el email existe, se envio el enlace.', 'success')
    } catch (error) {
      notifyAuth(error.message || 'No se pudo enviar el enlace.', 'error')
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
      notifyAuth(data.message || 'Contrasena actualizada.', 'success')
      setResetForm({ token: '', email: '', password: '', password_confirmation: '' })
    } catch (error) {
      notifyAuth(error.message || 'No se pudo actualizar la contrasena.', 'error')
    }
  }

  async function onSaveProfile(e) {
    e.preventDefault()

    if (!currentUser) return

    const rut = formatRut(profileForm.rut)
    const rutError = getRutValidationError(rut)
    if (rutError) {
      notifyUser(rutError, 'error')
      return
    }

    try {
      const payload = {
        name: profileForm.name,
        rut,
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
        objective: '',
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
      objective: template.objective || '',
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
          objective: template.objective || '',
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

  function validateStudentForm(form) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const errors = {}

    if (!form.full_name.trim()) {
      errors.full_name = 'El nombre completo es obligatorio.'
    } else if (form.full_name.trim().length < 3) {
      errors.full_name = 'El nombre debe tener al menos 3 caracteres.'
    }

    const rutError = getRutValidationError(form.rut)
    if (rutError) {
      errors.rut = rutError
    }

    const birthDateError = getBirthDateValidationError(form.birth_date)
    if (birthDateError) {
      errors.birth_date = birthDateError
    }

    const selectedDiagnosisIds = Array.isArray(form.diagnosis_ids) ? form.diagnosis_ids.filter(Boolean) : []
    const newDiagnosisName = (form.new_diagnosis_name || '').trim()
    if (selectedDiagnosisIds.length === 0 && form.diagnosis_picker !== '__new__' && !newDiagnosisName) {
      errors.diagnosis_ids = 'Selecciona al menos un diagnóstico o crea uno nuevo.'
    }
    if (form.diagnosis_picker === '__new__' && !newDiagnosisName) {
      errors.new_diagnosis_name = 'Escribe el nombre del nuevo diagnóstico.'
    }

    if (!form.school_level_id) {
      errors.school_level_id = 'Selecciona el nivel educacional.'
    }
    if (!form.school_course_id) {
      errors.school_course_id = 'Selecciona el curso.'
    }

    if (!form.guardian_name.trim()) {
      errors.guardian_name = 'El nombre del apoderado es obligatorio.'
    }
    if (!form.guardian_phone.trim()) {
      errors.guardian_phone = 'El teléfono del apoderado es obligatorio.'
    }
    if (!form.guardian_email.trim()) {
      errors.guardian_email = 'El email del apoderado es obligatorio.'
    } else if (!emailRegex.test(form.guardian_email.trim())) {
      errors.guardian_email = 'Ingresa un email de apoderado válido.'
    }

    return errors
  }

    async function onSaveStudent(e) {
    e.preventDefault()
    const path = editingId ? `/students/${editingId}` : '/students'
    const method = 'POST'
    const isCreating = !editingId

    const errors = validateStudentForm(studentForm)
    setStudentFormErrors(errors)
    if (Object.keys(errors).length > 0) {
      const message = 'Revisa los campos marcados del formulario.'
      setStatus(message)
      notifyUser(message, 'error')
      return
    }

    setIsSavingStudent(true)
    try {
      const diagnosisIds = [...(studentForm.diagnosis_ids || [])]
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)

      const newDiagnosisName = (studentForm.new_diagnosis_name || '').trim()
      let createdDiagnosis = null
      if (newDiagnosisName) {
        createdDiagnosis = await api('/student-diagnoses', {
          method: 'POST',
          body: JSON.stringify({ name: newDiagnosisName }),
        })
        if (createdDiagnosis?.id && !diagnosisIds.includes(createdDiagnosis.id)) {
          diagnosisIds.push(createdDiagnosis.id)
        }
      }

      if (diagnosisIds.length === 0) {
        const message = 'Selecciona al menos un diagnóstico o crea uno nuevo.'
        setStudentFormErrors({ diagnosis_ids: message })
        notifyUser(message, 'error')
        return
      }

      const diagnosisLabel = diagnosisIds
        .map((id) => {
          if (createdDiagnosis && Number(createdDiagnosis.id) === Number(id)) {
            return createdDiagnosis.name
          }
          return studentDiagnoses.find((d) => Number(d.id) === Number(id))?.name
        })
        .filter(Boolean)
        .join('; ')

      const rut = formatRut(studentForm.rut)
      const payload = {
        full_name: (studentForm.full_name || '').trim(),
        rut,
        birth_date: studentForm.birth_date,
        diagnosis_ids: diagnosisIds,
        student_diagnosis_id: diagnosisIds[0],
        current_diagnosis: diagnosisLabel,
        school_level_id: Number(studentForm.school_level_id),
        school_course_id: Number(studentForm.school_course_id),
        guardian_name: (studentForm.guardian_name || '').trim(),
        guardian_phone: (studentForm.guardian_phone || '').trim(),
        guardian_email: (studentForm.guardian_email || '').trim(),
      }

      const savedStudent = await api(path, { method, body: JSON.stringify(payload) })
      setStudentForm(initialStudent)
      setStudentFormErrors({})
      setEditingId(null)
      setShowStudentModal(false)
      await Promise.all([loadStudents(), loadStudentDiagnoses()])
      if (selectedStudent && savedStudent?.id && selectedStudent.id === savedStudent.id) {
        setSelectedStudent(savedStudent)
      }
      setStatus('Estudiante guardado')
      notifyUser(
        isCreating ? 'Estudiante registrado correctamente.' : 'Estudiante actualizado correctamente.',
        'success',
      )
    } catch (error) {
      const message = error.message || 'No se pudo registrar el estudiante.'
      if (/rut/i.test(message)) {
        setStudentFormErrors((prev) => ({ ...prev, rut: 'El RUT no es válido.' }))
      }
      setStatus(message)
      notifyUser(/rut/i.test(message) ? 'El RUT no es válido.' : message, 'error')
    } finally {
      setIsSavingStudent(false)
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
    setStudentFormErrors({})
    setShowStudentModal(true)
    const diagnosisIds = Array.isArray(student.diagnoses) && student.diagnoses.length > 0
      ? student.diagnoses.map((d) => String(d.id))
      : (student.student_diagnosis_id ? [String(student.student_diagnosis_id)] : [])
    setStudentForm({
      full_name: student.full_name,
      rut: formatRut(student.rut || ''),
      birth_date: student.birth_date ? String(student.birth_date).slice(0, 10) : '',
      diagnosis_ids: diagnosisIds,
      diagnosis_picker: '',
      new_diagnosis_name: '',
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
    setStudentFormErrors({})
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
    setSuspensionReason(parseSuspensionReasonValue(session.general_observation) || 'estudiante_ausente')
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
      `Eliminar "${item.stored_name}" de la biblioteca?\n\nAdvertencia: se quitará de las sesiones y talleres donde esté vinculado.`,
    )
    if (!confirmation) return

    try {
      await api(`/media-library/${item.id}`, { method: 'DELETE' })
      await Promise.all([
        loadMediaLibraryItems(),
        selectedSession ? onSelectSession(selectedSession) : Promise.resolve(),
        selectedWorkshopCourse ? loadWorkshops(selectedWorkshopCourse.id) : Promise.resolve(),
      ])
      setStatus('Recurso eliminado de la biblioteca y de los vínculos en sesiones y talleres')
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

  async function onSaveWorkshop(e) {
    e.preventDefault()
    if (!workshopForm.name.trim()) {
      setStatus('El nombre del taller es obligatorio.')
      return false
    }
    if (!workshopForm.school_course_id) {
      setStatus('Selecciona el curso.')
      return false
    }
    const creatingFromCourseList = !editingWorkshopId && !selectedWorkshopCourse && !workshopForm.fromExistingCourse
    if (creatingFromCourseList) {
      const existingCourse = workshopCourses.find(
        (course) => String(course.id) === String(workshopForm.school_course_id),
      )
      if (existingCourse) {
        const count = Number(existingCourse.workshops_count || 0)
        setStatus(
          `Este curso ya está en tu listado y cuenta con ${count} ${count === 1 ? 'taller' : 'talleres'}. Entra al curso para registrar otro.`,
        )
        return false
      }
    }
    if (!workshopForm.held_on) {
      setStatus('Selecciona la fecha de realización.')
      return false
    }

    const formData = new FormData()
    formData.append('name', workshopForm.name.trim())
    formData.append('objective', workshopForm.objective.trim())
    formData.append('description', workshopForm.description.trim())
    formData.append('held_on', workshopForm.held_on)
    formData.append('school_course_id', String(workshopForm.school_course_id))
    if (workshopForm.media_library_item_id) {
      formData.append('media_library_item_id', String(workshopForm.media_library_item_id))
    } else if (workshopForm.file) {
      const fileError = getWorkshopFileError(workshopForm.file)
      if (fileError) {
        setStatus(fileError)
        return false
      }
      formData.append('file', workshopForm.file)
    }
    formData.append('urls', JSON.stringify(
      (workshopForm.urls || []).map((url) => String(url).trim()).filter(Boolean),
    ))

    try {
      setSavingWorkshop(true)
      const path = editingWorkshopId ? `/workshops/${editingWorkshopId}` : '/workshops'
      const savedWorkshop = await api(path, { method: 'POST', body: formData })
      setWorkshopForm(emptyWorkshopForm({ held_on: workshopForm.held_on }))
      setEditingWorkshopId(null)
      await Promise.all([loadWorkshopCourses(), loadMediaLibraryItems()])
      if (selectedWorkshopCourse) {
        const stillSelected = selectedWorkshopCourse.id === Number(workshopForm.school_course_id)
          || String(selectedWorkshopCourse.id) === String(workshopForm.school_course_id)
        if (stillSelected) {
          await loadWorkshops(selectedWorkshopCourse.id)
        }
      }
      if (savedWorkshop && selectedWorkshop && Number(savedWorkshop.id) === Number(selectedWorkshop.id)) {
        setSelectedWorkshop(savedWorkshop)
      }
      setStatus('Taller guardado')
      return true
    } catch (error) {
      setStatus(error.message)
      return false
    } finally {
      setSavingWorkshop(false)
    }
  }

  function onEditWorkshop(workshop) {
    setEditingWorkshopId(workshop.id)
    setWorkshopForm({
      name: workshop.name || '',
      objective: workshop.objective || '',
      description: workshop.description || '',
      held_on: String(workshop.held_on || '').slice(0, 10),
      school_level_id: String(workshop.course?.school_level_id || selectedWorkshopCourse?.school_level_id || ''),
      school_course_id: String(workshop.school_course_id || selectedWorkshopCourse?.id || ''),
      file: null,
      media_library_item_id: workshop.media_library_item_id ? String(workshop.media_library_item_id) : '',
      urls: Array.isArray(workshop.urls) ? workshop.urls : [],
      fromExistingCourse: true,
    })
  }

  async function onDeleteWorkshop(workshopId) {
    if (!window.confirm('Eliminar este taller? El archivo permanecerá en la biblioteca de medios.')) return false
    try {
      await api(`/workshops/${workshopId}`, { method: 'DELETE' })
      await Promise.all([loadWorkshopCourses(), loadMediaLibraryItems()])
      if (selectedWorkshopCourse) {
        await loadWorkshops(selectedWorkshopCourse.id)
      }
      if (selectedWorkshop && Number(selectedWorkshop.id) === Number(workshopId)) {
        setSelectedWorkshop(null)
      }
      setStatus('Taller eliminado')
      return true
    } catch (error) {
      setStatus(error.message)
      return false
    }
  }

  async function onDownloadWorkshop(workshop) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/workshops/${workshop.id}/download`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo descargar el material del taller')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = workshop.stored_name || workshop.original_name || `taller-${workshop.id}`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('Material del taller descargado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function onOpenWorkshopCourse(course) {
    setSelectedWorkshopCourse(course)
    setEditingWorkshopId(null)
    setWorkshopForm(emptyWorkshopForm({
      school_level_id: String(course.school_level_id || course.level?.id || ''),
      school_course_id: String(course.id),
    }))
    setActiveSection('workshopCourse')
  }

  function onBackToWorkshopCourses() {
    setSelectedWorkshopCourse(null)
    setSelectedWorkshop(null)
    setWorkshops([])
    setEditingWorkshopId(null)
    setWorkshopForm(emptyWorkshopForm())
    setActiveSection('workshops')
  }

  async function onOpenWorkshopDetail(workshop) {
    setSelectedWorkshop(workshop)
    setActiveSection('workshopDetail')
    try {
      const fresh = await api(`/workshops/${workshop.id}`)
      setSelectedWorkshop(fresh)
    } catch (error) {
      setStatus(error.message)
    }
  }

  function onBackToWorkshopCourse() {
    setSelectedWorkshop(null)
    setActiveSection('workshopCourse')
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

  function notifyUser(message, type = 'success') {
    setStatus(message)
    setToast({ show: true, type, message })
  }

  function notifyAuth(message, type = 'info') {
    setAuthFeedback(message)
    setAuthFeedbackType(type)
    setStatus(message)
    setToast({ show: true, type: type === 'info' ? 'success' : type, message })
  }

  async function onUpdateSessionState({ status, generalObservation }, successMessage) {
    if (!selectedStudent || !selectedPlan || !selectedSession) return null
    try {
      const updatedSession = await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${selectedSession.id}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            session_date: selectedSession.session_date,
            session_time: normalizeSessionTime(selectedSession.session_time),
            objective: selectedSession.objective,
            description: selectedSession.description || null,
            general_observation: generalObservation,
            status,
          }),
        },
      )
      setSelectedSession(updatedSession)
      setSessionObservation(updatedSession.general_observation || '')
      const refreshedSessions = await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions`,
      )
      setSessions(refreshedSessions)
      setActiveSection('sessionDetail')
      notifyUser(successMessage, 'success')
      return updatedSession
    } catch (error) {
      notifyUser(error.message, 'error')
      throw error
    }
  }

  async function onFinalizeSession() {
    if (!selectedSession) return
    try {
      await onUpdateSessionState(
        { status: 'finalizada', generalObservation: sessionObservation || null },
        'Sesión finalizada correctamente.',
      )
    } catch {
      // El mensaje de error ya se muestra en notifyUser.
    }
  }

  async function onReopenSession() {
    if (!selectedSession) return
    try {
      await onUpdateSessionState(
        { status: 'pendiente', generalObservation: sessionObservation || null },
        'Sesión habilitada para edición.',
      )
    } catch {
      // El mensaje de error ya se muestra en notifyUser.
    }
  }

  async function onSuspendSession() {
    if (!selectedSession || isSuspendingSession) return
    setIsSuspendingSession(true)
    setSuspendModalError('')
    const { text: generalObservationWithReason, label: suspensionLabel } = buildSuspensionObservation(
      sessionObservation,
      suspensionReason,
    )
    try {
      await onUpdateSessionState(
        { status: 'suspendida', generalObservation: generalObservationWithReason },
        `Sesión suspendida correctamente (${suspensionLabel}).`,
      )
      setShowSuspendModal(false)
    } catch (error) {
      setSuspendModalError(error.message || 'No se pudo suspender la sesión.')
    } finally {
      setIsSuspendingSession(false)
    }
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

      const diagnosisNames = [
        ...(Array.isArray(student.diagnoses) ? student.diagnoses.map((d) => d.name) : []),
        student.student_diagnosis?.name,
        student.current_diagnosis,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      const matchesDiagnosis = !diagnosis || diagnosisNames.includes(diagnosis)

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
  const displaySessionStatus = (status) => (status === 'draft' ? 'pendiente' : status)
  const finalizedSessionsCount = sessions.filter((session) => displaySessionStatus(session.status) === 'finalizada').length
  const pendingSessionsCount = sessions.filter((session) => displaySessionStatus(session.status) !== 'finalizada').length
  const sortedScheduledSessions = useMemo(
    () =>
      [...scheduledSessions].sort((a, b) => {
        const first = a.session.session_time || '23:59'
        const second = b.session.session_time || '23:59'
        return first.localeCompare(second)
      }),
    [scheduledSessions],
  )
  const suspendedSessions = sessions.filter((session) => displaySessionStatus(session.status) === 'suspendida')
  // Sesiones realizadas del plan: finalizadas vs suspendidas por ausencia.
  const finalizedForAttendance = sessions.filter(
    (session) => displaySessionStatus(session.status) === 'finalizada',
  ).length
  const absentSuspensionsForAttendance = suspendedSessions.filter((session) =>
    sessionHasSuspensionReason(session.general_observation, 'estudiante_ausente'),
  ).length
  const assistanceBase = finalizedForAttendance + absentSuspensionsForAttendance
  const attendancePercent = assistanceBase > 0 ? Math.round((finalizedForAttendance / assistanceBase) * 100) : 0
  const suspensionPercent = assistanceBase > 0 ? 100 - attendancePercent : 0
  const suspensionByAbsent = absentSuspensionsForAttendance
  const suspensionBySchool = suspendedSessions.filter((session) =>
    sessionHasSuspensionReason(session.general_observation, 'actividad_escolar_suspension'),
  ).length
  const unknownSuspensionReason = Math.max(suspendedSessions.length - suspensionByAbsent - suspensionBySchool, 0)
  const suspendedTotal = suspendedSessions.length
  const totalSessionsGlobal = sessions.length
  const globalAttendanceCount = finalizedForAttendance
  const globalAbsentCount = suspensionByAbsent
  const globalActivityCount = suspensionBySchool
  const globalAttendancePercent = totalSessionsGlobal > 0
    ? Math.round((globalAttendanceCount / totalSessionsGlobal) * 100)
    : 0
  const globalAbsentPercent = totalSessionsGlobal > 0
    ? Math.round((globalAbsentCount / totalSessionsGlobal) * 100)
    : 0
  const globalActivityPercent = totalSessionsGlobal > 0
    ? Math.round((globalActivityCount / totalSessionsGlobal) * 100)
    : 0
  const globalOverviewSegments = (() => {
    if (totalSessionsGlobal <= 0) return []
    return [
      {
        key: 'global_asistencia',
        label: 'Sesiones realizadas',
        value: `${globalAttendancePercent}%`,
        count: globalAttendanceCount,
        percent: globalAttendancePercent,
        color: '#10b981',
      },
      {
        key: 'global_inasistencia',
        label: 'Suspensión por inasistencia',
        value: `${globalAbsentPercent}%`,
        count: globalAbsentCount,
        percent: globalAbsentPercent,
        color: '#f59e0b',
      },
      {
        key: 'global_actividad',
        label: 'Suspensión por actividad',
        value: `${globalActivityPercent}%`,
        count: globalActivityCount,
        percent: globalActivityPercent,
        color: '#d946ef',
      },
    ].filter((segment) => segment.count > 0)
  })()
  const attendanceSegments = (() => {
    if (assistanceBase <= 0) return []
    const raw = [
      {
        key: 'asistencia',
        label: 'Sesiones realizadas',
        value: `${attendancePercent}%`,
        count: finalizedForAttendance,
        color: '#10b981',
      },
      {
        key: 'inasistencia',
        label: 'Inasistencia',
        value: `${suspensionPercent}%`,
        count: absentSuspensionsForAttendance,
        color: '#f59e0b',
      },
    ].filter((segment) => segment.count > 0)

    let used = 0
    return raw.map((segment, index) => {
      const percent = index === raw.length - 1
        ? Math.max(100 - used, 0)
        : Math.round((segment.count / assistanceBase) * 100)
      used += percent
      return { ...segment, percent }
    })
  })()
  const suspensionSegments = (() => {
    if (suspendedTotal <= 0) return []
    const raw = [
      {
        key: 'ausente',
        label: 'Estudiante ausente',
        value: suspensionByAbsent,
        count: suspensionByAbsent,
        color: '#ef4444',
      },
      {
        key: 'actividad',
        label: 'Actividad escolar/suspensión',
        value: suspensionBySchool,
        count: suspensionBySchool,
        color: '#d946ef',
      },
      {
        key: 'sin_motivo',
        label: 'Sin motivo',
        value: unknownSuspensionReason,
        count: unknownSuspensionReason,
        color: '#94a3b8',
      },
    ].filter((segment) => segment.count > 0)

    let used = 0
    return raw.map((segment, index) => {
      const percent = index === raw.length - 1
        ? Math.max(100 - used, 0)
        : Math.round((segment.count / suspendedTotal) * 100)
      used += percent
      return { ...segment, percent }
    })
  })()
  const displaySessionStatusLabel = (session) => {
    const status = displaySessionStatus(session?.status)
    if (status !== 'suspendida') return status
    const reason = getSuspensionReasonShortLabel(session?.general_observation)
    return reason ? `suspendida (${reason})` : 'suspendida'
  }
  const getSessionEntryActionLabel = (status) => {
    const normalized = displaySessionStatus(status)
    return normalized === 'pendiente' ? 'Realizar sesión' : 'Revisar sesión'
  }
  const getSessionEntryActionClass = (status) => {
    const normalized = displaySessionStatus(status)
    if (normalized === 'pendiente') {
      return 'rounded-[5px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100'
    }
    if (normalized === 'finalizada') {
      return 'rounded-[5px] border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-800 transition hover:bg-violet-100'
    }
    return 'rounded-[5px] border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-800 transition hover:bg-rose-100'
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
  const chartTimeline = [...sessionRatingSeries]
    .filter((entry) => (
      (entry.status === 'finalizada' && entry.performancePercent !== null)
      || entry.status === 'suspendida'
    ))
    .sort((a, b) => {
      const byDate = String(a.sessionDate || '').localeCompare(String(b.sessionDate || ''))
      return byDate !== 0 ? byDate : a.sessionId - b.sessionId
    })
  const chartEvents = chartTimeline.map((entry, index) => {
    const x =
      chartPadding +
      (chartTimeline.length > 1
        ? (index / (chartTimeline.length - 1)) * (chartWidth - chartPadding * 2)
        : (chartWidth - chartPadding * 2) / 2)

    if (entry.status === 'suspendida') {
      const color = entry.suspensionReason === 'estudiante_ausente'
        ? '#f59e0b'
        : entry.suspensionReason === 'actividad_escolar_suspension'
          ? '#d946ef'
          : '#f43f5e'
      return {
        ...entry,
        kind: 'suspension',
        x,
        y: chartHeight - chartPadding,
        color,
      }
    }

    const normalized = ((entry.averageScore - 1) / 2) * (chartHeight - chartPadding * 2)
    const y = chartHeight - chartPadding - normalized
    return {
      ...entry,
      kind: 'performance',
      x,
      y,
      color: '#a21caf',
    }
  })
  const chartPoints = chartEvents.filter((entry) => entry.kind === 'performance')
  const suspensionChartPoints = chartEvents.filter((entry) => entry.kind === 'suspension')
  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const hasChartData = chartEvents.length > 0
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
    <>
      {toast.show && (
        <div className="fixed right-4 top-4 z-[70]">
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
        authFeedback,
        authFeedbackType,
      }}
    >
      <main className={token ? 'min-h-screen w-full' : 'appShell'}>
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
                  className={`sidebarNavItem ${['workshops', 'workshopCourse', 'workshopDetail'].includes(activeSection) ? 'sidebarNavItemActive' : ''}`}
                  onClick={() => {
                    setSelectedWorkshopCourse(null)
                    setSelectedWorkshop(null)
                    setActiveSection('workshops')
                  }}
                >
                  <span className="sidebarNavItemContent">
                    <svg className="sidebarNavItemIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M4 19V7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                      <path d="M8 13h8M8 16h5" strokeLinecap="round" />
                    </svg>
                    <span>Talleres</span>
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
                    <h2 className="mb-4 text-base font-semibold text-slate-900">Agenda de sesiones</h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_1fr]">
                      <SessionsDayCalendar
                        selectedDate={dashboardSelectedDate}
                        onSelectDate={setDashboardSelectedDate}
                        viewMonth={dashboardCalendarMonth}
                        onViewMonthChange={setDashboardCalendarMonth}
                        sessionCountsByDate={sessionCountsByDate}
                      />
                      <DashboardScheduledSessions
                        selectedDate={dashboardSelectedDate}
                        formatDisplayDate={formatDisplayDate}
                        formatDisplayTime={formatDisplayTime}
                        sessions={sortedScheduledSessions}
                        displaySessionStatus={displaySessionStatus}
                        displaySessionStatusLabel={displaySessionStatusLabel}
                        getSessionEntryActionLabel={getSessionEntryActionLabel}
                        getSessionEntryActionClass={getSessionEntryActionClass}
                        onOpenSession={onOpenTodaySession}
                      />
                    </div>
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
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, rut: normalizeRutInput(e.target.value) }))}
                          placeholder="12.345.678-5"
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

            {activeSection === 'workshops' && (
              <WorkshopsSection
                workshopCourses={workshopCourses}
                levels={levels}
                workshopForm={workshopForm}
                setWorkshopForm={setWorkshopForm}
                onSaveWorkshop={onSaveWorkshop}
                onOpenCourse={onOpenWorkshopCourse}
                formatDisplayDate={formatDisplayDate}
                savingWorkshop={savingWorkshop}
                mediaLibraryItems={mediaLibraryItems}
              />
            )}

            {activeSection === 'workshopCourse' && selectedWorkshopCourse && (
              <WorkshopCourseSection
                selectedWorkshopCourse={selectedWorkshopCourse}
                workshops={workshops}
                levels={levels}
                workshopForm={workshopForm}
                setWorkshopForm={setWorkshopForm}
                editingWorkshopId={editingWorkshopId}
                setEditingWorkshopId={setEditingWorkshopId}
                onBackToCourses={onBackToWorkshopCourses}
                onSaveWorkshop={onSaveWorkshop}
                onEditWorkshop={onEditWorkshop}
                onDeleteWorkshop={onDeleteWorkshop}
                onViewWorkshop={onOpenWorkshopDetail}
                formatDisplayDate={formatDisplayDate}
                savingWorkshop={savingWorkshop}
                mediaLibraryItems={mediaLibraryItems}
              />
            )}

            {activeSection === 'workshopDetail' && selectedWorkshop && (
              <WorkshopDetailSection
                workshop={selectedWorkshop}
                formatDisplayDate={formatDisplayDate}
                onBack={onBackToWorkshopCourse}
                onEditWorkshop={onEditWorkshop}
                onDeleteWorkshop={onDeleteWorkshop}
                onDownloadWorkshop={onDownloadWorkshop}
                workshopForm={workshopForm}
                setWorkshopForm={setWorkshopForm}
                levels={levels}
                editingWorkshopId={editingWorkshopId}
                setEditingWorkshopId={setEditingWorkshopId}
                onSaveWorkshop={onSaveWorkshop}
                savingWorkshop={savingWorkshop}
                mediaLibraryItems={mediaLibraryItems}
              />
            )}

            {activeSection === 'mediaLibrary' && (
              <section className="sectionCard">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="sectionTitle mb-0">Biblioteca de medios</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Reutiliza recursos en sesiones y talleres sin volver a subirlos.
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
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Uso</th>
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
                          <td className="px-3 py-2 text-slate-700">
                            {`Sesiones: ${item.session_materials_count || 0} · Talleres: ${item.workshops_count || 0}`}
                          </td>
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
                              <p className="text-xs text-slate-500">
                                Edad: {student.exact_age || formatExactAge(student.birth_date) || 'Sin fecha de nacimiento'}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-slate-700">{student.course?.display_name || 'Sin curso'}</td>
                            <td className="px-3 py-3 text-slate-700">
                              {Array.isArray(student.diagnoses) && student.diagnoses.length > 0
                                ? student.diagnoses.map((d) => d.name).join('; ')
                                : (student.student_diagnosis?.name || student.current_diagnosis)}
                            </td>
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
              <section className="space-y-4">
                <StudentContextCard student={selectedStudent} planCount={plans.length} />

                <section className="sectionCard">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="sectionTitle mb-0">Planes de tratamiento</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Cada plan corresponde a un año escolar con su diagnóstico registrado al momento de creación.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button className="actionButton actionButtonPrimary" onClick={() => setShowPlanModal(true)}>
                        Crear plan
                      </button>
                      <button className="actionButton" onClick={() => setActiveSection('students')}>
                        Volver a estudiantes
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-[10px] border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="w-28 px-4 py-3 text-left font-semibold text-slate-600">Año</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-600">Diagnóstico del plan</th>
                          <th className="min-w-[18rem] whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-600">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {plans.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-4 py-10 text-center">
                              <p className="font-medium text-slate-700">Sin planes de tratamiento</p>
                              <p className="mt-1 text-sm text-slate-500">
                                Crea el primer plan para comenzar a registrar sesiones.
                              </p>
                              <button
                                type="button"
                                className="actionButton actionButtonPrimary mt-4"
                                onClick={() => setShowPlanModal(true)}
                              >
                                Crear plan de tratamiento
                              </button>
                            </td>
                          </tr>
                        )}
                        {paginatedPlans.map((plan) => (
                          <tr key={plan.id} className="transition hover:bg-violet-50/40">
                            <td className="px-4 py-3">
                              <span className="inline-flex min-w-[3rem] items-center justify-center rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">
                                {plan.year}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-700">{plan.diagnosis_snapshot}</td>
                            <td className="whitespace-nowrap px-4 py-3">
                              <div className="flex flex-nowrap items-center justify-end gap-2">
                                <button
                                  className="shrink-0 rounded-[5px] border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-xs font-medium text-fuchsia-800 transition hover:bg-fuchsia-100"
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
                                  className="shrink-0 rounded-[5px] border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-medium text-purple-800 transition hover:bg-purple-100"
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
                                  className="shrink-0 rounded-[5px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
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
              </section>
            )}
            {activeSection === 'sessions' && selectedStudent && selectedPlan && (
              <section className="space-y-4">
                <StudentContextCard student={selectedStudent} planYear={selectedPlan.year} />

                <section className="sectionCard">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="sectionTitle mb-0">Sesiones del plan de tratamiento {selectedPlan.year}</h2>
                  <div className="flex items-center gap-2">
                    <button className="actionButton actionButtonPrimary" onClick={onOpenCreateSessionModal}>
                      Agendar sesión
                    </button>
                    <button className="actionButton" onClick={() => setActiveSection('studentPlans')}>
                      Volver a planes de tratamiento
                    </button>
                  </div>
                </div>

                <section className="rounded-[5px] border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_3fr]">
                    <article className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">Indicadores</h3>
                      <div className="mt-3 grid grid-cols-1 gap-3">
                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumen global del plan</p>
                          <div className="mt-2 flex items-center gap-3">
                            <IndicatorDonut
                              key={`global-${totalSessionsGlobal}-${globalAttendanceCount}-${globalAbsentCount}-${globalActivityCount}`}
                              segments={globalOverviewSegments}
                              emptyLabel="Sin sesiones registradas en este plan"
                            />
                            <div className="space-y-1 text-xs text-slate-700">
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Sesiones realizadas: <strong>{globalAttendancePercent}%</strong></p>
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Susp. inasistencia: <strong>{globalAbsentPercent}%</strong></p>
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Susp. actividad: <strong>{globalActivityPercent}%</strong></p>
                              <p className="pt-1 text-slate-500">Total sesiones: {totalSessionsGlobal}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sesiones realizadas</p>
                          <div className="mt-2 flex items-center gap-3">
                            <IndicatorDonut
                              key={`attendance-${assistanceBase}-${attendancePercent}-${suspensionPercent}`}
                              segments={attendanceSegments}
                              emptyLabel="Sin sesiones realizadas ni inasistencias para calcular"
                            />
                            <div className="space-y-1 text-xs text-slate-700">
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Realizadas: <strong>{attendancePercent}%</strong></p>
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />Inasistencia: <strong>{suspensionPercent}%</strong></p>
                              <p className="pt-1 text-slate-500">Base: {finalizedForAttendance}/{assistanceBase || 0}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Motivos de suspensión</p>
                          {suspendedTotal === 0 ? (
                            <p className="mt-2 text-xs text-slate-500">Sin sesiones suspendidas.</p>
                          ) : (
                            <div className="mt-2 flex items-center gap-3">
                              <IndicatorDonut
                                key={`suspension-${suspendedTotal}-${suspensionByAbsent}-${suspensionBySchool}-${unknownSuspensionReason}`}
                                segments={suspensionSegments}
                                emptyLabel="Sin motivos de suspensión para graficar"
                              />
                              <div className="space-y-1 text-xs text-slate-700">
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Ausente: <strong>{suspensionByAbsent}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Actividad: <strong>{suspensionBySchool}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />Sin motivo: <strong>{unknownSuspensionReason}</strong></p>
                              </div>
                            </div>
                          )}
                        </div>
                        </div>
                      </div>
                    </article>

                    <article className="rounded-[5px] border border-slate-200 bg-white p-4 shadow-sm">
                      <h3 className="text-base font-semibold text-slate-900">Gráfico de sesiones</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Progreso por sesiones realizadas y marcas de días suspendidos en la misma línea de tiempo.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a21caf]" />
                          Sesión realizada (progreso %)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-amber-500" />
                          Suspensión por inasistencia
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-fuchsia-500" />
                          Suspensión por actividad
                        </span>
                      </div>
                      <div className="mt-4 rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                        {hasChartData ? (
                          <div className="overflow-x-auto">
                            <svg
                              className="session-chart min-w-[640px]"
                              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                              role="img"
                              aria-label="Gráfico lineal de progreso y suspensiones por sesión"
                            >
                              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" strokeWidth="1" />
                              <line x1={chartPadding} y1={chartPadding} x2={chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" strokeWidth="1" />
                              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#fde68a" strokeWidth="1" strokeDasharray="4 4" />
                              <line x1={chartPadding} y1={chartHeight / 2} x2={chartWidth - chartPadding} y2={chartHeight / 2} stroke="#fde68a" strokeWidth="1" strokeDasharray="4 4" />
                              <line x1={chartPadding} y1={chartPadding} x2={chartWidth - chartPadding} y2={chartPadding} stroke="#fde68a" strokeWidth="1" strokeDasharray="4 4" />
                              {chartPoints.length > 1 ? (
                                <polyline
                                  className="session-chart-line"
                                  fill="none"
                                  stroke="#a21caf"
                                  strokeWidth="2.5"
                                  points={polylinePoints}
                                />
                              ) : null}
                              {chartPoints.map((point) => (
                                <g key={`perf-${point.sessionId}`}>
                                  <circle
                                    className="session-chart-point"
                                    cx={point.x}
                                    cy={point.y}
                                    r="5.5"
                                    fill="#a21caf"
                                    stroke="#ffffff"
                                    strokeWidth="2"
                                  >
                                    <title>{`${formatDisplayDate(point.sessionDate)}: ${point.performancePercent}%`}</title>
                                  </circle>
                                </g>
                              ))}
                              {suspensionChartPoints.map((point) => (
                                <g key={`susp-${point.sessionId}`}>
                                  <line
                                    x1={point.x}
                                    y1={chartPadding}
                                    x2={point.x}
                                    y2={chartHeight - chartPadding}
                                    stroke={point.color}
                                    strokeWidth="1.5"
                                    strokeDasharray="3 3"
                                    opacity="0.45"
                                  />
                                  <polygon
                                    points={`${point.x},${point.y - 7} ${point.x + 7},${point.y} ${point.x},${point.y + 7} ${point.x - 7},${point.y}`}
                                    fill={point.color}
                                    stroke="#ffffff"
                                    strokeWidth="1.5"
                                  >
                                    <title>{`${formatDisplayDate(point.sessionDate)}: suspendida (${point.suspensionLabel})`}</title>
                                  </polygon>
                                </g>
                              ))}
                              {chartEvents.map((point) => (
                                <text key={`label-${point.sessionId}`} x={point.x} y={chartHeight - 8} textAnchor="middle" fontSize="10" fill="#475569">
                                  {formatDisplayDate(point.sessionDate)}
                                </text>
                              ))}
                              <text x={8} y={chartPadding + 2} fontSize="10" fill="#475569">100%</text>
                              <text x={8} y={chartHeight / 2 + 2} fontSize="10" fill="#475569">50%</text>
                              <text x={8} y={chartHeight - chartPadding + 2} fontSize="10" fill="#475569">0%</text>
                            </svg>
                          </div>
                        ) : (
                          <div className="flex min-h-[180px] items-center justify-center text-sm text-slate-500">
                            Sin sesiones realizadas ni suspendidas para graficar.
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
                                type="button"
                                className={getSessionEntryActionClass(session.status)}
                                onClick={() => onSelectSession(session)}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  {displaySessionStatus(session.status) === 'pendiente' ? (
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <rect x="3" y="5" width="18" height="16" rx="2" />
                                      <path d="M8 3v4M16 3v4M3 10h18" strokeLinecap="round" />
                                      <path d="m10 14 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                  ) : (
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M2.2 12c1.2-4 4.9-7 9.8-7s8.6 3 9.8 7c-1.2 4-4.9 7-9.8 7s-8.6-3-9.8-7Z" />
                                      <circle cx="12" cy="12" r="3" />
                                    </svg>
                                  )}
                                  <span>{getSessionEntryActionLabel(session.status)}</span>
                                </span>
                              </button>
                              {displaySessionStatus(session.status) === 'pendiente' && (
                                <button
                                  type="button"
                                  className="rounded-[5px] border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1.5 text-xs font-medium text-fuchsia-800 transition hover:bg-fuchsia-100"
                                  onClick={() => onEditSession(session)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M12 20h9" strokeLinecap="round" />
                                      <path d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z" strokeLinejoin="round" />
                                    </svg>
                                    <span>Editar datos</span>
                                  </span>
                                </button>
                              )}
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
              </section>
            )}
            {activeSection === 'sessionDetail' && selectedStudent && selectedPlan && selectedSession && (
              <section className="space-y-4">
                <SessionContextCard
                  session={selectedSession}
                  studentName={selectedStudent.full_name}
                  studentAge={selectedStudent.exact_age || formatExactAge(selectedStudent.birth_date) || ''}
                  planYear={selectedPlan.year}
                  formattedDate={formatDisplayDate(selectedSession.session_date)}
                  formattedTime={formatDisplayTime(selectedSession.session_time)}
                  statusLabel={displaySessionStatusLabel(selectedSession)}
                  statusKey={displaySessionStatus(selectedSession.status)}
                  suspensionReasonLabel={getSuspensionReasonDisplayLabel(selectedSession.general_observation)}
                />

                <section className="sectionCard">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="sectionTitle mb-0">Tareas de la sesión</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Registra, importa y califica las tareas de esta sesión.
                    </p>
                  </div>
                  <button type="button" className="actionButton cursor-pointer" onClick={() => setActiveSection('sessions')}>
                    Volver a sesiones
                  </button>
                </div>

                <section className={`rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                  selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                }`}>
                  <p className="text-xs text-slate-500">
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

                <div className="mt-4">
                  <h2 className="sectionTitle mb-0">Observación general de la sesión</h2>
                  <section className={`mt-3 rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                    selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                  }`}>
                    <textarea
                      className={`fieldInput mb-0 min-h-24 ${
                        selectedSession.status === 'finalizada' ? 'cursor-not-allowed bg-slate-100 text-slate-500' : ''
                      }`}
                      placeholder="Observaciones generales de la sesión..."
                      value={sessionObservation}
                      onChange={(e) => setSessionObservation(e.target.value)}
                      disabled={selectedSession.status === 'finalizada'}
                      aria-label="Observación general de la sesión"
                    />
                  </section>
                </div>

                <div className="mt-4">
                  <h2 className="sectionTitle mb-0">Material complementario en sesión</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Puedes reutilizar recursos desde tu biblioteca o subir uno nuevo desde tu PC.
                  </p>
                  <section className={`mt-3 rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                    selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                  }`}>
                  <form onSubmit={onUploadSessionMaterial} className="grid grid-cols-1 gap-2 md:grid-cols-[1.4fr_1.2fr_1fr_auto]">
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
                </div>

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
                  {selectedSession.status !== 'finalizada' && selectedSession.status !== 'suspendida' && (
                    <button
                      type="button"
                      className="actionButton cursor-pointer"
                      onClick={() => {
                        setSuspendModalError('')
                        setShowSuspendModal(true)
                      }}
                    >
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
                    {suspendModalError && (
                      <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {suspendModalError}
                      </p>
                    )}
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Motivo
                    </label>
                    <select
                      className="fieldInput mb-0"
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      disabled={isSuspendingSession}
                    >
                      {SUSPENSION_REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={() => setShowSuspendModal(false)}
                      disabled={isSuspendingSession}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton actionButtonPrimary"
                      onClick={onSuspendSession}
                      disabled={isSuspendingSession}
                    >
                      {isSuspendingSession ? 'Guardando...' : 'Confirmar suspensión'}
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
                      <h2 className="text-lg font-semibold text-slate-900">{editingSessionId ? 'Editar sesión' : 'Agendar sesión'}</h2>
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
                        <textarea
                          id="session-description"
                          className="fieldInput mb-0 min-h-24"
                          rows={4}
                          placeholder="Descripción de la sesión"
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
                        {editingSessionId ? 'Actualizar sesión' : 'Agendar sesión'}
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
                  <form onSubmit={onSaveStudent} noValidate>
                    <div className="grid gap-3 px-5 py-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-full-name">Nombre completo</label>
                        <input
                          id="student-full-name"
                          className={`fieldInput mb-0 ${studentFormErrors.full_name ? 'border-red-400' : ''}`}
                          placeholder="Nombre completo"
                          value={studentForm.full_name}
                          onChange={(e) => {
                            setStudentForm({ ...studentForm, full_name: e.target.value })
                            setStudentFormErrors((prev) => ({ ...prev, full_name: '' }))
                          }}
                          aria-invalid={Boolean(studentFormErrors.full_name)}
                        />
                        {studentFormErrors.full_name ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.full_name}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-rut">RUT</label>
                        <input
                          id="student-rut"
                          className={`fieldInput mb-0 ${studentFormErrors.rut ? 'border-red-400' : ''}`}
                          placeholder="12.345.678-5"
                          value={studentForm.rut}
                          onChange={(e) => {
                            setStudentForm({ ...studentForm, rut: normalizeRutInput(e.target.value) })
                            setStudentFormErrors((prev) => ({ ...prev, rut: '' }))
                          }}
                          aria-invalid={Boolean(studentFormErrors.rut)}
                        />
                        {studentFormErrors.rut ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.rut}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-birth-date">Fecha de nacimiento</label>
                        <input
                          id="student-birth-date"
                          type="date"
                          className={`fieldInput mb-0 ${studentFormErrors.birth_date ? 'border-red-400' : ''}`}
                          value={studentForm.birth_date}
                          max={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => {
                            setStudentForm({ ...studentForm, birth_date: e.target.value })
                            setStudentFormErrors((prev) => ({ ...prev, birth_date: '' }))
                          }}
                          aria-invalid={Boolean(studentFormErrors.birth_date)}
                        />
                        {studentForm.birth_date && !studentFormErrors.birth_date ? (
                          <p className="mt-1 text-xs text-slate-500">
                            Edad: {formatExactAge(studentForm.birth_date) || '—'}
                          </p>
                        ) : null}
                        {studentFormErrors.birth_date ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.birth_date}</p> : null}
                      </div>
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-diagnosis-picker">
                          Diagnósticos
                        </label>
                        {Array.isArray(studentForm.diagnosis_ids) && studentForm.diagnosis_ids.length > 0 ? (
                          <div className="mb-2 flex flex-wrap gap-2">
                            {studentForm.diagnosis_ids.map((diagnosisId) => {
                              const diagnosis = studentDiagnoses.find((d) => String(d.id) === String(diagnosisId))
                              const label = diagnosis?.name || `Diagnóstico #${diagnosisId}`
                              return (
                                <span
                                  key={diagnosisId}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800"
                                >
                                  {label}
                                  <button
                                    type="button"
                                    className="!m-0 inline-flex h-4 w-4 items-center justify-center rounded-full !border-0 !bg-transparent p-0 text-violet-600 shadow-none transition hover:!bg-violet-100 hover:text-violet-900"
                                    aria-label={`Quitar ${label}`}
                                    onClick={() => {
                                      setStudentForm({
                                        ...studentForm,
                                        diagnosis_ids: studentForm.diagnosis_ids.filter((id) => String(id) !== String(diagnosisId)),
                                      })
                                      setStudentFormErrors((prev) => ({ ...prev, diagnosis_ids: '' }))
                                    }}
                                  >
                                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                                    </svg>
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        ) : null}
                        <select
                          id="student-diagnosis-picker"
                          className={`fieldInput mb-0 ${studentFormErrors.diagnosis_ids ? 'border-red-400' : ''}`}
                          value={studentForm.diagnosis_picker || ''}
                          onChange={(e) => {
                            const value = e.target.value
                            if (!value) {
                              setStudentForm({ ...studentForm, diagnosis_picker: '' })
                              return
                            }
                            if (value === '__new__') {
                              setStudentForm({ ...studentForm, diagnosis_picker: '__new__', new_diagnosis_name: '' })
                              setStudentFormErrors((prev) => ({ ...prev, diagnosis_ids: '', new_diagnosis_name: '' }))
                              return
                            }
                            const alreadySelected = (studentForm.diagnosis_ids || []).some((id) => String(id) === value)
                            setStudentForm({
                              ...studentForm,
                              diagnosis_picker: '',
                              new_diagnosis_name: '',
                              diagnosis_ids: alreadySelected
                                ? studentForm.diagnosis_ids
                                : [...(studentForm.diagnosis_ids || []), value],
                            })
                            setStudentFormErrors((prev) => ({ ...prev, diagnosis_ids: '', new_diagnosis_name: '' }))
                          }}
                          aria-invalid={Boolean(studentFormErrors.diagnosis_ids)}
                        >
                          <option value="">Agregar diagnóstico…</option>
                          {studentDiagnoses
                            .filter((d) => !(studentForm.diagnosis_ids || []).includes(String(d.id)))
                            .map((d) => (
                              <option key={d.id} value={String(d.id)}>{d.name}</option>
                            ))}
                          <option value="__new__">+ Crear nuevo diagnóstico</option>
                        </select>
                        {studentFormErrors.diagnosis_ids ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.diagnosis_ids}</p> : null}
                      </div>
                      {studentForm.diagnosis_picker === '__new__' && (
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-new-diagnosis">Nuevo diagnóstico</label>
                          <input
                            id="student-new-diagnosis"
                            className={`fieldInput mb-0 ${studentFormErrors.new_diagnosis_name ? 'border-red-400' : ''}`}
                            placeholder="Ej: TEL expresivo leve"
                            value={studentForm.new_diagnosis_name}
                            onChange={(e) => {
                              setStudentForm({ ...studentForm, new_diagnosis_name: e.target.value })
                              setStudentFormErrors((prev) => ({ ...prev, new_diagnosis_name: '' }))
                            }}
                          />
                          {studentFormErrors.new_diagnosis_name ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.new_diagnosis_name}</p> : null}
                        </div>
                      )}
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-level">Nivel</label>
                        <select
                          id="student-level"
                          className={`fieldInput mb-0 ${studentFormErrors.school_level_id ? 'border-red-400' : ''}`}
                          value={studentForm.school_level_id}
                          onChange={(e) => {
                            setStudentForm({ ...studentForm, school_level_id: e.target.value, school_course_id: '' })
                            setStudentFormErrors((prev) => ({ ...prev, school_level_id: '', school_course_id: '' }))
                          }}
                        >
                          <option value="">Nivel</option>
                          {levels.map((l) => <option key={l.id} value={l.id}>{l.display_name}</option>)}
                        </select>
                        {studentFormErrors.school_level_id ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.school_level_id}</p> : null}
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="student-course">Curso</label>
                        <select
                          id="student-course"
                          className={`fieldInput mb-0 ${studentFormErrors.school_course_id ? 'border-red-400' : ''}`}
                          value={studentForm.school_course_id}
                          onChange={(e) => {
                            setStudentForm({ ...studentForm, school_course_id: e.target.value })
                            setStudentFormErrors((prev) => ({ ...prev, school_course_id: '' }))
                          }}
                        >
                          <option value="">Curso</option>
                          {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
                        </select>
                        {studentFormErrors.school_course_id ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.school_course_id}</p> : null}
                      </div>
                      <div className="md:col-span-2 rounded-[10px] border border-slate-200 bg-slate-100/70 p-3 md:p-4">
                        <h3 className="mb-3 text-[15px] font-semibold text-slate-700">Datos apoderado</h3>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="guardian-name">Nombre apoderado</label>
                            <input
                              id="guardian-name"
                              className={`fieldInput mb-0 ${studentFormErrors.guardian_name ? 'border-red-400' : ''}`}
                              placeholder="Nombre apoderado"
                              value={studentForm.guardian_name}
                              onChange={(e) => {
                                setStudentForm({ ...studentForm, guardian_name: e.target.value })
                                setStudentFormErrors((prev) => ({ ...prev, guardian_name: '' }))
                              }}
                            />
                            {studentFormErrors.guardian_name ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.guardian_name}</p> : null}
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="guardian-phone">Teléfono apoderado</label>
                            <input
                              id="guardian-phone"
                              className={`fieldInput mb-0 ${studentFormErrors.guardian_phone ? 'border-red-400' : ''}`}
                              placeholder="Teléfono apoderado"
                              value={studentForm.guardian_phone}
                              onChange={(e) => {
                                setStudentForm({ ...studentForm, guardian_phone: e.target.value })
                                setStudentFormErrors((prev) => ({ ...prev, guardian_phone: '' }))
                              }}
                            />
                            {studentFormErrors.guardian_phone ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.guardian_phone}</p> : null}
                          </div>
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="guardian-email">Email apoderado</label>
                            <input
                              id="guardian-email"
                              className={`fieldInput mb-0 ${studentFormErrors.guardian_email ? 'border-red-400' : ''}`}
                              placeholder="Email apoderado"
                              value={studentForm.guardian_email}
                              onChange={(e) => {
                                setStudentForm({ ...studentForm, guardian_email: e.target.value })
                                setStudentFormErrors((prev) => ({ ...prev, guardian_email: '' }))
                              }}
                            />
                            {studentFormErrors.guardian_email ? <p className="mt-1 text-xs text-red-600">{studentFormErrors.guardian_email}</p> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                      <button type="button" className="actionButton" onClick={() => setShowStudentModal(false)} disabled={isSavingStudent}>
                        Cancelar
                      </button>
                      <button type="submit" className="actionButton actionButtonPrimary" disabled={isSavingStudent}>
                        {isSavingStudent ? 'Guardando...' : (editingId ? 'Actualizar' : 'Crear')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            <AppFooter />
            </main>
          </div>
        </section>
      )}
      </main>
    </AppRouter>
    </>
  )
}

export default App
