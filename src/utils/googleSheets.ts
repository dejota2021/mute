import { GuestRegistration, GoogleSheetsConfig } from '../types';
import { appendGuestToGoogleSheet } from './googleAuth';

const STORAGE_KEY_GUESTS = 'mute_dejota_guests';
const STORAGE_KEY_CONFIG = 'mute_dejota_sheets_config';
const STORAGE_KEY_CURRENT_GUEST = 'mute_dejota_current_guest';

export const DEFAULT_SPREADSHEET_ID = '1MftaLSnZMugyzBkfzFuRT5lWAFee-PTZnPp56nzeA24';
export const DEFAULT_SPREADSHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`;

export function getSavedConfig(): GoogleSheetsConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
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
    webhookUrl: '',
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

  if (config.spreadsheetId) {
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

  if (!synced && config.webhookUrl && config.webhookUrl.trim().length > 0) {
    try {
      // Send to Google Sheets Apps Script Webhook
      // Using no-cors ensures submission succeeds through Google Apps Script redirects
      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: newGuest.id,
          name: newGuest.name,
          email: newGuest.email,
          ticketCode: newGuest.ticketCode,
          registeredAt: new Date().toLocaleString('es-ES', { timeZone: 'America/Bogota' }),
          userAgent: navigator.userAgent,
        }),
      });

      synced = true;
      newGuest.syncedToGoogleSheets = true;
      message = 'Sincronizado con Google Sheets automáticamente';
    } catch (err) {
      console.warn('Could not sync to Google Sheets webhook directly:', err);
      synced = false;
      message = 'Guardado localmente. Pendiente sincronización con Google Sheets.';
    }
  }

  // Save in local guests list
  const currentList = getRegisteredGuests();
  // Avoid duplicate email or append
  const updatedList = [newGuest, ...currentList.filter(g => g.email !== newGuest.email)];
  localStorage.setItem(STORAGE_KEY_GUESTS, JSON.stringify(updatedList));
  setCurrentGuest(newGuest);

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
