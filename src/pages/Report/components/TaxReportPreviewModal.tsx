import React, { useEffect, useState } from 'react';
import { Modal, Tabs, Table, Alert, Spin, Space, Typography, Tag, Row, Col, Statistic, Tooltip, theme } from 'antd';
import { QuestionCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { getTaxReportPreview, TaxReportPreview } from '@/api/report';

const { Text, Title } = Typography;
const { useToken } = theme;

interface Props {
  open: boolean;
  startDate: string;
  endDate: string;
  onClose: () => void;
}

const fmt = (v: number) =>
  `¥${v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ReportRow {
  key: string;
  label: string;
  hint?: string;
  a: number; // 期末 / 本期
  b: number; // 年初 / 累计
  bold?: boolean;
  indent?: boolean;
}

const makeColumns = (aTitle: string, bTitle: string, colorAmount: boolean) => [
  {
    title: '项目',
    dataIndex: 'label',
    key: 'label',
    render: (label: string, row: ReportRow) => (
      <Space size={4}>
        <Text strong={row.bold} style={{ paddingLeft: row.indent ? 16 : 0 }}>{label}</Text>
        {row.hint && (
          <Tooltip title={row.hint}>
            <QuestionCircleOutlined style={{ color: '#bbb', fontSize: 12 }} />
          </Tooltip>
        )}
      </Space>
    ),
  },
  {
    title: aTitle,
    dataIndex: 'a',
    key: 'a',
    align: 'right' as const,
    width: 160,
    render: (v: number, row: ReportRow) => (
      <Text strong={row.bold} type={colorAmount && v < 0 ? 'danger' : undefined}>{fmt(v)}</Text>
    ),
  },
  {
    title: bTitle,
    dataIndex: 'b',
    key: 'b',
    align: 'right' as const,
    width: 160,
    render: (v: number, row: ReportRow) => (
      <Text strong={row.bold} type={colorAmount && v < 0 ? 'danger' : undefined}>{fmt(v)}</Text>
    ),
  },
];

const TaxReportPreviewModal: React.FC<Props> = ({ open, startDate, endDate, onClose }) => {
  const { token } = useToken();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TaxReportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    getTaxReportPreview({ startDate, endDate })
      .then((res) => {
        if (res.code === 0) setData(res.data);
        else setError(res.message || '预览失败');
      })
      .catch((e) => setError(e instanceof Error ? e.message : '预览失败'))
      .finally(() => setLoading(false));
  }, [open, startDate, endDate]);

  const renderBody = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>;
    if (error) return <Alert type="error" message={error} showIcon />;
    if (!data) return null;

    const { common, cash_flow: cf, filing } = data;
    const snap = common.snapshot_end;
    const snap0 = common.snapshot_year_start;

    // ===== 资产负债表 =====
    const assetsEnd = snap.cash + snap.receivables + common.tax_prepaid;
    const assetsStart = snap0.cash + snap0.receivables + common.tax_prepaid_year_start;
    const liabEnd = snap.payables + snap.unpaid_salary + common.tax_payable;
    const liabStart = snap0.payables + snap0.unpaid_salary + common.tax_payable_year_start;
    const bsRows: ReportRow[] = [
      { key: 'cash', label: '货币资金', hint: '报告期末银行/现金账户的时点余额（由流水重算，期后收支不影响）', a: snap.cash, b: snap0.cash },
      { key: 'recv', label: '应收账款', hint: '期末尚未到账的收入（欠你的钱）', a: snap.receivables, b: snap0.receivables },
      { key: 'prepaid', label: '其他流动资产', hint: '多预缴的企业所得税（税务局欠你的，年度汇算可退/抵）', a: common.tax_prepaid, b: common.tax_prepaid_year_start },
      { key: 'assets', label: '资产合计', a: assetsEnd, b: assetsStart, bold: true },
      { key: 'pay', label: '应付账款', hint: '期末未付的支出 + 已确认未报销的员工垫付（欠别人的钱）', a: snap.payables, b: snap0.payables },
      { key: 'salary', label: '应付职工薪酬', hint: '期末尚未发放的工资（如 6 月工资 7 月才发，6/30 报表中即为应付）', a: snap.unpaid_salary, b: snap0.unpaid_salary },
      { key: 'tax', label: '应交税费', hint: '所得税估提中尚未缴纳的部分', a: common.tax_payable, b: common.tax_payable_year_start },
      { key: 'liab', label: '负债合计', a: liabEnd, b: liabStart, bold: true },
      { key: 'retained', label: '未分配利润（所有者权益）', hint: '= 资产 − 负债；与利润表本年累计净利润严格相等（勾稽）', a: assetsEnd - liabEnd, b: assetsStart - liabStart, bold: true },
      { key: 'total', label: '负债和所有者权益总计', a: assetsEnd, b: assetsStart, bold: true },
    ];

    // ===== 利润表 =====
    const p = common.pnl_period;
    const y = common.pnl_ytd;
    const plRows: ReportRow[] = [
      { key: 'rev', label: '一、营业收入', hint: '不含银行利息（利息在财务费用中以负数体现）', a: p.revenue, b: y.revenue, bold: true },
      { key: 'cost', label: '减：营业成本', a: p.cost, b: y.cost, indent: true },
      { key: 'taxadd', label: '税金及附加', hint: '实际缴纳的增值税/附加/印花等（不含企业所得税）', a: p.tax_add, b: y.tax_add, indent: true },
      { key: 'sales', label: '销售费用', a: p.sales, b: y.sales, indent: true },
      { key: 'admin', label: '管理费用', hint: '含按工资所属月计提的工资（权责发生制，与实际发放日无关）', a: p.admin, b: y.admin, indent: true },
      { key: 'fin', label: '财务费用', hint: '手续费等减去利息收入的净额，为负表示利息收益大于费用', a: p.finance, b: y.finance, indent: true },
      { key: 'op', label: '二、营业利润', a: p.operating_profit, b: y.operating_profit, bold: true },
      { key: 'nonop', label: '减：营业外支出', a: p.non_op, b: y.non_op, indent: true },
      { key: 'profit', label: '三、利润总额', a: p.profit_total, b: y.profit_total, bold: true },
      { key: 'tax', label: '减：所得税费用', hint: '小微企业实际税负 5% 估提（年应纳税所得额≤300万）', a: p.income_tax, b: y.income_tax, indent: true },
      { key: 'net', label: '四、净利润', a: p.net_profit, b: y.net_profit, bold: true },
    ];

    // ===== 现金流量表 =====
    const cfCol = (income: number, interest: number, exp: Record<string, number>, salary: number, salaryTax: number, opening: number) => {
      const cost = exp['营业成本'] || 0;
      const taxTotal = (exp['税金及附加'] || 0) + salaryTax;
      const other = (exp['销售费用'] || 0) + (exp['管理费用'] || 0) + (exp['财务费用'] || 0) + (exp['营业外支出'] || 0);
      const net = income + interest - cost - salary - taxTotal - other;
      return { income, interest, cost, salary, taxTotal, other, net, opening, closing: opening + net };
    };
    const cp = cfCol(cf.income_period, cf.interest_period, cf.expenses_period, cf.salary_period, cf.salary_tax_period, cf.opening_period);
    const cy = cfCol(cf.income_ytd, cf.interest_ytd, cf.expenses_ytd, cf.salary_ytd, cf.salary_tax_ytd, cf.opening_ytd);
    const cfRows: ReportRow[] = [
      { key: 'in', label: '销售商品、提供劳务收到的现金', a: cp.income, b: cy.income },
      { key: 'int', label: '收到其他与经营活动有关的现金', hint: '银行利息等', a: cp.interest, b: cy.interest },
      { key: 'cost', label: '购买商品、接受劳务支付的现金', a: cp.cost, b: cy.cost },
      { key: 'salary', label: '支付的职工薪酬', hint: '实际发放的工资（含差额补发），按实际付款期间统计', a: cp.salary, b: cy.salary },
      { key: 'tax', label: '支付的税费', a: cp.taxTotal, b: cy.taxTotal },
      { key: 'other', label: '支付其他与经营活动有关的现金', hint: '费用类支出及报销打款等', a: cp.other, b: cy.other },
      { key: 'net', label: '经营活动现金流量净额', a: cp.net, b: cy.net, bold: true },
      { key: 'open', label: '期初现金余额', hint: '各列期间起点前一日的账户时点余额', a: cp.opening, b: cy.opening },
      { key: 'close', label: '期末现金余额', hint: '与资产负债表"货币资金"一致（勾稽）', a: cp.closing, b: cy.closing, bold: true },
    ];

    // ===== 申报助手 =====
    const filingTab = (
      <div>
        <Alert
          type={filing.currentDue > 0 ? 'warning' : 'success'}
          showIcon
          icon={<CheckCircleOutlined />}
          message={
            filing.currentDue > 0
              ? `本期应补税款 ${fmt(filing.currentDue)}`
              : `本期应补（退）税费：¥0.00${filing.creditCarryover > 0 ? `，另有多缴 ${fmt(filing.creditCarryover)} 留抵（年度汇算清缴可退）` : ''}`
          }
          style={{ marginBottom: 16 }}
        />
        <Title level={5} style={{ marginTop: 0 }}>优惠及附报事项信息</Title>
        <Row gutter={16} style={{ marginBottom: 8 }}>
          <Col span={6}><Statistic title="季末资产总额（万元）" value={filing.assetsTotalWan} precision={2} valueStyle={{ fontSize: 18 }} /></Col>
          <Col span={6}><Statistic title="国家限制或禁止行业" value="否" valueStyle={{ fontSize: 18 }} /></Col>
          <Col span={12}>
            <Statistic
              title="附报事项"
              value={filing.isSmallMicro ? '小型微利企业减免（勾选 1 项）' : '不适用小微优惠'}
              valueStyle={{ fontSize: 18, color: filing.isSmallMicro ? token.colorSuccess : token.colorWarning }}
            />
          </Col>
        </Row>
        <Text type="secondary" style={{ fontSize: 12 }}>
          季末从业人数按实际填写；小型微利资格要求：应纳税所得额≤300万、从业人数≤300人、资产总额≤5000万。
        </Text>

        <Title level={5} style={{ marginTop: 20 }}>预缴税款信息（对应电子税务局"税费试算"页）</Title>
        <Table<ReportRow>
          size="small"
          pagination={false}
          columns={[
            { title: '申报表栏目', dataIndex: 'label', render: (v: string, r: ReportRow) => (
              <Space size={4}>
                <Text>{v}</Text>
                {r.hint && <Tooltip title={r.hint}><QuestionCircleOutlined style={{ color: '#bbb', fontSize: 12 }} /></Tooltip>}
              </Space>
            ) },
            { title: '填写值', dataIndex: 'a', align: 'right' as const, width: 180, render: (v: number) => <Text strong copyable={{ text: v.toFixed(2) }}>{fmt(v)}</Text> },
          ]}
          dataSource={[
            { key: '1', label: '利润总额本年累计金额', hint: '来自利润表"利润总额"本年累计列', a: filing.profitYtd, b: 0 },
            { key: '2', label: '所得减免本年累计金额', hint: '农林牧渔等免税项目才用，一般为 0', a: 0, b: 0 },
            { key: '3', label: '减免所得税额本年累计金额', hint: '小微优惠减免 = 应纳税所得额 ×（法定25% − 实际5%）', a: filing.reliefAmount, b: 0 },
            { key: '4', label: '不征税收入 / 加速折旧 / 免税收入 / 抵免税额', hint: '特殊调整项，无相关业务时均为 0', a: 0, b: 0 },
            { key: '5', label: '附报事项：已计入成本费用的职工薪酬', hint: '本年累计计提的应发工资总额（含期末已计提未发放的）', a: filing.salaryAccruedYtd, b: 0 },
            { key: '6', label: '附报事项：实际支付给职工的应付职工薪酬', hint: '本年累计实际发放数 = 累计计提 − 期末应付职工薪酬', a: filing.salaryPaidYtd, b: 0 },
          ]}
        />
        <div style={{ background: token.colorFillQuaternary, borderRadius: 6, padding: 12, marginTop: 16, fontFamily: 'monospace', fontSize: 13 }}>
          <div>应纳税所得额 {fmt(filing.taxableIncome)} × 25% = 法定税额 {fmt(filing.statutoryTax)}</div>
          <div>− 小微减免 {fmt(filing.reliefAmount)} = 累计应纳 {fmt(filing.accruedTax)}（实际税负 5%）</div>
          <div>− 已预缴 {fmt(filing.prepaidTax)} = 本期应补（退） <Text strong>{fmt(filing.currentDue)}</Text>
            {filing.creditCarryover > 0 && <Text type="success">（多缴 {fmt(filing.creditCarryover)} 留抵）</Text>}
          </div>
        </div>
      </div>
    );

    return (
      <Tabs
        defaultActiveKey="filing"
        items={[
          { key: 'filing', label: '📋 季度申报助手', children: filingTab },
          {
            key: 'bs', label: '资产负债表',
            children: <Table<ReportRow> size="small" pagination={false} columns={makeColumns('期末余额', '年初余额', false)} dataSource={bsRows} />,
          },
          {
            key: 'pl', label: '利润表',
            children: <Table<ReportRow> size="small" pagination={false} columns={makeColumns('本期金额', '本年累计', true)} dataSource={plRows} />,
          },
          {
            key: 'cf', label: '现金流量表',
            children: <Table<ReportRow> size="small" pagination={false} columns={makeColumns('本期金额', '本年累计', true)} dataSource={cfRows} />,
          },
        ]}
      />
    );
  };

  return (
    <Modal
      title={
        <Space>
          <span>报表预览</span>
          <Tag color="blue">{startDate} 至 {endDate}</Tag>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
            与生成的 XLS 报表完全同源，仅展示更友好
          </Text>
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnClose
    >
      {renderBody()}
    </Modal>
  );
};

export default TaxReportPreviewModal;
