import React, { useCallback } from 'react';
import { Radio, Input, Button, Row, Col, Space } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTransactionStore } from '@/store/useTransactionStore';
import { TRANSACTION_TYPE_MAP } from '@/utils/constants';
import CategorySelect from '@/components/CategorySelect';
import AccountSelect from '@/components/AccountSelect';
import DateRangeFilter from '@/components/DateRangeFilter';

const TransactionFilter: React.FC = () => {
  const { filter, setFilter, resetFilter } = useTransactionStore();

  const handleTypeChange = useCallback(
    (e: any) => {
      setFilter({ type: e.target.value || undefined });
    },
    [setFilter],
  );

  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      setFilter({ categoryId: categoryId || undefined });
    },
    [setFilter],
  );

  const handleAccountChange = useCallback(
    (accountId: string) => {
      setFilter({ accountId: accountId || undefined });
    },
    [setFilter],
  );

  const handleDateRangeChange = useCallback(
    (dates: [string, string] | null) => {
      setFilter({ dateRange: dates || undefined });
    },
    [setFilter],
  );

  const handleKeywordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilter({ keyword: e.target.value });
    },
    [setFilter],
  );

  return (
    <div style={{ marginBottom: 16 }}>
      <Row gutter={[16, 16]} align="middle">
        <Col span={24}>
          <Space wrap size="middle">
            <Radio.Group value={filter.type} onChange={handleTypeChange}>
              <Radio.Button value={undefined}>全部</Radio.Button>
              {Object.entries(TRANSACTION_TYPE_MAP).map(([key, val]) => (
                <Radio.Button key={key} value={key}>
                  {val.label}
                </Radio.Button>
              ))}
            </Radio.Group>
          </Space>
        </Col>

        <Col xs={24} sm={12} md={6} lg={5}>
          <CategorySelect
            value={filter.categoryId}
            onChange={handleCategoryChange}
            placeholder="选择分类"
            style={{ width: '100%' }}
          />
        </Col>

        <Col xs={24} sm={12} md={6} lg={5}>
          <AccountSelect
            value={filter.accountId}
            onChange={handleAccountChange}
            placeholder="选择账户"
            style={{ width: '100%' }}
          />
        </Col>

        <Col xs={24} sm={12} md={6} lg={5}>
          <DateRangeFilter
            onChange={handleDateRangeChange}
          />
        </Col>

        <Col xs={24} sm={12} md={6} lg={5}>
          <Input
            placeholder="搜索描述/标签"
            prefix={<SearchOutlined />}
            value={filter.keyword}
            onChange={handleKeywordChange}
            allowClear
            style={{ width: '100%' }}
          />
        </Col>

        <Col xs={24} sm={12} md={6} lg={4}>
          <Button icon={<ReloadOutlined />} onClick={resetFilter}>
            重置筛选
          </Button>
        </Col>
      </Row>
    </div>
  );
};

export default TransactionFilter;
