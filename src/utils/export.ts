import * as XLSX from 'xlsx';

export interface ExportColumn {
  title: string;
  dataIndex: string;
}

export interface ExportOptions {
  fileName: string;
  sheetName?: string;
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions,
): void {
  const headers = columns.map((c) => c.title);
  const rows = data.map((row) => columns.map((c) => row[c.dataIndex] ?? ''));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');
  XLSX.writeFile(wb, `${options.fileName}.xlsx`);
}

export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ExportColumn[],
  options: ExportOptions,
): void {
  const headers = columns.map((c) => c.title);
  const rows = data.map((row) => columns.map((c) => {
    const val = String(row[c.dataIndex] ?? '');
    return val.includes(',') ? `"${val}"` : val;
  }));
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${options.fileName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseExcelFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function generateTemplate(columns: ExportColumn[], fileName: string): void {
  const headers = columns.map((c) => c.title);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}
