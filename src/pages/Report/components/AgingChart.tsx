import React from 'react';
import { Column } from '@ant-design/charts';

interface AgingBucket {
  range: string;
  amount: number;
}

interface AgingChartProps {
  data: AgingBucket[];
  title?: string;
}

const AgingChart: React.FC<AgingChartProps> = ({ data, title }) => {
  const config = {
    data,
    xField: 'range',
    yField: 'amount',
    label: {
      position: 'middle' as const,
      formatter: (datum: any) => `¥${datum.amount.toLocaleString()}`,
    },
    xAxis: { label: { autoRotate: false } },
    yAxis: { label: { formatter: (v: string) => `¥${Number(v).toLocaleString()}` } },
    color: '#1890ff',
    meta: {
      range: { alias: '账龄区间' },
      amount: { alias: '金额' },
    },
  };

  return (
    <div>
      {title && <div style={{ fontWeight: 600, marginBottom: 12 }}>{title}</div>}
      <Column {...config} height={300} />
    </div>
  );
};

export default AgingChart;
