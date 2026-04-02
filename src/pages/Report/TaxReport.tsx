import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Select,
  DatePicker,
  Table,
  Space,
  Typography,
  App,
  Popconfirm,
  Row,
  Col,
  Divider,
  Tag,
  Alert,
} from 'antd';
import {
  FileExcelOutlined,
  DownloadOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import PageContainer from '@/components/PageContainer';
import {
  generateTaxReport,
  listTaxReports,
  deleteTaxReport,
  getTaxReportDownloadUrl,
  TaxReportFile,
} from '@/api/report';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const reportTypeOptions = [
  { label: '月/季报', value: 'monthly' },
  { label: '年报', value: 'yearly' },
];

// 快捷日期选择
const getQuarterRange = (year: number, quarter: number): [Dayjs, Dayjs] => {
  const startMonth = (quarter - 1) * 3;
  const start = dayjs(`${year}-${String(startMonth + 1).padStart(2, '0')}-01`);
  const end = start.add(2, 'month').endOf('month');
  return [start, end];
};

const getMonthRange = (year: number, month: number): [Dayjs, Dayjs] => {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const end = start.endOf('month');
  return [start, end];
};

const getYearRange = (year: number): [Dayjs, Dayjs] => {
  return [dayjs(`${year}-01-01`), dayjs(`${year}-12-31`)];
};

const TaxReport: React.FC = () => {
  const { message } = App.useApp();
  const [reportType, setReportType] = useState<string>('monthly');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [reports, setReports] = useState<TaxReportFile[]>([]);
  const [loading, setLoading] = useState(false);

  const currentYear = dayjs().year();
  const currentMonth = dayjs().month() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTaxReports();
      setReports(res.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleGenerate = async () => {
    if (!dateRange) {
      message.warning('请选择日期范围');
      return;
    }

    setGenerating(true);
    try {
      const res = await generateTaxReport({
        reportType,
        startDate: dateRange[0].format('YYYY-MM-DD'),
        endDate: dateRange[1].format('YYYY-MM-DD'),
      });
      if (res.code === 0) {
        message.success('报表生成成功');
        // 自动下载
        const url = getTaxReportDownloadUrl(res.data.filename);
        window.open(url, '_blank');
        fetchReports();
      } else {
        message.error(res.message || '生成失败');
      }
    } catch (e: any) {
      message.error('生成失败: ' + (e.message || '未知错误'));
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      await deleteTaxReport(filename);
      message.success('已删除');
      fetchReports();
    } catch {
      message.error('删除失败');
    }
  };

  const handleDownload = (filename: string) => {
    window.open(getTaxReportDownloadUrl(filename), '_blank');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string) => (
        <Space>
          <FileExcelOutlined style={{ color: '#217346', fontSize: 16 }} />
          <Text>{text}</Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (v: number) => formatSize(v),
    },
    {
      title: '生成时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: any, record: TaxReportFile) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record.filename)}
          >
            下载
          </Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.filename)}>
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer title="报税报表">
      <Card>
        <Alert
          message="根据系统记账数据自动生成小企业会计准则三表：资产负债表、利润表、现金流量表。生成后下载 XLS 文件，可直接用于报税。"
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />

        <Title level={5}>生成新报表</Title>
        <Row gutter={16} align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Space>
              <Text>报表类型：</Text>
              <Select
                value={reportType}
                onChange={setReportType}
                options={reportTypeOptions}
                style={{ width: 120 }}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Text>所属期间：</Text>
              <RangePicker
                value={dateRange}
                onChange={(v) => setDateRange(v as [Dayjs, Dayjs] | null)}
                style={{ width: 280 }}
              />
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={handleGenerate}
              loading={generating}
              disabled={!dateRange}
              style={{ background: '#217346' }}
            >
              生成报表
            </Button>
          </Col>
        </Row>

        {/* 快捷选择 */}
        <Space wrap style={{ marginBottom: 24 }}>
          <Text type="secondary">快速选择：</Text>
          {[1, 2, 3, 4].map((q) => (
            <Tag
              key={`q${q}`}
              color={q <= currentQuarter ? 'green' : 'default'}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                setReportType('monthly');
                setDateRange(getQuarterRange(currentYear, q));
              }}
            >
              {currentYear}年Q{q}
            </Tag>
          ))}
          <Tag
            color="blue"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setReportType('monthly');
              setDateRange(getMonthRange(currentYear, currentMonth > 1 ? currentMonth - 1 : 12));
            }}
          >
            上月
          </Tag>
          <Tag
            color="blue"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setReportType('monthly');
              setDateRange(getMonthRange(currentYear, currentMonth));
            }}
          >
            本月
          </Tag>
          <Tag
            color="orange"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setReportType('yearly');
              setDateRange(getYearRange(currentYear - 1));
            }}
          >
            {currentYear - 1}年年报
          </Tag>
          <Tag
            color="orange"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              setReportType('yearly');
              setDateRange(getYearRange(currentYear));
            }}
          >
            {currentYear}年年报
          </Tag>
        </Space>

        <Divider />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Title level={5} style={{ margin: 0 }}>
            已生成的报表
          </Title>
          <Button icon={<ReloadOutlined />} onClick={fetchReports} loading={loading}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={reports}
          rowKey="filename"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '暂无已生成的报表' }}
        />
      </Card>
    </PageContainer>
  );
};

export default TaxReport;
