import React from 'react';
import { DatePicker } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

const { RangePicker } = DatePicker;

interface DateRangeFilterProps {
  value?: [Dayjs, Dayjs];
  onChange?: (dates: [string, string] | null) => void;
}

const presets: { label: string; value: [Dayjs, Dayjs] }[] = [
  { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
  { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { label: '本季度', value: [dayjs().startOf('quarter'), dayjs().endOf('quarter')] },
  { label: '本年', value: [dayjs().startOf('year'), dayjs().endOf('year')] },
  { label: '近7天', value: [dayjs().subtract(6, 'day'), dayjs()] },
  { label: '近30天', value: [dayjs().subtract(29, 'day'), dayjs()] },
];

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  return (
    <RangePicker
      value={value}
      presets={presets}
      onChange={(dates) => {
        if (dates && dates[0] && dates[1]) {
          onChange?.([dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]);
        } else {
          onChange?.(null);
        }
      }}
      style={{ width: 280 }}
    />
  );
};

export default DateRangeFilter;
