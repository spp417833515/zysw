import axios, { type AxiosRequestConfig } from 'axios';

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

instance.interceptors.request.use(
  (config) => {
    // 后期可添加 token
    return config;
  },
  (error) => Promise.reject(error),
);

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  },
);

// 后端业务错误返回 HTTP 200 + code!=0，调用方必须显式检查，
// 否则失败会被当作成功（全项目统一用这一个检查点）
export function ensureOk(res: { code: number; message?: string }, fallback: string): void {
  if (res.code !== 0) {
    throw new Error(res.message || fallback);
  }
}

// Typed wrapper: interceptor returns response.data directly, so R = T
const request = {
  get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.get(url, config) as Promise<T>;
  },
  post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.post(url, data, config) as Promise<T>;
  },
  put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return instance.put(url, data, config) as Promise<T>;
  },
  delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return instance.delete(url, config) as Promise<T>;
  },
};

export default request;
