import { GuestRegistration, GoogleSheetsConfig } from '../types';
import { appendGuestToGoogleSheet } from './googleAuth';

const STORAGE_KEY_GUESTS = 'mute_dejota_guests';
const STORAGE_KEY_CONFIG = 'mute_dejota_sheets_config';
const STORAGE_KEY_CURRENT_GUEST = 'mute_dejota_current_guest';

export const DEFAULT_SPREADSHEET_ID = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SPREADSHEET_ID) ||
  '1tnDaZRuX-rwVcBI4Xzm-VpgvomDInozaZu99fYYUpvg'
).trim();

export const DEFAULT_SPREADSHEET_URL = (
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SPREADSHEET_URL) ||
  `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`
).trim();

// Webhook interno preconfigurado oficial proporcionado por el usuario.
const rawEnvWebhook = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
const isWebookPlaceholder = !rawEnvWebhook || rawEnvWebhook.includes('your-script-id') || rawEnvWebhook.trim() === '';

export const INTERNAL_WEBHOOK_URL: string = (
  isWebookPlaceholder
    ? 'https://script.google.com/macros/s/AKfycbz_m8MRc33wfXgBYqfL8CLhVmA5wMmUOl6kBvlwVufy4TymqwPwsPEix5x045R3vhMr/exec'
    : rawEnvWebhook.trim()
);

export function getSavedConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isSavedPlaceholder = !parsed.webhookUrl || parsed.webhookUrl.includes('your-script-id') || parsed.webhookUrl.trim() === '';
      return {
        ...parsed,
        webhookUrl: isSavedPlaceholder ? INTERNAL_WEBHOOK_URL : parsed.webhookUrl.trim(),
        spreadsheetId: parsed.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        spreadsheetUrl: parsed.spreadsheetUrl || DEFAULT_SPREADSHEET_URL,
        autoSync: true,
        useDirectApi: true,
      };
    }
  } catch (e) {
    console.error('Error loading sheets config', e);
  }
  return {
    webhookUrl: INTERNAL_WEBHOOK_URL,
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    spreadsheetUrl: DEFAULT_SPREADSHEET_URL,
    spreadsheetTitle: 'MUTE DEJOTA - Registro de Invitados',
    autoSync: true,
    useDirectApi: true,
  };
}

export function saveConfig(config: GoogleSheetsConfig) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

export function getRegisteredGuests(): GuestRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_GUESTS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading guests', e);
  }
  return [];
}

export function getCurrentGuest(): GuestRegistration | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_GUEST);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading current guest', e);
  }
  return null;
}

export function setCurrentGuest(guest: GuestRegistration | null) {
  if (guest) {
    localStorage.setItem(STORAGE_KEY_CURRENT_GUEST, JSON.stringify(guest));
  } else {
    localStorage.removeItem(STORAGE_KEY_CURRENT_GUEST);
  }
}

export function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MUTE-${code}`;
}

export async function submitRegistration(name: string, email: string): Promise<{
  guest: GuestRegistration;
  synced: boolean;
  message: string;
}> {
  const newGuest: GuestRegistration = {
    id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    email: email.trim().toLowerCase(),
    registeredAt: new Date().toISOString(),
    ticketCode: generateTicketCode(),
    syncedToGoogleSheets: false,
  };

  const config = getSavedConfig();
  let synced = false;
  let message = 'Registrado exitosamente';

  const webhookToUse = (config.webhookUrl && config.webhookUrl.trim().length > 0)
    ? config.webhookUrl.trim()
    : INTERNAL_WEBHOOK_URL;

  if (webhookToUse) {
    try {
      // Send to Google Sheets Apps Script Webhook
      // Content-Type: text/plain avoids CORS preflight OPTIONS in Google Apps Script Web Apps
      await fetch(webhookToUse, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({
          id: newGuest.id,
          // Support both English and Spanish payload keys for maximum compatibility with any Apps Script version
          name: newGuest.name,
          nombre: newGuest.name,
          nombreCompleto: newGuest.name,
          
          email: newGuest.email,
          correo: newGuest.email,
          
          ticketCode: newGuest.ticketCode,
          ticket: newGuest.ticketCode,
          
          registeredAt: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
          userAgent: navigator.userAgent,
          // Pass the spreadsheet ID dynamically in case the Apps Script supports it
          spreadsheetId: config.spreadsheetId || DEFAULT_SPREADSHEET_ID,
        }),
      });
      synced = true;
      newGuest.syncedToGoogleSheets = true;
      message = 'Sincronizado con Google Sheets';
    } catch (err) {
      console.warn('Could not sync to Google Sheets webhook directly:', err);
    }
  }

  if (!synced && config.spreadsheetId) {
    try {
      const apiSuccess = await appendGuestToGoogleSheet(config.spreadsheetId, newGuest);
      if (apiSuccess) {
        synced = true;
        newGuest.syncedToGoogleSheets = true;
        message = 'Sincronizado directamente con Google Sheets';
      }
    } catch (err) {
      console.warn('Error syncing directly to Google Sheets API:', err);
    }
  }

  // Save in local guests list safely
  try {
    const currentList = getRegisteredGuests();
    const updatedList = [newGuest, ...currentList.filter(g => g.email !== newGuest.email)];
    localStorage.setItem(STORAGE_KEY_GUESTS, JSON.stringify(updatedList));
    setCurrentGuest(newGuest);
  } catch (storageErr) {
    console.warn('LocalStorage is not available to save guest:', storageErr);
  }

  return { guest: newGuest, synced, message };
}

export function exportToCSV(guests: GuestRegistration[]) {
  const headers = ['ID', 'Nombre', 'Correo', 'Código de Ticket', 'Fecha de Registro', 'Sincronizado en Sheets'];
  const rows = guests.map(g => [
    `"${g.id}"`,
    `"${g.name.replace(/"/g, '""')}"`,
    `"${g.email.replace(/"/g, '""')}"`,
    `"${g.ticketCode}"`,
    `"${new Date(g.registeredAt).toLocaleString('es-ES')}"`,
    `"${g.syncedToGoogleSheets ? 'SÍ' : 'NO'}"`
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `lista_invitados_MUTE_DEJOTA_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
