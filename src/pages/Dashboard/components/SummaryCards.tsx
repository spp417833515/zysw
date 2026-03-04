import React, { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Statistic } from 'antd';
import {
  AccountBookOutlined,
  CreditCardOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import { useAccountStore } from '@/store/useAccountStore';
import { useReimbursementStore } from '@/store/useReimbursementStore';
import { getUnpaidSalaries } from '@/api/employee';
import { formatAmount } from '@/utils/format';
import { semanticColors } from '@/theme/tokens/colors';

const SummaryCards: React.FC = () => {
  const { accounts } = useAccountStore();
  const unpaidReimbursementAmount = useReimbursementStore((s) => s.unpaidAmount);
  const fetchUnpaidInfo = useReimbursementStore((s) => s.fetchUnpaidInfo);

  const [unpaidSalaryAmount, setUnpaidSalaryAmount] = useState(0);

  useEffect(() => {
    fetchUnpaidInfo();
    getUnpaidSalaries().then((res: any) => {
      setUnpaidSalaryAmount(res.data?.totalAmount ?? 0);
    }).catch(() => {});
  }, []);

  const totalAssets = useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
  }, [accounts]);

  const totalPending = unpaidSalaryAmount + unpaidReimbursementAmount;
  const netBalance = totalAssets - totalPending;

  const cardStyle = { height: '100%' };
  const iconBox = (color: string, icon: React.ReactNode) => (
    <div style={{
      width: 44, height: 44, borderRadius: 10,
      background: `${color}15`, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontSize: 22, color,
    }}>
      {icon}
    </div>
  );

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={8}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(semanticColors.info, <AccountBookOutlined />)}
            <Statistic title="总资产" value={`¥${formatAmount(totalAssets)}`} />
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(semanticColors.expense, <CreditCardOutlined />)}
            <div style={{ flex: 1 }}>
              <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>待支付</div>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>待开工资</span>
                <span style={{ color: semanticColors.expense }}>¥{formatAmount(unpaidSalaryAmount)}</span>
              </div>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span>待报销</span>
                <span style={{ color: semanticColors.expense }}>¥{formatAmount(unpaidReimbursementAmount)}</span>
              </div>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4, fontWeight: 600 }}>
                <span>合计</span>
                <span style={{ color: semanticColors.expense }}>¥{formatAmount(totalPending)}</span>
              </div>
            </div>
          </div>
        </Card>
      </Col>

      <Col xs={24} sm={8}>
        <Card hoverable style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {iconBox(netBalance >= 0 ? semanticColors.income : semanticColors.expense, <WalletOutlined />)}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#999' }}>实际余额</span>
                <span style={{ fontWeight: 600 }}>¥{formatAmount(totalAssets)}</span>
              </div>
              <div style={{ fontSize: 13, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f0f0f0', marginTop: 4, paddingTop: 4, fontWeight: 600 }}>
                <span>净余额</span>
                <span style={{ color: netBalance >= 0 ? semanticColors.income : semanticColors.expense }}>
                  ¥{formatAmount(netBalance)}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default SummaryCards;
