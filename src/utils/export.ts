// Excel/PDF 导出工具 - Phase 4 实现
// 当前提供接口定义，后续对接 xlsx 和 jspdf

export interface ExportOptions {
  fileName: string;
  sheetName?: string;
  title?: string;
}

export function exportToExcel(
  _data: Record<string, unknown>[],
  _columns: { title: string; dataIndex: string }[],
  _options: ExportOptions,
): void {
  // TODO: Phase 4 - 使用 xlsx 库实现
  console.log('Excel export - will be implemented in Phase 4');
}

export function exportToPDF(
  _data: Record<string, unknown>[],
  _columns: { title: string; dataIndex: string }[],
  _options: ExportOptions,
): void {
  // TODO: Phase 4 - 使用 jspdf 库实现
  console.log('PDF export - will be implemented in Phase 4');
}
