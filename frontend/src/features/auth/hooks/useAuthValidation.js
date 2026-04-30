import { useMemo } from 'react'

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useAuthValidation({ authForm, loginForm, forgotForm, resetForm }) {
  return useMemo(() => {
    const registerErrors = {
      name: authForm.name.trim().length < 3 ? 'El nombre debe tener al menos 3 caracteres.' : '',
      email: !emailRegex.test(authForm.email) ? 'Ingresa un correo valido.' : '',
      password: authForm.password.length < 8 ? 'La contrasena debe tener al menos 8 caracteres.' : '',
      profession_id: !authForm.profession_id ? 'Selecciona una profesion.' : '',
    }

    const loginErrors = {
      email: !emailRegex.test(loginForm.email) ? 'Ingresa un correo valido.' : '',
      password: loginForm.password.length < 6 ? 'La contrasena es obligatoria.' : '',
    }

    const forgotErrors = {
      email: !emailRegex.test(forgotForm.email) ? 'Ingresa un correo valido.' : '',
    }

    const resetErrors = {
      token: resetForm.token.trim() ? '' : 'El token es obligatorio.',
      email: !emailRegex.test(resetForm.email) ? 'Ingresa un correo valido.' : '',
      password: resetForm.password.length < 8 ? 'La contrasena debe tener al menos 8 caracteres.' : '',
      password_confirmation:
        resetForm.password !== resetForm.password_confirmation ? 'Las contrasenas no coinciden.' : '',
    }

    return { registerErrors, loginErrors, forgotErrors, resetErrors }
  }, [authForm, forgotForm, loginForm, resetForm])
}
