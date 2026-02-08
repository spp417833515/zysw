import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import router from '@/router';
import { useThemeMode } from '@/theme/useThemeMode';
import 'dayjs/locale/zh-cn';

function App() {
  const { resolvedTheme } = useThemeMode();

  return (
    <ConfigProvider theme={resolvedTheme} locale={zhCN}>
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
