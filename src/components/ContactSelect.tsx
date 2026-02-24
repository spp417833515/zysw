import React, { useEffect } from 'react';
import { Select } from 'antd';
import { useContactStore } from '@/store/useContactStore';
import type { ContactType } from '@/types/contact';

interface ContactSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  contactType?: ContactType;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

const ContactSelect: React.FC<ContactSelectProps> = ({
  value,
  onChange,
  placeholder = '请选择客户/供应商',
  contactType,
  style,
  allowClear = true,
}) => {
  const contacts = useContactStore((s) => s.contacts);
  const fetchContacts = useContactStore((s) => s.fetchContacts);

  useEffect(() => {
    if (contacts.length === 0) {
      fetchContacts();
    }
  }, [contacts.length, fetchContacts]);

  const filtered = contactType
    ? contacts.filter((c) => c.type === contactType || c.type === 'both')
    : contacts;

  const options = filtered.map((c) => ({
    label: c.name,
    value: c.id,
  }));

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      style={{ width: '100%', ...style }}
      allowClear={allowClear}
      showSearch
      optionFilterProp="label"
    />
  );
};

export default ContactSelect;
