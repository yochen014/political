export interface PartySupport {
  BLUE: number;
  GREEN: number;
  WHITE: number;
}

export interface RegionData {
  id: string; // 英文代號
  name: string; // 縣市名稱
  votes: number; // 預估總投票人數 (約略值)
  baseSupport: PartySupport; // 基本盤 (百分比，相加為 100%)
}

// 根據台灣政治板塊與 2024 選舉人數約略值進行的遊戲化設定
export const TAIWAN_REGIONS: RegionData[] = [
  // -------- 北部 --------
  { id: 'KEE', name: '基隆市', votes: 310000, baseSupport: { BLUE: 45, GREEN: 35, WHITE: 20 } },
  { id: 'TPE', name: '台北市', votes: 2020000, baseSupport: { BLUE: 40, GREEN: 35, WHITE: 25 } },
  { id: 'NWT', name: '新北市', votes: 3400000, baseSupport: { BLUE: 38, GREEN: 40, WHITE: 22 } }, // 全台最大票倉，指標搖擺州
  { id: 'TYN', name: '桃園市', votes: 1880000, baseSupport: { BLUE: 42, GREEN: 33, WHITE: 25 } },
  { id: 'HSZ', name: '新竹市', votes: 350000,  baseSupport: { BLUE: 30, GREEN: 30, WHITE: 40 } }, // 科技城，第三勢力極高
  { id: 'HSQ', name: '新竹縣', votes: 460000,  baseSupport: { BLUE: 45, GREEN: 30, WHITE: 25 } },
  
  // -------- 中部 --------
  { id: 'MIA', name: '苗栗縣', votes: 430000,  baseSupport: { BLUE: 55, GREEN: 25, WHITE: 20 } }, // 傳統深藍
  { id: 'TXG', name: '台中市', votes: 2320000, baseSupport: { BLUE: 38, GREEN: 38, WHITE: 24 } }, // 決戰中台灣
  { id: 'CWH', name: '彰化縣', votes: 1020000, baseSupport: { BLUE: 40, GREEN: 42, WHITE: 18 } },
  { id: 'NTC', name: '南投縣', votes: 400000,  baseSupport: { BLUE: 48, GREEN: 32, WHITE: 20 } },
  { id: 'YUN', name: '雲林縣', votes: 550000,  baseSupport: { BLUE: 32, GREEN: 50, WHITE: 18 } },
  
  // -------- 南部 --------
  { id: 'CYQ', name: '嘉義縣', votes: 420000,  baseSupport: { BLUE: 25, GREEN: 60, WHITE: 15 } }, // 深綠
  { id: 'CYI', name: '嘉義市', votes: 210000,  baseSupport: { BLUE: 40, GREEN: 45, WHITE: 15 } },
  { id: 'TNN', name: '台南市', votes: 1560000, baseSupport: { BLUE: 25, GREEN: 60, WHITE: 15 } }, // 鐵綠票倉
  { id: 'KHH', name: '高雄市', votes: 2310000, baseSupport: { BLUE: 30, GREEN: 55, WHITE: 15 } },
  { id: 'PIF', name: '屏東縣', votes: 670000,  baseSupport: { BLUE: 35, GREEN: 55, WHITE: 10 } },
  
  // -------- 東部與外島 --------
  { id: 'ILN', name: '宜蘭縣', votes: 370000,  baseSupport: { BLUE: 35, GREEN: 45, WHITE: 20 } },
  { id: 'HWA', name: '花蓮縣', votes: 260000,  baseSupport: { BLUE: 60, GREEN: 20, WHITE: 20 } }, // 鐵藍票倉
  { id: 'TTT', name: '台東縣', votes: 170000,  baseSupport: { BLUE: 55, GREEN: 25, WHITE: 20 } },
  { id: 'PEH', name: '澎湖縣', votes: 90000,   baseSupport: { BLUE: 40, GREEN: 40, WHITE: 20 } },
  { id: 'KMN', name: '金門縣', votes: 120000,  baseSupport: { BLUE: 65, GREEN: 10, WHITE: 25 } },
  { id: 'LNN', name: '連江縣', votes: 11000,   baseSupport: { BLUE: 70, GREEN: 10, WHITE: 20 } },
];
