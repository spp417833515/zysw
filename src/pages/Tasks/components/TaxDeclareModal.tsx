import React, { useState, useMemo } from 'react';
import { Modal, DatePicker, Space, message, Typography, Tag, Alert } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';
import dayjs from 'dayjs';

const { Text } = Typography;

interface TaxDeclareModalProps {
  open: boolean;
  transactionId: string;
  transactionDate: string;
  onClose: () => void;
}

const TaxDeclareModal: React.FC<TaxDeclareModalProps> = ({
  open,
  transactionId,
  transactionDate,
  onClose,
}) => {
  // 智能推荐申报所属期：交易日期所在月
  const suggestedPeriod = useMemo(() => {
    const txDate = dayjs(transactionDate);
    return txDate.startOf('month');
  }, [transactionDate]);

  const [period, setPeriod] = useState<dayjs.Dayjs | null>(suggestedPeriod);
  const [loading, setLoading] = useState(false);
  const confirmTaxDeclare = useTransactionStore((s) => s.confirmTaxDeclare);

  // 计算该笔交易应该在什么时候申报
  const filingInfo = useMemo(() => {
    if (!period) return null;
    const txMonth = period.month() + 1; // 1-12
    const txYear = period.year();

    // 月报：下月1-14日申报
    const filingMonth = period.add(1, 'month');
    const monthlyLabel = `${filingMonth.year()}年${filingMonth.month() + 1}月1日 ～ 14日`;

    // 季报：看交易月是否为季度末月（3/6/9/12），如果是则需季报
    const isQuarterEnd = [3, 6, 9, 12].includes(txMonth);
    let quarterlyLabel = '';
    if (isQuarterEnd) {
      const quarterMonth = txMonth + 1 > 12 ? 1 : txMonth + 1;
      const quarterYear = txMonth + 1 > 12 ? txYear + 1 : txYear;
      quarterlyLabel = `${quarterYear}年${quarterMonth}月1日 ～ 14日（季报）`;
    }

    return { monthlyLabel, isQuarterEnd, quarterlyLabel };
  }, [period]);

  const handleOk = async () => {
    if (!period) {
      message.warning('请选择申报所属期');
      return;
    }
    setLoading(true);
    try {
      await confirmTaxDeclare(transactionId, period.format('YYYY-MM'));
      message.success('申报确认成功');
      onClose();
    } catch {
      message.error('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="确认税务申报"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认申报"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <Space direction="vertical" size="middle" style={{ width: '100%', padding: '16px 0' }}>
        <Alert
          type="info"
          showIcon
          message={
            <Space direction="vertical" size={2}>
              <Text>
                交易日期：<Tag>{dayjs(transactionDate).format('YYYY-MM-DD')}</Tag>
              </Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                该笔交易的个税应在 <Text strong>{filingInfo?.monthlyLabel}</Text> 完成月报
              </Text>
              {filingInfo?.isQuarterEnd && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  增值税/企业所得税应在 <Text strong>{filingInfo.quarterlyLabel}</Text> 完成季报
                </Text>
              )}
            </Space>
          }
        />

        <div>
          <Text style={{ display: 'block', marginBottom: 8 }}>申报所属期：</Text>
          <DatePicker
            picker="month"
            value={period}
            onChange={(val) => setPeriod(val)}
            placeholder="选择申报所属期"
            style={{ width: '100%' }}
          />
          <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
            通常选择交易发生月份作为所属期
          </Text>
        </div>
      </Space>
    </Modal>
  );
};

export default TaxDeclareModal;
