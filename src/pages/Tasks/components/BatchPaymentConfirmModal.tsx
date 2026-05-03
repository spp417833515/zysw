import React, { useState, useMemo } from 'react';
import { Modal, Radio, Space, Table, Typography, message, Tag, Alert } from 'antd';
import type { PaymentAccountType, Transaction } from '@/types/transaction';
import { useTransactionStore } from '@/store/useTransactionStore';
import { TRANSACTION_TYPE_MAP } from '@/utils/constants';
import { formatAmount, formatDate } from '@/utils/format';
import AmountText from '@/components/AmountText';
import AccountSelect from '@/components/AccountSelect';

const { Text } = Typography;

interface BatchPaymentConfirmModalProps {
  open: boolean;
  items: Transaction[];
  /** 'income' = 待到账 / 'expense' = 待支出 — 仅用于文案 */
  flow: 'income' | 'expense';
  onClose: () => void;
  onSuccess?: () => void;
}

const BatchPaymentConfirmModal: React.FC<BatchPaymentConfirmModalProps> = ({
  open, items, flow, onClose, onSuccess,
}) => {
  const [accountType, setAccountType] = useState<PaymentAccountType>('company');
  const [accountId, setAccountId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const batchConfirmPayment = useTransactionStore((s) => s.batchConfirmPayment);

  const total = items.reduce((s, i) => s + (i.amount || 0), 0);
  const isIncome = flow === 'income';
  const verb = isIncome ? '到账' : '付款';
  // 是否有交易尚未绑定账户（如工资差额自动生成的待处理流水）
  const hasUnboundAccount = useMemo(
    () => items.some((i) => !i.accountId),
    [items],
  );
  const accountRequired = hasUnboundAccount && accountType === 'company';

  const handleOk = async () => {
    if (items.length === 0) return;
    if (accountRequired && !accountId) {
      message.warning('该批次包含未绑定账户的流水（如工资差额），请选择账户');
      return;
    }
    setLoading(true);
    try {
      const res = await batchConfirmPayment(
        items.map((i) => i.id),
        accountType,
        accountId,
      );
      const skipped = res.skipped?.length ?? 0;
      message.success(
        skipped > 0
          ? `合并${verb}完成：成功 ${res.success} 笔，跳过 ${skipped} 笔`
          : `合并${verb}完成：${res.success} 笔已确认`,
      );
      onClose();
      onSuccess?.();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '日期', dataIndex: 'date', key: 'date', width: 110, render: (v: string) => formatDate(v) },
    {
      title: '类型', dataIndex: 'type', key: 'type', width: 70,
      render: (v: string) => {
        const info = TRANSACTION_TYPE_MAP[v as keyof typeof TRANSACTION_TYPE_MAP];
        return <Tag color={info?.color}>{info?.label || v}</Tag>;
      },
    },
    {
      title: '金额', dataIndex: 'amount', key: 'amount', width: 110,
      render: (v: number, r: Transaction) => <AmountText value={v} type={r.type} />,
    },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
  ];

  return (
    <Modal
      title={`合并${verb} (${items.length} 笔)`}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText={`确认${verb}`}
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
      width={680}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          pagination={false}
          size="small"
          scroll={{ y: 280 }}
        />

        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 16px', background: '#fafafa', borderRadius: 6,
        }}>
          <Text strong style={{ fontSize: 16 }}>合计金额</Text>
          <Text strong style={{ fontSize: 22, color: isIncome ? '#52c41a' : '#f5222d' }}>
            ¥{formatAmount(total)}
          </Text>
        </div>

        {hasUnboundAccount && (
          <Alert
            type="info"
            showIcon
            message="本批次包含工资差额等未绑定账户的流水"
            description="确认时请选择实际收/付账户，系统会扣减/增加该账户余额。"
          />
        )}

        <div>
          <div style={{ marginBottom: 8 }}>{`${verb}账户类型：`}</div>
          <Radio.Group value={accountType} onChange={(e) => setAccountType(e.target.value)}>
            <Space direction="vertical">
              <Radio value="company">公户（对公账户）</Radio>
              <Radio value="personal">私户（个人账户）</Radio>
            </Space>
          </Radio.Group>
        </div>

        {accountType === 'company' && (
          <div>
            <div style={{ marginBottom: 8 }}>
              {accountRequired ? <Text type="danger">* </Text> : null}
              选择具体账户{accountRequired ? '（必选）' : '（可选）'}：
            </div>
            <AccountSelect value={accountId} onChange={setAccountId} placeholder="请选择账户" />
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default BatchPaymentConfirmModal;
