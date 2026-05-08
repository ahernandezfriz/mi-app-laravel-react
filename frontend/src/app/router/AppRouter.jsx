import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '../../features/auth/pages/LoginPage'
import RegisterPage from '../../features/auth/pages/RegisterPage'
import ForgotPasswordPage from '../../features/auth/pages/ForgotPasswordPage'

function AppRouter({ token, authProps, children }) {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" element={<Navigate to={token ? '/dashboard/overview' : '/login'} replace />} />
        <Route
          path="/login"
          element={token ? <Navigate to="/dashboard/overview" replace /> : (
            <LoginPage
              loginForm={authProps.loginForm}
              setLoginForm={authProps.setLoginForm}
              onLogin={authProps.onLogin}
              authForm={authProps.authForm}
              forgotForm={authProps.forgotForm}
              resetForm={authProps.resetForm}
            />
          )}
        />
        <Route
          path="/register"
          element={token ? <Navigate to="/dashboard/overview" replace /> : (
            <RegisterPage
              authForm={authProps.authForm}
              setAuthForm={authProps.setAuthForm}
              professions={authProps.professions}
              onRegister={authProps.onRegister}
              loginForm={authProps.loginForm}
              forgotForm={authProps.forgotForm}
              resetForm={authProps.resetForm}
            />
          )}
        />
        <Route
          path="/forgot-password"
          element={token ? <Navigate to="/dashboard/overview" replace /> : (
            <ForgotPasswordPage
              forgotForm={authProps.forgotForm}
              setForgotForm={authProps.setForgotForm}
              onForgotPassword={authProps.onForgotPassword}
              resetForm={authProps.resetForm}
              setResetForm={authProps.setResetForm}
              onResetPassword={authProps.onResetPassword}
              authForm={authProps.authForm}
              loginForm={authProps.loginForm}
            />
          )}
        />
        <Route
          path="/dashboard/*"
          element={token ? children : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={token ? '/dashboard/overview' : '/login'} replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter
