import React, { useState, useEffect } from 'react';
import { GoogleSheetsConfig, GuestRegistration } from '../types';
import {
  getSavedConfig,
  saveConfig,
  getRegisteredGuests,
  exportToCSV,
} from '../utils/googleSheets';
import {
  initAuth,
  googleSignIn,
  logout,
  createMuteSpreadsheet,
  appendGuestToGoogleSheet,
  extractSpreadsheetId,
} from '../utils/googleAuth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { User } from 'firebase/auth';
import {
  FileSpreadsheet,
  Check,
  Copy,
  ArrowLeft,
  Download,
  AlertCircle,
  Search,
  Trash2,
  ExternalLink,
  Users,
  KeyRound,
  RefreshCw,
  PlusCircle,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface InternalSheetsAdminProps {
  onBackToApp: () => void;
}

export const InternalSheetsAdmin: React.FC<InternalSheetsAdminProps> = ({ onBackToApp }) => {
  const [config, setConfig] = useState<GoogleSheetsConfig>(getSavedConfig());
  const [guests, setGuests] = useState<GuestRegistration[]>(getRegisteredGuests());
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  // Google OAuth Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sheets API Actions State
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [sheetInputUrl, setSheetInputUrl] = useState(config.spreadsheetUrl || '');
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Webhook Test State
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setCurrentUser(result.user);
        const updatedConfig = {
          ...config,
          connectedEmail: result.user.email || '',
        };
        setConfig(updatedConfig);
        saveConfig(updatedConfig);
        setActionNotice({
          type: 'success',
          text: `Conectado exitosamente como ${result.user.email}`,
        });
      }
    } catch (err: any) {
      console.error('Google Sign In error:', err);
      setAuthError(err?.message || 'No se pudo completar el inicio de sesión con Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentUser(null);
    setActionNotice({ type: 'success', text: 'Sesión de Google cerrada.' });
  };

  const handleCreateNewSheet = async () => {
    setIsCreatingSheet(true);
    setActionNotice(null);
    try {
      const { spreadsheetId, spreadsheetUrl } = await createMuteSpreadsheet();
      const updatedConfig: GoogleSheetsConfig = {
        ...config,
        spreadsheetId,
        spreadsheetUrl,
        spreadsheetTitle: 'MUTE DEJOTA - Registro de Invitados',
        useDirectApi: true,
      };
      setConfig(updatedConfig);
      setSheetInputUrl(spreadsheetUrl);
      saveConfig(updatedConfig);
      setActionNotice({
        type: 'success',
        text: '¡Hoja creada en tu Google Drive! Los nuevos registros se sincronizarán allí directamente.',
      });
    } catch (err: any) {
      console.error(err);
      setActionNotice({
        type: 'error',
        text: err?.message || 'Error al crear la hoja en Google Sheets.',
      });
    } finally {
      setIsCreatingSheet(false);
    }
  };

  const handleLinkExistingSheet = () => {
    if (!sheetInputUrl.trim()) {
      setActionNotice({
        type: 'error',
        text: 'Ingresa la URL o ID de tu hoja de Google Sheets.',
      });
      return;
    }
    const id = extractSpreadsheetId(sheetInputUrl);
    const updatedConfig: GoogleSheetsConfig = {
      ...config,
      spreadsheetId: id,
      spreadsheetUrl: sheetInputUrl.trim(),
      useDirectApi: true,
    };
    setConfig(updatedConfig);
    saveConfig(updatedConfig);
    setActionNotice({
      type: 'success',
      text: 'Hoja vinculada correctamente.',
    });
  };

  const handleSyncAllGuests = async () => {
    if (!config.spreadsheetId) {
      setActionNotice({
        type: 'error',
        text: 'Primero debes conectar o crear una hoja de Google Sheets.',
      });
      return;
    }
    setIsSyncingAll(true);
    setActionNotice(null);
    let successCount = 0;
    try {
      for (const guest of guests) {
        const ok = await appendGuestToGoogleSheet(config.spreadsheetId, guest);
        if (ok) {
          guest.syncedToGoogleSheets = true;
          successCount++;
        }
      }
      setGuests([...guests]);
      localStorage.setItem('mute_dejota_guests', JSON.stringify(guests));
      setActionNotice({
        type: 'success',
        text: `¡${successCount} de ${guests.length} invitados sincronizados con Google Sheets!`,
      });
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        text: `Error al sincronizar: ${err?.message || 'Verifica los permisos de la hoja'}`,
      });
    } finally {
      setIsSyncingAll(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!config.webhookUrl) {
      setWebhookTestResult({
        success: false,
        message: 'Ingresa la URL de tu Webhook de Google Apps Script.',
      });
      return;
    }
    setIsTestingWebhook(true);
    setWebhookTestResult(null);
    try {
      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test: true,
          name: 'Prueba de Conexión MUTE',
          email: 'test@dejota.musica',
          ticketCode: 'MUTE-PRUEBA',
          registeredAt: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        }),
      });
      setWebhookTestResult({
        success: true,
        message: '¡Prueba enviada! Verifica tu Google Sheet para ver la nueva fila.',
      });
      saveConfig(config);
    } catch (err: any) {
      setWebhookTestResult({
        success: false,
        message: `Error al enviar prueba: ${err?.message || 'Verifica la URL'}`,
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleClearGuests = () => {
    if (window.confirm('¿Deseas reiniciar la lista de invitados locales de prueba?')) {
      localStorage.removeItem('mute_dejota_guests');
      setGuests([]);
    }
  };

  const appsScriptCode = `function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById("${config.spreadsheetId || '1MftaLSnZMugyzBkfzFuRT5lWAFee-PTZnPp56nzeA24'}");
    var sheet = ss.getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Fecha y Hora", "Nombre Completo", "Correo Electrónico", "Código de Ticket", "ID"]);
    }
    sheet.appendRow([
      data.registeredAt || new Date().toLocaleString(),
      data.name,
      data.email,
      data.ticketCode,
      data.id || ""
    ]);
    return ContentService.createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const filteredGuests = guests.filter((g) => {
    const q = searchTerm.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.ticketCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Invitación</span>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
              <span>Conexión Google Sheets Oficial</span>
            </h1>
            <p className="text-xs text-neutral-400 font-mono mt-0.5">
              Sincronización en tiempo real de invitados al lanzamiento MUTE DEJOTA
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV(guests)}
            disabled={guests.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-mono transition-colors"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-mono border ${
            actionNotice.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
              : 'bg-red-950/70 border-red-800 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{actionNotice.text}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-neutral-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Grid: Direct Google OAuth Integration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Direct Google Sheets API Integration */}
        <div className="lg:col-span-7 bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-neutral-100">
                1. Conexión Directa con tu Cuenta Google
              </h2>
            </div>
            {currentUser && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300">
                Conectado
              </span>
            )}
          </div>

          {/* User Authentication Status */}
          {!currentUser ? (
            <div className="bg-neutral-950/80 rounded-xl p-5 border border-neutral-800 space-y-4">
              <p className="text-xs text-neutral-300 font-sans leading-relaxed">
                Inicia sesión con tu cuenta de Google para crear o sincronizar automáticamente las
                confirmaciones de asistencia en tu propio <strong>Google Sheets</strong>.
              </p>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <GoogleSignInButton
                  onClick={handleGoogleSignIn}
                  disabled={isLoggingIn}
                  text={isLoggingIn ? 'Conectando...' : 'Iniciar Sesión con Google'}
                />
              </div>
              {authError && (
                <div className="p-3 bg-red-950/50 border border-red-800 rounded-lg text-xs font-mono text-red-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-neutral-950/80 rounded-xl p-4 border border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || ''}
                      className="w-9 h-9 rounded-full border border-neutral-700"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-800 text-white font-bold flex items-center justify-center text-xs">
                      {(currentUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {currentUser.displayName || 'Usuario Google'}
                    </p>
                    <p className="text-[11px] font-mono text-neutral-400">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white text-xs font-mono transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Cerrar</span>
                </button>
              </div>
            </div>
          )}

          {/* Spreadsheet Creation & Linking */}
          <div className="space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-300">
              2. Hoja de Cálculo en Google Drive:
            </h3>

            {config.spreadsheetId ? (
              <div className="p-4 bg-emerald-950/30 border border-emerald-800/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-mono font-bold">Hoja Conectada y Activa</span>
                  </div>
                  {config.spreadsheetUrl && (
                    <a
                      href={config.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs font-mono text-emerald-400 hover:text-emerald-300 underline"
                    >
                      <span>Abrir en Google Sheets</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
                <div className="text-xs font-mono text-neutral-300 space-y-1">
                  <p>
                    <strong>ID:</strong> <code className="text-neutral-400">{config.spreadsheetId}</code>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleSyncAllGuests}
                    disabled={isSyncingAll || !currentUser}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg transition-colors shadow-md"
                  >
                    {isSyncingAll ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isSyncingAll
                        ? 'Sincronizando...'
                        : `Sincronizar Lista (${guests.length} invitados)`}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={handleCreateNewSheet}
                    disabled={isCreatingSheet || !currentUser}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-mono font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-950/50"
                  >
                    {isCreatingSheet ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlusCircle className="w-4 h-4" />
                    )}
                    <span>
                      {isCreatingSheet
                        ? 'Creando en Google Drive...'
                        : 'Crear Hoja Automática en tu Drive'}
                    </span>
                  </button>
                </div>
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-neutral-800"></div>
                  <span className="flex-shrink mx-4 text-[10px] font-mono uppercase text-neutral-500">
                    O vincula una hoja existente
                  </span>
                  <div className="flex-grow border-t border-neutral-800"></div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sheetInputUrl}
                    onChange={(e) => setSheetInputUrl(e.target.value)}
                    placeholder="Pega el enlace o ID de tu Google Sheet..."
                    className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={handleLinkExistingSheet}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-mono font-semibold border border-neutral-700 transition-colors"
                  >
                    Vincular
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Webhook Fallback / Apps Script */}
        <div className="lg:col-span-5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold uppercase font-mono tracking-wider text-neutral-200 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                <span>Alternativa: Apps Script Webhook</span>
              </h2>
              <button
                onClick={copyScript}
                className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono transition-colors"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-xs text-neutral-400 font-sans mb-3 leading-relaxed">
              Si prefieres que no requiera inicio de sesión con Google en el navegador, puedes usar
              un Webhook público de Apps Script como canal directo:
            </p>
            <div className="space-y-2">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase">
                URL del Webhook (Google Apps Script):
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={config.webhookUrl}
                  onChange={(e) => {
                    const updated = { ...config, webhookUrl: e.target.value };
                    setConfig(updated);
                    saveConfig(updated);
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleTestWebhook}
                  disabled={isTestingWebhook}
                  className="px-3 py-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-xs font-mono rounded-lg border border-neutral-700 text-neutral-200 shrink-0"
                >
                  {isTestingWebhook ? 'Probando...' : 'Probar'}
                </button>
              </div>
              {webhookTestResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs font-mono flex items-start gap-2 ${
                    webhookTestResult.success
                      ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                      : 'bg-red-950/60 border border-red-800 text-red-300'
                  }`}
                >
                  {webhookTestResult.success ? (
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <span>{webhookTestResult.message}</span>
                </div>
              )}
            </div>
          </div>
          <div className="pt-2">
            <pre className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-[10px] font-mono text-emerald-400/80 max-h-32 overflow-y-auto">
              {appsScriptCode}
            </pre>
          </div>
        </div>
      </div>

      {/* Guest List Table */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 sm:p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-neutral-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Lista de Invitados Registrados</h2>
              <p className="text-xs text-neutral-400 font-mono">
                {guests.length} personas registradas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, correo..."
                className="pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 w-56 sm:w-64"
              />
            </div>
            {guests.length > 0 && (
              <button
                onClick={handleClearGuests}
                title="Limpiar datos de prueba"
                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {filteredGuests.length === 0 ? (
            <div className="text-center py-12 text-neutral-500 font-mono text-xs">
              {guests.length === 0
                ? 'No hay registros todavía. Los invitados que completen el formulario aparecerán aquí y en Google Sheets.'
                : 'No se encontraron registros que coincidan con la búsqueda.'}
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-950/70 border-b border-neutral-800 text-neutral-400 font-mono uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Pase / Ticket</th>
                  <th className="py-3 px-4">Nombre Completo</th>
                  <th className="py-3 px-4">Correo Electrónico</th>
                  <th className="py-3 px-4">Fecha de Registro</th>
                  <th className="py-3 px-4 text-center">Estado Sheets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                      {g.ticketCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-neutral-100">{g.name}</td>
                    <td className="py-3 px-4 font-mono text-neutral-300">{g.email}</td>
                    <td className="py-3 px-4 text-neutral-400 text-[11px] font-mono">
                      {new Date(g.registeredAt).toLocaleString('es-ES')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono ${
                          g.syncedToGoogleSheets
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                            : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                        }`}
                      >
                        {g.syncedToGoogleSheets ? 'Sincronizado' : 'Almacenado local'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
