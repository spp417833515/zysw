import React from 'react';
import { message } from 'antd';
import ExportButton from '@/components/ExportButton';

interface ReportExportButtonProps {
  title: string;
  data: any[];
}

const ReportExportButton: React.FC<ReportExportButtonProps> = ({ title, data }) => {
  const handleExportExcel = () => {
    message.info(`${title} Excel 导出功能将在后续版本实现（共 ${data.length} 条数据）`);
  };

  const handleExportPDF = () => {
    message.info(`${title} PDF 导出功能将在后续版本实现（共 ${data.length} 条数据）`);
  };

  return (
    <ExportButton
      onExportExcel={handleExportExcel}
      onExportPDF={handleExportPDF}
    />
  );
};

export default ReportExportButton;
