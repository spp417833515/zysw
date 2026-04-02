import React, { useMemo } from 'react';
import { Card, Alert, Typography, Space, Tag, Divider } from 'antd';
import { ClockCircleOutlined, WarningOutlined, CalendarOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  calculateTaxDeadline,
  getCurrentDeclarationItems,
  isQuarterlyMonth,
} from '@/utils/taxConfig';

const { Text } = Typography;

const TaxDeadlineReminder: React.FC = () => {
  const today = dayjs();

  const { deadline, daysLeft, status, items, isQuarterly } = useMemo(() => {
    const year = today.year();
    const month = today.month(); // 0-11

    const currentDeadline = calculateTaxDeadline(year, month);
    const days = currentDeadline.diff(today, 'day');
    const declarationItems = getCurrentDeclarationItems(today);
    const quarterly = isQuarterlyMonth(today);

    let alertStatus: 'error' | 'warning' | 'info' | 'success' = 'info';
    if (days < 0) {
      alertStatus = 'success';
    } else if (days <= 3) {
      alertStatus = 'error';
    } else if (days <= 7) {
      alertStatus = 'warning';
    }

    return {
      deadline: currentDeadline,
      daysLeft: days,
      status: alertStatus,
      items: declarationItems,
      isQuarterly: quarterly,
    };
  }, [today]);

  // 已过本月征期
  if (daysLeft < 0) {
    const nextMonth = today.add(1, 'month');
    const nextDeadline = calculateTaxDeadline(nextMonth.year(), nextMonth.month());
    const nextIsQ = isQuarterlyMonth(nextMonth);

    return (
      <Card>
        <Alert
          type="success"
          icon={<ClockCircleOutlined />}
          message={
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Text strong>本月征期已结束</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>
                下月征期：{nextMonth.format('M月')}1日 ～ {nextDeadline.format('M月D日')}
                {nextIsQ && <Tag color="blue" style={{ marginLeft: 8 }}>含季度申报</Tag>}
              </Text>
            </Space>
          }
          showIcon
        />
        {nextIsQ && (
          <div style={{ marginTop: 8, paddingLeft: 38, fontSize: 12 }}>
            <Text type="secondary">
              下月需完成季度申报：增值税、企业所得税预缴等
            </Text>
          </div>
        )}
      </Card>
    );
  }

  // 按频率分组
  const monthlyItems = items.filter((i) => i.frequency === 'monthly');
  const quarterlyItems = items.filter((i) => i.frequency === 'quarterly');

  return (
    <Card>
      <Alert
        type={status}
        icon={status === 'error' ? <WarningOutlined /> : <ClockCircleOutlined />}
        message={
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Space align="center">
              <Text strong style={{ fontSize: 15 }}>
                距征期结束还有 {daysLeft} 天
              </Text>
              {daysLeft <= 3 && <Tag color="red">紧急</Tag>}
              {daysLeft > 3 && daysLeft <= 7 && <Tag color="orange">即将到期</Tag>}
              {isQuarterly && <Tag color="blue">季度申报月</Tag>}
            </Space>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <CalendarOutlined style={{ marginRight: 4 }} />
              征期：{today.format('M月')}1日 ～ {deadline.format('M月D日（dddd）')}
            </Text>
          </Space>
        }
        showIcon
        style={{ marginBottom: 0 }}
      />

      <div style={{ marginTop: 16, paddingLeft: 4 }}>
        {/* 月报事项 */}
        <div style={{ marginBottom: monthlyItems.length > 0 && quarterlyItems.length > 0 ? 12 : 0 }}>
          <Space align="center" style={{ marginBottom: 8 }}>
            <Tag color="green">月报</Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              申报所属期：{monthlyItems[0]?.periodLabel}
            </Text>
          </Space>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
            {monthlyItems.map((item, i) => (
              <li key={i} style={{ color: '#666', lineHeight: '24px' }}>{item.name}</li>
            ))}
          </ul>
        </div>

        {/* 季报事项 */}
        {quarterlyItems.length > 0 && (
          <>
            <Divider style={{ margin: '8px 0' }} />
            <div>
              <Space align="center" style={{ marginBottom: 8 }}>
                <Tag color="blue">季报</Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  申报所属期：{quarterlyItems[0]?.periodLabel}
                </Text>
              </Space>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13 }}>
                {quarterlyItems.map((item, i) => (
                  <li key={i} style={{ color: '#666', lineHeight: '24px' }}>{item.name}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        <Text type="secondary" style={{ fontSize: 11, fontStyle: 'italic', display: 'block', marginTop: 12 }}>
          征期遇法定节假日、周末自动顺延至下一工作日
        </Text>
      </div>
    </Card>
  );
};

export default TaxDeadlineReminder;
