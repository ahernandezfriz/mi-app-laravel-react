<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    @include('reports.partials.styles')
</head>
<body>
    <div class="banner">
        <h1>Informe de sesión terapéutica</h1>
        <p>Plan {{ $plan->year }} · {{ $student->full_name }}</p>
    </div>

    <div class="section meta">
        <table>
            <tr>
                <td width="50%">
                    <div class="label">Estudiante</div>
                    <div class="value">{{ $student->full_name }}</div>
                </td>
                <td width="50%">
                    <div class="label">Curso</div>
                    <div class="value">{{ optional($student->course)->display_name ?: '—' }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Edad</div>
                    <div class="value">{{ $exactAge }}@if($ageReference) <span class="muted">(al {{ $ageReference }})</span>@endif</div>
                </td>
                <td>
                    <div class="label">Diagnóstico actual</div>
                    <div class="value">{{ $student->current_diagnosis }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Sesión</div>
                    <div class="value">{{ \Carbon\Carbon::parse($session->session_date)->format('d-m-Y') }} ({{ $session->status }})</div>
                </td>
                <td>
                    <div class="label">Plan anual</div>
                    <div class="value">{{ $plan->year }}</div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="label">Objetivo</div>
                    <div class="value">{{ $session->objective }}</div>
                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <div class="label">Descripción</div>
                    <div class="value">{{ $session->description ?: 'Sin descripción' }}</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Tareas y calificaciones</h2>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Tarea</th>
                    <th>Descripción</th>
                    <th>Calificación</th>
                </tr>
            </thead>
            <tbody>
                @forelse($session->tasks as $task)
                    <tr>
                        <td>{{ $task->name }}</td>
                        <td>{{ $task->description ?: '-' }}</td>
                        <td>
                            @switch($task->rating)
                                @case('con_dificultad') No lo logra @break
                                @case('por_lograr') Por lograr @break
                                @case('logrado') Lo logra @break
                                @default {{ $task->rating ?: '-' }}
                            @endswitch
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="3">No hay tareas registradas en esta sesión.</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>

    @include('reports.partials.professional-signature')
</body>
</html>
