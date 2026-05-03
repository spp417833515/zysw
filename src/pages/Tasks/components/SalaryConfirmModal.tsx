import React, { useState, useEffect } from 'react';
import { Modal, Form, Card, Switch, Space, message, Divider, Typography, InputNumber, Alert } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import AccountSelect from '@/components/AccountSelect';
import ImageUpload from '@/components/ImageUpload';
import { confirmSalary } from '@/api/employee';
import { formatAmount } from '@/utils/format';
import type { UnpaidSalaryItem } from '@/types/employee';

const { Text } = Typography;

interface SalaryConfirmModalProps {
  open: boolean;
  item: UnpaidSalaryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

const TRANSFER_FEE = 4.5;

const SalaryConfirmModal: React.FC<SalaryConfirmModalProps> = ({
  open,
  item,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [includeFee, setIncludeFee] = useState(false);

  // 手动填写的个税
  const [manualTax, setManualTax] = useState<number>(0);
  // 实际发放金额
  const [actualPaid, setActualPaid] = useState<number>(0);

  const baseSalary = item?.baseSalary ?? 0;
  const isSelfFiling = !!item?.selfTaxFiling;
  // 自缴模式：netSalary 始终 = base，tax 仅作 memo（员工自缴，不从工资扣除）
  // 代扣模式：netSalary = base - tax
  const netSalary = isSelfFiling ? baseSalary : baseSalary - manualTax;
  // 差额 = 应发(税后) - 实付
  const difference = netSalary - actualPaid;
  // 合计支出（实付 + 可选手续费）
  const total = includeFee ? actualPaid + TRANSFER_FEE : actualPaid;

  // 当 item 变化时，重置个税和实付
  useEffect(() => {
    if (item) {
      if (item.selfTaxFiling) {
        // 自缴税：默认税=0，全额发放
        setManualTax(0);
        setActualPaid(item.baseSalary);
      } else {
        // 代扣代缴：默认取系统预估值
        const estimatedTax = item.baseSalary - (item.netSalary ?? item.baseSalary);
        setManualTax(Math.max(0, Math.round(estimatedTax * 100) / 100));
        setActualPaid(item.netSalary ?? item.baseSalary);
      }
    }
  }, [item]);

  // 当个税变化时：
  // - 代扣模式：tax 影响应发税后，自动同步实付为 base - tax
  // - 自缴模式：tax 仅是 memo，不联动实付（用户照常发全额）
  const handleTaxChange = (val: number | null) => {
    const tax = val ?? 0;
    setManualTax(tax);
    if (!isSelfFiling) {
      setActualPaid(Math.round((baseSalary - tax) * 100) / 100);
    }
  };

  const handleOk = async () => {
    if (!item) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setLoading(true);
    try {
      const res = await confirmSalary({
        employeeId: item.employeeId,
        year: item.year,
        month: item.month,
        accountId: values.accountId || undefined,
        transferFee: includeFee ? TRANSFER_FEE : 0,
        manualTax: manualTax,
        actualPaid: actualPaid,
        voucher: values.voucher || [],
      });
      if (res.code === 0) {
        message.success('工资发放确认成功，支出流水已生成');
        form.resetFields();
        setIncludeFee(false);
        onClose();
        onSuccess();
      } else {
        message.error(res.message || '操作失败');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setIncludeFee(false);
    onClose();
  };

  return (
    <Modal
      title="确认工资发放"
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="确认发放"
      okButtonProps={{ danger: true }}
      confirmLoading={loading}
      destroyOnClose
      width={520}
    >
      {item && (
        <>
          <div style={{ marginBottom: 16, color: '#666' }}>
            {item.employeeName} - {item.year}年{item.month}月
          </div>

          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {isSelfFiling && (
              <Alert
                type="info"
                showIcon
                message="员工自行缴税"
                description="公司全额发放工资到员工。个税字段仅作记账提醒，确认后会生成「应缴个税」待支出条目（员工从私户缴纳）。"
              />
            )}

            {/* 基本工资（固定） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fafafa', borderRadius: 6 }}>
              <Text>基本工资</Text>
              <Text strong style={{ fontSize: 16 }}>¥{formatAmount(baseSalary)}</Text>
            </div>

            {/* 个税（可编辑） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#fff7e6', borderRadius: 6, border: '1px solid #ffd591' }}>
              <Text>{isSelfFiling ? '个人所得税（员工自缴）' : '个人所得税'}</Text>
              <InputNumber
                value={manualTax}
                onChange={handleTaxChange}
                min={0}
                step={0.01}
                precision={2}
                prefix="¥"
                style={{ width: 160 }}
              />
            </div>

            {/* 税后应发（自动计算） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f6ffed', borderRadius: 6, border: '1px solid #b7eb8f' }}>
              <Text>应发(税后)</Text>
              <Text strong style={{ fontSize: 16, color: '#52c41a' }}>¥{formatAmount(netSalary)}</Text>
            </div>

            {/* 实际发放（可编辑） */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#e6f7ff', borderRadius: 6, border: '1px solid #91d5ff' }}>
              <Text>实际发放</Text>
              <InputNumber
                value={actualPaid}
                onChange={(val) => setActualPaid(val ?? 0)}
                min={0}
                step={0.01}
                precision={2}
                prefix="¥"
                style={{ width: 160 }}
              />
            </div>

            {/* 差额显示 */}
            {difference !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: difference > 0 ? '#fff1f0' : '#fffbe6', borderRadius: 6, border: `1px solid ${difference > 0 ? '#ffa39e' : '#ffe58f'}` }}>
                <Text>差额</Text>
                <Text strong style={{ fontSize: 14, color: difference > 0 ? '#f5222d' : '#faad14' }}>
                  {difference > 0 ? `少发 ¥${formatAmount(difference)}（欠员工）` : `多发 ¥${formatAmount(Math.abs(difference))}（员工欠）`}
                </Text>
              </div>
            )}

            {/* 手续费卡片 */}
            <Card
              size="small"
              style={{
                borderColor: includeFee ? '#1890ff' : '#f0f0f0',
                background: includeFee ? '#e6f7ff' : '#fafafa',
                cursor: 'pointer',
              }}
              onClick={() => setIncludeFee(!includeFee)}
              hoverable
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  <SwapOutlined style={{ fontSize: 20, color: includeFee ? '#1890ff' : '#999' }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>转账手续费</div>
                    <Text type="secondary" style={{ fontSize: 12 }}>银行转账手续费（可选）</Text>
                  </div>
                </Space>
                <Space size="middle">
                  <Text style={{ fontSize: 20, fontWeight: 700, color: includeFee ? '#f5222d' : '#999' }}>
                    ¥{formatAmount(TRANSFER_FEE)}
                  </Text>
                  <Switch checked={includeFee} onChange={setIncludeFee} />
                </Space>
              </div>
            </Card>
          </Space>

          <Divider style={{ margin: '16px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text strong style={{ fontSize: 16 }}>合计支出</Text>
            <Text strong style={{ fontSize: 22, color: '#f5222d' }}>
              ¥{formatAmount(total)}
            </Text>
          </div>
        </>
      )}

      <Form form={form} layout="vertical">
        <Form.Item name="accountId" label="发放账户">
          <AccountSelect placeholder="请选择发放账户（可选）" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="voucher" label="转账凭证截图">
          <ImageUpload maxCount={3} accept="image/*,.pdf" label="上传凭证" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SalaryConfirmModal;
