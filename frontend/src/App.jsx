import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'
const initialStudent = {
  full_name: '',
  rut: '',
  current_diagnosis: '',
  school_level_id: '',
  school_course_id: '',
  guardian_name: '',
  guardian_phone: '',
  guardian_email: '',
}

function App() {
  const [status, setStatus] = useState('Inicializando...')
  const [token, setToken] = useState(localStorage.getItem('token') || '')
  const [professions, setProfessions] = useState([])
  const [levels, setLevels] = useState([])
  const [students, setStudents] = useState([])
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
  const [studentForm, setStudentForm] = useState(initialStudent)
  const [editingId, setEditingId] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [plans, setPlans] = useState([])
  const [planForm, setPlanForm] = useState({ year: new Date().getFullYear() })
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [sessions, setSessions] = useState([])
  const [editingSessionId, setEditingSessionId] = useState(null)
  const [sessionForm, setSessionForm] = useState({
    session_date: new Date().toISOString().slice(0, 10),
    objective: '',
    description: '',
    status: 'draft',
  })
  const healthUrl = useMemo(() => `${apiBaseUrl}/health`, [])

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    })

    if (response.status === 204) return null
    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Error en solicitud')
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

  useEffect(() => {
    const init = async () => {
      await checkHealth()
      await loadCatalogs()
    }
    init()
  }, [checkHealth, loadCatalogs])

  useEffect(() => {
    const load = async () => {
      if (token) await loadStudents()
    }
    load()
  }, [token, loadStudents])

  async function onRegister(e) {
    e.preventDefault()
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify(authForm),
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
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(loginForm) })
      localStorage.setItem('token', data.token)
      setToken(data.token)
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
      })
      setStatus(data.message || 'Contrasena actualizada.')
      setResetForm({ token: '', email: '', password: '', password_confirmation: '' })
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
      setStudents([])
    }
  }

  async function onSaveStudent(e) {
    e.preventDefault()
    const path = editingId ? `/students/${editingId}` : '/students'
    const method = editingId ? 'PUT' : 'POST'

    try {
      await api(path, { method, body: JSON.stringify(studentForm) })
      setStudentForm(initialStudent)
      setEditingId(null)
      await loadStudents()
      setStatus('Estudiante guardado')
    } catch (error) {
      setStatus(error.message)
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
    setStudentForm({
      full_name: student.full_name,
      rut: student.rut,
      current_diagnosis: student.current_diagnosis,
      school_level_id: String(student.school_level_id),
      school_course_id: String(student.school_course_id),
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      guardian_email: student.guardian_email,
    })
  }

  async function onSelectStudent(student) {
    setSelectedStudent(student)
    setSelectedPlan(null)
    setSessions([])
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

  async function onSelectPlan(plan) {
    if (!selectedStudent) return
    setSelectedPlan(plan)
    setEditingSessionId(null)
    setSessionForm({
      session_date: new Date().toISOString().slice(0, 10),
      objective: '',
      description: '',
      status: 'draft',
    })
    try {
      const data = await api(`/students/${selectedStudent.id}/treatment-plans/${plan.id}/sessions`)
      setSessions(data)
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
      await api(path, { method: isEditing ? 'PUT' : 'POST', body: JSON.stringify(sessionForm) })
      await onSelectPlan(selectedPlan)
      setStatus(isEditing ? 'Sesion actualizada' : 'Sesion creada')
    } catch (error) {
      setStatus(error.message)
    }
  }

  function onEditSession(session) {
    setEditingSessionId(session.id)
    setSessionForm({
      session_date: session.session_date,
      objective: session.objective,
      description: session.description || '',
      status: session.status,
    })
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

  const selectedLevel = levels.find((level) => String(level.id) === String(studentForm.school_level_id))
  const availableCourses = selectedLevel?.courses ?? []

  return (
    <main style={{ fontFamily: 'system-ui', maxWidth: 900, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Sprint 1 - Auth + Estudiantes + Planes</h1>
      <p><strong>Estado:</strong> {status}</p>

      {!token && (
        <>
          <h2>Registro Profesional</h2>
          <form onSubmit={onRegister}>
            <input placeholder="Nombre" value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
            <input placeholder="RUT" value={authForm.rut} onChange={(e) => setAuthForm({ ...authForm, rut: e.target.value })} />
            <input placeholder="Email" value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <input placeholder="Password" type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            <select value={authForm.profession_id} onChange={(e) => setAuthForm({ ...authForm, profession_id: e.target.value })}>
              <option value="">Selecciona profesion</option>
              {professions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button>Registrarme</button>
          </form>

          <h2>Login</h2>
          <form onSubmit={onLogin}>
            <input placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
            <input placeholder="Password" type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            <button>Ingresar</button>
          </form>

          <h2>Recuperar contrasena</h2>
          <form onSubmit={onForgotPassword}>
            <input placeholder="Email" value={forgotForm.email} onChange={(e) => setForgotForm({ email: e.target.value })} />
            <button>Enviar enlace</button>
          </form>

          <h2>Resetear contrasena</h2>
          <form onSubmit={onResetPassword}>
            <input placeholder="Token" value={resetForm.token} onChange={(e) => setResetForm({ ...resetForm, token: e.target.value })} />
            <input placeholder="Email" value={resetForm.email} onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })} />
            <input placeholder="Nueva contrasena" type="password" value={resetForm.password} onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })} />
            <input placeholder="Confirmar contrasena" type="password" value={resetForm.password_confirmation} onChange={(e) => setResetForm({ ...resetForm, password_confirmation: e.target.value })} />
            <button>Resetear</button>
          </form>
        </>
      )}

      {token && (
        <>
          <button onClick={onLogout}>Cerrar sesion</button>
          <h2>{editingId ? 'Editar estudiante' : 'Nuevo estudiante'}</h2>
          <form onSubmit={onSaveStudent}>
            <input placeholder="Nombre completo" value={studentForm.full_name} onChange={(e) => setStudentForm({ ...studentForm, full_name: e.target.value })} />
            <input placeholder="RUT" value={studentForm.rut} onChange={(e) => setStudentForm({ ...studentForm, rut: e.target.value })} />
            <input placeholder="Diagnostico actual" value={studentForm.current_diagnosis} onChange={(e) => setStudentForm({ ...studentForm, current_diagnosis: e.target.value })} />
            <select value={studentForm.school_level_id} onChange={(e) => setStudentForm({ ...studentForm, school_level_id: e.target.value, school_course_id: '' })}>
              <option value="">Nivel</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.display_name}</option>)}
            </select>
            <select value={studentForm.school_course_id} onChange={(e) => setStudentForm({ ...studentForm, school_course_id: e.target.value })}>
              <option value="">Curso</option>
              {availableCourses.map((c) => <option key={c.id} value={c.id}>{c.display_name}</option>)}
            </select>
            <input placeholder="Nombre apoderado" value={studentForm.guardian_name} onChange={(e) => setStudentForm({ ...studentForm, guardian_name: e.target.value })} />
            <input placeholder="Telefono apoderado" value={studentForm.guardian_phone} onChange={(e) => setStudentForm({ ...studentForm, guardian_phone: e.target.value })} />
            <input placeholder="Email apoderado" value={studentForm.guardian_email} onChange={(e) => setStudentForm({ ...studentForm, guardian_email: e.target.value })} />
            <button>{editingId ? 'Actualizar' : 'Crear'}</button>
          </form>

          <h2>Estudiantes</h2>
          <ul>
            {students.map((student) => (
              <li key={student.id}>
                {student.full_name} - {student.course?.display_name}
                <button onClick={() => onEditStudent(student)}>Editar</button>
                <button onClick={() => onDeleteStudent(student.id)}>Eliminar</button>
                <button onClick={() => onSelectStudent(student)}>Ver planes</button>
              </li>
            ))}
          </ul>

          {selectedStudent && (
            <>
              <h2>Planes anuales de {selectedStudent.full_name}</h2>
              <p><strong>Diagnostico actual:</strong> {selectedStudent.current_diagnosis}</p>
              <form onSubmit={onCreatePlan}>
                <input
                  type="number"
                  min="2000"
                  max="2100"
                  value={planForm.year}
                  onChange={(e) => setPlanForm({ year: e.target.value })}
                />
                <button>Crear plan</button>
              </form>
              <ul>
                {plans.map((plan) => (
                  <li key={plan.id}>
                    {selectedStudent.full_name} - {selectedStudent.course?.display_name} - {plan.year}
                    {' | '}Diagnostico snapshot: {plan.diagnosis_snapshot}
                    <button onClick={() => onSelectPlan(plan)}>Ver sesiones</button>
                    <button onClick={() => onDeletePlan(plan.id)}>Eliminar plan</button>
                  </li>
                ))}
              </ul>

              {selectedPlan && (
                <>
                  <h3>Sesiones del plan {selectedPlan.year}</h3>
                  <form onSubmit={onSaveSession}>
                    <input
                      type="date"
                      value={sessionForm.session_date}
                      onChange={(e) => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                    />
                    <input
                      placeholder="Objetivo"
                      value={sessionForm.objective}
                      onChange={(e) => setSessionForm({ ...sessionForm, objective: e.target.value })}
                    />
                    <input
                      placeholder="Descripcion"
                      value={sessionForm.description}
                      onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    />
                    <select
                      value={sessionForm.status}
                      onChange={(e) => setSessionForm({ ...sessionForm, status: e.target.value })}
                    >
                      <option value="draft">Borrador</option>
                      <option value="finalizada">Finalizada</option>
                    </select>
                    <button>{editingSessionId ? 'Actualizar sesion' : 'Crear sesion'}</button>
                  </form>
                  <ul>
                    {sessions.map((session) => (
                      <li key={session.id}>
                        Sesion {session.id} - {session.session_date} - {session.status}
                        {' | '}Objetivo: {session.objective}
                        <button onClick={() => onEditSession(session)}>Editar</button>
                        <button onClick={() => onDeleteSession(session.id)}>Eliminar</button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </>
      )}
    </main>
  )
}

export default App
