import React from 'react';
import { Button, Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { message } from 'antd';

interface ExportButtonProps {
  onExportExcel?: () => void;
  onExportPDF?: () => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExportExcel, onExportPDF }) => {
  const items: MenuProps['items'] = [
    {
      key: 'excel',
      label: '导出 Excel',
      onClick: () => {
        onExportExcel?.();
        message.success('Excel 导出功能将在后续版本实现');
      },
    },
    {
      key: 'pdf',
      label: '导出 PDF',
      onClick: () => {
        onExportPDF?.();
        message.success('PDF 导出功能将在后续版本实现');
      },
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button icon={<DownloadOutlined />}>导出</Button>
    </Dropdown>
  );
};

export default ExportButton;
