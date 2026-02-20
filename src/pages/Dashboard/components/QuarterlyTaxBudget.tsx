import React, { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Alert, Space, Typography, Spin, theme } from 'antd';
import { DollarOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTaxSettings, TaxSettings } from '@/api/settings';
import { calculateQuarterlyTax, formatCurrency, QuarterlyTaxResult, aggregateQuarterTransactions } from '@/utils/taxCalculator';
import { getQuarterInfo } from '@/utils/taxConfig';
import { useTransactionStore } from '@/store/useTransactionStore';
import TaxDetailRow from './TaxDetailRow';

const { Text } = Typography;
const { useToken } = theme;

const QuarterlyTaxBudget: React.FC = () => {
  const { token } = useToken();
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [taxResult, setTaxResult] = useState<QuarterlyTaxResult | null>(null);
  const { transactions } = useTransactionStore();

  useEffect(() => {
    fetchTaxSettings();
  }, []);

  useEffect(() => {
    if (taxSettings) {
      const today = dayjs();
      const { start, end } = getQuarterInfo(today);
      const { income, invoicedIncome, expense } = aggregateQuarterTransactions(transactions, start, end);
      setTaxResult(calculateQuarterlyTax(income, invoicedIncome, expense, taxSettings));
    }
  }, [taxSettings, transactions]);

  const fetchTaxSettings = async () => {
    try {
      setLoading(true);
      const res = await getTaxSettings();
      if (res.data) setTaxSettings(res.data);
    } catch {
      // 使用默认税率设置
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Card><div style={{ textAlign: 'center', padding: '40px 0' }}><Spin /></div></Card>;
  }

  if (!taxSettings || !taxResult) {
    return (
      <Card>
        <Alert message="无法计算税款" description="请先在设置中配置税率信息" type="warning" showIcon />
      </Card>
    );
  }

  const today = dayjs();
  const { name: quarterName } = getQuarterInfo(today);

  return (
    <Card
      title={<Space><DollarOutlined /><span>{today.year()}年 {quarterName} 季度交税预算</span></Space>}
      size="small"
    >
      {/* 免征/超额提示 */}
      <Alert
        message={
          <Space>
            {taxResult.vatExempted ? <CheckCircleOutlined /> : <WarningOutlined />}
            <Text>
              {taxResult.vatExempted
                ? '本季度收入低于免征额，免征增值税和附加税'
                : `本季度收入已超过免征额 ${formatCurrency(taxSettings.vatThresholdQuarterly)}，需缴纳增值税`}
            </Text>
          </Space>
        }
        type={taxResult.vatExempted ? 'success' : 'warning'}
        showIcon={false}
        style={{ marginBottom: 16 }}
      />

      {/* 收入支出统计 */}
      <Row gutter={16} style={{ marginBottom: 12 }}>
        <Col span={6}>
          <Statistic title="季度总收入" value={taxResult.income} precision={2} prefix="¥"
            valueStyle={{ color: token.colorSuccess, fontSize: 16 }} />
        </Col>
        <Col span={6}>
          <Statistic title="已开票收入" value={taxResult.invoicedIncome} precision={2} prefix="¥"
            valueStyle={{ color: token.colorPrimary, fontSize: 16 }} />
        </Col>
        <Col span={6}>
          <Statistic title="未开票收入" value={taxResult.uninvoicedIncome} precision={2} prefix="¥"
            valueStyle={{ color: token.colorWarning, fontSize: 16 }} />
        </Col>
        <Col span={6}>
          <Statistic title="季度利润" value={taxResult.profit} precision={2} prefix="¥"
            valueStyle={{ color: taxResult.profit >= 0 ? token.colorPrimary : token.colorError, fontSize: 16, fontWeight: 'bold' }} />
        </Col>
      </Row>

      {/* 税款明细 */}
      <div style={{ background: token.colorBgContainer, padding: 12, borderRadius: 4, border: `1px solid ${token.colorBorder}` }}>
        <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>税款明细</Text>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          <TaxDetailRow
            label="增值税"
            tagColor={taxResult.vatExempted ? 'success' : 'blue'}
            tagText={`税率 ${(taxSettings.vatRate * 100).toFixed(0)}%`}
            details={[
              `已开票：${formatCurrency(taxResult.invoicedIncome)} → 税额 ${formatCurrency(taxResult.vatFromInvoiced)}`,
              `未开票：${formatCurrency(taxResult.uninvoicedIncome)} → 税额 ${formatCurrency(taxResult.vatFromUninvoiced)}`,
            ]}
            amount={formatCurrency(taxResult.vat)}
          />
          <TaxDetailRow
            label="附加税"
            tagColor={taxResult.vatExempted ? 'success' : 'blue'}
            tagText={`税率 ${(taxSettings.additionalTaxRate * 100).toFixed(0)}%`}
            details={[`计税基数：${formatCurrency(taxResult.vat)}（增值税额）`]}
            amount={formatCurrency(taxResult.additionalTax)}
          />
          {taxSettings.incomeTaxEnabled && (
            <TaxDetailRow
              label="企业所得税"
              tagColor="orange"
              tagText={(() => {
                const ap = taxResult.profit * 4;
                if (ap <= 1000000) return '税率 5%';
                if (ap <= 3000000) return '税率 5%-10%';
                return '税率 25%';
              })()}
              details={[`季度利润：${formatCurrency(taxResult.profit)} × 4 = 年利润 ${formatCurrency(taxResult.profit * 4)}`]}
              amount={formatCurrency(taxResult.corporateTax)}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTop: `1px solid ${token.colorBorder}` }}>
            <Text strong style={{ fontSize: 15 }}>预计总税额</Text>
            <Text strong style={{ fontSize: 18, color: token.colorPrimary }}>{formatCurrency(taxResult.totalTax)}</Text>
          </div>
        </Space>
      </div>

      {/* 提示信息 */}
      <Alert
        message="温馨提示"
        description={
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 11 }}>• 以上为预估税额，实际应缴税款以税务机关核定为准</Text>
            <Text style={{ fontSize: 11 }}>• 企业所得税按年度利润计算，此处显示的是季度预缴金额</Text>
            <Text style={{ fontSize: 11 }}>• 小微企业（年利润≤300万）可享受5%-10%优惠税率</Text>
          </Space>
        }
        type="info"
        showIcon={false}
        style={{ marginTop: 12, fontSize: 11 }}
      />
    </Card>
  );
};

export default QuarterlyTaxBudget;
