import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Spin } from 'antd';
import AppLayout from '@/components/Layout/AppLayout';

const lazyLoad = (factory: () => Promise<{ default: React.ComponentType }>) => (
  <Suspense fallback={<Spin style={{ display: 'block', margin: '200px auto' }} />}>
    {(() => {
      const Comp = lazy(factory);
      return <Comp />;
    })()}
  </Suspense>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: lazyLoad(() => import('@/pages/Dashboard')) },
      { path: 'transaction', element: lazyLoad(() => import('@/pages/Transaction')) },
      { path: 'transaction/add', element: lazyLoad(() => import('@/pages/Transaction/IncomeRecord')) },
      { path: 'transaction/create', element: lazyLoad(() => import('@/pages/Transaction/TransactionCreate')) },
      { path: 'transaction/:id', element: lazyLoad(() => import('@/pages/Transaction/TransactionDetail')) },
      { path: 'account', element: lazyLoad(() => import('@/pages/Account')) },
      { path: 'account/:id', element: lazyLoad(() => import('@/pages/Account/AccountDetail')) },
      { path: 'category', element: lazyLoad(() => import('@/pages/Category')) },
      { path: 'budget', element: lazyLoad(() => import('@/pages/Budget')) },
      { path: 'recurring-expense', element: lazyLoad(() => import('@/pages/RecurringExpense')) },
      { path: 'report', element: lazyLoad(() => import('@/pages/Report')) },
      { path: 'report/profit-loss', element: lazyLoad(() => import('@/pages/Report/ProfitLossReport')) },
      { path: 'report/cash-flow', element: lazyLoad(() => import('@/pages/Report/CashFlowReport')) },
      { path: 'report/category', element: lazyLoad(() => import('@/pages/Report/CategoryReport')) },
      { path: 'report/trend', element: lazyLoad(() => import('@/pages/Report/TrendReport')) },
      { path: 'tasks', element: lazyLoad(() => import('@/pages/Tasks')) },
      { path: 'invoice', element: lazyLoad(() => import('@/pages/Invoice')) },
      { path: 'invoice/create', element: lazyLoad(() => import('@/pages/Invoice/InvoiceCreate')) },
      { path: 'settings', element: lazyLoad(() => import('@/pages/Settings')) },
      { path: '*', element: lazyLoad(() => import('@/pages/NotFound')) },
    ],
  },
]);

export default router;
