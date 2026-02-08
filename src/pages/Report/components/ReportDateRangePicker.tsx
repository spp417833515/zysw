import React from 'react';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';

dayjs.extend(quarterOfYear);

const { RangePicker } = DatePicker;

interface ReportDateRangePickerProps {
  value?: [string, string];
  onChange?: (dates: [string, string]) => void;
}

const presets: { label: string; value: [Dayjs, Dayjs] }[] = [
  {
    label: '本月',
    value: [dayjs().startOf('month'), dayjs().endOf('month')],
  },
  {
    label: '上月',
    value: [
      dayjs().subtract(1, 'month').startOf('month'),
      dayjs().subtract(1, 'month').endOf('month'),
    ],
  },
  {
    label: '本季度',
    value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')],
  },
  {
    label: '上季度',
    value: [
      dayjs().subtract(1, 'quarter').startOf('quarter'),
      dayjs().subtract(1, 'quarter').endOf('quarter'),
    ],
  },
  {
    label: '本年',
    value: [dayjs().startOf('year'), dayjs().endOf('year')],
  },
  {
    label: '上年',
    value: [
      dayjs().subtract(1, 'year').startOf('year'),
      dayjs().subtract(1, 'year').endOf('year'),
    ],
  },
];

const ReportDateRangePicker: React.FC<ReportDateRangePickerProps> = ({
  value,
  onChange,
}) => {
  const handleChange = (
    dates: [Dayjs | null, Dayjs | null] | null,
  ) => {
    if (dates && dates[0] && dates[1]) {
      onChange?.([
        dates[0].format('YYYY-MM-DD'),
        dates[1].format('YYYY-MM-DD'),
      ]);
    }
  };

  const dayjsValue: [Dayjs, Dayjs] | undefined = value
    ? [dayjs(value[0]), dayjs(value[1])]
    : undefined;

  return (
    <RangePicker
      value={dayjsValue}
      onChange={handleChange}
      presets={presets}
      allowClear={false}
      style={{ width: 280 }}
    />
  );
};

export default ReportDateRangePicker;
