import React, { useState } from 'react';
import { Modal, message, Alert, Form } from 'antd';
import { useTransactionStore } from '@/store/useTransactionStore';
import AccountSelect from '@/components/AccountSelect';

interface PaymentConfirmModalProps {
  open: boolean;
  transactionId: string;
  onClose: () => void;
}

const PaymentConfirmModal: React.FC<PaymentConfirmModalProps> = ({
  open,
  transactionId,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>();
  const confirmPayment = useTransactionStore((s) => s.confirmPayment);
  const txn = useTransactionStore((s) =>
    s.pendingPayments.find((t) => t.id === transactionId),
  );

  // 私户垫付确认后保持 personal（进入待报销池，不扣公司账户）；其余按公户确认
  const isPersonal = txn?.paymentAccountType === 'personal';
  const needsAccount = !isPersonal && !txn?.accountId;

  const handleOk = async () => {
    if (needsAccount && !accountId) {
      message.warning('该笔流水未绑定账户，请先选择收付账户');
      return;
    }
    setLoading(true);
    try {
      await confirmPayment(
        transactionId,
        isPersonal ? 'personal' : 'company',
        needsAccount ? accountId : undefined,
      );
      message.success('确认成功');
      setAccountId(undefined);
      onClose();
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="确认"
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="确认"
      cancelText="取消"
      confirmLoading={loading}
      destroyOnClose
    >
      <div style={{ padding: '16px 0' }}>
        {isPersonal
          ? '该笔为私户垫付，确认后进入待报销流程，不影响公司账户余额。是否继续？'
          : '确认后该笔将进入「收支流水」并影响账户余额。是否继续？'}
      </div>
      {needsAccount && (
        <Form layout="vertical">
          <Alert
            type="warning"
            showIcon
            message="该笔流水尚未绑定账户，确认时需要指定实际收付账户"
            style={{ marginBottom: 12 }}
          />
          <Form.Item label="收付账户" required>
            <AccountSelect
              value={accountId}
              onChange={(v: string) => setAccountId(v)}
              placeholder="请选择收付账户"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
};

export default PaymentConfirmModal;
