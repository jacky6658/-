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
  } else {
    // 在線時清除 lastSeen（設為 null）
    updates.lastSeen = undefined; // 這會讓後端設置為 null
  }
  
  console.log(`🔄 更新在線狀態: ${uid} -> ${isOnline ? '在線' : '離線'}`);
  
  try {
    await updateUserProfile(uid, updates);
    console.log(`✅ 在線狀態更新成功: ${uid} = ${isOnline}`);
  } catch (error) {
    console.error(`❌ 在線狀態更新失敗: ${uid}`, error);
    throw error;
  }

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
  if (allUsers.length > 0) {
    console.log(`  所有用戶詳情:`, allUsers.map(u => ({
      name: u.displayName,
      uid: u.uid,
      isOnline: u.isOnline,
      hasAvatar: !!u.avatar,
      avatarLength: u.avatar ? u.avatar.length : 0,
      status: u.status || '無狀態'
    })));
  }
  if (onlineUsers.length > 0) {
    console.log(`  在線用戶:`, onlineUsers.map(u => `${u.displayName} (${u.avatar ? '有頭貼' : '無頭貼'})`).join(', '));
  } else {
    console.warn(`⚠️ 沒有在線用戶！所有用戶的在線狀態:`, allUsers.map(u => `${u.displayName}: ${u.isOnline ? '在線' : '離線'}`).join(', '));
  }
  
  return onlineUsers;
};

// 設置用戶在線（登入時調用）
export const setUserOnline = async (uid: string) => {
  console.log(`🟢 設置用戶在線: ${uid}`);
  
  // 立即更新在線狀態
  await updateOnlineStatus(uid, true);
  console.log(`✅ 在線狀態已更新到後端: ${uid}`);
  
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
  
  // 設置心跳，定期更新在線狀態（每 30 秒）
  const intervalId = window.setInterval(() => {
    console.log(`💓 心跳更新: ${uid}`);
    updateOnlineStatus(uid, true).catch(console.error);
  }, HEARTBEAT_INTERVAL);
  
  // 保存心跳 ID，登出時清除
  localStorage.setItem(`heartbeat_${uid}`, JSON.stringify({ intervalId }));
  
  // 頁面卸載時設置離線
  const handleBeforeUnload = () => {
    console.log(`🔴 頁面卸載，設置離線: ${uid}`);
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
