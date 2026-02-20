import { theme } from 'antd';

/**
 * 使用主题token的hook
 * 确保所有颜色都使用主题系统，支持暗色模式
 */
export const useThemeToken = () => {
  const { token } = theme.useToken();

  return {
    // Ant Design token
    token,

    // 业务语义色（使用token确保暗色模式兼容）
    colors: {
      income: token.colorSuccess,
      expense: token.colorError,
      transfer: token.colorPrimary,
      warning: token.colorWarning,
      info: token.colorInfo,
      primary: token.colorPrimary,
    },
  };
};
