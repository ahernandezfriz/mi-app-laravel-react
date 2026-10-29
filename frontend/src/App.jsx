import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import AppRouter from './app/router/AppRouter'
import TaskBankSection from './features/taskTemplates/components/TaskBankSection'
import WorkshopsSection from './features/workshops/components/WorkshopsSection'
import WorkshopCourseSection from './features/workshops/components/WorkshopCourseSection'
import WorkshopDetailSection from './features/workshops/components/WorkshopDetailSection'
import FeedbackMessage from './shared/components/FeedbackMessage'
import { BackIcon, ButtonLabel, DownloadIcon, IconActionButton, PlusIcon } from './shared/components/ActionButtonIcons'
import StudentContextCard from './shared/components/StudentContextCard'
import SessionContextCard from './shared/components/SessionContextCard'
import TaskProgressBar from './shared/components/TaskProgressBar'
import HoverTooltip from './shared/components/HoverTooltip'
import IndicatorDonut from './shared/components/IndicatorDonut'
import AppFooter from './shared/components/AppFooter'
import SessionsDayCalendar from './shared/components/SessionsDayCalendar'
import DashboardScheduledSessions from './features/dashboard/components/DashboardScheduledSessions'
import { monthYearFromISODate, toLocalISODate } from './shared/utils/date'
import { formatExactAge, getBirthDateValidationError } from './shared/utils/exactAge'
import { getPlanCoursePreview, getPreviousPlanForYear, planCourseDisplayName } from './shared/utils/schoolCourseProgression'
import { formatRut, getRutValidationError, normalizeRutInput } from './shared/utils/rut'
import {
  buildSuspensionObservation,
  getSuspensionReasonColor,
  getSuspensionReasonDisplayLabel,
  parseSuspensionOtherDetail,
  parseSuspensionReasonValue,
  sessionHasSuspensionReason,
  SUSPENSION_REASON_OPTIONS,
} from './shared/utils/suspensionReason'
import { userFacingApiError, userFacingCaughtError } from './shared/utils/userFacingError'
import { defaultHeldOnForWorkshopYear, findWorkshopCourseForYear, workshopHeldYear } from './features/workshops/workshopCourseLabel'

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

function asList(data) {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.data)) return data.data
  if (data && typeof data === 'object') return Object.values(data)
  return []
}

function planSessionsCount(plan) {
  if (plan == null || plan.sessions_count == null || plan.sessions_count === '') return null
  const count = Number(plan.sessions_count)
  return Number.isFinite(count) ? count : null
}

const CLINICAL_CONTEXT_KEY = 'clinicalNavContext'

function readClinicalContext() {
  try {
    return JSON.parse(sessionStorage.getItem(CLINICAL_CONTEXT_KEY) || 'null')
  } catch {
    return null
  }
}

function persistClinicalContext(next = {}) {
  const current = readClinicalContext() || {}
  sessionStorage.setItem(CLINICAL_CONTEXT_KEY, JSON.stringify({ ...current, ...next }))
}

function asUrlList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || '').trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return asUrlList(parsed)
    } catch {
      return [value.trim()]
    }
  }
  if (value && typeof value === 'object') {
    return asUrlList(Object.values(value))
  }
  return []
}

