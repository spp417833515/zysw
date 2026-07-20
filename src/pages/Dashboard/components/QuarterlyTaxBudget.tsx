import React, { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Alert, Space, Typography, Spin, theme } from 'antd';
import { DollarOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getTaxSettings, TaxSettings } from '@/api/settings';
import { calculateQuarterlyTax, formatCurrency, getEffectiveVatRate, QuarterlyTaxResult } from '@/utils/taxCalculator';
import { getDashboardSummary } from '@/api/dashboard';
import { getInvoices } from '@/api/invoice';
import { getTaxReportPreview, TaxReportFiling } from '@/api/report';
import TaxDetailRow from './TaxDetailRow';

const { Text } = Typography;
const { useToken } = theme;

const QuarterlyTaxBudget: React.FC = () => {
  const { token } = useToken();
  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [taxResult, setTaxResult] = useState<QuarterlyTaxResult | null>(null);
  // 企业所得税一律取后端报税口径（与报税预览"季度申报助手"完全同源）
  const [filing, setFiling] = useState<TaxReportFiling | null>(null);
  const [quarterName, setQuarterName] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 本季度专票（专用发票不享受起征点免征，需单独计税）
      const now = dayjs();
      const qStart = now.month(Math.floor(now.month() / 3) * 3).startOf('month');
      const qEnd = qStart.add(2, 'month').endOf('month');
      const [taxRes, summaryRes, invRes, previewRes] = await Promise.all([
        getTaxSettings(),
        getDashboardSummary(),
        getInvoices({
          direction: 'out',
          type: 'special',
          start_date: qStart.format('YYYY-MM-DD'),
          end_date: qEnd.format('YYYY-MM-DD'),
          page_size: 100,
        }),
        getTaxReportPreview({
          startDate: qStart.format('YYYY-MM-DD'),
          endDate: qEnd.format('YYYY-MM-DD'),
        }),
      ]);
      const settings = taxRes.data;
      const summary = summaryRes.data;
      const specialInvoicedIncome = (invRes.data?.data ?? [])
        .filter((i) => i.status !== 'void')
        .reduce((s, i) => s + (i.totalAmount || i.amount || 0), 0);
      if (previewRes.code === 0 && previewRes.data) {
        setFiling(previewRes.data.filing);
      }
      if (settings && summary) {
        setTaxSettings(settings);
        setQuarterName(summary.quarterName);
        setTaxResult(calculateQuarterlyTax(
          summary.quarterlyIncome,
          summary.quarterlyInvoicedIncome,
          summary.quarterlyExpense,
          settings,
          specialInvoicedIncome,
        ));
      }
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
  // 企业所得税（后端报税口径）：本期应补 = 累计应纳 − 已预缴
  const corporateTaxDue = taxSettings.incomeTaxEnabled && filing ? filing.currentDue : 0;
  const totalTax = taxResult.vat + taxResult.additionalTax + corporateTaxDue;

  return (
    <Card
      title={<Space><DollarOutlined /><span>{today.year()}年 {quarterName} 季度交税预算</span></Space>}
      size="small"
    >
      {/* 免征/超额提示 */}
      <Alert
        message={
          <Space>
            {taxResult.vatExempted && taxResult.vatFromSpecial === 0 ? <CheckCircleOutlined /> : <WarningOutlined />}
            <Text>
              {taxResult.vatExempted
                ? taxResult.vatFromSpecial > 0
                  ? `本季度收入低于起征点，普票/未开票部分免征；专票 ${formatCurrency(taxResult.specialInvoicedIncome)} 不免征，需缴增值税`
                  : '本季度收入低于起征点，免征增值税和附加税'
                : `本季度收入已超过起征点 ${formatCurrency(taxSettings.vatThresholdQuarterly)}，全部销售额需缴纳增值税`}
            </Text>
          </Space>
        }
        type={taxResult.vatExempted && taxResult.vatFromSpecial === 0 ? 'success' : 'warning'}
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
            tagColor={taxResult.vat === 0 ? 'success' : 'blue'}
            tagText={(() => {
              const eff = getEffectiveVatRate(taxSettings);
              const reduced = eff !== taxSettings.vatRate;
              return `征收率 ${(eff * 100).toFixed(0)}%${reduced ? '（3%减按1%）' : ''}`;
            })()}
            details={
              taxResult.vatExempted
                ? [
                    `专票（不免征）：${formatCurrency(taxResult.specialInvoicedIncome)} → 税额 ${formatCurrency(taxResult.vatFromSpecial)}`,
                    `普票/未开票（免征）：${formatCurrency(taxResult.income - taxResult.specialInvoicedIncome)} → 税额 ¥0.00`,
                  ]
                : [
                    `已开票：${formatCurrency(taxResult.invoicedIncome)} → 税额 ${formatCurrency(taxResult.vatFromInvoiced)}`,
                    `未开票：${formatCurrency(taxResult.uninvoicedIncome)} → 税额 ${formatCurrency(taxResult.vatFromUninvoiced)}`,
                  ]
            }
            amount={formatCurrency(taxResult.vat)}
          />
          <TaxDetailRow
            label="附加税"
            tagColor={taxResult.vatExempted ? 'success' : 'blue'}
            tagText={`税率 ${(taxSettings.additionalTaxRate * 100).toFixed(0)}%`}
            details={[`计税基数：${formatCurrency(taxResult.vat)}（增值税额）`]}
            amount={formatCurrency(taxResult.additionalTax)}
          />
          {taxSettings.incomeTaxEnabled && filing && (
            <TaxDetailRow
              label="企业所得税"
              tagColor="orange"
              tagText={filing.isSmallMicro ? '小微实际税负 5%' : '税率 25%'}
              details={[
                `利润总额本年累计：${formatCurrency(filing.profitYtd)} → 累计应纳 ${formatCurrency(filing.accruedTax)}`,
                `已预缴 ${formatCurrency(filing.prepaidTax)} → 本期应补（退） ${formatCurrency(filing.currentDue)}${filing.creditCarryover > 0 ? `（多缴 ${formatCurrency(filing.creditCarryover)} 留抵）` : ''}`,
              ]}
              amount={formatCurrency(corporateTaxDue)}
            />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 12, marginTop: 8, borderTop: `1px solid ${token.colorBorder}` }}>
            <Text strong style={{ fontSize: 15 }}>预计总税额</Text>
            <Text strong style={{ fontSize: 18, color: token.colorPrimary }}>{formatCurrency(totalTax)}</Text>
          </div>
        </Space>
      </div>

      {/* 提示信息 */}
      <Alert
        message="温馨提示"
        description={
          <Space direction="vertical" size={2}>
            <Text style={{ fontSize: 11 }}>• 以上为预估税额，实际应缴税款以税务机关核定为准</Text>
            <Text style={{ fontSize: 11 }}>• 企业所得税取自报税口径（本年累计利润估提 − 已预缴），与报表预览"季度申报助手"同源</Text>
            <Text style={{ fontSize: 11 }}>• 小微企业（年应纳税所得额≤300万）实际税负5%；超过300万整体按25%</Text>
            <Text style={{ fontSize: 11 }}>• 专用发票（专票）不享受季度30万起征点免征，开出即需按1%缴纳</Text>
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
