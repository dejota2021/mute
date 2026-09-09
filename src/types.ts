export interface GuestRegistration {
  id: string;
  name: string;
  email: string;
  registeredAt: string;
  ticketCode: string;
  syncedToGoogleSheets: boolean;
}

export type ViewMode = 'registration' | 'envelope' | 'invitation' | 'admin';

export interface GoogleSheetsConfig {
  webhookUrl: string;
  spreadsheetUrl: string;
  spreadsheetId?: string;
  spreadsheetTitle?: string;
  connectedEmail?: string;
  autoSync: boolean;
  useDirectApi?: boolean;
}
