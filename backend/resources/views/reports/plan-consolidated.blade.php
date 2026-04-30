<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: DejaVu Sans, sans-serif; font-size: 12px; color: #111827; }
        h1, h2 { margin: 0 0 8px; }
        .section { margin-bottom: 14px; }
        .meta p { margin: 2px 0; }
        .session { border: 1px solid #d1d5db; padding: 8px; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-top: 4px; }
        th, td { border: 1px solid #d1d5db; padding: 5px; vertical-align: top; }
        th { background: #f3f4f6; text-align: left; }
    </style>
</head>
<body>
    <h1>Informe consolidado anual</h1>

    <div class="section meta">
        <p><strong>Estudiante:</strong> {{ $student->full_name }}</p>
        <p><strong>Curso:</strong> {{ optional($student->course)->display_name }}</p>
        <p><strong>Plan anual:</strong> {{ $plan->year }}</p>
        <p><strong>Diagnostico snapshot:</strong> {{ $plan->diagnosis_snapshot }}</p>
        <p><strong>Total sesiones:</strong> {{ $plan->sessions->count() }}</p>
    </div>

    <div class="section">
        @forelse($plan->sessions as $session)
            <div class="session">
                <p><strong>Sesion:</strong> {{ $session->session_date }} ({{ $session->status }})</p>
                <p><strong>Objetivo:</strong> {{ $session->objective }}</p>
                <p><strong>Descripcion:</strong> {{ $session->description ?: 'Sin descripcion' }}</p>

                <table>
                    <thead>
                        <tr>
                            <th>Tarea</th>
                            <th>Descripcion</th>
                            <th>Calificacion</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($session->tasks as $task)
                            <tr>
                                <td>{{ $task->name }}</td>
                                <td>{{ $task->description ?: '-' }}</td>
                                <td>{{ $task->rating }}</td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="3">Sin tareas en esta sesion.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        @empty
            <p>No hay sesiones registradas en este plan.</p>
        @endforelse
    </div>
</body>
</html>
