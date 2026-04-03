import { useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import twGeoData from './assets/twCounty.json';
import { TAIWAN_REGIONS, RegionData, PartySupport } from './data/regions';

const PARTIES = [
    { id: 'BLUE', name: '藍營', color: '#000095', hex: 'bg-blueTeam', highlight: 'text-blue-400', description: '擁有強大地方根基與組織動員力的傳統大黨', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kuomintang_Emblem.svg' },
    { id: 'GREEN', name: '綠營', color: '#1b9431', hex: 'bg-greenTeam', highlight: 'text-green-400', description: '主張本土意識，具有強大社群聲量與執政資源', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/The_Democratic_Progressive_Party_Logo.svg' },
    { id: 'WHITE', name: '白營', color: '#28cdcc', hex: 'bg-whiteTeam', highlight: 'text-teal-400', description: '主打超越藍綠的新興勢力，深受年輕與中間選民支持', logoUrl: 'https://commons.wikimedia.org/wiki/Special:FilePath/Taiwan_People%27s_Party_logo.svg' }
];

export interface NewsEvent {
    turn: number;
    partyId: string;
    message: string;
    isHeadline?: boolean;
    isFlip?: boolean;
    electionData?: {
        regionName: string;
        stats: Record<string, { votes: number; percentage: number }>;
    };
}

export interface HQ {
    partyId: string;
    regionId: string;
}

export const VP_CANDIDATES = [
    // 藍營副手
    { id: 'BLUE_FINANCE', partyId: 'BLUE', name: '五星企業大老', icon: '💰', desc: '出身頂尖財團，擁有雄厚的政商關係與競選資源。', buff: '【金援】每週自動獲得額外 $1,500,000 資金。' },
    { id: 'BLUE_VETERAN', partyId: 'BLUE', name: '鐵桿軍方代表', icon: '🎖️', desc: '在軍公教群體中享有極高聲望，能穩定基本盤。', buff: '【固本】全台藍營基本盤區域民調每週自動 +0.3%。' },
    { id: 'BLUE_LOCAL', partyId: 'BLUE', name: '地方明星縣長', icon: '🏗️', desc: '擁有豐富的基層行政經驗，擅長地方組織動員。', buff: '【組織】「成立總部」的費用減半 ($1.5M)。' },
    
    // 綠營副手
    { id: 'GREEN_TECH', partyId: 'GREEN', name: '矽谷半導體專家', icon: '🔬', desc: '享譽國際的科技領袖，象徵進步與數位轉型。', buff: '【科技】北北桃、新竹等科技重鎮民調每週自動 +0.6%。' },
    { id: 'GREEN_LAWYER', partyId: 'GREEN', name: '人權金牌律師', icon: '⚖️', desc: '辯才無礙，曾參與多項重大社會運動，深受都市選民認同。', buff: '【辯才】「電視辯論會」勝率大幅提升。' },
    { id: 'GREEN_MEDIA', partyId: 'GREEN', name: '資深政府發言人', icon: '🎙️', desc: '擅長輿論防禦與媒體操作，能有效轉化負面攻擊。', buff: '【空戰】「廣告投放」的效果增加 50%。' },

    // 白營副手
    { id: 'WHITE_INFLUENCER', partyId: 'WHITE', name: '百萬級意見領袖', icon: '🤳', desc: '網路流量女王，掌握年輕人的網路社群脈動。', buff: '【流量】「舉辦造勢」在都會區的效果翻倍。' },
    { id: 'WHITE_DOCTOR', partyId: 'WHITE', name: '醫界權威院長', icon: '🏥', desc: '著名的外科醫生，形象正直專業，深獲中間選民信任。', buff: '【專業】每回自動吸引 0.4% 搖擺選民表態支持。' },
    { id: 'WHITE_SCHOLAR', partyId: 'WHITE', name: '跨國戰略學者', icon: '🎓', desc: '曾任教於頂尖名校，擅長長遠規劃與國際局勢分析。', buff: '【願景】所有縣市的「募款」收入額外 +20%。' }
];

export const ALL_EVENTS = [
    {
        id: 'TYPHOON',
        title: '🌀 強颱侵台',
        desc: '強烈颱風重創全台，考驗應變能力。',
        options: [
            { text: '立刻暫停選舉行程，投入救災', effect: '【加分】全國民調上升 1.5%', type: 'GOOD_ALL' },
            { text: '批評對手防災不力', effect: '【扣分】被批口水戰，全國民調下降 2%', type: 'BAD_ALL' },
            { text: '照常舉行造勢', effect: '【大扣分】引發民怨，全國民調下降 4%', type: 'WORST_ALL' }
        ]
    },
    {
        id: 'SCANDAL_RUMOR',
        title: '🕵️ 網軍爆料疑雲',
        desc: '有匿名粉專指控您的幹部涉嫌貪汙，該如何應對？',
        options: [
            { text: '大動作火速切割、開除黨籍', effect: '【止血】未受影響', type: 'NEUTRAL' },
            { text: '冷處理，等風頭過去', effect: '【扣分】全國民調微幅下降 1%', type: 'BAD_ALL' },
            { text: '反告網軍，堅稱是抹黑', effect: '【賭博】50%成功加分1%，50%翻車扣分3%', type: 'GAMBLE' }
        ]
    },
    {
        id: 'FOOD_SAFETY',
        title: '🤢 食安危機連環爆',
        desc: '知名連鎖食品商被查出使用黑心原料，社會譁然。',
        options: [
            { text: '提出嚴格的食安政策白皮書', effect: '【加分】全國民調上升 1.5%', type: 'GOOD_ALL' },
            { text: '趁機攻擊是對手的錯', effect: '【賭博】50%加分，50%引發反感', type: 'GAMBLE' },
            { text: '沉默以對', effect: '【扣分】選民認為不關心，扣分 1.5%', type: 'BAD_ALL' }
        ]
    },
    {
        id: 'CROSS_STRAIT',
        title: '🛩️ 對岸無預警軍演',
        desc: '對岸突然宣布在台海周邊進行實彈軍演，引發國安危機。',
        options: [
            { text: '發表聲明強烈譴責', effect: '【加分】展現態度，全台加分 1.5%', type: 'GOOD_ALL' },
            { text: '呼籲政府冷靜、重啟對話', effect: '【賭博】風險極高，可能大好大壞', type: 'GAMBLE' },
            { text: '照常在民間跑攤發紅包', effect: '【大扣分】被批狀況外，重挫 3%', type: 'WORST_ALL' }
        ]
    },
    {
        id: 'POWER_OUTAGE',
        title: '🔌 全台大停電',
        desc: '南部電廠超載跳機，引發全台無預警大停電！',
        options: [
            { text: '發放物資點蠟燭做公關', effect: '【加分】危機處理得宜，加分 1.5%', type: 'GOOD_ALL' },
            { text: '痛批現行能源政策失敗', effect: '【加分】順應民怨，加分 1%', type: 'GOOD_ALL' },
            { text: '幫發電廠講話', effect: '【大扣分】引起民怨火燒身，扣分 4%', type: 'WORST_ALL' }
        ]
    },
    {
        id: 'DIPLOMATIC',
        title: '🤝 邦交國斷交',
        desc: '某長期友邦突然宣布與我國斷交，引發外交震撼彈。',
        options: [
            { text: '呼籲國人團結', effect: '【加分】加分 1%', type: 'GOOD_ALL' },
            { text: '痛批外界打壓', effect: '【賭博】50/50 賭博', type: 'GAMBLE' },
            { text: '說這是不重要的國家', effect: '【大扣分】失言重挫 3%', type: 'WORST_ALL' }
        ]
    },
    {
        id: 'VIRAL',
        title: '📱 政策短影音爆紅',
        desc: '您的競選團隊拍的一隻迷因短影音在 TikTok/IG 上意外爆紅！',
        options: [
            { text: '趁勝追擊，自己親自下海跳舞', effect: '【加分】親民形象加分 1.5%', type: 'GOOD_ALL' },
            { text: '斥資買網紅繼續推廣', effect: '【賭博】可能有反效果', type: 'GAMBLE' },
            { text: '不予理會，回歸傳統造勢', effect: '【中立】錯失良機，無變化', type: 'NEUTRAL' }
        ]
    },
    {
        id: 'PROTEST',
        title: '🏠 居住正義萬人大遊行',
        desc: '年輕人因為高房價上街頭抗議！人潮擠滿了凱道。',
        options: [
            { text: '親自到場簽署承諾書', effect: '【加分】回應年輕人期待，加分 1.5%', type: 'GOOD_ALL' },
            { text: '在家發篇長文支持', effect: '【扣分】被批沒誠意，扣分 1%', type: 'BAD_ALL' },
            { text: '對外宣稱年輕人自己不夠努力', effect: '【大扣分】地獄級炎上，扣分 4%', type: 'WORST_ALL' }
        ]
    }
];

const MAX_TURNS = 20;

const getRegionLeader = (poll: PartySupport | undefined) => {
    if (!poll) return '';
    let max = -1;
    let leader = '';
    Object.entries(poll).forEach(([pid, val]) => {
        if (val > max) { max = val; leader = pid; }
    });
    return leader;
};

const getNationalLeader = (pollingData: Record<string, PartySupport>) => {
    const totals: Record<string, number> = { BLUE: 0, GREEN: 0, WHITE: 0 };
    
    TAIWAN_REGIONS.forEach(region => {
        const poll = pollingData[region.id];
        if (poll) {
            Object.entries(poll).forEach(([partyId, percentage]) => {
                if (totals[partyId] !== undefined) {
                    totals[partyId] += (region.votes * (percentage / 100));
                }
            });
        }
    });

    let max = -1;
    let leader = '';
    Object.entries(totals).forEach(([pid, votes]) => {
        if (votes > max) { max = votes; leader = pid; }
    });
    return leader;
};

const applySupportBoost = (
    newData: Record<string, PartySupport>, 
    regionId: string, 
    partyId: string, 
    boost: number,
    activeParties: any[]
) => {
    const regionPoll = { ...newData[regionId] };
    let otherTotal = 0;
    activeParties.forEach(p => {
        if (p.id !== partyId) otherTotal += (regionPoll[p.id as keyof PartySupport] || 0);
    });
    
    activeParties.forEach(p => {
        if (p.id !== partyId) {
            const ratio = otherTotal === 0 ? 0 : ((regionPoll[p.id as keyof PartySupport] || 0) / otherTotal);
            regionPoll[p.id as keyof PartySupport] -= boost * ratio;
            if (regionPoll[p.id as keyof PartySupport] < 0) regionPoll[p.id as keyof PartySupport] = 0;
        }
    });
    
    regionPoll[partyId as keyof PartySupport] = (regionPoll[partyId as keyof PartySupport] || 0) + boost;
    newData[regionId] = regionPoll;
};


export default function App() {
    const [gameState, setGameState] = useState<'SELECT_FACTION' | 'PLAYING' | 'ELECTION_NIGHT' | 'GAME_OVER'>('SELECT_FACTION');
    const [gameMode, setGameMode] = useState<'1v1' | '3p'>('3p');
    const [playerParty, setPlayerParty] = useState<any>(null);

    const geoData: any = twGeoData;
    const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

    // Core Game State
    const [turn, setTurn] = useState(1);
    const [partyFunds, setPartyFunds] = useState<Record<string, number>>({});
    const [ap, setAp] = useState(3);
    const [pollingData, setPollingData] = useState<Record<string, PartySupport>>({});
    const [news, setNews] = useState<NewsEvent[]>([]);
    const [headquarters, setHeadquarters] = useState<HQ[]>([]);
    const [fundraiseLevel, setFundraiseLevel] = useState<Record<string, number>>({});
    const [goldenWeek, setGoldenWeek] = useState(false);
    
    // Advanced Mechanics State
    const [activeModal, setActiveModal] = useState<'VP' | 'DEBATE' | 'EVENT' | null>(null);
    const [playerVp, setPlayerVp] = useState<string | null>(null);
    const [aiVps, setAiVps] = useState<Record<string, string>>({});
    const [currentEvent, setCurrentEvent] = useState<any>(null);
    const [gameEvents, setGameEvents] = useState<any[]>([]);
    const [completedModals, setCompletedModals] = useState<string[]>([]);

    // Election Night States
    const [electionNews, setElectionNews] = useState<NewsEvent[]>([]);
    const [calledRegions, setCalledRegions] = useState<string[]>([]);
    const [electionFinished, setElectionFinished] = useState(false);

    const svgWidth = 800;
    const svgHeight = 800;

    const pathGenerator = useMemo(() => {
        if (!geoData) return null;
        const projection = d3.geoMercator()
            .center([120.9, 23.8])
            .scale(10000)
            .translate([svgWidth / 2, svgHeight / 2]);
        return d3.geoPath().projection(projection);
    }, [geoData]);

    const activeParties = useMemo(() => {
        return gameMode === '1v1' ? PARTIES.filter(p => p.id !== 'WHITE') : PARTIES;
    }, [gameMode]);

    const startGame = (party: any) => {
        setPlayerParty(party);
        const initialPolling: Record<string, PartySupport> = {};
        TAIWAN_REGIONS.forEach(region => {
            const bs = { ...region.baseSupport };
            if (gameMode === '1v1') {
                bs.BLUE += bs.WHITE / 2;
                bs.GREEN += bs.WHITE / 2;
                bs.WHITE = 0;
            }
            initialPolling[region.id] = bs;
        });
        const initialFunds: Record<string, number> = {};
        PARTIES.forEach(p => initialFunds[p.id] = 5000000);
        setPollingData(initialPolling);
        setPartyFunds(initialFunds);
        setNews([]);
        setHeadquarters([]);
        setFundraiseLevel({});
        setGoldenWeek(false);
        setActiveModal(null);
        setCompletedModals([]);
        setPlayerVp(null);
        setAiVps({});
        setCalledRegions([]);
        setElectionNews([]);
        setElectionFinished(false);
        setAp(3);
        setTurn(1);
        const shuffledEvents = [...ALL_EVENTS].sort(() => 0.5 - Math.random());
        setGameEvents([{ ...shuffledEvents[0], turn: 4 }, { ...shuffledEvents[1], turn: 12 }]);
        setGameState('PLAYING');
    };

    const getRegionData = (feature: any) => {
        let name = feature.properties.name || feature.properties.COUNTYNAME || "";
        name = name.replace('臺', '台');
        if (name === '桃園縣') name = '桃園市';
        if (name === '台中縣') name = '台中市';
        if (name === '台南縣') name = '台南市';
        if (name === '高雄縣') name = '高雄市';
        return TAIWAN_REGIONS.find(r => r.name === name) || null;
    };

    const getRegionColor = (region: RegionData | null) => {
        if (!region || !pollingData[region.id]) return 'rgba(255,255,255,0.1)';
        if (gameState === 'ELECTION_NIGHT' && !calledRegions.includes(region.id)) return '#1e293b'; 
        const support = pollingData[region.id];
        const activeSupports = activeParties.map(p => support[p.id as keyof PartySupport] || 0).sort((a, b) => b - a);
        const margin = activeSupports[0] - (activeSupports[1] || 0);
        if (gameState === 'PLAYING' && margin <= 3.0) return '#fbbf24';
        if (support.BLUE >= support.GREEN && (gameMode === '1v1' || support.BLUE >= (support.WHITE||0))) return '#000095';
        if (support.GREEN > support.BLUE && (gameMode === '1v1' || support.GREEN >= (support.WHITE||0))) return '#1b9431';
        return '#28cdcc';
    };

    const selectedRegionData = useMemo(() => {
        if (!selectedRegionId || !geoData) return null;
        const feature = geoData.features.find((f: any) => (f.properties.COUNTYCODE || f.properties.COUNTYNAME) === selectedRegionId);
        if (!feature) return null;
        return getRegionData(feature);
    }, [selectedRegionId, geoData]);

    const handleRegionClick = (feature: any) => {
        if (gameState !== 'PLAYING') {
            if (gameState === 'ELECTION_NIGHT') {
                const regionData = getRegionData(feature);
                if (regionData && calledRegions.includes(regionData.id)) {
                    const el = document.getElementById(`news-${regionData.name}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            return;
        }
        const id = feature.properties.COUNTYCODE || feature.properties.COUNTYNAME;
        setSelectedRegionId(id);
    };

    // ACTION MECHANICS (Player)
    const handleActionClick = (actionName: 'RALLY' | 'ADS' | 'HQ' | 'OPPO' | 'FUNDRAISE') => {
        if (!selectedRegionData || gameState !== 'PLAYING' || ap <= 0) return;

        let cost = 0; let reqAp = 0; let actText = '';
        if (actionName === 'RALLY') { cost = 1000000; reqAp = 1; actText = '舉辦萬人造勢'; }
        if (actionName === 'ADS') { cost = 500000; reqAp = 1; actText = '投放大型廣告'; }
        if (actionName === 'HQ') {
            cost = (playerVp === 'BLUE_LOCAL') ? 1500000 : 3000000;
            reqAp = 2; actText = '建立地方總部';
        }
        if (actionName === 'OPPO') { cost = 1500000; reqAp = 2; actText = '發動黑料爆料'; }
        if (actionName === 'FUNDRAISE') { cost = 0; reqAp = 1; actText = '舉辦募款餐會'; }

        const currentFunds = partyFunds[playerParty.id] || 0;
        if (currentFunds < cost) { alert(`資金不足！您需要 $${cost.toLocaleString()}！`); return; }
        if (ap < reqAp) { alert('您的體力(AP)不足！'); return; }

        setAp(prev => prev - reqAp);
        if (cost > 0) setPartyFunds(prev => ({ ...prev, [playerParty.id]: prev[playerParty.id] - cost }));

        const newDataSync = { ...pollingData };
        const regionIdWork = selectedRegionData.id;
        const myIdX = playerParty.id;
        const oldRegionLeaderStr = getRegionLeader(newDataSync[regionIdWork]);

        let actionNewsMsg = '';

        if (actionName === 'OPPO') {
            const rng = Math.random();
            let resultType: 'CRITICAL' | 'LOCAL' | 'NOTHING' = 'NOTHING';
            if (rng < 0.25) resultType = 'CRITICAL';
            else if (rng < 0.7) resultType = 'LOCAL';

            const effectVal = 1.0 + Math.random() * 2.5;

            if (resultType === 'CRITICAL') {
                TAIWAN_REGIONS.forEach(reg => {
                    const rP = { ...newDataSync[reg.id] };
                    let target = ''; let maxV = -1;
                    activeParties.forEach(pr => { if (pr.id !== myIdX && rP[pr.id as keyof PartySupport] > maxV) { maxV = rP[pr.id as keyof PartySupport]; target = pr.id; } });
                    const st = Math.min(rP[target as keyof PartySupport], effectVal);
                    rP[target as keyof PartySupport] -= st; rP[myIdX as keyof PartySupport] += st;
                    newDataSync[reg.id] = rP;
                });
                actionNewsMsg = `【核彈級黑料】您拋出重磅爆料！全國支持度瞬間朝您集中，吸收了 ${effectVal.toFixed(1)}% 的選票！`;
            } else if (resultType === 'LOCAL') {
                const shuffled = [...TAIWAN_REGIONS].sort(() => 0.5 - Math.random()).slice(0, 3);
                const regionNames: string[] = [];
                const stealAmt = effectVal + Math.random() * 2;
                shuffled.forEach(reg => {
                    const rP = { ...newDataSync[reg.id] };
                    let target = ''; let maxV = -1;
                    activeParties.forEach(pr => { if (pr.id !== myIdX && rP[pr.id as keyof PartySupport] > maxV) { maxV = rP[pr.id as keyof PartySupport]; target = pr.id; } });
                    const st = Math.min(rP[target as keyof PartySupport], stealAmt);
                    rP[target as keyof PartySupport] -= st; rP[myIdX as keyof PartySupport] += st;
                    newDataSync[reg.id] = rP;
                    regionNames.push(reg.name);
                });
                actionNewsMsg = `【地方弊案連爆】成功挖出對手在 ${regionNames.join('、')} 的不法證據！當地民調瞬間重挫約 ${stealAmt.toFixed(1)}%！`;
            } else {
                actionNewsMsg = `【查無實證】花了經費查核，但沒能動搖選民信心。`;
            }
        } else if (actionName === 'FUNDRAISE') {
            const key = `${myIdX}_${regionIdWork}`;
            const currentLvl = fundraiseLevel[key] || 0;
            if (currentLvl >= 3) { alert('該地區募款次數已達上限！'); setAp(prev => prev + 1); return; }
            let reward = 1500000 - (currentLvl * 500000);
            if (playerVp === 'WHITE_SCHOLAR') reward = Math.floor(reward * 1.2);
            setPartyFunds(prev => ({ ...prev, [myIdX]: prev[myIdX] + reward }));
            setFundraiseLevel(prev => ({ ...prev, [key]: currentLvl + 1 }));
            actionNewsMsg = `【募款成功】您在 ${selectedRegionData.name} 舉辦募款，獲得 $${(reward/10000).toLocaleString()} 萬資金！`;
        } else if (actionName === 'HQ') {
            setHeadquarters(prev => [...prev, { partyId: myIdX, regionId: regionIdWork }]);
            actionNewsMsg = `【深耕基層】${playerParty.name} 在 ${selectedRegionData.name} 成立競選總部！`;
        } else {
            let minB = (actionName === 'RALLY') ? 1.0 : 0.5;
            let maxB = (actionName === 'RALLY') ? 2.5 : 1.2;
            let boostValue = minB + Math.random() * (maxB - minB);
            if (actionName === 'ADS' && playerVp === 'GREEN_MEDIA') boostValue *= 1.5;
            if (actionName === 'RALLY' && playerVp === 'WHITE_INFLUENCER' && ['TPE', 'NTPC', 'TYC', 'TC', 'TNC', 'KHH'].includes(regionIdWork)) boostValue *= 2.0;
            if (goldenWeek) boostValue *= 3.0;

            applySupportBoost(newDataSync, regionIdWork, myIdX, boostValue, activeParties);
            actionNewsMsg = `您在 ${selectedRegionData.name} ${actText}！支持度上升 ${boostValue.toFixed(1)}%！`;
        }

        // Leader / Flip Detection (Regional only)
        const newRegionLeaderStr = getRegionLeader(newDataSync[regionIdWork]);

        const newsItems: NewsEvent[] = [];
        
        // Check for regional leader changes
        if (oldRegionLeaderStr !== newRegionLeaderStr && newRegionLeaderStr === myIdX) {
            newsItems.push({ 
                turn, 
                partyId: myIdX, 
                message: `【選情震撼】${selectedRegionData.name} 變天！您成功在此逆轉超車，登上第一！`, 
                isFlip: true 
            });
        }

        // Add the action message LAST in newsItems array so when spread into setNews, it's below the flip
        newsItems.push({ turn, partyId: myIdX, message: actionNewsMsg });

        setPollingData(newDataSync);
        setNews(prev => [...newsItems, ...prev].slice(0, 30));
    };

    const handleEndTurn = () => {
        if (turn === 8 && !playerVp && !activeModal) { setActiveModal('VP'); return; }
        if ((turn === 10 || turn === 16) && !activeModal && !completedModals.includes(`DEBATE_${turn}`)) { setActiveModal('DEBATE'); return; }
        const eventItem = gameEvents.find(e => e.turn === turn);
        if (eventItem && !activeModal && !currentEvent && !completedModals.includes(`EVENT_${turn}`)) { setCurrentEvent(eventItem); setActiveModal('EVENT'); return; }

        if (turn >= MAX_TURNS) {
            setGameState('ELECTION_NIGHT');
            return;
        }

        const nextTurnValue = turn + 1;
        const newNewsItems: NewsEvent[] = [];
        const aiSpentFunds: Record<string, number> = {};

        if (turn === 17) setGoldenWeek(true);

        if (turn === 8) {
            const nextAiVps = { ...aiVps };
            activeParties.forEach(p => { 
                if (p.id !== playerParty.id) { 
                    const partyVps = VP_CANDIDATES.filter(v => v.partyId === p.id); 
                    nextAiVps[p.id] = partyVps[Math.floor(Math.random() * partyVps.length)].id; 
                } 
            });
            setAiVps(nextAiVps);
        }

        const newDataSync = { ...pollingData };

        headquarters.forEach(hq => {
            const oldLeaderSync = getRegionLeader(newDataSync[hq.regionId]);
            applySupportBoost(newDataSync, hq.regionId, hq.partyId, 0.5, activeParties);
            const newLeaderSync = getRegionLeader(newDataSync[hq.regionId]);
            if (oldLeaderSync !== newLeaderSync) {
                newNewsItems.push({ turn: nextTurnValue, partyId: hq.partyId, message: `【選情震撼】${TAIWAN_REGIONS.find(r=>r.id===hq.regionId)?.name} 變天！${PARTIES.find(p=>p.id===newLeaderSync)?.name} 成功在此超車！`, isFlip: true });
            }
        });

        activeParties.forEach(aiParty => {
            if (aiParty.id === playerParty.id) return;
            const currentAiFunds = partyFunds[aiParty.id] || 0;
            aiSpentFunds[aiParty.id] = 0;
            let actionType: "RALLY" | "ADS" | "HQ" | "OPPO" | "FUNDRAISE" = "RALLY";
            if (currentAiFunds < 500000) actionType = "FUNDRAISE";
            
            let bestRegAI = TAIWAN_REGIONS[Math.floor(Math.random() * 22)];
            const targetRegionIdAI = bestRegAI.id;
            
            const oldRegLeader = getRegionLeader(newDataSync[targetRegionIdAI]);
            if (actionType === "RALLY") {
                aiSpentFunds[aiParty.id] += 1000000;
                applySupportBoost(newDataSync, targetRegionIdAI, aiParty.id, 1.2, activeParties);
                const newRegLeader = getRegionLeader(newDataSync[targetRegionIdAI]);
                if (oldRegLeader !== newRegLeader) {
                    newNewsItems.push({ turn: nextTurnValue, partyId: aiParty.id, message: `【選情震撼】${bestRegAI.name} 變天！${aiParty.name} 成功在此超車！`, isFlip: true });
                }
            }
        });

        setPollingData(newDataSync);
        setNews(prev => [...newNewsItems.reverse(), ...prev].slice(0, 25));
        setTurn(nextTurnValue);
        setAp(3);

        // Apply VP auto-buffs at end of turn
        if (playerVp === 'BLUE_FINANCE') {
            setPartyFunds(prev => ({ ...prev, [playerParty.id]: prev[playerParty.id] + 1500000 }));
        }
        if (playerVp === 'WHITE_DOCTOR') {
            // 0.4% swing to player from all regions handled in polling boost
            const doctorBoostData = { ...newDataSync };
            const swingRegions = TAIWAN_REGIONS.filter(r => {
                const support = doctorBoostData[r.id];
                const activeSupports = activeParties.map(p => support[p.id as keyof PartySupport] || 0).sort((a, b) => b - a);
                return (activeSupports[0] - activeSupports[1]) <= 5;
            });
            swingRegions.slice(0, 3).forEach(r => applySupportBoost(doctorBoostData, r.id, playerParty.id, 0.2, activeParties));
            setPollingData(doctorBoostData);
        }
    };

    // === ELECTION NIGHT AUTO-COUNTING ===
    useEffect(() => {
        if (gameState !== 'ELECTION_NIGHT') return;
        if (electionFinished) return;

        const uncalled = TAIWAN_REGIONS.filter(r => !calledRegions.includes(r.id));
        if (uncalled.length === 0) {
            setElectionFinished(true);
            return;
        }

        const timer = setTimeout(() => {
            const nextRegion = uncalled[Math.floor(Math.random() * uncalled.length)];
            const regionPoll = pollingData[nextRegion.id];

            // Build stats for this region
            const regionStats: Record<string, { votes: number; percentage: number }> = {};
            activeParties.forEach(p => {
                const pct = regionPoll[p.id as keyof PartySupport] || 0;
                regionStats[p.id] = {
                    votes: Math.round((pct / 100) * nextRegion.votes),
                    percentage: pct
                };
            });

            const newElectionItem: NewsEvent = {
                turn: 0,
                partyId: '',
                message: `📊 ${nextRegion.name} 開票完畢`,
                electionData: {
                    regionName: nextRegion.name,
                    stats: regionStats
                }
            };

            setCalledRegions(prev => [...prev, nextRegion.id]);
            setElectionNews(prev => [newElectionItem, ...prev]);
        }, 600);

        return () => clearTimeout(timer);
    }, [gameState, calledRegions, electionFinished]);

    const nationalStats = useMemo(() => {
        const stats: any = { 
            BLUE: { votes: 0, percentage: 0 }, 
            GREEN: { votes: 0, percentage: 0 }, 
            WHITE: { votes: 0, percentage: 0 }, 
            totalVotes: 0, 
            calledVotes: 0, 
            remainingVotes: 0 
        };
        TAIWAN_REGIONS.forEach(reg => {
            const poll = pollingData[reg.id];
            if (!poll) return;
            activeParties.forEach(p => {
                const pct = poll[p.id as keyof PartySupport] || 0;
                const v = (pct / 100) * reg.votes;
                stats[p.id].votes += v;
                stats.totalVotes += v;
            });
        });
        activeParties.forEach(p => {
            const s = stats[p.id];
            s.percentage = stats.totalVotes === 0 ? 0 : (s.votes / stats.totalVotes) * 100;
        });
        return stats;
    }, [pollingData, activeParties]);


    if (gameState === 'SELECT_FACTION') {
        return (
            <div className="min-h-[100dvh] py-12 w-full bg-slate-900 flex md:items-center justify-center p-4 text-slate-200" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'#1e293b\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'}}>
                <div className="glass-panel max-w-5xl w-full p-6 md:p-10 rounded-2xl flex flex-col items-center animate-fadeIn shadow-2xl">
                    <h1 className="text-4xl font-black mb-2 tracking-widest text-white">選擇您的陣營勢力</h1>
                    <p className="text-slate-400 mb-8 tracking-widest text-sm">TAIWAN POLITICAL SIMULATOR - 2024</p>
                    <div className="flex bg-slate-800/80 p-1 rounded-xl mb-10 border border-white/5 shadow-inner">
                        <button onClick={() => setGameMode('1v1')} className={`px-8 py-3 rounded-lg font-bold tracking-widest text-sm transition-all focus:outline-none ${gameMode === '1v1' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>⚔️ 藍綠對決 (1v1)</button>
                        <button onClick={() => setGameMode('3p')} className={`px-8 py-3 rounded-lg font-bold tracking-widest text-sm transition-all focus:outline-none ${gameMode === '3p' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>🔥 三強鼎立 (三人)</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full justify-center">
                        {activeParties.map(party => (
                            <div key={party.id} onClick={() => startGame(party)} className="glass-panel border-white/5 p-8 rounded-xl cursor-pointer hover:scale-[1.03] transition-all text-center flex flex-col items-center group relative overflow-hidden">
                                <div className="absolute inset-0 opacity-10 group-hover:opacity-30 transition-opacity duration-500" style={{ backgroundColor: party.color }}></div>
                                <div className="w-20 h-20 rounded-full mb-6 shadow-xl flex items-center justify-center border-4 bg-white transition-transform group-hover:scale-110 duration-500" style={{ borderColor: party.color }}><img src={party.logoUrl} alt={party.name} className="w-14 h-14 object-contain" /></div>
                                <h2 className={`text-2xl font-bold mb-3 ${party.highlight}`}>{party.name}候選人</h2>
                                <p className="text-sm text-slate-400 leading-relaxed min-h-[60px]">{party.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    const isElection = gameState === 'ELECTION_NIGHT';

    return (
        <div className="h-[100dvh] w-full flex flex-col pt-1 relative overflow-hidden bg-[#0a0e1a] text-slate-200">
            {/* Header / Top Info Bar - Classic Vercel Style */}
            {!isElection && (
                <header className="flex justify-between items-center px-6 py-4 bg-[#0f172a] border-b border-white/5 z-30 shrink-0">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black tracking-widest text-[#f8fafc]">
                                TAIWAN <span className="text-[#3b82f6]">POLITICAL MACHINE</span>
                            </h1>
                            <div className="h-4 w-[1px] bg-white/10 mx-1" />
                            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-2 py-1 rounded">
                                第 {turn}/{MAX_TURNS} 週 <span className={playerParty?.highlight}>【{playerParty?.name}】</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-10 pr-4">
                        <div className="flex flex-col items-end group">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">可用預算資金</span>
                            <span className="text-2xl font-black text-[#4ade80] font-mono tracking-tight group-hover:scale-105 transition-transform">
                                ${(partyFunds[playerParty?.id] || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1.5">剩餘行動點數 (AP)</span>
                            <div className="flex gap-2.5">
                                {[...Array(3)].map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-500 ${
                                            i < ap 
                                            ? 'bg-[#facd15] border-[#facd15] shadow-[0_0_12px_rgba(250,205,21,0.5)]' 
                                            : 'bg-slate-800 border-slate-700'
                                        }`} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </header>
            )}

            {/* Election Night Header - Classic Dark Style */}
            {isElection && (
                <header className="flex justify-between items-center px-8 py-5 bg-[#0f172a] border-b-2 border-indigo-500/30 z-30 shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center gap-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.5)]" />
                        <div>
                            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none">Taiwan Decision <span className="text-indigo-400">2024</span></h1>
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
                                <span className="text-red-500/80">● LIVE</span> 全國開票中心 · 即時開票數據
                            </div>
                        </div>
                    </div>
                </header>
            )}

            <main className="flex-1 min-h-0 flex flex-row gap-0 overflow-hidden relative">
                {/* Left Sidebar: Stats, News, End Turn — Classic Dashboard Style */}
                <div className="hidden md:flex w-80 flex-col shrink-0 bg-[#0f172a] border-r border-white/5 p-5 overflow-hidden z-20">
                    <div className="flex flex-col h-full">
                        {/* Stats Panel */}
                        <div className="bg-[#1e293b]/40 rounded-2xl border border-white/5 p-5 mb-6">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                全國選情預測
                            </h2>
                            <div className="space-y-6">
                                {activeParties.map((party) => {
                                    const pStats = (nationalStats as any)[party.id];
                                    const isMe = party.id === playerParty?.id;
                                    const isLeading = party.id === (Object.entries(nationalStats).reduce((a, b) => (a[1] as any).votes > (b[1] as any).votes ? a : b)[0]);

                                    return (
                                        <div key={party.id} className="relative">
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-xs font-black ${party.highlight} flex items-center gap-1.5`}>
                                                        {party.name} {isMe && <span className="text-[10px] opacity-70">(您)</span>}
                                                    </span>
                                                    {isLeading && (
                                                        <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-500/20">
                                                            領先
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-mono font-black text-slate-300">
                                                    {pStats.percentage.toFixed(1)}% <span className="text-slate-500 font-medium ml-1">({(pStats.votes / 10000).toFixed(0)}萬)</span>
                                                </div>
                                            </div>
                                            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                                <div 
                                                    className={`h-full ${party.hex} transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(255,255,255,0.05)]`} 
                                                    style={{width: `${pStats.percentage}%`}} 
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* News Alert Panel */}
                        <div className="flex-1 flex flex-col bg-[#1e293b]/20 rounded-2xl border border-white/5 overflow-hidden min-h-0 mb-6">
                            <div className="p-4 border-b border-white/5 bg-white/2">
                                <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                    最新選戰報
                                </h2>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {!isElection ? (
                                    news.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-600 italic text-xs text-center px-4 opacity-60">
                                            目前尚無重大事件...
                                        </div>
                                    ) : (
                                        news.map((item, idx) => (
                                            <div key={idx} className="flex gap-3 animate-fadeIn">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                                                <div className="text-[11px] leading-relaxed text-slate-400 font-medium">{item.message}</div>
                                            </div>
                                        ))
                                    )
                                ) : (
                                    electionNews.map((item, idx) => (
                                        <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-xl shadow-lg animate-fadeIn mb-2">
                                            <div className="text-[10px] font-black text-slate-400 mb-2 border-b border-white/5 pb-1 uppercase tracking-widest">{item.message}</div>
                                            <div className="space-y-1.5">
                                                {activeParties.map(p => {
                                                    const s = item.electionData?.stats[p.id];
                                                    if (!s) return null;
                                                    return (
                                                        <div key={p.id} className="flex justify-between items-center text-[10px]">
                                                            <span className={`font-bold ${p.highlight}`}>{p.name}</span>
                                                            <span className="font-black text-slate-200">{s.percentage.toFixed(1)}%</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* End Turn Button - Integrated Bottom */}
                        <div className="mt-auto">
                            {!isElection ? (
                                <button 
                                    onClick={handleEndTurn} 
                                    className="w-full py-4 bg-[#4f46e5] hover:bg-[#4338ca] text-white rounded-xl font-black tracking-[0.2em] shadow-xl shadow-indigo-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
                                >
                                    結束本週
                                </button>
                            ) : electionFinished && (
                                <button 
                                    onClick={() => setGameState('GAME_OVER')} 
                                    className="w-full py-4 bg-[#ef4444] hover:bg-[#dc2626] rounded-xl text-white font-black tracking-[0.2em] shadow-xl transition-all animate-pulse text-sm"
                                >
                                    查看最終結果
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Bottom Bar: campaign = stats+end-turn; election night = live counting feed */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0f172a]/95 border-t border-white/10 backdrop-blur-xl px-4 pt-3 pb-safe">
                    {!isElection ? (
                        <>
                            <div className="flex justify-between items-center mb-2">
                                {activeParties.map(p => {
                                    const pStats = (nationalStats as any)[p.id];
                                    const isMe = p.id === playerParty?.id;
                                    return (
                                        <div key={p.id} className="flex items-center gap-1.5">
                                            {isMe && <span className="text-[9px] text-yellow-400">⭐</span>}
                                            <span className={`text-[11px] font-black ${p.highlight}`}>{p.name}</span>
                                            <span className="text-[11px] font-mono text-slate-300">{pStats.percentage.toFixed(1)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <button
                                onClick={handleEndTurn}
                                className="w-full py-3 bg-indigo-700/90 hover:bg-indigo-600 rounded-xl text-white font-black tracking-[0.15em] text-sm shadow-lg transition-all active:scale-95 mb-1"
                            >
                                結束本週進度 · 第 {turn}/{MAX_TURNS} 週
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Live counting feed for mobile election night */}
                            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-[11px] font-black text-white uppercase tracking-widest">LIVE · 開票中 {calledRegions.length}/{TAIWAN_REGIONS.length} 區</span>
                                <div className="ml-auto flex gap-2">
                                    {activeParties.map(p => (
                                        <span key={p.id} className={`text-[10px] font-black font-mono ${p.highlight}`}>
                                            {(nationalStats as any)[p.id]?.percentage.toFixed(1)}%
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="max-h-[110px] overflow-y-auto space-y-1 custom-scrollbar">
                                {electionNews.slice(0, 8).map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-1.5">
                                        <span className="text-[11px] text-slate-300 font-bold">{item.message}</span>
                                        <div className="flex gap-2 shrink-0">
                                            {activeParties.map(p => {
                                                const s = item.electionData?.stats[p.id];
                                                if (!s) return null;
                                                return <span key={p.id} className={`text-[10px] font-mono font-black ${p.highlight}`}>{s.percentage.toFixed(0)}%</span>;
                                            })}
                                        </div>
                                    </div>
                                ))}
                                {electionNews.length === 0 && (
                                    <div className="text-center text-slate-500 text-[11px] py-2">開票中，請稍後...</div>
                                )}
                            </div>
                            {electionFinished && (
                                <button
                                    onClick={() => setGameState('GAME_OVER')}
                                    className="w-full py-2 mt-2 bg-red-600 hover:bg-red-500 rounded-xl text-white font-black tracking-[0.15em] text-sm animate-bounce mb-1"
                                >
                                    查看最終結果
                                </button>
                            )}
                        </>
                    )}
                </div>

                {/* Center: Map - election night mobile bottom bar is taller */}
                <div className={`flex-1 relative flex items-center justify-center overflow-hidden bg-[#0a0e1a]/80 md:pb-0 ${isElection ? 'pb-[230px]' : 'pb-[100px]'}`}>
                    <svg className="w-full h-full p-4" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
                        <g>
                            {geoData.features.map((feature: any, i: number) => {
                                const id = feature.properties.COUNTYCODE || feature.properties.COUNTYNAME;
                                const isSelected = selectedRegionId === id;
                                const regionData = getRegionData(feature);
                                return (
                                    <path
                                        key={i}
                                        d={pathGenerator ? (pathGenerator(feature) as string) : ''}
                                        fill={getRegionColor(regionData)}
                                        className={`county-path ${isSelected ? 'selected' : ''}`}
                                        style={{ stroke: '#ffffff', strokeWidth: 0.5, strokeOpacity: 0.2 }}
                                        onClick={() => handleRegionClick(feature)}
                                    />
                                );
                            })}
                        </g>
                    </svg>

                    {/* Map Legend - Classic Vercel Style */}
                    {!isElection && (
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 glass-panel px-8 py-3 rounded-full border border-white/10 shadow-2xl backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-[#facc15] shadow-[0_0_12px_rgba(250,204,21,0.6)] animate-pulse" />
                                <span className="text-[11px] text-slate-300 font-black tracking-widest italic opacity-90">金黃色代表前兩名差距 3% 以內的搖擺州</span>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Right Sidebar: Regional Context & Actions - Classic Dashboard Style */}
                {(selectedRegionData && !isElection) && (
                    <div className="
                        md:w-[340px] md:border-l md:border-white/10 md:relative md:animate-slideInRight
                        fixed inset-0 md:inset-auto z-50 md:z-30
                        bg-[#0a0e1a]/95 md:bg-[#0f172a]/80
                        backdrop-blur-2xl p-7 flex flex-col
                        overflow-y-auto custom-scrollbar
                        md:shrink-0
                    ">
                        {/* Panel Header */}
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-4xl font-black text-white tracking-tighter mb-1">{selectedRegionData.name}</h2>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                                    <span>👥 選舉人：</span>
                                    <span className="text-slate-300">{(selectedRegionData.votes / 10000).toLocaleString()} 萬</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedRegionId(null)} 
                                className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all hover:rotate-90"
                            >
                                <span className="text-xl">✕</span>
                            </button>
                        </div>

                        {/* Local Polling Bars - Refined Style */}
                        <div className="space-y-5 mb-10 overflow-hidden">
                            {activeParties.map(p => {
                                const pct = pollingData[selectedRegionData.id]?.[p.id as keyof PartySupport] || 0;
                                return (
                                    <div key={p.id} className="relative">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className={`text-[11px] font-black uppercase tracking-widest ${p.highlight}`}>{p.name}民調</span>
                                            <span className="text-[11px] font-mono font-black text-slate-200">{pct.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className={`h-full ${p.hex} transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.05)]`} 
                                                style={{width: `${pct}%`}} 
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="space-y-4">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2 pl-1">您的策略行動</div>
                            
                            <ActionCard icon="🏟️" title="舉辦萬人造勢" desc="大幅拉抬當地 1~2.5% 民調。透過集會展現基層動員實力。" cost="-1 AP | -$1M" color="yellow" onClick={() => handleActionClick('RALLY')} />
                            <ActionCard icon="📺" title="投放地方廣告" desc="小幅提升 0.5~1.2% 民調。針對在地選民進行精準文宣攻擊。" cost="-1 AP | -$500k" color="blue" onClick={() => handleActionClick('ADS')} />
                            <ActionCard icon="🗳️" title="舉辦地方募款餐會" desc="越大的縣市募得的金額越多！但在同一地區多次募款會使選民疲乏，收入會隨之遞減。" cost="-1 AP | +$1.5M" color="emerald" onClick={() => handleActionClick('FUNDRAISE')} />
                            <ActionCard icon="🏛️" title="成立競選總部" desc="常駐效果：地方派系固本，每回合自動 +0.5% 民調。" cost="-2 AP | -$3M" color="purple" onClick={() => handleActionClick('HQ')} />
                            <ActionCard icon="💣" title="挖掘對手驚天黑料" desc="【豪賭注意】可能重創對手選情，無實證浪費錢，或不幸被抓包「抹黑」而反損自身民調！" cost="-2 AP | -$1.5M" color="red" isHighRisk onClick={() => handleActionClick('OPPO')} />
                        </div>
                    </div>
                )}
            </main>

            {/* Modal Overlay System */}
            {(activeModal || gameState === 'GAME_OVER') && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    {activeModal === 'VP' && (
                        <div className="glass-panel max-w-4xl w-full p-8 rounded-2xl border-white/10 shadow-2xl animate-scaleIn">
                            <h2 className="text-3xl font-black mb-2 text-white italic">SELECT YOUR RUNNING MATE</h2>
                            <p className="text-slate-400 mb-8 uppercase tracking-widest text-xs font-bold">選戰進入中盤，請選擇您的副手人選來強化優勢</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {VP_CANDIDATES.filter(v => v.partyId === playerParty.id).map(vp => (
                                    <div key={vp.id} onClick={() => { setPlayerVp(vp.id); setActiveModal(null); setCompletedModals(prev => [...prev, 'VP']); }} className="bg-slate-900/50 border border-white/5 p-6 rounded-xl cursor-pointer hover:bg-indigo-600/20 hover:border-indigo-500 transition-all group">
                                        <div className="text-4xl mb-4 group-hover:scale-125 transition-transform">{vp.icon}</div>
                                        <h3 className="text-xl font-bold mb-2 text-white">{vp.name}</h3>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-4">{vp.desc}</p>
                                        <div className="text-[11px] font-bold text-emerald-400 bg-emerald-400/5 p-2 rounded border border-emerald-400/20">{vp.buff}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeModal === 'DEBATE' && (
                        <div className="glass-panel max-w-lg w-full p-8 rounded-2xl text-center animate-scaleIn border-b-4 border-indigo-500">
                            <div className="text-5xl mb-6">🎙️</div>
                            <h2 className="text-2xl font-black mb-4 text-white uppercase tracking-widest">電視辯論大會</h2>
                            <p className="text-slate-400 mb-6 text-sm leading-relaxed italic">這是向全國選民展現論述實力的關鍵時刻。投入資金強化幕僚團隊，能獲得更好的辯論表現。</p>
                            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                {partyFunds[playerParty?.id] >= 1000000 ? (
                                    <button 
                                        onClick={() => { 
                                            setPartyFunds(prev => ({ ...prev, [playerParty.id]: prev[playerParty.id] - 1000000 })); 
                                            setActiveModal(null); 
                                            setCompletedModals(prev => [...prev, `DEBATE_${turn}`]); 
                                        }} 
                                        className="flex-1 py-4 bg-indigo-600 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 text-sm border border-indigo-400/30"
                                    >
                                        投入 $100萬 (穩健)
                                    </button>
                                ) : (
                                    <button 
                                        disabled
                                        className="flex-1 py-4 bg-slate-800/50 rounded-xl font-bold text-slate-500 cursor-not-allowed text-sm border border-white/5 opacity-50"
                                    >
                                        資金不足 ($100萬)
                                    </button>
                                )}
                                <button onClick={() => { setActiveModal(null); setCompletedModals(prev => [...prev, `DEBATE_${turn}`]); }} className="flex-1 py-4 bg-slate-800 rounded-xl font-bold hover:bg-slate-700 transition-all text-sm border border-white/10">不額外投入</button>
                            </div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">目前資金: ${(partyFunds[playerParty?.id] || 0).toLocaleString()}</div>
                        </div>
                    )}

                    {activeModal === 'EVENT' && currentEvent && (
                        <div className="glass-panel max-w-2xl w-full p-8 rounded-2xl animate-scaleIn border-l-8 border-indigo-600 shadow-2xl">
                            <h2 className="text-3xl font-black mb-4 text-white italic">{currentEvent.title}</h2>
                            <p className="text-slate-300 mb-8 leading-relaxed font-medium">{currentEvent.desc}</p>
                            <div className="space-y-4">
                                {currentEvent.options.map((opt: any, i: number) => (
                                    <button key={i} onClick={() => { setActiveModal(null); setCompletedModals(prev => [...prev, `EVENT_${turn}`]); }} className="w-full p-5 bg-white/5 border border-white/5 rounded-xl text-left hover:bg-white/10 hover:border-indigo-500 transition-all group flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{opt.text}</div>
                                            <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">{opt.effect}</div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">➔</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {gameState === 'GAME_OVER' && (
                        <div className="glass-panel max-w-4xl w-full p-6 md:p-12 rounded-3xl text-center border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-scaleIn mx-4">
                            <h2 className="text-3xl md:text-6xl font-black text-white mb-4 tracking-tighter uppercase italic">Election Final Results</h2>
                            <div className="h-1 w-24 bg-indigo-500 mx-auto mb-6 md:mb-10" />
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-8 md:mb-12">
                                {activeParties.map(p => {
                                    const stats = (nationalStats as any)[p.id];
                                    const maxPct = Math.max(...activeParties.map(ap => (nationalStats as any)[ap.id].percentage));
                                    const isWinner = stats.percentage >= maxPct;
                                    return (
                                        <div key={p.id} className={`p-5 md:p-8 rounded-2xl border relative overflow-hidden ${
                                            isWinner ? 'bg-yellow-400/10 border-yellow-400/40 shadow-[0_0_30px_rgba(250,204,21,0.15)]' : 'bg-slate-900/50 border-white/5'
                                        }`}>
                                            {isWinner && <div className="text-2xl mb-1">🏆</div>}
                                            <div className={`text-4xl md:text-5xl font-black mb-2 ${p.highlight}`}>{stats.percentage.toFixed(1)}%</div>
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">{p.name}</div>
                                            <div className="text-sm font-mono text-slate-400">{(stats.votes / 10000).toFixed(0)}萬 票</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button 
                                    onClick={() => setGameState('ELECTION_NIGHT')} 
                                    className="px-8 py-4 bg-slate-700 text-white rounded-full font-black tracking-[0.1em] hover:bg-slate-600 transition-all text-sm"
                                >
                                    🗺️ 回到開票地圖
                                </button>
                                <button 
                                    onClick={() => window.location.reload()} 
                                    className="px-10 md:px-12 py-4 bg-indigo-600 text-white rounded-full font-black tracking-[0.1em] md:tracking-[0.2em] hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/30 text-sm md:text-lg uppercase"
                                >
                                    🔄 Restart Simulation
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// Sub-component for better organization
function ActionCard({ icon, title, desc, cost, color, onClick, isHighRisk }: any) {
    const colorClasses: Record<string, string> = {
        yellow: 'bg-yellow-500/5 border-yellow-500/10 text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500/30',
        blue: 'bg-blue-500/5 border-blue-500/10 text-blue-500 hover:bg-blue-500/10 hover:border-blue-500/30',
        emerald: 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500/30',
        purple: 'bg-purple-500/5 border-purple-500/10 text-purple-500 hover:bg-purple-500/10 hover:border-purple-500/30',
        red: 'bg-red-500/5 border-red-500/10 text-red-500 hover:bg-red-500/10 hover:border-red-500/30'
    };

    // Parse cost into AP and Money for specific styling if needed
    const parts = cost.split('|').map((s: string) => s.trim());

    return (
        <button 
            onClick={onClick} 
            className={`w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02] flex items-center gap-4 group ${colorClasses[color]}`}
        >
            <span className="text-3xl group-hover:scale-110 transition-transform shrink-0 drop-shadow-lg">{icon}</span>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-0.5">
                    <span className="font-black text-sm text-slate-200 truncate">{title}</span>
                    <div className="flex flex-col items-end shrink-0 ml-2">
                        {parts.map((p: string, i: number) => (
                            <span key={i} className={`text-[9px] font-black font-mono uppercase tracking-tighter ${
                                p.includes('AP') ? 'text-yellow-500/80' : 
                                p.includes('+') ? 'text-emerald-400' : 'text-red-400'
                            }`}>
                                {p}
                            </span>
                        ))}
                    </div>
                </div>
                <p className="text-[10px] text-slate-500 font-medium leading-normal line-clamp-2 italic">{desc}</p>
                {isHighRisk && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-red-500/20 px-1.5 py-0.5 rounded text-red-400 border border-red-500/20">
                        <span>🚨</span> 核彈級操作
                    </div>
                )}
            </div>
        </button>
    );
}
