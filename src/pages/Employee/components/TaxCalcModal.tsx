import React, { useState } from 'react';
import { Modal, InputNumber, Descriptions, Typography } from 'antd';
import { calcTax } from '@/api/employee';
import type { TaxInfo } from '@/types/employee';

const { Text } = Typography;

interface Props {
  open: boolean;
  onCancel: () => void;
  defaultSalary?: number;
  defaultSocialRate?: number;
  defaultFundRate?: number;
  defaultSpecialDeduction?: number;
}

const TaxCalcModal: React.FC<Props> = ({ open, onCancel, defaultSalary = 8000, defaultSocialRate = 0, defaultFundRate = 0, defaultSpecialDeduction = 0 }) => {
  const [salary, setSalary] = useState(defaultSalary);
  const [socialRate, setSocialRate] = useState(defaultSocialRate);
  const [fundRate, setFundRate] = useState(defaultFundRate);
  const [specialDed, setSpecialDed] = useState(defaultSpecialDeduction);
  const [result, setResult] = useState<TaxInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCalc = async () => {
    setLoading(true);
    try {
      const res = await calcTax({ salary, socialInsuranceRate: socialRate, housingFundRate: fundRate, specialDeduction: specialDed });
      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      setSalary(defaultSalary);
      setSocialRate(defaultSocialRate);
      setFundRate(defaultFundRate);
      setSpecialDed(defaultSpecialDeduction);
      setResult(null);
    }
  }, [open, defaultSalary, defaultSocialRate, defaultFundRate, defaultSpecialDeduction]);

  return (
    <Modal title="个税计算器" open={open} onOk={handleCalc} onCancel={onCancel} okText="计算" confirmLoading={loading} width={520}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div>
          <Text type="secondary">月薪（元）</Text>
          <InputNumber value={salary} onChange={(v) => setSalary(v || 0)} min={0} style={{ width: '100%' }} />
        </div>
        <div>
          <Text type="secondary">社保个人比例(%)</Text>
          <InputNumber value={socialRate} onChange={(v) => setSocialRate(v || 0)} min={0} max={30} step={0.5} style={{ width: '100%' }} />
        </div>
        <div>
          <Text type="secondary">公积金个人比例(%)</Text>
          <InputNumber value={fundRate} onChange={(v) => setFundRate(v || 0)} min={0} max={12} step={0.5} style={{ width: '100%' }} />
        </div>
        <div>
          <Text type="secondary">专项附加扣除(元/月)</Text>
          <InputNumber value={specialDed} onChange={(v) => setSpecialDed(v || 0)} min={0} style={{ width: '100%' }} />
        </div>
      </div>
      {result && (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="税前工资">{result.salary.toLocaleString()} 元</Descriptions.Item>
          <Descriptions.Item label="社保（个人）">{result.socialInsurance.toLocaleString()} 元</Descriptions.Item>
          <Descriptions.Item label="公积金（个人）">{result.housingFund.toLocaleString()} 元</Descriptions.Item>
          <Descriptions.Item label="专项附加扣除">{result.specialDeduction.toLocaleString()} 元</Descriptions.Item>
          <Descriptions.Item label="起征点">5,000 元</Descriptions.Item>
          <Descriptions.Item label="应纳税所得额">{result.taxableIncome.toLocaleString()} 元</Descriptions.Item>
          <Descriptions.Item label="个人所得税">
            <Text type="danger" strong>{result.tax.toLocaleString()} 元</Text>
          </Descriptions.Item>
          <Descriptions.Item label="实发工资">
            <Text type="success" strong style={{ fontSize: 16 }}>{result.netSalary.toLocaleString()} 元</Text>
          </Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
};

export default TaxCalcModal;
