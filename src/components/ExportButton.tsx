import React from 'react';
import { Button, Dropdown } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { exportToExcel, exportToCSV } from '@/utils/export';
import type { ExportColumn } from '@/utils/export';

interface ExportButtonProps {
  data?: Record<string, unknown>[];
  columns?: ExportColumn[];
  fileName?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  data = [],
  columns = [],
  fileName = '导出数据',
}) => {
  const items: MenuProps['items'] = [
    {
      key: 'excel',
      label: '导出 Excel',
      onClick: () => exportToExcel(data, columns, { fileName }),
    },
    {
      key: 'csv',
      label: '导出 CSV',
      onClick: () => exportToCSV(data, columns, { fileName }),
    },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight">
      <Button icon={<DownloadOutlined />}>导出</Button>
    </Dropdown>
  );
};

export default ExportButton;
