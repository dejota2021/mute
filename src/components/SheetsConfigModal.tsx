import React, { useState } from 'react';
import { GoogleSheetsConfig, GuestRegistration } from '../types';
import { getSavedConfig, saveConfig, getRegisteredGuests, exportToCSV } from '../utils/googleSheets';
import { X, Check, Copy, ExternalLink, Download, FileSpreadsheet, ShieldCheck, AlertCircle } from 'lucide-react';

interface SheetsConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigUpdated?: (config: GoogleSheetsConfig) => void;
}

export const SheetsConfigModal: React.FC<SheetsConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigUpdated,
}) => {
  const [config, setConfig] = useState<GoogleSheetsConfig>(getSavedConfig());
  const [copiedCode, setCopiedCode] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'setup' | 'guests'>('setup');

  const guests = getRegisteredGuests();

  if (!isOpen) return null;

  const handleSave = () => {
    saveConfig(config);
    if (onConfigUpdated) onConfigUpdated(config);
    onClose();
  };

  const handleTestWebhook = async () => {
    if (!config.webhookUrl) {
      setTestResult({ success: false, message: 'Por favor ingresa una URL de Google Apps Script' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          name: 'Prueba de Conexión MUTE',
          email: 'test@mute.dejota',
          ticketCode: 'MUTE-TEST',
          date: new Date().toISOString(),
        }),
      });

      setTestResult({
        success: true,
        message: '¡Petición enviada exitosamente! Revisa tu Google Sheet para confirmar la nueva fila.',
      });
      saveConfig(config);
      if (onConfigUpdated) onConfigUpdated(config);
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `Error al conectar: ${e?.message || 'Verifica la URL del Webhook'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const appsScriptSnippet = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Si la hoja está vacía, agrega los encabezados primero
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Fecha y Hora", "Nombre Completo", "Correo Electrónico", "Código de Ticket", "ID"]);
    }
    
    // Agrega la fila con los datos de registro
    sheet.appendRow([
      data.registeredAt || new Date().toLocaleString(),
      data.name,
      data.email,
      data.ticketCode,
      data.id || ""
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScriptCode = () => {
    navigator.clipboard.writeText(appsScriptSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        id="sheets-config-modal"
        className="relative w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl text-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/40 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Google Spreadsheets</h2>
              <p className="text-xs text-neutral-400">Sincronización automática de registros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-neutral-800 px-6 pt-2 gap-4 text-xs font-mono">
          <button
            onClick={() => setActiveTab('setup')}
            className={`pb-2.5 border-b-2 transition-colors ${
              activeTab === 'setup'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Configuración del Webhook
          </button>
          <button
            onClick={() => setActiveTab('guests')}
            className={`pb-2.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guests'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <span>Invitados Registrados</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-[10px] text-neutral-300">
              {guests.length}
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {activeTab === 'setup' ? (
            <>
              {/* Webhook Input */}
              <div className="space-y-2">
                <label className="block text-xs font-mono uppercase tracking-wider text-neutral-300">
                  URL de la Web App de Google Apps Script:
                </label>
                <div className="flex gap-2">
                  <input
                    id="sheets-webhook-url-input"
                    type="url"
                    value={config.webhookUrl}
                    onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    id="btn-test-sheets-webhook"
                    onClick={handleTestWebhook}
                    disabled={isTesting}
                    className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs font-mono rounded-lg border border-neutral-700 transition-colors shrink-0"
                  >
                    {isTesting ? 'Probando...' : 'Probar'}
                  </button>
                </div>
                {testResult && (
                  <div
                    className={`flex items-start gap-2 p-2.5 rounded-lg text-xs font-mono ${
                      testResult.success
                        ? 'bg-emerald-950/50 border border-emerald-800/60 text-emerald-300'
                        : 'bg-red-950/50 border border-red-800/60 text-red-300'
                    }`}
                  >
                    {testResult.success ? (
                      <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Step by Step Setup Instructions */}
              <div className="p-4 bg-neutral-950/80 rounded-lg border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono tracking-wider text-neutral-300 uppercase">
                    ¿Cómo conectar tu Google Spreadsheet en 60 segundos?
                  </h3>
                  <button
                    onClick={copyScriptCode}
                    className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? '¡Código Copiado!' : 'Copiar Script'}</span>
                  </button>
                </div>

                <ol className="text-xs text-neutral-400 space-y-2 list-decimal list-inside font-sans leading-relaxed">
                  <li>
                    Abre una hoja en <span className="text-neutral-200">Google Sheets</span>.
                  </li>
                  <li>
                    En el menú superior ve a <span className="text-neutral-200">Extensiones &gt; Apps Script</span>.
                  </li>
                  <li>
                    Borra cualquier código que aparezca y pega el script de abajo.
                  </li>
                  <li>
                    Haz clic en <span className="text-neutral-200">Implementar &gt; Nueva implementación</span>, selecciona tipo <span className="text-neutral-200">Aplicación web</span>, y en &quot;Quién tiene acceso&quot; selecciona <span className="text-emerald-400 font-semibold">Cualquiera (Anyone)</span>.
                  </li>
                  <li>
                    Copia la URL resultante que termina en <code className="text-neutral-200">/exec</code> y pégala arriba.
                  </li>
                </ol>

                <div className="relative">
                  <pre className="p-3 bg-black/60 rounded border border-neutral-800/80 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-36">
                    {appsScriptSnippet}
                  </pre>
                </div>
              </div>
            </>
          ) : (
            /* Guests List Tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-neutral-400 font-mono">
                  Total de registros en memoria: <strong className="text-white">{guests.length}</strong>
                </p>
                <button
                  id="btn-export-csv-modal"
                  onClick={() => exportToCSV(guests)}
                  disabled={guests.length === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-xs font-mono rounded-lg border border-neutral-700 text-neutral-200 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Exportar a Excel / CSV</span>
                </button>
              </div>

              {guests.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 font-mono text-xs">
                  No hay personas registradas todavía. Completa el formulario para probar.
                </div>
              ) : (
                <div className="divide-y divide-neutral-800/80 border border-neutral-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {guests.map((g) => (
                    <div key={g.id} className="p-3 bg-neutral-950 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-white">{g.name}</p>
                        <p className="text-neutral-400 font-mono text-[11px]">{g.email}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-emerald-400 font-bold">{g.ticketCode}</span>
                        <p className="text-[10px] text-neutral-500">
                          {new Date(g.registeredAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-800 bg-neutral-950/60">
          <p className="text-[11px] text-neutral-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>Datos protegidos y listos para exportación</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-xs font-mono rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