function workshopHeldOn(value) {
  const day = String(value || '').trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : ''
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

function taskProgressFromTasks(tasks) {
  const ratedTasks = (Array.isArray(tasks) ? tasks : []).filter((task) => task?.rating && ratingToScore[task.rating])
  if (ratedTasks.length === 0) {
    return { percent: null, count: 0 }
  }
  const averageScore = ratedTasks.reduce((acc, task) => acc + ratingToScore[task.rating], 0) / ratedTasks.length
  return {
    percent: Math.round(((averageScore - 1) / 2) * 100),
    count: ratedTasks.length,
    averageScore,
  }
}
const emptyTaskRatingCounts = () => ({
  con_dificultad: 0,
  por_lograr: 0,
  logrado: 0,
})

function countTaskRatings(tasks) {
  return (Array.isArray(tasks) ? tasks : []).reduce((counts, task) => {
    if (task?.rating && counts[task.rating] !== undefined) {
      counts[task.rating] += 1
    }
    return counts
  }, emptyTaskRatingCounts())
}

function normalizeSessionTime(value) {
  if (!value) return '09:00'
  const match = String(value).trim().match(/^(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : '09:00'
}

function isBankSessionTask(task) {
  return Boolean(task?.task_template_id)
}

function getSessionTaskOriginLabel(task) {
  if (!isBankSessionTask(task)) return 'Nueva'
  return task?.edited_from_bank ? 'Banco de tareas (editada)' : 'Banco de tareas'
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
    secreduc_registry: '',
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [showReopenModal, setShowReopenModal] = useState(false)
  const [isReopenModalVisible, setIsReopenModalVisible] = useState(false)
  const [reopenModalError, setReopenModalError] = useState('')
  const [isReopeningSession, setIsReopeningSession] = useState(false)
  const [showDeletePlanModal, setShowDeletePlanModal] = useState(false)
  const [isDeletePlanModalVisible, setIsDeletePlanModalVisible] = useState(false)
  const [deletePlanModalError, setDeletePlanModalError] = useState('')
  const [isDeletingPlan, setIsDeletingPlan] = useState(false)
  const [planPendingDelete, setPlanPendingDelete] = useState(null)
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false)
  const [isDeleteSessionModalVisible, setIsDeleteSessionModalVisible] = useState(false)
  const [deleteSessionModalError, setDeleteSessionModalError] = useState('')
  const [isDeletingSession, setIsDeletingSession] = useState(false)
  const [sessionPendingDelete, setSessionPendingDelete] = useState(null)
  const [deleteSessionMode, setDeleteSessionMode] = useState('trash')
  const [showRestoreSessionModal, setShowRestoreSessionModal] = useState(false)
  const [isRestoreSessionModalVisible, setIsRestoreSessionModalVisible] = useState(false)
  const [restoreSessionModalError, setRestoreSessionModalError] = useState('')
  const [isRestoringSession, setIsRestoringSession] = useState(false)
  const [sessionPendingRestore, setSessionPendingRestore] = useState(null)
  const [showDeleteWorkshopModal, setShowDeleteWorkshopModal] = useState(false)
  const [isDeleteWorkshopModalVisible, setIsDeleteWorkshopModalVisible] = useState(false)
  const [deleteWorkshopModalError, setDeleteWorkshopModalError] = useState('')
  const [isDeletingWorkshop, setIsDeletingWorkshop] = useState(false)
  const [workshopPendingDelete, setWorkshopPendingDelete] = useState(null)
  const [showBankTaskEditModal, setShowBankTaskEditModal] = useState(false)
  const [isBankTaskEditModalVisible, setIsBankTaskEditModalVisible] = useState(false)
  const [taskPendingBankEdit, setTaskPendingBankEdit] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [plans, setPlans] = useState([])
  const [plansLoadError, setPlansLoadError] = useState('')
  const [editingPlanId, setEditingPlanId] = useState(null)
  const [planForm, setPlanForm] = useState({ year: new Date().getFullYear(), repeats_course: false, diagnosis_snapshot: '' })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [sessions, setSessions] = useState([])
  const [trashedSessions, setTrashedSessions] = useState([])
  const [showSessionTrash, setShowSessionTrash] = useState(false)
  const [sessionsLoadError, setSessionsLoadError] = useState('')
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
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
  const [suspensionOtherDetail, setSuspensionOtherDetail] = useState('')
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
  const [workshopSubmitError, setWorkshopSubmitError] = useState('')
  const [isUploadingSessionMaterial, setIsUploadingSessionMaterial] = useState(false)
  const [taskForm, setTaskForm] = useState({
    task_template_id: '',
    task_template_ids: [],
    name: '',
    description: '',
    rating: 'por_lograr',
  })
  const [taskCreationMode, setTaskCreationMode] = useState('manual')
  const [editingTaskId, setEditingTaskId] = useState(null)
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
  const didRestoreClinicalContext = useRef(false)
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
        throw new Error(response.ok
          ? 'La respuesta del servidor no es válida.'
          : userFacingApiError(response.status, {}))
      }
    }

    if (response.status === 401) {
      if (sendAuth) {
        localStorage.removeItem('token')
        setToken('')
        setCurrentUser(null)
      }
      throw new Error(userFacingApiError(401, data))
    }

    if (!response.ok) {
      throw new Error(userFacingApiError(response.status, data))
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
      setWorkshopCourses(asList(data))
    } catch (error) {
      setStatus(error.message)
    }
  }, [api])

  const loadWorkshops = useCallback(async (courseId, year) => {
    if (!courseId) {
      setWorkshops([])
      return []
    }
    try {
      const params = new URLSearchParams({ school_course_id: String(courseId) })
      if (year) {
        params.set('year', String(year))
      }
      const data = await api(`/workshops?${params.toString()}`)
      const list = asList(data)
      setWorkshops(list)
      return list
    } catch (error) {
      setStatus(error.message)
      return []
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
        secreduc_registry: '',
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
      secreduc_registry: currentUser.secreduc_registry || '',
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
    if (!token || didRestoreClinicalContext.current) return
    didRestoreClinicalContext.current = true

    const section = getSectionFromPath(window.location.pathname)
    const needsContext = section === 'studentPlans' || section === 'sessions' || section === 'sessionDetail'
    if (!needsContext) return

    const ctx = readClinicalContext()
    if (!ctx?.studentId) {
      setActiveSection('students')
      return
    }

    async function restoreClinicalContext() {
      try {
        const student = await api(`/students/${ctx.studentId}`)
        setSelectedStudent(student)
        const planList = asList(await api(`/students/${ctx.studentId}/treatment-plans`))
        setPlans(planList)

        if (!ctx.planId) {
          if (section === 'sessions' || section === 'sessionDetail') {
            setActiveSection('studentPlans')
          }
          return
        }

        const plan = planList.find((item) => Number(item.id) === Number(ctx.planId))
        if (!plan) {
          setActiveSection('studentPlans')
          return
        }

        setSelectedPlan(plan)
        setIsLoadingSessions(true)
        const [sessionList, trashList] = await Promise.all([
          api(`/students/${ctx.studentId}/treatment-plans/${plan.id}/sessions`).then(asList),
          api(`/students/${ctx.studentId}/treatment-plans/${plan.id}/sessions/trash`).then(asList).catch(() => []),
        ])
        setSessions(sessionList)
        setTrashedSessions(trashList)
        setShowSessionTrash(false)
        if (ctx.sessionId) {
          const session = sessionList.find((item) => Number(item.id) === Number(ctx.sessionId))
          if (session) setSelectedSession(session)
        }
        setActiveSectionState(section)
      } catch (error) {
        setSessionsLoadError(error.message)
        setStatus(error.message)
        setActiveSection('students')
      } finally {
        setIsLoadingSessions(false)
      }
    }

    restoreClinicalContext()
  }, [api, setActiveSection, token])

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
    if (showReopenModal) {
      setIsReopenModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsReopenModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showReopenModal])

  useEffect(() => {
    if (showDeletePlanModal) {
      setIsDeletePlanModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsDeletePlanModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showDeletePlanModal])

  useEffect(() => {
    if (showDeleteSessionModal) {
      setIsDeleteSessionModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsDeleteSessionModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showDeleteSessionModal])

  useEffect(() => {
    if (showRestoreSessionModal) {
      setIsRestoreSessionModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsRestoreSessionModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showRestoreSessionModal])

  useEffect(() => {
    if (showDeleteWorkshopModal) {
      setIsDeleteWorkshopModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsDeleteWorkshopModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showDeleteWorkshopModal])

  useEffect(() => {
    if (!toast.show) return

    const timer = setTimeout(() => {
      setToast((current) => ({ ...current, show: false }))
    }, 6000)

    return () => clearTimeout(timer)
  }, [toast.show, toast.message])

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
        onClosePlanModal()
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
  }, [selectedPlan?.id, sessions.length, trashedSessions.length, showSessionTrash])

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
    if (!showReopenModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowReopenModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showReopenModal])

  useEffect(() => {
    if (!showDeletePlanModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeletingPlan) {
        setShowDeletePlanModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showDeletePlanModal, isDeletingPlan])

  useEffect(() => {
    if (!showDeleteSessionModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeletingSession) {
        setShowDeleteSessionModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showDeleteSessionModal, isDeletingSession])

  useEffect(() => {
    if (!showRestoreSessionModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isRestoringSession) {
        setShowRestoreSessionModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showRestoreSessionModal, isRestoringSession])

  useEffect(() => {
    if (!showDeleteWorkshopModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !isDeletingWorkshop) {
        setShowDeleteWorkshopModal(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showDeleteWorkshopModal, isDeletingWorkshop])

  useEffect(() => {
    if (showBankTaskEditModal) {
      setIsBankTaskEditModalVisible(true)
      return
    }

    const timer = setTimeout(() => setIsBankTaskEditModalVisible(false), 180)
    return () => clearTimeout(timer)
  }, [showBankTaskEditModal])

  useEffect(() => {
    if (!showBankTaskEditModal) return

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowBankTaskEditModal(false)
        setTaskPendingBankEdit(null)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [showBankTaskEditModal])

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
            const tasks = asList(await api(
              `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${session.id}/tasks`,
            ))
            const progress = taskProgressFromTasks(tasks)

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
              averageScore: progress.averageScore ?? null,
              performancePercent: progress.percent,
              ratedTasksCount: progress.count,
              ratingCounts: countTaskRatings(tasks),
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
    loadWorkshops(selectedWorkshopCourse.id, selectedWorkshopCourse.year)
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
        secreduc_registry: profileForm.secreduc_registry.trim() || null,
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
    setPlans([])
    setPlansLoadError('')
    setActiveSection('studentPlans')
    try {
      const [freshStudent, data] = await Promise.all([
        api(`/students/${student.id}`),
        api(`/students/${student.id}/treatment-plans`),
      ])
      setSelectedStudent(freshStudent)
      setPlans(asList(data))
      persistClinicalContext({ studentId: freshStudent.id, planId: null, sessionId: null })
    } catch (error) {
      setPlans([])
      setPlansLoadError(error.message)
      setStatus(error.message)
    }
  }

  async function reloadTreatmentPlans(student = selectedStudent) {
    if (!student) return
    try {
      const data = asList(await api(`/students/${student.id}/treatment-plans`))
      setPlans(data)
      setPlansLoadError('')
    } catch (error) {
      setPlansLoadError(error.message)
    }
  }

  function onOpenCreatePlanModal() {
    const latestYear = plans.reduce((max, plan) => Math.max(max, Number(plan.year) || 0), 0)
    setEditingPlanId(null)
    setPlanForm({
      year: latestYear ? latestYear + 1 : new Date().getFullYear(),
      repeats_course: false,
      diagnosis_snapshot: selectedStudent?.current_diagnosis || '',
    })
    setShowPlanModal(true)
  }

  function onOpenEditPlanModal(plan) {
    if (!plan) return
    const otherPlans = plans.filter((item) => Number(item.id) !== Number(plan.id))
    const previousPlan = getPreviousPlanForYear(otherPlans, plan.year)
    const previousCourseId = previousPlan?.course?.id
    const currentCourseId = plan.course?.id
    const repeatsCourse = previousCourseId && currentCourseId
      ? Number(previousCourseId) === Number(currentCourseId)
      : true

    setEditingPlanId(plan.id)
    setPlanForm({
      year: plan.year,
      repeats_course: repeatsCourse,
      diagnosis_snapshot: plan.diagnosis_snapshot || '',
    })
    setShowPlanModal(true)
  }

  function onClosePlanModal() {
    setShowPlanModal(false)
    setEditingPlanId(null)
  }

  async function onSavePlan(e) {
    e.preventDefault()
    if (!selectedStudent) return

    const repeatsCourse = planCoursePreview.isFirstPlan
      || !planCoursePreview.nextCourse
      || Boolean(planForm.repeats_course)
    const isEditing = Boolean(editingPlanId)

    try {
      await api(
        isEditing
          ? `/students/${selectedStudent.id}/treatment-plans/${editingPlanId}`
          : `/students/${selectedStudent.id}/treatment-plans`,
        {
          method: isEditing ? 'PUT' : 'POST',
          body: JSON.stringify({
            year: Number(planForm.year),
            repeats_course: repeatsCourse,
            ...(isEditing ? { diagnosis_snapshot: planForm.diagnosis_snapshot } : {}),
          }),
        },
      )
      await onSelectStudent(selectedStudent)
      onClosePlanModal()
      setStatus(isEditing ? 'Plan de tratamiento actualizado' : 'Plan anual creado')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function onAskDeletePlan(plan) {
    setPlanPendingDelete(plan)
    setDeletePlanModalError('')
    setShowDeletePlanModal(true)
  }

  async function onConfirmDeletePlan() {
    if (!selectedStudent || !planPendingDelete || isDeletingPlan) return
    setIsDeletingPlan(true)
    setDeletePlanModalError('')

    try {
      await api(`/students/${selectedStudent.id}/treatment-plans/${planPendingDelete.id}`, { method: 'DELETE' })
      await onSelectStudent(selectedStudent)
      setShowDeletePlanModal(false)
      setPlanPendingDelete(null)
      setStatus('Plan eliminado')
    } catch (error) {
      setDeletePlanModalError(error.message || 'No se pudo eliminar el plan de tratamiento.')
    } finally {
      setIsDeletingPlan(false)
    }
  }

  async function onDownloadPlanConsolidatedPdf(planId) {
    if (!selectedStudent || isGeneratingPdf) return
    setIsGeneratingPdf(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/students/${selectedStudent.id}/treatment-plans/${planId}/consolidated-pdf`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo generar el PDF consolidado.')
      const plan = plans.find((item) => item.id === planId) || selectedPlan
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = consolidatedPdfFilename(selectedStudent, plan)
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('PDF consolidado descargado')
    } catch (error) {
      setStatus(userFacingCaughtError(error, 'No se pudo generar el PDF consolidado.'))
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  async function onSelectPlan(plan) {
    if (!selectedStudent) return
    setSelectedPlan(plan)
    setActiveSection('sessions')
    setSessions([])
    setTrashedSessions([])
    setShowSessionTrash(false)
    setSessionsLoadError('')
    setIsLoadingSessions(true)
    setSessionRatingSeries([])
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
      const [data, trash] = await Promise.all([
        api(`/students/${selectedStudent.id}/treatment-plans/${plan.id}/sessions`).then(asList),
        api(`/students/${selectedStudent.id}/treatment-plans/${plan.id}/sessions/trash`).then(asList).catch(() => []),
      ])
      setSessions(data)
      setTrashedSessions(trash)
      setSelectedSession(null)
      setSessionTasks([])
      setSessionMaterials([])
      persistClinicalContext({ studentId: selectedStudent.id, planId: plan.id, sessionId: null })
    } catch (error) {
      setSessionsLoadError(error.message)
      setStatus(error.message)
    } finally {
      setIsLoadingSessions(false)
    }
  }

  async function refreshPlanSessionLists(plan = selectedPlan) {
    if (!selectedStudent || !plan) return []
    const [data, trash] = await Promise.all([
      api(`/students/${selectedStudent.id}/treatment-plans/${plan.id}/sessions`).then(asList),
      api(`/students/${selectedStudent.id}/treatment-plans/${plan.id}/sessions/trash`).then(asList).catch(() => []),
    ])
    setSessions(data)
    setTrashedSessions(trash)
    return trash
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

  function onAskDeleteSession(session) {
    setSessionPendingDelete(session)
    setDeleteSessionMode('trash')
    setDeleteSessionModalError('')
    setShowDeleteSessionModal(true)
  }

  function onAskForceDeleteSession(session) {
    setSessionPendingDelete(session)
    setDeleteSessionMode('force')
    setDeleteSessionModalError('')
    setShowDeleteSessionModal(true)
  }

  function onCloseDeleteSessionModal() {
    if (isDeletingSession) return
    setShowDeleteSessionModal(false)
  }

  async function onConfirmDeleteSession() {
    if (!selectedStudent || !selectedPlan || !sessionPendingDelete || isDeletingSession) return
    const sessionId = sessionPendingDelete.id
    const isForceDelete = deleteSessionMode === 'force'
    setIsDeletingSession(true)
    setDeleteSessionModalError('')

    try {
      await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${sessionId}${isForceDelete ? '/force' : ''}`,
        { method: 'DELETE' },
      )
      if (!isForceDelete && Number(selectedSession?.id) === Number(sessionId)) {
        setSelectedSession(null)
        setActiveSection('sessions')
      }
      const trash = await refreshPlanSessionLists()
      if (isForceDelete && trash.length === 0) setShowSessionTrash(false)
      setShowDeleteSessionModal(false)
      setSessionPendingDelete(null)
      setStatus(isForceDelete ? 'Sesión eliminada definitivamente' : 'Sesión enviada a la papelera')
    } catch (error) {
      setDeleteSessionModalError(error.message || (isForceDelete
        ? 'No se pudo eliminar la sesión de forma definitiva.'
        : 'No se pudo enviar la sesión a la papelera.'))
    } finally {
      setIsDeletingSession(false)
    }
  }

  function onAskRestoreSession(session) {
    setSessionPendingRestore(session)
    setRestoreSessionModalError('')
    setShowRestoreSessionModal(true)
  }

  function onCloseRestoreSessionModal() {
    if (isRestoringSession) return
    setShowRestoreSessionModal(false)
  }

  async function onConfirmRestoreSession() {
    if (!selectedStudent || !selectedPlan || !sessionPendingRestore || isRestoringSession) return
    const sessionId = sessionPendingRestore.id
    setIsRestoringSession(true)
    setRestoreSessionModalError('')

    try {
      await api(`/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${sessionId}/restore`, {
        method: 'POST',
      })
      const trash = await refreshPlanSessionLists()
      if (trash.length === 0) setShowSessionTrash(false)
      setShowRestoreSessionModal(false)
      setSessionPendingRestore(null)
      notifyUser('Sesión restaurada con éxito')
    } catch (error) {
      setRestoreSessionModalError(error.message || 'No se pudo restaurar la sesión.')
    } finally {
      setIsRestoringSession(false)
    }
  }

  async function onDownloadSessionPdf(sessionId) {
    if (!selectedStudent || !selectedPlan || isGeneratingPdf) return
    const session = sessions.find((item) => item.id === sessionId) || selectedSession
    setIsGeneratingPdf(true)
    try {
      const response = await fetch(
        `${apiBaseUrl}/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${sessionId}/pdf`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo generar el PDF de la sesión.')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = sessionPdfFilename(selectedStudent, session)
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('PDF de sesion descargado')
    } catch (error) {
      setStatus(userFacingCaughtError(error, 'No se pudo generar el PDF de la sesión.'))
    } finally {
      setIsGeneratingPdf(false)
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

  async function loadSessionDetails(session) {
    if (!selectedStudent || !selectedPlan || !session) return
    try {
      const [tasksData, materialsData] = await Promise.all([
        api(`/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${session.id}/tasks`),
        api(`/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions/${session.id}/materials`),
      ])
      setSessionTasks(asList(tasksData))
      setSessionMaterials(asList(materialsData))
    } catch (error) {
      setStatus(error.message)
    }
  }

  async function onSelectSession(session) {
    if (!selectedStudent || !selectedPlan) return
    setSelectedSession(session)
    persistClinicalContext({ studentId: selectedStudent.id, planId: selectedPlan.id, sessionId: session.id })
    setActiveSection('sessionDetail')
    setEditingTaskId(null)
    setTaskForm({
      task_template_id: '',
      task_template_ids: [],
      name: '',
      description: '',
      rating: 'por_lograr',
    })
    setSessionObservation(session.general_observation || '')
    setSuspensionReason(parseSuspensionReasonValue(session.general_observation) || 'estudiante_ausente')
    setSuspensionOtherDetail(parseSuspensionOtherDetail(session.general_observation))
    setSessionMaterialForm({ title: '', media_library_item_id: '', file: null })
    setShowTaskModal(false)
    setTaskCreationMode('manual')
    await loadSessionDetails(session)
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
      await Promise.all([loadSessionDetails(selectedSession), loadMediaLibraryItems()])
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
      await loadSessionDetails(selectedSession)
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
      if (!response.ok) throw new Error('No se pudo descargar el material.')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = material.media_item?.stored_name || material.original_name || `material-${material.id}`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('Material descargado')
    } catch (error) {
      setStatus(userFacingCaughtError(error, 'No se pudo descargar el material.'))
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
        selectedSession ? loadSessionDetails(selectedSession) : Promise.resolve(),
        selectedWorkshopCourse ? loadWorkshops(selectedWorkshopCourse.id, selectedWorkshopCourse.year) : Promise.resolve(),
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
      if (!response.ok) throw new Error('No se pudo descargar el recurso.')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = item.stored_name || item.original_name || `media-${item.id}`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('Recurso descargado')
    } catch (error) {
      setStatus(userFacingCaughtError(error, 'No se pudo descargar el recurso.'))
    }
  }

  async function onSaveWorkshop(e, overrides = {}) {
    e.preventDefault()
    const form = { ...workshopForm, ...overrides }
    const wasEditing = Boolean(editingWorkshopId)
    const actionLabel = wasEditing ? 'actualizar' : 'crear'
    setWorkshopSubmitError('')
    const name = String(form.name || '').trim()
    const objective = String(form.objective || '').trim()
    const description = String(form.description || '').trim()
    const heldOn = workshopHeldOn(form.held_on)
    const urls = asUrlList(form.urls)
    const failSave = (detail) => {
      const message = `No se pudo ${actionLabel} el taller. ${detail}`
      setWorkshopSubmitError(message)
      notifyUser(message, 'error')
      return false
    }
    if (!name) {
      return failSave('El nombre es obligatorio.')
    }
    if (!form.school_course_id) {
      return failSave('Selecciona el curso.')
    }
    if (!heldOn) {
      return failSave('Selecciona la fecha de realización.')
    }
    const creatingFromCourseList = !wasEditing && !selectedWorkshopCourse && !form.fromExistingCourse
    if (creatingFromCourseList) {
      const existingCourse = findWorkshopCourseForYear(
        workshopCourses,
        form.school_course_id,
        workshopHeldYear(heldOn),
      )
      if (existingCourse) {
        const count = Number(existingCourse.workshops_count || 0)
        const yearLabel = existingCourse.year ? ` en ${existingCourse.year}` : ''
        return failSave(
          `Este curso ya está en tu listado${yearLabel} y cuenta con ${count} ${count === 1 ? 'taller' : 'talleres'}. Entra al curso para registrar otro.`,
        )
      }
    }

    const formData = new FormData()
    formData.append('name', name)
    formData.append('objective', objective)
    formData.append('description', description)
    formData.append('held_on', heldOn)
    formData.append('school_course_id', String(form.school_course_id))
    if (form.media_library_item_id) {
      formData.append('media_library_item_id', String(form.media_library_item_id))
    } else if (form.file) {
      const fileError = getWorkshopFileError(form.file)
      if (fileError) {
        return failSave(fileError)
      }
      formData.append('file', form.file)
    }
    formData.append('urls', JSON.stringify(urls))

    try {
      setSavingWorkshop(true)
      const path = wasEditing ? `/workshops/${editingWorkshopId}` : '/workshops'
      if (wasEditing) {
        formData.append('_method', 'PUT')
      }
      const savedWorkshop = await api(path, { method: 'POST', body: formData, timeoutMs: 60000 })
      let savedWorkshopId = savedWorkshop?.id ?? savedWorkshop?.data?.id ?? null
      setWorkshopForm(emptyWorkshopForm({ held_on: heldOn }))
      setEditingWorkshopId(null)
      setWorkshopSubmitError('')
      await Promise.all([loadWorkshopCourses(), loadMediaLibraryItems()])
      if (selectedWorkshopCourse) {
        const stillSelected = selectedWorkshopCourse.id === Number(form.school_course_id)
          || String(selectedWorkshopCourse.id) === String(form.school_course_id)
        if (stillSelected) {
          const savedYear = workshopHeldYear(heldOn) || selectedWorkshopCourse.year
          if (Number(selectedWorkshopCourse.year) !== Number(savedYear)) {
            setSelectedWorkshopCourse({ ...selectedWorkshopCourse, year: savedYear })
          }
          const list = await loadWorkshops(selectedWorkshopCourse.id, savedYear)
          if (!wasEditing && !savedWorkshopId) {
            const match = list.find((item) => (
              String(item.name || '') === name && workshopHeldOn(item.held_on) === heldOn
            ))
            savedWorkshopId = match?.id ?? list[0]?.id ?? null
          }
        }
      }
      if (savedWorkshop && selectedWorkshop && Number(savedWorkshopId) === Number(selectedWorkshop.id)) {
        setSelectedWorkshop(savedWorkshop?.id ? savedWorkshop : savedWorkshop?.data)
      }
      const successMessage = wasEditing
        ? 'El taller se actualizó correctamente.'
        : 'El taller se creó correctamente.'
      notifyUser(successMessage, 'success')
      return true
    } catch (error) {
      const detail = userFacingCaughtError(error, 'Inténtalo de nuevo.')
      const message = `No se pudo ${actionLabel} el taller. ${detail}`
      setWorkshopSubmitError(message)
      notifyUser(message, 'error')
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
      held_on: workshopHeldOn(workshop.held_on),
      school_level_id: String(workshop.course?.school_level_id || selectedWorkshopCourse?.school_level_id || ''),
      school_course_id: String(workshop.school_course_id || selectedWorkshopCourse?.id || ''),
      file: null,
      media_library_item_id: workshop.media_library_item_id ? String(workshop.media_library_item_id) : '',
      urls: asUrlList(workshop.urls),
      fromExistingCourse: true,
    })
  }

  function onAskDeleteWorkshop(workshop) {
    setWorkshopPendingDelete(workshop)
    setDeleteWorkshopModalError('')
    setShowDeleteWorkshopModal(true)
  }

  async function onConfirmDeleteWorkshop() {
    if (!workshopPendingDelete || isDeletingWorkshop) return
    setIsDeletingWorkshop(true)
    setDeleteWorkshopModalError('')
    try {
      await api(`/workshops/${workshopPendingDelete.id}`, { method: 'DELETE' })
      await Promise.all([loadWorkshopCourses(), loadMediaLibraryItems()])
      let yearStillHasWorkshops = true
      if (selectedWorkshopCourse) {
        const remaining = await loadWorkshops(selectedWorkshopCourse.id, selectedWorkshopCourse.year)
        if (Array.isArray(remaining) && remaining.length === 0) {
          yearStillHasWorkshops = false
          setSelectedWorkshopCourse(null)
          setSelectedWorkshop(null)
          setActiveSection('workshops')
        }
      }
      if (yearStillHasWorkshops && selectedWorkshop && Number(selectedWorkshop.id) === Number(workshopPendingDelete.id)) {
        setSelectedWorkshop(null)
        setActiveSection('workshopCourse')
      }
      setShowDeleteWorkshopModal(false)
      setWorkshopPendingDelete(null)
      notifyUser('El taller se eliminó correctamente.', 'success')
    } catch (error) {
      const message = userFacingCaughtError(error, 'No se pudo eliminar el taller.')
      setDeleteWorkshopModalError(message)
      notifyUser(message, 'error')
    } finally {
      setIsDeletingWorkshop(false)
    }
  }

  async function onDownloadWorkshop(workshop) {
    try {
      const response = await fetch(
        `${apiBaseUrl}/workshops/${workshop.id}/download`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } },
      )
      if (!response.ok) throw new Error('No se pudo descargar el material del taller.')
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = workshop.stored_name || workshop.original_name || `taller-${workshop.id}`
      a.click()
      window.URL.revokeObjectURL(url)
      setStatus('Material del taller descargado')
    } catch (error) {
      setStatus(userFacingCaughtError(error, 'No se pudo descargar el material del taller.'))
    }
  }

  function onOpenWorkshopCourse(course) {
    setSelectedWorkshopCourse(course)
    setEditingWorkshopId(null)
    setWorkshopForm(emptyWorkshopForm({
      school_level_id: String(course.school_level_id || course.level?.id || ''),
      school_course_id: String(course.id),
      held_on: defaultHeldOnForWorkshopYear(course),
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
      if (editingTaskId) {
        await api(`${path}/${editingTaskId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: taskForm.name.trim(),
            description: taskForm.description.trim() || '',
            rating: taskForm.rating || null,
          }),
        })
        notifyUser('Tarea actualizada en la sesión.', 'success')
      } else if (taskCreationMode === 'import' && taskForm.task_template_ids.length > 0) {
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
        setStatus('Tarea agregada a sesion')
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
        setStatus('Tarea agregada a sesion')
      }
      await loadSessionDetails(selectedSession)
      setShowTaskModal(false)
      setEditingTaskId(null)
      setTaskCreationMode('manual')
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
      await loadSessionDetails(selectedSession)
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
      const refreshedSessions = asList(await api(
        `/students/${selectedStudent.id}/treatment-plans/${selectedPlan.id}/sessions`,
      ))
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
    if (!selectedSession || isReopeningSession) return
    setIsReopeningSession(true)
    setReopenModalError('')
    try {
      await onUpdateSessionState(
        { status: 'pendiente', generalObservation: sessionObservation || null },
        'Sesión habilitada para edición.',
      )
      setShowReopenModal(false)
    } catch (error) {
      setReopenModalError(error.message || 'No se pudo volver a editar la sesión.')
    } finally {
      setIsReopeningSession(false)
    }
  }

  async function onSuspendSession() {
    if (!selectedSession || isSuspendingSession) return
    if (suspensionReason === 'otro' && !String(suspensionOtherDetail || '').trim()) {
      setSuspendModalError('Indica el motivo de suspensión.')
      return
    }
    setIsSuspendingSession(true)
    setSuspendModalError('')
    const { text: generalObservationWithReason, label: suspensionLabel } = buildSuspensionObservation(
      sessionObservation,
      suspensionReason,
      suspensionOtherDetail,
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
      await loadSessionDetails(selectedSession)
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

  function openEditSessionTaskForm(task) {
    setEditingTaskId(task.id)
    setTaskCreationMode('edit')
    setTaskForm({
      task_template_id: task.task_template_id ? String(task.task_template_id) : '',
      task_template_ids: [],
      name: task.name || '',
      description: task.description || '',
      rating: task.rating || '',
    })
    setShowTaskModal(true)
  }

  function onOpenEditSessionTask(task) {
    if (!task || selectedSession?.status === 'finalizada') return
    if (isBankSessionTask(task)) {
      setTaskPendingBankEdit(task)
      setShowBankTaskEditModal(true)
      return
    }
    openEditSessionTaskForm(task)
  }

  function onConfirmBankTaskEdit() {
    const task = taskPendingBankEdit
    setShowBankTaskEditModal(false)
    setTaskPendingBankEdit(null)
    if (task) {
      openEditSessionTaskForm(task)
    }
  }

  async function onOpenTodaySession(todaySessionItem) {
    const { student, plan, session } = todaySessionItem
    await onSelectStudent(student)
    await onSelectPlan(plan)
    await onSelectSession(session)
  }

  const selectedLevel = levels.find((level) => String(level.id) === String(studentForm.school_level_id))
  const availableCourses = selectedLevel?.courses ?? []
  const studentContextPlan = useMemo(() => {
    if (selectedPlan && plans.some((plan) => Number(plan.id) === Number(selectedPlan.id))) {
      return selectedPlan
    }
    return [...plans].sort((a, b) => Number(b.year) - Number(a.year))[0] || null
  }, [selectedPlan, plans])
  const plansForCoursePreview = useMemo(
    () => (editingPlanId
      ? plans.filter((plan) => Number(plan.id) !== Number(editingPlanId))
      : plans),
    [plans, editingPlanId],
  )
  const planCoursePreview = useMemo(
    () => getPlanCoursePreview(
      levels,
      selectedStudent,
      plansForCoursePreview,
      planForm.year,
      Boolean(planForm.repeats_course),
    ),
    [levels, selectedStudent, plansForCoursePreview, planForm.year, planForm.repeats_course],
  )
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
  const visibleSessions = showSessionTrash ? trashedSessions : sessions
  const sessionsTotalPages = Math.max(1, Math.ceil(visibleSessions.length / PAGE_SIZE))
  const safeSessionsPage = Math.min(sessionsPage, sessionsTotalPages)
  const paginatedSessions = useMemo(() => {
    const start = (safeSessionsPage - 1) * PAGE_SIZE
    return visibleSessions.slice(start, start + PAGE_SIZE)
  }, [visibleSessions, safeSessionsPage])
  const MONTH_SHORT_LABELS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC']
  const MONTH_SHORT_SLUGS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return '-'
    const [year, month, day] = String(dateValue).split('-')
    if (!year || !month || !day) return dateValue
    const monthLabel = MONTH_SHORT_LABELS[Number(month) - 1]
    if (!monthLabel) return dateValue
    return `${Number(day)} ${monthLabel} ${year}`
  }
  const formatDisplayTime = (timeValue) => {
    if (!timeValue) return '--:--'
    return String(timeValue).slice(0, 5)
  }
  const sessionPdfFilename = (student, session) => {
    const slug = studentFilenameSlug(student)
    const [year, month, day] = String(session?.session_date || '').split('-')
    const monthSlug = MONTH_SHORT_SLUGS[Number(month) - 1] || 'ene'
    const timeDigits = String(session?.session_time || '00:00:00').replace(/\D/g, '').padEnd(6, '0').slice(0, 6)
    return `${slug}-${day}-${monthSlug}-${year}-${timeDigits}.pdf`
  }
  const studentFilenameSlug = (student) => (
    String(student?.full_name || 'estudiante')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'estudiante'
  )
  const consolidatedPdfFilename = (student, plan) => (
    `${studentFilenameSlug(student)}-plan-consolidado-${plan?.year}.pdf`
  )
  const currentYear = new Date().getFullYear()
  const displaySessionStatus = (status) => (status === 'draft' ? 'pendiente' : status)
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
  const suspensionByLeave = suspendedSessions.filter((session) =>
    sessionHasSuspensionReason(session.general_observation, 'licencia_medica_profesional'),
  ).length
  const suspensionBySchool = suspendedSessions.filter((session) =>
    sessionHasSuspensionReason(session.general_observation, 'suspension_de_clases'),
  ).length
  const suspensionByOther = suspendedSessions.filter((session) =>
    sessionHasSuspensionReason(session.general_observation, 'otro'),
  ).length
  const unknownSuspensionReason = Math.max(
    suspendedSessions.length - suspensionByAbsent - suspensionByLeave - suspensionBySchool - suspensionByOther,
    0,
  )
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
        label: 'Suspensión de clases',
        value: `${globalActivityPercent}%`,
        count: globalActivityCount,
        percent: globalActivityPercent,
        color: '#d946ef',
      },
    ].filter((segment) => segment.count > 0)
  })()
  const planTaskRatingTotals = sessionRatingSeries.reduce(
    (totals, entry) => {
      totals.con_dificultad += entry.ratingCounts?.con_dificultad || 0
      totals.por_lograr += entry.ratingCounts?.por_lograr || 0
      totals.logrado += entry.ratingCounts?.logrado || 0
      return totals
    },
    emptyTaskRatingCounts(),
  )
  const planRatedTasksTotal =
    planTaskRatingTotals.con_dificultad + planTaskRatingTotals.por_lograr + planTaskRatingTotals.logrado
  const sessionProgressById = Object.fromEntries(
    sessionRatingSeries.map((entry) => [String(entry.sessionId), entry]),
  )
  const taskRatingSegments = (() => {
    if (planRatedTasksTotal <= 0) return []
    const raw = [
      {
        key: 'no_logra',
        label: 'No lo logra',
        value: planTaskRatingTotals.con_dificultad,
        count: planTaskRatingTotals.con_dificultad,
        color: '#ef4444',
      },
      {
        key: 'por_lograr',
        label: 'Por lograr',
        value: planTaskRatingTotals.por_lograr,
        count: planTaskRatingTotals.por_lograr,
        color: '#eab308',
      },
      {
        key: 'lo_logra',
        label: 'Lo logra',
        value: planTaskRatingTotals.logrado,
        count: planTaskRatingTotals.logrado,
        color: '#10b981',
      },
    ].filter((segment) => segment.count > 0)

    let used = 0
    return raw.map((segment, index) => {
      const percent = index === raw.length - 1
        ? Math.max(100 - used, 0)
        : Math.round((segment.count / planRatedTasksTotal) * 100)
      used += percent
      return { ...segment, percent }
    })
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
        key: 'licencia',
        label: 'Licencia médica profesional',
        value: suspensionByLeave,
        count: suspensionByLeave,
        color: '#0ea5e9',
      },
      {
        key: 'clases',
        label: 'Suspensión de clases',
        value: suspensionBySchool,
        count: suspensionBySchool,
        color: '#d946ef',
      },
      {
        key: 'otro',
        label: 'Otro',
        value: suspensionByOther,
        count: suspensionByOther,
        color: '#64748b',
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
    if (status === 'pendiente') return 'Pendiente'
    if (status === 'finalizada') return 'Finalizada'
    if (status === 'suspendida') return 'Suspendida'
    return status ? status.charAt(0).toUpperCase() + status.slice(1) : status
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
      return {
        ...entry,
        kind: 'suspension',
        x,
        y: chartHeight - chartPadding,
        color: getSuspensionReasonColor(entry.suspensionReason),
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
      {isGeneratingPdf && (
        <div className="fixed bottom-6 right-4 z-[80]" role="status" aria-live="polite">
          <div className="flex items-center gap-3 rounded-[5px] border border-violet-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-lg">
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-violet-200 border-t-[#6e62e5]"
              aria-hidden="true"
            />
            <span className="font-medium">Generando PDF...</span>
          </div>
        </div>
      )}
      {toast.show && (
        <div className="fixed right-4 top-4 z-[90] max-w-sm">
          <div
            className={`rounded-[5px] border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
            role="alert"
            aria-live="assertive"
          >
            <p className="font-semibold">
              {toast.type === 'success' ? 'Listo' : 'No se pudo completar'}
            </p>
            <p className="mt-0.5">{toast.message}</p>
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
                    onClick={() => {
                      setActiveSection('studentPlans')
                      reloadTreatmentPlans()
                    }}
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
                    onClick={() => (selectedPlan ? onSelectPlan(selectedPlan) : setActiveSection('sessions'))}
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
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="profile-secreduc">Registro secreduc</label>
                        <input
                          id="profile-secreduc"
                          className="fieldInput mb-0"
                          value={profileForm.secreduc_registry}
                          onChange={(e) => setProfileForm((prev) => ({ ...prev, secreduc_registry: e.target.value }))}
                          placeholder="Registro ministerial"
                        />
                        <p className="mt-1 text-xs text-slate-500">Número de registro ministerial del profesional.</p>
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
                submitError={workshopSubmitError}
                onClearSubmitError={() => setWorkshopSubmitError('')}
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
                onDeleteWorkshop={onAskDeleteWorkshop}
                onViewWorkshop={onOpenWorkshopDetail}
                formatDisplayDate={formatDisplayDate}
                savingWorkshop={savingWorkshop}
                submitError={workshopSubmitError}
                onClearSubmitError={() => setWorkshopSubmitError('')}
                mediaLibraryItems={mediaLibraryItems}
              />
            )}

            {activeSection === 'workshopDetail' && selectedWorkshop && (
              <WorkshopDetailSection
                workshop={selectedWorkshop}
                formatDisplayDate={formatDisplayDate}
                onBack={onBackToWorkshopCourse}
                onEditWorkshop={onEditWorkshop}
                onDeleteWorkshop={onAskDeleteWorkshop}
                onDownloadWorkshop={onDownloadWorkshop}
                workshopForm={workshopForm}
                setWorkshopForm={setWorkshopForm}
                levels={levels}
                editingWorkshopId={editingWorkshopId}
                setEditingWorkshopId={setEditingWorkshopId}
                onSaveWorkshop={onSaveWorkshop}
                savingWorkshop={savingWorkshop}
                submitError={workshopSubmitError}
                onClearSubmitError={() => setWorkshopSubmitError('')}
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
                        <th className="px-3 py-2 text-left font-bold text-slate-900">Vista previa</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-900">Título</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-900">Archivo</th>
                        <th className="px-3 py-2 text-left font-bold text-slate-900">Uso</th>
                        <th className="px-3 py-2 text-right font-bold text-slate-900">Opciones</th>
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
                              <IconActionButton
                                variant="download"
                                label="Descargar"
                                onClick={() => onDownloadMediaLibraryItem(item)}
                              />
                              <IconActionButton
                                variant="delete"
                                label="Eliminar"
                                onClick={() => onDeleteMediaLibraryItem(item)}
                              />
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
                      <ButtonLabel icon={<PlusIcon />}>Registrar estudiante</ButtonLabel>
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
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Estudiante</th>
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Curso</th>
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Diagnóstico</th>
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Apoderado</th>
                          <th className="px-3 py-3 text-right font-bold text-slate-900">Opciones</th>
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
                              <div className="flex flex-nowrap items-center justify-end gap-2">
                                <button
                                  className="shrink-0 whitespace-nowrap rounded-[5px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
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
                                <IconActionButton
                                  variant="edit"
                                  label="Editar"
                                  onClick={() => onEditStudent(student)}
                                />
                                <IconActionButton
                                  variant="delete"
                                  label="Eliminar"
                                  onClick={() => onDeleteStudent(student.id)}
                                />
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
                <StudentContextCard
                  student={selectedStudent}
                  planYear={studentContextPlan?.year}
                  courseLabel={planCourseDisplayName(studentContextPlan, selectedStudent)}
                />

                <section className="sectionCard">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="sectionTitle mb-0">Planes de tratamiento</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Cada plan corresponde a un año escolar con su diagnóstico registrado al momento de creación.
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button className="actionButton actionButtonPrimary" onClick={onOpenCreatePlanModal}>
                        <ButtonLabel icon={<PlusIcon />}>Crear plan</ButtonLabel>
                      </button>
                      <button className="actionButton" onClick={() => setActiveSection('students')}>
                        <ButtonLabel icon={<BackIcon />}>Volver a estudiantes</ButtonLabel>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-[10px] border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="w-28 px-6 py-3 text-left font-bold text-slate-900">Año</th>
                          <th className="px-6 py-3 text-left font-bold text-slate-900">Curso del estudiante</th>
                          <th className="px-6 py-3 text-left font-bold text-slate-900">Diagnóstico del plan</th>
                          <th className="min-w-[14rem] px-6 py-3 text-left font-bold text-slate-900">Logro</th>
                          <th className="whitespace-nowrap px-6 py-3 text-right font-bold text-slate-900">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {plans.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-10 text-center">
                              {plansLoadError ? (
                                <>
                                  <p className="font-medium text-slate-700">No se pudieron cargar los planes</p>
                                  <p className="mt-1 text-sm text-red-600">{plansLoadError}</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-slate-700">Sin planes de tratamiento</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    Crea el primer plan para comenzar a registrar sesiones.
                                  </p>
                                  <button
                                    type="button"
                                    className="actionButton actionButtonPrimary mt-4"
                                    onClick={onOpenCreatePlanModal}
                                  >
                                    <ButtonLabel icon={<PlusIcon />}>Crear plan de tratamiento</ButtonLabel>
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                        {paginatedPlans.map((plan) => (
                          <tr key={plan.id} className="transition hover:bg-violet-50/40">
                            <td className="px-6 py-3">
                              <span className="inline-flex min-w-[3rem] items-center justify-center rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">
                                {plan.year}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-slate-700">{planCourseDisplayName(plan, selectedStudent)}</td>
                            <td className="px-6 py-3 text-slate-700">{plan.diagnosis_snapshot}</td>
                            <td className="min-w-[14rem] px-6 py-3">
                              <TaskProgressBar
                                percent={plan.progress_percent}
                                taskCount={plan.rated_tasks_count}
                              />
                            </td>
                            <td className="whitespace-nowrap px-6 py-3">
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
                                    <span>Sesiones{planSessionsCount(plan) == null ? '' : ` (${planSessionsCount(plan)})`}</span>
                                  </span>
                                </button>
                                <IconActionButton
                                  variant="edit"
                                  label="Editar"
                                  onClick={() => onOpenEditPlanModal(plan)}
                                />
                                <IconActionButton
                                  variant="download"
                                  label="Descargar PDF"
                                  onClick={() => onDownloadPlanConsolidatedPdf(plan.id)}
                                  disabled={isGeneratingPdf}
                                />
                                <IconActionButton
                                  variant="delete"
                                  label="Eliminar"
                                  onClick={() => onAskDeletePlan(plan)}
                                />
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
                <StudentContextCard
                  student={selectedStudent}
                  planYear={selectedPlan.year}
                  courseLabel={planCourseDisplayName(selectedPlan, selectedStudent)}
                  actions={(
                    <>
                      {!showSessionTrash && (
                        <button className="actionButton actionButtonPrimary" onClick={onOpenCreateSessionModal}>
                          <ButtonLabel icon={<PlusIcon />}>Agendar sesión</ButtonLabel>
                        </button>
                      )}
                      <button
                        type="button"
                        className="actionButton"
                        onClick={() => setShowSessionTrash((prev) => !prev)}
                      >
                        {showSessionTrash
                          ? <ButtonLabel icon={<BackIcon />}>Volver a sesiones</ButtonLabel>
                          : `Papelera (${trashedSessions.length})`}
                      </button>
                      <button
                        className="actionButton"
                        onClick={() => {
                          setActiveSection('studentPlans')
                          reloadTreatmentPlans()
                        }}
                      >
                        <ButtonLabel icon={<BackIcon />}>Volver a planes de tratamiento</ButtonLabel>
                      </button>
                    </>
                  )}
                />
                {sessionsLoadError && (
                  <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    No se pudieron cargar las sesiones. {sessionsLoadError}
                  </p>
                )}

                <section className="sectionCard">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch">
                    <article className="rounded-[16px] border border-slate-200 bg-slate-50/70 p-4">
                      <h3 className="text-base font-semibold text-slate-900">Indicadores</h3>
                      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Susp. de clases: <strong>{globalActivityPercent}%</strong></p>
                              <p className="pt-1 text-slate-500">Total sesiones: {totalSessionsGlobal}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Calificación de tareas del plan</p>
                          <div className="mt-2 flex items-center gap-3">
                            <IndicatorDonut
                              key={`task-ratings-${planRatedTasksTotal}-${planTaskRatingTotals.con_dificultad}-${planTaskRatingTotals.por_lograr}-${planTaskRatingTotals.logrado}`}
                              segments={taskRatingSegments}
                              emptyLabel="Sin tareas calificadas en este plan"
                            />
                            <div className="space-y-1 text-xs text-slate-700">
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />No lo logra: <strong>{planTaskRatingTotals.con_dificultad}</strong></p>
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />Por lograr: <strong>{planTaskRatingTotals.por_lograr}</strong></p>
                              <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />Lo logra: <strong>{planTaskRatingTotals.logrado}</strong></p>
                              <p className="pt-1 text-slate-500">Total calificadas: {planRatedTasksTotal}</p>
                            </div>
                          </div>
                        </div>

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
                                key={`suspension-${suspendedTotal}-${suspensionByAbsent}-${suspensionByLeave}-${suspensionBySchool}-${suspensionByOther}-${unknownSuspensionReason}`}
                                segments={suspensionSegments}
                                emptyLabel="Sin motivos de suspensión para graficar"
                              />
                              <div className="space-y-1 text-xs text-slate-700">
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-500" />Ausente: <strong>{suspensionByAbsent}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />Licencia médica: <strong>{suspensionByLeave}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-fuchsia-500" />Suspensión de clases: <strong>{suspensionBySchool}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-500" />Otro: <strong>{suspensionByOther}</strong></p>
                                <p><span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />Sin motivo: <strong>{unknownSuspensionReason}</strong></p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>

                    <article className="flex min-w-0 flex-col rounded-[16px] border border-slate-200 bg-slate-50/70 p-4">
                      <h3 className="text-base font-semibold text-slate-900">Gráfico de sesiones</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        Logro por sesiones realizadas y marcas de días suspendidos en la misma línea de tiempo.
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#a21caf]" />
                          Sesión realizada (logro %)
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-amber-500" />
                          Estudiante ausente
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-sky-500" />
                          Licencia médica profesional
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-fuchsia-500" />
                          Suspensión de clases
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="inline-block h-2.5 w-2.5 rotate-45 bg-slate-500" />
                          Otro
                        </span>
                      </div>
                      <div className="mt-4 rounded-[5px] border border-slate-200 bg-slate-50 p-3">
                        {hasChartData ? (
                          <div className="overflow-x-auto">
                            <svg
                              className="session-chart min-w-[640px]"
                              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                              role="img"
                              aria-label="Gráfico lineal de logro y suspensiones por sesión"
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
                </section>

                <section className="sectionCard">
                  <div className={`flex flex-wrap items-center justify-between gap-2 ${showSessionTrash ? 'mb-3' : 'mb-0'}`}>
                    <h3 className="sectionTitle mb-0">
                      {showSessionTrash ? 'Papelera de sesiones' : 'Sesiones'}
                    </h3>
                    {!showSessionTrash && (
                      <button
                        type="button"
                        className="actionButton"
                        onClick={() => onDownloadPlanConsolidatedPdf(selectedPlan.id)}
                        disabled={isGeneratingPdf}
                      >
                        <ButtonLabel icon={<DownloadIcon />}>
                          {isGeneratingPdf ? 'Generando PDF...' : 'PDF consolidado'}
                        </ButtonLabel>
                      </button>
                    )}
                  </div>
                  {!showSessionTrash && (
                    <p className="mb-3 mt-1 text-base font-normal text-slate-500">
                      Registro histórico con evolución, tareas y evaluación por objetivos.
                    </p>
                  )}
                  <div className="overflow-x-auto border-y border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="w-40 whitespace-nowrap px-6 py-3 text-left font-bold text-slate-900">Fecha</th>
                        <th className="px-6 py-3 text-left font-bold text-slate-900">Objetivo</th>
                        <th className="min-w-[14rem] px-6 py-3 text-left font-bold text-slate-900">Logro</th>
                        <th className="whitespace-nowrap px-6 py-3 text-right font-bold text-slate-900">Opciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleSessions.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-6 py-6 text-center text-slate-500">
                            {isLoadingSessions
                              ? 'Cargando sesiones...'
                              : sessionsLoadError
                                ? `No se pudieron cargar las sesiones. ${sessionsLoadError}`
                                : showSessionTrash
                                  ? 'La papelera de este plan está vacía.'
                                  : (
                                    <>
                                      No hay sesiones registradas para este plan de tratamiento.
                                      {plans.some((plan) => Number(plan.id) !== Number(selectedPlan?.id) && Number(plan.sessions_count) > 0) ? (
                                        <span className="mt-2 block text-slate-600">
                                          Hay sesiones en otro plan anual. Vuelve a planes y entra al que indique Sesiones (n).
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                          </td>
                        </tr>
                      )}
                      {paginatedSessions.map((session) => {
                        const sessionStatus = displaySessionStatus(session.status)
                        const suspensionDetail = getSuspensionReasonDisplayLabel(session.general_observation) || 'No registrado'
                        const statusBadgeClass = sessionStatus === 'finalizada'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sessionStatus === 'suspendida'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'

                        return (
                          <tr key={session.id} className="hover:bg-slate-50">
                            <td className="w-40 whitespace-nowrap px-6 py-3 text-slate-700">
                              {sessionStatus === 'suspendida' ? (
                                <HoverTooltip
                                  text={suspensionDetail}
                                  ariaLabel={`Motivo de suspensión: ${suspensionDetail}`}
                                  className={`inline-flex cursor-help items-center rounded-[5px] px-2 py-1 text-[11px] font-semibold ${statusBadgeClass}`}
                                >
                                  Suspendida<span className="ml-0.5 leading-none">*</span>
                                </HoverTooltip>
                              ) : (
                                <span className={`inline-flex items-center rounded-[5px] px-2 py-1 text-[11px] font-semibold ${statusBadgeClass}`}>
                                  {displaySessionStatusLabel(session)}
                                </span>
                              )}
                              <div className="mt-1 font-bold">{formatDisplayDate(session.session_date)}</div>
                              <div className="text-xs text-slate-500">{formatDisplayTime(session.session_time)} Hrs.</div>
                            </td>
                            <td className="px-6 py-3 text-slate-700">{session.objective}</td>
                            <td className="min-w-[14rem] px-6 py-3">
                              <TaskProgressBar
                                percent={sessionProgressById[String(session.id)]?.performancePercent}
                                taskCount={sessionProgressById[String(session.id)]?.ratedTasksCount}
                              />
                            </td>
                            <td className="px-6 py-3">
                              <div className="flex flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
                                {showSessionTrash ? (
                                  <>
                                    <button
                                      type="button"
                                      className="rounded-[5px] border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100"
                                      onClick={() => onAskRestoreSession(session)}
                                    >
                                      Restaurar
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-[5px] border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
                                      onClick={() => onAskForceDeleteSession(session)}
                                    >
                                      Eliminar definitivo
                                    </button>
                                  </>
                                ) : (
                                  <>
                                <button
                                  type="button"
                                  className={getSessionEntryActionClass(session.status)}
                                  onClick={() => onSelectSession(session)}
                                >
                                  <span className="inline-flex items-center gap-1.5">
                                    {sessionStatus === 'pendiente' ? (
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
                                {(sessionStatus === 'pendiente' || sessionStatus === 'finalizada') && (
                                  <IconActionButton
                                    variant="edit"
                                    label="Editar"
                                    onClick={() => onEditSession(session)}
                                  />
                                )}
                                {sessionStatus === 'finalizada' && (
                                  <IconActionButton
                                    variant="download"
                                    label="Descargar PDF"
                                    onClick={() => onDownloadSessionPdf(session.id)}
                                    disabled={isGeneratingPdf}
                                  />
                                )}
                                {sessionStatus === 'pendiente' && (
                                  <IconActionButton
                                    variant="delete"
                                    label="Eliminar"
                                    onClick={() => onAskDeleteSession(session)}
                                  />
                                )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                {visibleSessions.length > PAGE_SIZE && renderPagination(
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
                    <ButtonLabel icon={<BackIcon />}>Volver a sesiones</ButtonLabel>
                  </button>
                </div>

                <section className={`rounded-[5px] border border-slate-200 p-4 shadow-sm ${
                  selectedSession.status === 'finalizada' ? 'bg-slate-50/80' : 'bg-white'
                }`}>
                  <p className="text-xs text-slate-500">
                    Primero crea o importa la tarea. La calificación se aplica cuando el profesional la ejecuta con el estudiante.
                  </p>
                  {selectedSession.status === 'finalizada' && (
                    <p className="mt-2 rounded-[5px] border border-amber-200 bg-amber-100 px-2 py-1 text-sm text-amber-800">
                      <strong>Contenido bloqueado:</strong> la sesión está finalizada.
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
                      <ButtonLabel icon={<PlusIcon />}>Crear tarea</ButtonLabel>
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
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Tarea</th>
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Descripción</th>
                          <th className="px-3 py-3 text-left font-bold text-slate-900">Calificación</th>
                          <th className="px-3 py-3 text-right font-bold text-slate-900">Opciones</th>
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
                            <td className="px-3 py-3 text-slate-700">
                              <p className="font-medium text-slate-800">{task.name}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {getSessionTaskOriginLabel(task)}
                              </p>
                            </td>
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
                                <IconActionButton
                                  variant="edit"
                                  label="Editar"
                                  onClick={() => onOpenEditSessionTask(task)}
                                  disabled={selectedSession.status === 'finalizada'}
                                />
                                <IconActionButton
                                  variant="delete"
                                  label="Eliminar"
                                  onClick={() => onDeleteSessionTask(task.id)}
                                  disabled={selectedSession.status === 'finalizada'}
                                />
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
                          <th className="px-3 py-2 text-left font-bold text-slate-900">Título</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-900">Archivo</th>
                          <th className="px-3 py-2 text-left font-bold text-slate-900">Peso</th>
                          <th className="px-3 py-2 text-right font-bold text-slate-900">Opciones</th>
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
                                <IconActionButton
                                  variant="download"
                                  label="Descargar"
                                  onClick={() => onDownloadSessionMaterial(material)}
                                />
                                <IconActionButton
                                  variant="delete"
                                  label="Eliminar"
                                  onClick={() => onDeleteSessionMaterial(material.id)}
                                  disabled={selectedSession.status === 'finalizada'}
                                />
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
                    <button
                      type="button"
                      className="actionButton actionButtonPrimary cursor-pointer"
                      onClick={() => {
                        setReopenModalError('')
                        setShowReopenModal(true)
                      }}
                    >
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
                        setSuspensionReason(parseSuspensionReasonValue(sessionObservation || selectedSession.general_observation) || 'estudiante_ausente')
                        setSuspensionOtherDetail(parseSuspensionOtherDetail(sessionObservation || selectedSession.general_observation))
                        setShowSuspendModal(true)
                      }}
                    >
                      Suspender sesión
                    </button>
                  )}
                  {selectedSession.status === 'finalizada' && (
                    <button
                      type="button"
                      className="actionButton cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => onDownloadSessionPdf(selectedSession.id)}
                      disabled={isGeneratingPdf}
                    >
                      {isGeneratingPdf ? 'Generando PDF...' : 'Generar PDF'}
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
                        {editingTaskId ? 'Editar tarea' : taskCreationMode === 'import' ? 'Importar tarea' : 'Crear tarea'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {editingTaskId
                          ? 'Modifica el nombre y la descripción de esta tarea en la sesión.'
                          : taskCreationMode === 'import'
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
                      {taskCreationMode === 'import' && !editingTaskId && (
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
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Descripción
                        </label>
                        <textarea
                          className="fieldInput mb-0 min-h-24"
                          rows={4}
                          placeholder="Descripción"
                          value={taskForm.description}
                          onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        />
                      </div>

                      {editingTaskId && isBankSessionTask({ task_template_id: taskForm.task_template_id }) && (
                        <p className="rounded-[5px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          Los cambios se aplicarán solo a esta sesión. El banco de tareas no se modifica.
                        </p>
                      )}

                      {taskCreationMode === 'import' && !editingTaskId && taskForm.task_template_ids.length > 0 && (
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
                      <button className="actionButton actionButtonPrimary">
                        {editingTaskId ? 'Guardar cambios' : 'Guardar tarea'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
            {isBankTaskEditModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showBankTaskEditModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) {
                    setShowBankTaskEditModal(false)
                    setTaskPendingBankEdit(null)
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showBankTaskEditModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Editar tarea del banco</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Confirma que quieres modificar esta tarea importada del banco.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => {
                        setShowBankTaskEditModal(false)
                        setTaskPendingBankEdit(null)
                      }}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    <p className="text-sm text-slate-700">
                      La modificación se realizará solo para esta tarea en la sesión actual. No se actualizará
                      la tarea del banco ni las demás sesiones donde esté en uso.
                    </p>
                    {taskPendingBankEdit?.name && (
                      <p className="rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                        Tarea: <span className="font-medium text-slate-900">{taskPendingBankEdit.name}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={() => {
                        setShowBankTaskEditModal(false)
                        setTaskPendingBankEdit(null)
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton actionButtonPrimary"
                      onClick={onConfirmBankTaskEdit}
                    >
                      Continuar edición
                    </button>
                  </div>
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
                    <fieldset className="space-y-2" disabled={isSuspendingSession}>
                      <legend className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Motivo
                      </legend>
                      {SUSPENSION_REASON_OPTIONS.map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-start gap-2 rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                        >
                          <input
                            type="radio"
                            name="suspension-reason"
                            className="mt-0.5"
                            value={option.value}
                            checked={suspensionReason === option.value}
                            onChange={() => setSuspensionReason(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </fieldset>
                    {suspensionReason === 'otro' && (
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Indica el motivo
                        </span>
                        <textarea
                          className="fieldInput mb-0 min-h-[72px]"
                          value={suspensionOtherDetail}
                          onChange={(e) => setSuspensionOtherDetail(e.target.value)}
                          placeholder="Escribe el motivo de suspensión"
                          disabled={isSuspendingSession}
                        />
                      </label>
                    )}
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
            {isReopenModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showReopenModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !isReopeningSession) {
                    setShowReopenModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showReopenModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Volver a editar sesión</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Confirma que necesitas volver a editar esta sesión ya finalizada.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowReopenModal(false)}
                      aria-label="Cerrar modal"
                      disabled={isReopeningSession}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    {reopenModalError && (
                      <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {reopenModalError}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      Al confirmar, la sesión volverá a estado pendiente y podrás modificar tareas, observación y material.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={() => setShowReopenModal(false)}
                      disabled={isReopeningSession}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton actionButtonPrimary"
                      onClick={onReopenSession}
                      disabled={isReopeningSession}
                    >
                      {isReopeningSession ? 'Habilitando...' : 'Confirmar edición'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isDeletePlanModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showDeletePlanModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !isDeletingPlan) {
                    setShowDeletePlanModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showDeletePlanModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Eliminar plan de tratamiento</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Confirma que deseas eliminar este plan{planPendingDelete?.year ? ` ${planPendingDelete.year}` : ''}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowDeletePlanModal(false)}
                      aria-label="Cerrar modal"
                      disabled={isDeletingPlan}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    {deletePlanModalError && (
                      <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {deletePlanModalError}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      Se eliminarán las sesiones asociadas a este plan. Esta acción no se puede deshacer.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={() => setShowDeletePlanModal(false)}
                      disabled={isDeletingPlan}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton border-red-300 bg-red-600 text-white hover:bg-red-700"
                      onClick={onConfirmDeletePlan}
                      disabled={isDeletingPlan}
                    >
                      {isDeletingPlan ? 'Eliminando...' : 'Confirmar eliminación'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isDeleteSessionModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showDeleteSessionModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !isDeletingSession) {
                    onCloseDeleteSessionModal()
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showDeleteSessionModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {deleteSessionMode === 'force' ? 'Eliminar sesión definitivamente' : 'Eliminar sesión'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {sessionPendingDelete?.session_date
                          ? `Sesión del ${formatDisplayDate(sessionPendingDelete.session_date)}${sessionPendingDelete.session_time ? ` a las ${formatDisplayTime(sessionPendingDelete.session_time)}` : ''}.`
                          : 'Confirma esta acción para continuar.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={onCloseDeleteSessionModal}
                      aria-label="Cerrar modal"
                      disabled={isDeletingSession}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    {deleteSessionModalError && (
                      <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {deleteSessionModalError}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      {deleteSessionMode === 'force'
                        ? 'Esta sesión se eliminará de forma definitiva, junto con sus tareas y materiales. Esta acción no se puede deshacer.'
                        : 'La sesión irá a la papelera. Podrás restaurarla más adelante desde este plan.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={onCloseDeleteSessionModal}
                      disabled={isDeletingSession}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton border-red-300 bg-red-600 text-white hover:bg-red-700"
                      onClick={onConfirmDeleteSession}
                      disabled={isDeletingSession}
                    >
                      {isDeletingSession
                        ? (deleteSessionMode === 'force' ? 'Eliminando...' : 'Enviando...')
                        : (deleteSessionMode === 'force' ? 'Eliminar definitivamente' : 'Enviar a papelera')}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isRestoreSessionModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showRestoreSessionModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !isRestoringSession) {
                    onCloseRestoreSessionModal()
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showRestoreSessionModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Restaurar sesión</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {sessionPendingRestore?.session_date
                          ? `Sesión del ${formatDisplayDate(sessionPendingRestore.session_date)}${sessionPendingRestore.session_time ? ` a las ${formatDisplayTime(sessionPendingRestore.session_time)}` : ''}.`
                          : 'Confirma esta acción para continuar.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={onCloseRestoreSessionModal}
                      aria-label="Cerrar modal"
                      disabled={isRestoringSession}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    {restoreSessionModalError && (
                      <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {restoreSessionModalError}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      La sesión volverá al listado de este plan. Si hay un choque de horario, no se podrá restaurar.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={onCloseRestoreSessionModal}
                      disabled={isRestoringSession}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={onConfirmRestoreSession}
                      disabled={isRestoringSession}
                    >
                      {isRestoringSession ? 'Restaurando...' : 'Restaurar sesión'}
                    </button>
                  </div>
                </div>
              </div>
            )}
            {isDeleteWorkshopModalVisible && (
              <div
                className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
                  showDeleteWorkshopModal ? 'bg-slate-900/60 opacity-100' : 'bg-slate-900/0 opacity-0'
                }`}
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget && !isDeletingWorkshop) {
                    setShowDeleteWorkshopModal(false)
                  }
                }}
              >
                <div
                  className={`w-full max-w-lg rounded-[5px] border border-slate-200 bg-white shadow-2xl transition-all duration-200 ${
                    showDeleteWorkshopModal ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
                  }`}
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Eliminar taller</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Confirma que deseas eliminar{workshopPendingDelete?.name ? ` “${workshopPendingDelete.name}”` : ' este taller'}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowDeleteWorkshopModal(false)}
                      aria-label="Cerrar modal"
                      disabled={isDeletingWorkshop}
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-3 px-5 py-4">
                    {deleteWorkshopModalError && (
                      <p className="rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                        {deleteWorkshopModalError}
                      </p>
                    )}
                    <p className="text-sm text-slate-700">
                      El archivo permanecerá en la biblioteca de medios. Esta acción no se puede deshacer.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button
                      type="button"
                      className="actionButton"
                      onClick={() => setShowDeleteWorkshopModal(false)}
                      disabled={isDeletingWorkshop}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="actionButton border-red-300 bg-red-600 text-white hover:bg-red-700"
                      onClick={onConfirmDeleteWorkshop}
                      disabled={isDeletingWorkshop}
                    >
                      {isDeletingWorkshop ? 'Eliminando...' : 'Confirmar eliminación'}
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
                    onClosePlanModal()
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
                      <h2 className="text-lg font-semibold text-slate-900">
                        {editingPlanId ? 'Editar plan de tratamiento' : 'Crear plan de tratamiento'}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {editingPlanId
                          ? 'Actualiza el año, el diagnóstico del plan y el curso asociado.'
                          : 'Define el año y si el estudiante aumenta de curso o se mantiene.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-slate-300 bg-white text-lg font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      onClick={onClosePlanModal}
                      aria-label="Cerrar modal"
                    >
                      ×
                    </button>
                  </div>
                  <form onSubmit={onSavePlan}>
                    <div className="space-y-4 px-5 py-4">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="plan-year">Año</label>
                        <input
                          id="plan-year"
                          className="fieldInput mb-0"
                          type="number"
                          min="2000"
                          max="2100"
                          value={planForm.year}
                          onChange={(e) => setPlanForm((current) => ({ ...current, year: e.target.value }))}
                        />
                      </div>

                      {editingPlanId ? (
                        <div>
                          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" htmlFor="plan-diagnosis">
                            Diagnóstico del plan
                          </label>
                          <input
                            id="plan-diagnosis"
                            className="fieldInput mb-0"
                            value={planForm.diagnosis_snapshot}
                            onChange={(e) => setPlanForm((current) => ({ ...current, diagnosis_snapshot: e.target.value }))}
                          />
                        </div>
                      ) : null}

                      {planCoursePreview.isFirstPlan ? (
                        <p className="rounded-[5px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {editingPlanId ? 'Este es el primer plan. Quedará con el curso' : 'Este será el primer plan. Quedará con el curso actual'}:{' '}
                          <strong>{planCoursePreview.referenceCourse?.display_name || 'Sin curso'}</strong>.
                        </p>
                      ) : (
                        <fieldset className="space-y-2">
                          <legend className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Curso para {planForm.year}
                          </legend>
                          <p className="text-sm text-slate-600">
                            Curso del plan anterior ({planCoursePreview.previousPlan?.year}):{' '}
                            <strong>{planCoursePreview.referenceCourse?.display_name || 'Sin curso'}</strong>
                          </p>
                          <label className="flex cursor-pointer items-start gap-2 rounded-[5px] border border-slate-200 px-3 py-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name="plan-course-progress"
                              className="mt-1"
                              checked={!planForm.repeats_course}
                              disabled={!planCoursePreview.nextCourse}
                              onChange={() => setPlanForm((current) => ({ ...current, repeats_course: false }))}
                            />
                            <span>
                              Aumenta de curso
                              <span className="mt-0.5 block text-slate-500">
                                {planCoursePreview.nextCourse
                                  ? `Quedará en ${planCoursePreview.nextCourse.display_name}`
                                  : 'No hay un curso siguiente en el catálogo'}
                              </span>
                            </span>
                          </label>
                          <label className="flex cursor-pointer items-start gap-2 rounded-[5px] border border-slate-200 px-3 py-2 text-sm text-slate-700">
                            <input
                              type="radio"
                              name="plan-course-progress"
                              className="mt-1"
                              checked={Boolean(planForm.repeats_course) || !planCoursePreview.nextCourse}
                              onChange={() => setPlanForm((current) => ({ ...current, repeats_course: true }))}
                            />
                            <span>
                              Se mantiene en el mismo curso
                              <span className="mt-0.5 block text-slate-500">
                                Repite {planCoursePreview.referenceCourse?.display_name || 'el curso actual'}
                              </span>
                            </span>
                          </label>
                        </fieldset>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                      <button type="button" className="actionButton" onClick={onClosePlanModal}>
                        Cancelar
                      </button>
                      <button className="actionButton actionButtonPrimary">
                        {editingPlanId ? 'Guardar cambios' : 'Crear plan de tratamiento'}
                      </button>
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
                      <p className="mt-1 text-sm text-slate-500">
                        {editingSessionId && sessionForm.status === 'finalizada'
                          ? 'Puedes actualizar fecha, hora, objetivo y descripción. El estado de la sesión se mantiene finalizada.'
                          : 'Completa los datos principales de la sesión.'}
                      </p>
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
