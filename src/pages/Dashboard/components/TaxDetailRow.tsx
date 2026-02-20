import React from 'react';
import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

interface TaxDetailRowProps {
  label: string;
  tagColor: string;
  tagText: string;
  details?: React.ReactNode[];
  amount: string;
}

const TaxDetailRow: React.FC<TaxDetailRowProps> = ({ label, tagColor, tagText, details, amount }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <Space direction="vertical" size={2}>
      <Space>
        <Text>{label}</Text>
        <Tag color={tagColor}>{tagText}</Tag>
      </Space>
      {details?.map((d, i) => (
        <Text key={i} type="secondary" style={{ fontSize: 11 }}>{d}</Text>
      ))}
    </Space>
    <Text strong style={{ fontSize: 16 }}>{amount}</Text>
  </div>
);

export default TaxDetailRow;
