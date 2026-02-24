import React from 'react';
import ExportButton from '@/components/ExportButton';
import type { ExportColumn } from '@/utils/export';

interface ReportExportButtonProps {
  title: string;
  data: any[];
  columns?: ExportColumn[];
}

const ReportExportButton: React.FC<ReportExportButtonProps> = ({ title, data, columns = [] }) => {
  return (
    <ExportButton
      data={data}
      columns={columns}
      fileName={title}
    />
  );
};

export default ReportExportButton;
