import { UserProfile } from '../types';
import { getAllUsers, updateUserProfile } from './userService';

const ONLINE_USERS_KEY = 'caseflow_online_users';
const HEARTBEAT_INTERVAL = 30000; // 30秒心跳

// 更新用戶在線狀態
export const updateOnlineStatus = async (uid: string, isOnline: boolean) => {
  const now = new Date().toISOString();
  
  // 構建更新對象，明確處理 lastSeen
  const updates: Partial<UserProfile> = {
    isOnline,
  };
  
  // 只有在離線時才設置 lastSeen
  if (!isOnline) {
    updates.lastSeen = now;
  }
  
  console.log(`🔄 更新在線狀態: ${uid} -> ${isOnline ? '在線' : '離線'}`);
  
  await updateUserProfile(uid, updates);

  // 更新在線用戶列表（僅用於 localStorage 模式的降級）
  const onlineUsers = getOnlineUsers();
  if (isOnline) {
    if (!onlineUsers.includes(uid)) {
      onlineUsers.push(uid);
    }
  } else {
    const index = onlineUsers.indexOf(uid);
    if (index > -1) {
      onlineUsers.splice(index, 1);
    }
  }
  localStorage.setItem(ONLINE_USERS_KEY, JSON.stringify(onlineUsers));
};

// 獲取在線用戶列表
export const getOnlineUsers = (): string[] => {
  return JSON.parse(localStorage.getItem(ONLINE_USERS_KEY) || '[]');
};

// 獲取在線用戶資料
export const getOnlineUserProfiles = async (): Promise<UserProfile[]> => {
  const allUsers = await getAllUsers();
  
  // 在 API 模式下，直接從後端獲取的用戶資料中過濾在線用戶
  // 後端已經返回了 isOnline 狀態
  const onlineUsers = allUsers.filter(user => {
    // 檢查用戶資料中標記為在線，且用戶是啟用狀態
    const isOnline = user.isOnline === true && user.isActive !== false;
    return isOnline;
  });
  
  console.log(`👥 獲取在線用戶: 總共 ${allUsers.length} 個用戶，${onlineUsers.length} 個在線`);
  if (onlineUsers.length > 0) {
    console.log(`  在線用戶:`, onlineUsers.map(u => u.displayName).join(', '));
  }
  
  return onlineUsers;
};

// 設置用戶在線（登入時調用）
export const setUserOnline = async (uid: string) => {
  await updateOnlineStatus(uid, true);
  
  // 清除舊的心跳（如果存在）
  const oldHeartbeat = localStorage.getItem(`heartbeat_${uid}`);
  if (oldHeartbeat) {
    try {
      const data = JSON.parse(oldHeartbeat);
      if (data.intervalId) {
        clearInterval(data.intervalId);
      }
    } catch (e) {
      // 忽略錯誤
    }
  }
  
  // 設置心跳，定期更新在線狀態
  const intervalId = window.setInterval(() => {
    updateOnlineStatus(uid, true).catch(console.error);
  }, HEARTBEAT_INTERVAL);

  // 保存心跳 ID，登出時清除
  localStorage.setItem(`heartbeat_${uid}`, JSON.stringify({ intervalId }));
  
  // 頁面卸載時設置離線
  const handleBeforeUnload = () => {
    updateOnlineStatus(uid, false).catch(console.error);
  };
  window.addEventListener('beforeunload', handleBeforeUnload);
};

// 設置用戶離線（登出時調用）
export const setUserOffline = async (uid: string) => {
  // 清除心跳
  const heartbeat = localStorage.getItem(`heartbeat_${uid}`);
  if (heartbeat) {
    try {
      const data = JSON.parse(heartbeat);
      if (data.intervalId) {
        clearInterval(data.intervalId);
      }
    } catch (e) {
      // 忽略錯誤
    }
    localStorage.removeItem(`heartbeat_${uid}`);
  }
  
  await updateOnlineStatus(uid, false);
};

// 檢查並清理過期的在線狀態（超過1分鐘沒有心跳視為離線）
export const cleanupOfflineUsers = async () => {
  const onlineUids = getOnlineUsers();
  const allUsers = await getAllUsers();
  
  for (const uid of onlineUids) {
    const user = allUsers.find(u => u.uid === uid);
    if (user && user.lastSeen) {
      const lastSeen = new Date(user.lastSeen).getTime();
      const now = Date.now();
      // 如果超過2分鐘沒有更新，視為離線
      if (now - lastSeen > 120000) {
        await updateOnlineStatus(uid, false);
      }
    }
  }
};

// 定期清理（每分鐘執行一次）
if (typeof window !== 'undefined') {
  setInterval(() => {
    cleanupOfflineUsers().catch(console.error);
  }, 60000);
}
