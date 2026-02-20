export interface RouteMeta {
  title: string;
  icon?: string;
  hideInMenu?: boolean;
}

export const routeMetas: Record<string, RouteMeta> = {
  '/': { title: '仪表盘', icon: 'DashboardOutlined' },
  '/transaction': { title: '收支流水', icon: 'TransactionOutlined' },
  '/transaction/add': { title: '记一笔', hideInMenu: true },
  '/transaction/create': { title: '新增交易', hideInMenu: true },
  '/transaction/:id': { title: '交易详情', hideInMenu: true },
  '/account': { title: '账户管理', icon: 'BankOutlined' },
  '/account/:id': { title: '账户详情', hideInMenu: true },
  '/category': { title: '分类管理', icon: 'AppstoreOutlined' },
  '/budget': { title: '预算管理', icon: 'FundOutlined' },
  '/recurring-expense': { title: '月固定开销', icon: 'ScheduleOutlined' },
  '/report': { title: '报表中心', icon: 'BarChartOutlined' },
  '/report/profit-loss': { title: '利润表', hideInMenu: true },
  '/report/cash-flow': { title: '现金流量表', hideInMenu: true },
  '/report/category': { title: '分类汇总', hideInMenu: true },
  '/report/trend': { title: '趋势分析', hideInMenu: true },
  '/tasks': { title: '待办任务', icon: 'BellOutlined' },
  '/invoice': { title: '发票管理', icon: 'FileTextOutlined' },
  '/invoice/create': { title: '新增发票', hideInMenu: true },
  '/reimbursement': { title: '报销管理', icon: 'WalletOutlined' },
  '/settings': { title: '系统设置', icon: 'SettingOutlined' },
};
