<div class="signature-block">
    <h2>Profesional responsable</h2>
    <table class="signature-table">
        <tr>
            <td width="58%" class="signature-meta">
                <p><strong>Nombre:</strong> {{ $professional->name ?? '—' }}</p>
                <p><strong>Profesión:</strong> {{ optional($professional->profession)->name ?? '—' }}</p>
                <p><strong>RUT:</strong> {{ $professional->rut ?? '—' }}</p>
            </td>
            <td width="42%" class="signature-pad">
                <div class="signature-space">&nbsp;</div>
                <p class="signature-line">Firma y timbre</p>
            </td>
        </tr>
    </table>
</div>
