<!doctype html>
<html lang="es">
<head>
    <meta charset="utf-8">
    @include('reports.partials.styles')
</head>
<body>
    <div class="banner">
        <h1>Informe consolidado anual</h1>
        <p>Plan de tratamiento {{ $plan->year }} · {{ $student->full_name }}</p>
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
                    <div class="label">Plan anual</div>
                    <div class="value">{{ $plan->year }}</div>
                </td>
            </tr>
            <tr>
                <td>
                    <div class="label">Diagnóstico</div>
                    <div class="value">{{ $plan->diagnosis_snapshot }}</div>
                </td>
                <td>
                    <div class="label">Total sesiones</div>
                    <div class="value">{{ $charts['totals']['all'] }} (finalizadas: {{ $charts['totals']['finalized'] }}, pendientes: {{ $charts['totals']['pending'] }})</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="section">
        <h2>Indicadores del plan</h2>
        <table class="charts">
            <tr>
                <td>
                    <h3>Resumen global</h3>
                    <img class="donut" src="{{ $charts['global']['image'] }}" width="90" height="90" alt="Resumen global">
                    <p class="legend"><span style="color:#10b981;">&#9632;</span> Sesiones realizadas: <strong>{{ $charts['global']['attendancePercent'] }}%</strong></p>
                    <p class="legend"><span style="color:#f59e0b;">&#9632;</span> Susp. inasistencia: <strong>{{ $charts['global']['absentPercent'] }}%</strong></p>
                    <p class="legend"><span style="color:#d946ef;">&#9632;</span> Susp. actividad: <strong>{{ $charts['global']['activityPercent'] }}%</strong></p>
                    <p class="muted">Total sesiones: {{ $charts['global']['total'] }}</p>
                </td>
                <td>
                    <h3>Sesiones realizadas</h3>
                    <img class="donut" src="{{ $charts['attendance']['image'] }}" width="90" height="90" alt="Sesiones realizadas">
                    <p class="legend"><span style="color:#10b981;">&#9632;</span> Realizadas: <strong>{{ $charts['attendance']['attendancePercent'] }}%</strong></p>
                    <p class="legend"><span style="color:#f59e0b;">&#9632;</span> Inasistencia: <strong>{{ $charts['attendance']['suspensionPercent'] }}%</strong></p>
                    <p class="muted">Base: {{ $charts['attendance']['finalized'] }}/{{ $charts['attendance']['base'] }}</p>
                </td>
                <td>
                    <h3>Motivos de suspensión</h3>
                    @if($charts['suspension']['total'] === 0)
                        <p class="muted">Sin sesiones suspendidas.</p>
                    @else
                        <img class="donut" src="{{ $charts['suspension']['image'] }}" width="90" height="90" alt="Motivos de suspensión">
                        <p class="legend"><span style="color:#ef4444;">&#9632;</span> Ausente: <strong>{{ $charts['suspension']['absent'] }}</strong></p>
                        <p class="legend"><span style="color:#d946ef;">&#9632;</span> Actividad: <strong>{{ $charts['suspension']['activity'] }}</strong></p>
                        <p class="legend"><span style="color:#94a3b8;">&#9632;</span> Sin motivo: <strong>{{ $charts['suspension']['unknown'] }}</strong></p>
                    @endif
                </td>
            </tr>
        </table>

        <h2>Gráfico de sesiones</h2>
        <p class="muted">Progreso por sesiones realizadas y marcas de días suspendidos en la misma línea de tiempo.</p>
        <p class="legend"><span style="color:#a21caf;">&#9632;</span> Sesión realizada (progreso %)</p>
        <p class="legend"><span style="color:#f59e0b;">&#9632;</span> Suspensión por inasistencia</p>
        <p class="legend"><span style="color:#d946ef;">&#9632;</span> Suspensión por actividad</p>
        <div class="line-wrap">
            @if($charts['line']['hasData'] && $charts['line']['image'])
                <img class="timeline" src="{{ $charts['line']['image'] }}" width="640" height="200" alt="Gráfico lineal de progreso y suspensiones">
            @else
                <p class="muted">Sin sesiones realizadas ni suspendidas para graficar.</p>
            @endif
        </div>
    </div>

    <div class="section">
        <h2>Detalle de sesiones</h2>
        @forelse($plan->sessions as $session)
            <div class="session">
                <p><strong>Sesión:</strong> {{ \Carbon\Carbon::parse($session->session_date)->format('d-m-Y') }} ({{ $session->status }})</p>
                <p><strong>Objetivo:</strong> {{ $session->objective }}</p>
                <p><strong>Descripción:</strong> {{ $session->description ?: 'Sin descripción' }}</p>

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
                                <td colspan="3">Sin tareas en esta sesión.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        @empty
            <p>No hay sesiones registradas en este plan.</p>
        @endforelse
    </div>

    @include('reports.partials.professional-signature')
</body>
</html>
