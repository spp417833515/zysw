import request from './request';
import type { ApiResponse } from '@/types/common';

export interface BackupItem {
  name: string;
  size: number;
  createdAt: string;
}

export function getBackups() {
  return request.get<ApiResponse<BackupItem[]>>('/backups');
}

export function createBackup() {
  return request.post<ApiResponse<BackupItem>>('/backups', undefined, { timeout: 60000 });
}

export function restoreBackup(name: string) {
  return request.post<ApiResponse<null>>(
    `/backups/${encodeURIComponent(name)}/restore`,
    undefined,
    { timeout: 120000 },
  );
}

export function restoreFromFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  return request.post<ApiResponse<null>>('/backups/restore', form, { timeout: 120000 });
}

export function backupDownloadUrl(name: string): string {
  return `/api/backups/${encodeURIComponent(name)}/download`;
}
