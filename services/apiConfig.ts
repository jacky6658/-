/**
 * API 配置
 * 從環境變數獲取後端 API URL，如果沒有設置則使用 localStorage
 */

// 獲取 API URL（從環境變數或使用默認值）
export const getApiUrl = (): string | null => {
  // 優先使用環境變數
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (apiUrl) {
    return apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  }
  
  // 如果沒有設置，返回 null（使用 localStorage）
  return null;
};

// 檢查是否使用 API 模式
export const useApiMode = (): boolean => {
  return getApiUrl() !== null;
};

// API 請求封裝
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {}
): Promise<any> => {
  const apiUrl = getApiUrl();
  if (!apiUrl) {
    throw new Error('API URL 未設置，請設置 VITE_API_URL 環境變數');
  }

  const url = `${apiUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
};
