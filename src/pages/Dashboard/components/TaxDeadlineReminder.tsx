import React, { useMemo } from 'react';
import { Card, Alert, Typography, Space, Tag } from 'antd';
import { ClockCircleOutlined, WarningOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { calculateTaxDeadline, getCurrentTaxReminders } from '@/utils/taxConfig';

const { Text } = Typography;

const TaxDeadlineReminder: React.FC = () => {
  const today = dayjs();

  const { deadline, daysLeft, status, nextPeriodStart, reminders } = useMemo(() => {
    const year = today.year();
    const month = today.month(); // 0-11

    // 计算本月征期截止日期（考虑节假日顺延）
    const currentDeadline = calculateTaxDeadline(year, month);
    const days = currentDeadline.diff(today, 'day');

    // 下个月征期开始日期
    const nextMonth = today.add(1, 'month');
    const nextStart = dayjs(new Date(nextMonth.year(), nextMonth.month(), 1));

    // 获取当前应申报事项
    const currentReminders = getCurrentTaxReminders(today);

    let alertStatus: 'error' | 'warning' | 'info' | 'success' = 'info';

    if (days < 0) {
      // 已过期，显示下个月征期
      alertStatus = 'success';
    } else if (days <= 3) {
      alertStatus = 'error';
    } else if (days <= 7) {
      alertStatus = 'warning';
    } else {
      alertStatus = 'info';
    }

    return {
      deadline: currentDeadline,
      daysLeft: days,
      status: alertStatus,
      nextPeriodStart: nextStart,
      reminders: currentReminders,
    };
  }, [today]);

  // 如果已过本月征期，显示下月征期信息
  if (daysLeft < 0) {
    return (
      <Card>
        <Alert
          type="success"
          icon={<ClockCircleOutlined />}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>本月征期已结束</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                下月征期：{nextPeriodStart.format('YYYY年MM月DD日')} 开始
              </Text>
            </Space>
          }
          showIcon
        />
      </Card>
    );
  }

  return (
    <Card>
      <Alert
        type={status}
        icon={status === 'error' ? <WarningOutlined /> : <ClockCircleOutlined />}
        message={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space align="center">
              <Text strong style={{ fontSize: 15 }}>
                距本月征期结束还有 {daysLeft} 天
              </Text>
              {daysLeft <= 3 && <Tag color="red">紧急</Tag>}
              {daysLeft > 3 && daysLeft <= 7 && <Tag color="orange">即将到期</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              截止日期：{deadline.format('YYYY年MM月DD日（dddd）')}
            </Text>
            {daysLeft <= 7 && (
              <Text type="warning" style={{ fontSize: 12 }}>
                ⚠️ 请及时完成税务申报，避免逾期罚款
              </Text>
            )}
          </Space>
        }
        showIcon
        style={{ marginBottom: 0 }}
      />

      {/* 提醒事项 */}
      <div style={{ marginTop: 12, paddingLeft: 38 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <strong>本期申报事项：</strong>
        </Text>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12 }}>
          <Typography.Text type="secondary">
          {reminders.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
          </Typography.Text>
        </ul>
        <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic', display: 'block', marginTop: 8 }}>
          💡 提示：征期遇节假日会自动顺延至下一工作日
        </Text>
      </div>
    </Card>
  );
};

export default TaxDeadlineReminder;
