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

// 檢查是否使用 API 模式（只打印一次）
let apiModeLogged = false;
export const useApiMode = (): boolean => {
  const apiUrl = getApiUrl();
  if (!apiModeLogged) {
    if (apiUrl) {
      console.log('🌐 API 模式已啟用，後端 URL:', apiUrl);
    } else {
      console.log('💾 localStorage 模式（未設置 VITE_API_URL）');
    }
    apiModeLogged = true;
  }
  return apiUrl !== null;
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
  
  console.log(`🌐 API 請求: ${options.method || 'GET'} ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    console.log(`📡 API 響應狀態: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || response.statusText };
      }
      console.error(`❌ API 請求失敗:`, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API 請求成功，返回資料類型:`, Array.isArray(data) ? `陣列 (${data.length} 項)` : typeof data);
    return data;
  } catch (error) {
    console.error(`❌ API 請求異常:`, error);
    throw error;
  }
};
