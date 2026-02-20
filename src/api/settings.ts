import request from './request';

export interface CompanyInfo {
  id?: string;
  companyName: string;
  taxNumber: string;
  address?: string;
  phone?: string;
  bankName?: string;
  bankAccount?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaxSettings {
  id?: string;
  vatRate: number;
  vatThresholdQuarterly: number;
  additionalTaxRate: number;
  incomeTaxEnabled: boolean;
  province: string;
  city?: string;
  taxpayerType: string;
  createdAt?: string;
  updatedAt?: string;
}

// 获取企业信息
export const getCompanyInfo = () => {
  return request.get<CompanyInfo>('/settings/company');
};

// 保存企业信息
export const saveCompanyInfo = (data: CompanyInfo) => {
  return request.post<CompanyInfo>('/settings/company', data);
};

// 获取税率设置
export const getTaxSettings = () => {
  return request.get<TaxSettings>('/settings/tax');
};

// 保存税率设置
export const saveTaxSettings = (data: TaxSettings) => {
  return request.post<TaxSettings>('/settings/tax', data);
};
