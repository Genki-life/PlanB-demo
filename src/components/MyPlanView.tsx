import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ChevronRight,
  ChevronDown,
  Sparkles,
  Compass,
  Heart,
  Activity,
  Moon,
  Flame,
  Footprints,
  X,
  Check,
  Clock,
  Calendar as CalendarIcon,
  TrendingUp,
  Sliders,
  ShieldCheck,
  Pause,
  Play,
  HelpCircle,
  BarChart2,
  AlertCircle,
  Info,
  RotateCcw,
  MessageSquare,
  Trash2,
  ArrowUp,
  CornerDownRight
} from 'lucide-react';

const NOVA_LISTENING_URL = '/kila-listening.png';

// ============================================================================
// 1. DATA MODELS & SAMPLE DATASETS
// ============================================================================

type RhythmTimeframe = '7d' | 'month';
type SecondaryModuleType = 'activity' | 'rhythm' | 'direction' | 'memory' | 'health' | null;

// --- A. Activity Record Model (Supports Active, Mindful Rest, or No Record) ---
type DayRecordType = 'active' | 'rest' | 'none';

interface DayActivityRecord {
  date: string; // 'YYYY-MM-DD'
  type: DayRecordType;
  title?: string;
  durationMinutes?: number;
  note?: string;
  isSample?: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Build initial realistic multi-month sample dataset centered around real device date
function createInitialActivityLogs(baseYear: number, baseMonth: number, baseDay: number): Record<string, DayActivityRecord> {
  const logs: Record<string, DayActivityRecord> = {};

  const formatD = (y: number, m: number, d: number) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Populate current month up to baseDay
  const activeSampleDays = [1, 2, 4, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 24, 26, 28];
  const restSampleDays = [3, 10, 17, 23];

  for (const d of activeSampleDays) {
    if (d <= baseDay) {
      logs[formatD(baseYear, baseMonth, d)] = {
        date: formatD(baseYear, baseMonth, d),
        type: 'active',
        title: d % 2 === 0 ? '15-min mindful walk' : '5-min living room stretch',
        durationMinutes: d % 2 === 0 ? 15 : 5,
        note: d === baseDay ? 'Completed after lunch' : 'Light gentle pacing',
        isSample: true
      };
    }
  }

  for (const d of restSampleDays) {
    if (d <= baseDay) {
      logs[formatD(baseYear, baseMonth, d)] = {
        date: formatD(baseYear, baseMonth, d),
        type: 'rest',
        title: 'Mindful rest day',
        durationMinutes: 0,
        note: 'Intentional recovery pause — no guilt',
        isSample: true
      };
    }
  }

  // Always ensure Today has an active sample record if not already set
  const todayKey = formatD(baseYear, baseMonth, baseDay);
  if (!logs[todayKey]) {
    logs[todayKey] = {
      date: todayKey,
      type: 'active',
      title: '15-min mindful walk',
      durationMinutes: 15,
      note: 'Post-lunch outdoor walk',
      isSample: true
    };
  }

  // Populate Previous Month
  const prevDate = new Date(baseYear, baseMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();
  const prevActiveDays = [2, 3, 5, 7, 9, 12, 14, 15, 18, 20, 21, 24, 26, 28, 30];
  const prevRestDays = [6, 13, 19, 27];

  for (const d of prevActiveDays) {
    logs[formatD(prevYear, prevMonth, d)] = {
      date: formatD(prevYear, prevMonth, d),
      type: 'active',
      title: d % 3 === 0 ? '5-min desk shoulder reset' : '15-min mindful walk',
      durationMinutes: d % 3 === 0 ? 5 : 15,
      note: 'Sample historical activity',
      isSample: true
    };
  }

  for (const d of prevRestDays) {
    logs[formatD(prevYear, prevMonth, d)] = {
      date: formatD(prevYear, prevMonth, d),
      type: 'rest',
      title: 'Rest & recharge window',
      durationMinutes: 0,
      note: 'Sample restorative day',
      isSample: true
    };
  }

  // Populate 2 Months Ago
  const twoAgoDate = new Date(baseYear, baseMonth - 2, 1);
  const twoAgoYear = twoAgoDate.getFullYear();
  const twoAgoMonth = twoAgoDate.getMonth();
  const twoAgoActive = [1, 4, 6, 8, 11, 14, 17, 19, 22, 25, 27];
  const twoAgoRest = [5, 12, 20, 26];

  for (const d of twoAgoActive) {
    logs[formatD(twoAgoYear, twoAgoMonth, d)] = {
      date: formatD(twoAgoYear, twoAgoMonth, d),
      type: 'active',
      title: '15-min outdoor walk',
      durationMinutes: 15,
      isSample: true
    };
  }

  for (const d of twoAgoRest) {
    logs[formatD(twoAgoYear, twoAgoMonth, d)] = {
      date: formatD(twoAgoYear, twoAgoMonth, d),
      type: 'rest',
      title: 'Mindful rest day',
      durationMinutes: 0,
      isSample: true
    };
  }

  return logs;
}

// --- B. Your Rhythm Dataset ---
interface MonthlyTrendPoint {
  month: string;
  activeDays: number;
  totalMinutes: number;
}

const MONTHLY_TREND_SERIES: MonthlyTrendPoint[] = [
  { month: 'Jun', activeDays: 8, totalMinutes: 95 },
  { month: 'Jul', activeDays: 11, totalMinutes: 135 },
  { month: 'Aug', activeDays: 10, totalMinutes: 120 },
  { month: 'Sep', activeDays: 14, totalMinutes: 175 },
  { month: 'Oct', activeDays: 16, totalMinutes: 210 },
  { month: 'Nov', activeDays: 18, totalMinutes: 235 },
];

interface RecentSummaryData {
  rangeLabel: string;
  completedCount: number;
  activeMinutes: number;
  restDaysCount: number;
  rescheduledCount: number;
  novaObservation: string;
  dailyBreakdown: { label: string; minutes: number; status: 'done' | 'rest' | 'light' }[];
}

const RHYTHM_RECENT_SUMMARY: Record<RhythmTimeframe, RecentSummaryData> = {
  '7d': {
    rangeLabel: 'Past 7 days',
    completedCount: 5,
    activeMinutes: 65,
    restDaysCount: 1,
    rescheduledCount: 1,
    novaObservation:
      'Your post-lunch walks (1:15 PM – 1:40 PM) had the highest completion rate this week. On Tuesday, switching to a 5-minute living room stretch kept your rhythm steady without pressure.',
    dailyBreakdown: [
      { label: 'Mon', minutes: 15, status: 'done' },
      { label: 'Tue', minutes: 5, status: 'light' },
      { label: 'Wed', minutes: 15, status: 'done' },
      { label: 'Thu', minutes: 0, status: 'rest' },
      { label: 'Fri', minutes: 15, status: 'done' },
      { label: 'Sat', minutes: 15, status: 'done' },
      { label: 'Sun', minutes: 0, status: 'rest' },
    ],
  },
  month: {
    rangeLabel: 'Past 30 days',
    completedCount: 18,
    activeMinutes: 235,
    restDaysCount: 6,
    rescheduledCount: 4,
    novaObservation:
      'Over the past month, your active days rose from 14 to 18. Allowing 6 intentional rest days prevented mid-week fatigue and helped you sustain a gentle routine.',
    dailyBreakdown: [
      { label: 'Wk 1', minutes: 50, status: 'done' },
      { label: 'Wk 2', minutes: 60, status: 'done' },
      { label: 'Wk 3', minutes: 55, status: 'light' },
      { label: 'Wk 4', minutes: 70, status: 'done' },
    ],
  },
};

// --- C. Your Direction Dataset ---
interface DirectionPresetGoal {
  id: string;
  title: string;
  description: string;
  defaultApproach: string;
  tailoredReason: string;
}

const PRESET_DIRECTION_GOALS: DirectionPresetGoal[] = [
  {
    id: 'energy',
    title: 'Rebuild steady daily energy',
    description: 'Focus on low-friction movement after meals and gentle afternoon decompression.',
    defaultApproach: '10–15 min light outdoor walks after lunch + 5 min desk stretches on busy days',
    tailoredReason: 'Matched to your preference for zero-equipment afternoon resets and flexible rest days.',
  },
  {
    id: 'sleep',
    title: 'Unwind for deeper evening rest',
    description: 'Release physical shoulder and neck tension before bedtime for smoother sleep onset.',
    defaultApproach: '5–10 min evening floor stretches + 15 min screen-free wind-down audio',
    tailoredReason: 'Designed around your 7h 24m sleep baseline to ease late-evening mental restlessness.',
  },
  {
    id: 'mobility',
    title: 'Ease desk stiffness & posture fatigue',
    description: 'Counteract long sitting blocks with brief micro-mobility breaks.',
    defaultApproach: '5 min neck & shoulder mobility flow twice a week + gentle midday walks',
    tailoredReason: 'Built for high-meeting workdays where leaving home for a full workout feels overwhelming.',
  },
];

interface DirectionState {
  status: 'active' | 'paused';
  goalId: string;
  goalTitle: string;
  description: string;
  executionApproach: string;
  tailoredReason: string;
  nextReviewDate: string;
  reviewDaysLeft: number;
}

// --- D. What Nova Knows (Memory Dataset) ---
export type MemoryCategory = 'matters' | 'feels_right' | 'check';

export interface MemoryItem {
  id: string;
  category: MemoryCategory;
  title: string;
  summary: string;
  learnedFrom: string;
  howItHelps: string;
  updatedAt: string;
  isConfirmed: boolean;
}

const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-walk-window',
    category: 'feels_right',
    title: 'Preferred midday walking window is 1:15 PM – 1:45 PM',
    summary: 'Short 15-minute outdoor walks right after lunch feel easiest to start and help clear afternoon screen fatigue.',
    learnedFrom: 'Observed from 5 completed post-lunch walks over the past two weeks.',
    howItHelps: 'Nova schedules outdoor walk suggestions after 1:00 PM instead of early mornings.',
    updatedAt: 'Updated 2 days ago',
    isConfirmed: true
  },
  {
    id: 'mem-home-stretch',
    category: 'feels_right',
    title: 'Prefers low-friction living room stretches over gym routines',
    summary: 'No-mat, no-workout-clothes 5-minute stretches in the living room work best when workdays run late.',
    learnedFrom: 'You chose “5-minute stretch at home” as your Plan B three times on busy Tuesdays and Thursdays.',
    howItHelps: 'When energy or time is low, Nova defaults to standing or seated home stretches with zero setup.',
    updatedAt: 'Updated 5 days ago',
    isConfirmed: true
  },
  {
    id: 'mem-steady-energy',
    category: 'matters',
    title: 'Gradual nervous system reset without guilt or pace targets',
    summary: 'Building a calm, sustainable daily rhythm matters more than hitting calorie, step, or streak targets.',
    learnedFrom: 'Shared during your initial onboarding conversation with Nova.',
    howItHelps: 'Nova keeps all suggestions pressure-free and treats rest days as positive progress.',
    updatedAt: 'Saved Oct 28',
    isConfirmed: true
  },
  {
    id: 'mem-neck-tension',
    category: 'matters',
    title: 'Relieving afternoon neck and shoulder stiffness from desk work',
    summary: 'Long blocks of laptop work cause upper-back tightness by late afternoon.',
    learnedFrom: 'You mentioned “My shoulders feel super tight after meetings” in chat last week.',
    howItHelps: 'Prioritizes gentle shoulder rolls and upper-back decompression in your Plan B audio guides.',
    updatedAt: 'Saved Nov 1',
    isConfirmed: true
  },
  {
    id: 'mem-rainy-days',
    category: 'check',
    title: 'Switch to indoor breathing & mobility on rainy or cold days?',
    summary: 'It looks like you prefer staying indoors when temperatures drop below 12°C or when it rains.',
    learnedFrom: 'Noticed you switched outdoor walks to indoor Plan B on two rainy afternoons.',
    howItHelps: 'If confirmed, Nova will automatically suggest indoor sessions whenever wet or chilly weather is detected.',
    updatedAt: 'New observation',
    isConfirmed: false
  },
  {
    id: 'mem-sunday-recharge',
    category: 'check',
    title: 'Keep Sundays as a protected, notification-free rest day?',
    summary: 'You usually take Sundays off from structured plans to recharge quietly at home.',
    learnedFrom: 'Observed from your past 3 Sundays marked as Mindful Rest.',
    howItHelps: 'If confirmed, Nova will default Sundays to a quiet rest state without prompting for workouts.',
    updatedAt: 'New observation',
    isConfirmed: false
  }
];

interface MemoryChatProposal {
  mode: 'update' | 'add';
  targetMemoryId?: string;
  newTitle: string;
  newSummary: string;
  newCategory: MemoryCategory;
}

interface MemoryChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  proposal?: MemoryChatProposal;
  proposalAccepted?: boolean;
}

// --- E. Health Data Metrics ---
interface HealthMetricDefinition {
  id: string;
  name: string;
  sampleValue: string;
  unit: string;
  source: string;
  lastUpdated: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}

const HEALTH_METRICS_DEFINITIONS: HealthMetricDefinition[] = [
  {
    id: 'rhr',
    name: 'Resting Heart Rate',
    sampleValue: '62',
    unit: 'bpm',
    source: 'Apple Watch (Sample)',
    lastUpdated: 'Today, 8:30 AM',
    icon: Heart,
    iconColor: 'text-[#E11D48]',
    iconBg: 'bg-[#FFE4E6]',
  },
  {
    id: 'sleep',
    name: 'Sleep Duration',
    sampleValue: '7h 24m',
    unit: 'avg',
    source: 'Apple Health (Sample)',
    lastUpdated: 'Today, 7:15 AM',
    icon: Moon,
    iconColor: 'text-[#5E5BAE]',
    iconBg: 'bg-[#EDEBF9]',
  },
  {
    id: 'energy',
    name: 'Active Energy',
    sampleValue: '285',
    unit: 'kcal',
    source: 'Apple Health (Sample)',
    lastUpdated: 'Today, 9:20 AM',
    icon: Flame,
    iconColor: 'text-[#EA580C]',
    iconBg: 'bg-[#FFEDD5]',
  },
  {
    id: 'steps',
    name: 'Step Count',
    sampleValue: '5,420',
    unit: 'steps',
    source: 'iPhone Motion (Sample)',
    lastUpdated: 'Today, 9:35 AM',
    icon: Footprints,
    iconColor: 'text-[#0D9488]',
    iconBg: 'bg-[#CCFBF1]',
  },
];

// ============================================================================
// 2. VISUAL CHART SUB-COMPONENTS
// ============================================================================

function MonthlyTrendCurve({ compact = false }: { compact?: boolean }) {
  const maxVal = 22;
  const minVal = 4;
  const width = 280;
  const height = compact ? 68 : 96;
  const padX = 18;
  const padY = compact ? 14 : 18;

  const points = MONTHLY_TREND_SERIES.map((item, idx) => {
    const x = padX + (idx / (MONTHLY_TREND_SERIES.length - 1)) * (width - padX * 2);
    const y = height - padY - ((item.activeDays - minVal) / (maxVal - minVal)) * (height - padY * 2);
    return { x, y, ...item };
  });

  const linePath = points
    .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
    .join(' ');

  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${height} L ${points[0].x.toFixed(1)} ${height} Z`;

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible select-none"
        aria-label="Monthly active days trend curve from June to November"
      >
        <defs>
          <linearGradient id="rhythmTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E5BAE" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#5E5BAE" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        <line
          x1={padX}
          y1={height / 2}
          x2={width - padX}
          y2={height / 2}
          stroke="#26263F"
          strokeOpacity="0.06"
          strokeDasharray="3 3"
        />

        <path d={areaPath} fill="url(#rhythmTrendFill)" />

        <path
          d={linePath}
          fill="none"
          stroke="#5E5BAE"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((pt, idx) => {
          const isLatest = idx === points.length - 1;
          return (
            <g key={pt.month}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isLatest ? 4.5 : 3}
                className={isLatest ? 'fill-[#FF7A32] stroke-white stroke-2' : 'fill-[#5E5BAE] stroke-white stroke-[1.5]'}
              />
              {(!compact || isLatest || idx === 0 || idx === 2) && (
                <text
                  x={pt.x}
                  y={pt.y - 7}
                  textAnchor="middle"
                  className={`text-[9px] font-bold ${isLatest ? 'fill-[#5E5BAE]' : 'fill-[#7A7895]'}`}
                >
                  {pt.activeDays}d
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="flex items-center justify-between px-1.5 mt-1 text-[10px] font-medium text-[#7A7895]">
        {MONTHLY_TREND_SERIES.map((item, idx) => (
          <span
            key={item.month}
            className={idx === MONTHLY_TREND_SERIES.length - 1 ? 'text-[#5E5BAE] font-bold' : ''}
          >
            {item.month}
          </span>
        ))}
      </div>
    </div>
  );
}

function ActiveMinutesBarChart({ timeframe }: { timeframe: RhythmTimeframe }) {
  const items = RHYTHM_RECENT_SUMMARY[timeframe].dailyBreakdown;
  const maxVal = timeframe === '7d' ? 20 : 80;

  return (
    <div className="pt-2">
      <div className="flex items-end justify-between gap-2 h-24 px-2 pt-4 border-b border-[#26263F]/[0.06]">
        {items.map((bar, idx) => {
          const heightPct = bar.minutes === 0 ? 12 : Math.max(22, Math.round((bar.minutes / maxVal) * 100));
          return (
            <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <span className="text-[9.5px] font-semibold text-[#7A7895]">
                {bar.minutes > 0 ? `${bar.minutes}m` : 'Rest'}
              </span>
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full max-w-[24px] rounded-t-[8px] transition-all duration-300 ${
                  bar.status === 'done'
                    ? 'bg-[#5E5BAE]'
                    : bar.status === 'light'
                    ? 'bg-[#8E8CD6]'
                    : 'bg-[#E59980]/60'
                }`}
              />
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 px-2 mt-1.5">
        {items.map((bar, idx) => (
          <span key={idx} className="flex-1 text-center text-[10px] font-medium text-[#7A7895]">
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 3. MAIN COMPONENT: PLAN VIEW (MERGED MY PLAN + MEMORY)
// ============================================================================

interface MyPlanViewProps {
  phoneFrameRef?: React.RefObject<HTMLDivElement | null>;
}

export function MyPlanView({ phoneFrameRef }: MyPlanViewProps) {
  // Real device date anchor
  const [deviceToday] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const d = now.getDate();
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { year: y, month: m, day: d, dateStr };
  });

  // 1. Activity Monthly State & Logs
  const [viewYear, setViewYear] = useState<number>(deviceToday.year);
  const [viewMonth, setViewMonth] = useState<number>(deviceToday.month);
  const [pickerYear, setPickerYear] = useState<number>(deviceToday.year);
  const [slideDirection, setSlideDirection] = useState<number>(0);

  const [activityLogs, setActivityLogs] = useState<Record<string, DayActivityRecord>>(() =>
    createInitialActivityLogs(deviceToday.year, deviceToday.month, deviceToday.day)
  );

  // Month Picker Modal & Day Detail Modal States
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState<boolean>(false);
  const [activeDayModalDate, setActiveDayModalDate] = useState<string | null>(null);
  const [dayDraftType, setDayDraftType] = useState<DayRecordType>('active');
  const [dayDraftTitle, setDayDraftTitle] = useState<string>('');
  const [dayDraftDuration, setDayDraftDuration] = useState<number>(15);
  const [dayDraftNote, setDayDraftNote] = useState<string>('');
  const [dayUpdateToast, setDayUpdateToast] = useState<string | null>(null);

  // 2. Your Rhythm Filter State
  const [rhythmFilter, setRhythmFilter] = useState<RhythmTimeframe>('7d');

  // 3. Secondary Sheet Navigation ('activity' | 'rhythm' | 'direction' | 'memory' | 'health' | null)
  const [selectedModule, setSelectedModule] = useState<SecondaryModuleType>(null);

  // 4. Methodology Info Popup State (Inside Your Rhythm Secondary Sheet)
  const [isMethodologyOpen, setIsMethodologyOpen] = useState<boolean>(false);

  // 5. Your Direction State & Edit Mode / Nova Direction Chat Mode
  const [direction, setDirection] = useState<DirectionState>({
    status: 'active',
    goalId: 'energy',
    goalTitle: PRESET_DIRECTION_GOALS[0].title,
    description: PRESET_DIRECTION_GOALS[0].description,
    executionApproach: PRESET_DIRECTION_GOALS[0].defaultApproach,
    tailoredReason: PRESET_DIRECTION_GOALS[0].tailoredReason,
    nextReviewDate: 'Nov 30, 2026',
    reviewDaysLeft: 12,
  });

  const [isEditingDirection, setIsEditingDirection] = useState<boolean>(false);
  const [directionDraft, setDirectionDraft] = useState<DirectionState>(direction);
  const [directionToast, setDirectionToast] = useState<boolean>(false);

  // Conversational Direction Adjustment with Nova (References memory without creating/modifying memories)
  const [isDirectionChatOpen, setIsDirectionChatOpen] = useState<boolean>(false);
  const [directionChatInput, setDirectionChatInput] = useState<string>('');
  const [directionChatMessages, setDirectionChatMessages] = useState<
    {
      id: string;
      sender: 'ai' | 'user';
      text: string;
      proposedDirection?: { goalTitle: string; description: string; executionApproach: string; tailoredReason: string };
      accepted?: boolean;
    }[]
  >([]);
  const directionChatEndRef = useRef<HTMLDivElement>(null);

  // 6. What Nova Knows (Memory State & Sheets)
  const [memories, setMemories] = useState<MemoryItem[]>(INITIAL_MEMORIES);
  const [selectedMemory, setSelectedMemory] = useState<MemoryItem | null>(null);
  const [memoryToDelete, setMemoryToDelete] = useState<MemoryItem | null>(null);
  const [isMemoryInfoModalOpen, setIsMemoryInfoModalOpen] = useState<boolean>(false);

  // Conversational Memory Sheet (Supports editing an existing memory OR supplementing/adding a new memory)
  const [isMemoryChatOpen, setIsMemoryChatOpen] = useState<boolean>(false);
  const [editingMemory, setEditingMemory] = useState<MemoryItem | null>(null);
  const [memoryChatMessages, setMemoryChatMessages] = useState<MemoryChatMessage[]>([]);
  const [memoryChatInput, setMemoryChatInput] = useState<string>('');
  const memoryChatEndRef = useRef<HTMLDivElement>(null);

  // 7. Apple Health Connection Toggle (Frontend Demo Simulation)
  const [isAppleHealthConnected, setIsAppleHealthConnected] = useState<boolean>(true);

  const currentRecentData = RHYTHM_RECENT_SUMMARY[rhythmFilter];

  // Scroll chat containers to bottom
  useEffect(() => {
    if (isMemoryChatOpen) {
      memoryChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [memoryChatMessages, isMemoryChatOpen]);

  useEffect(() => {
    if (isDirectionChatOpen) {
      directionChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [directionChatMessages, isDirectionChatOpen]);

  // --- Computed Activity Month Grid Values ---
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const isCurrentMonth = viewYear === deviceToday.year && viewMonth === deviceToday.month;

  const monthPrefix = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const currentMonthRecords = Object.values(activityLogs).filter((r) => r.date.startsWith(monthPrefix));
  const activeDaysCount = currentMonthRecords.filter((r) => r.type === 'active').length;
  const restDaysCount = currentMonthRecords.filter((r) => r.type === 'rest').length;
  const totalMinutes = currentMonthRecords.reduce((acc, cur) => acc + (cur.durationMinutes || 0), 0);

  // --- Computed Nova 1-Sentence Top Observation ---
  const confirmedMemories = memories.filter((m) => m.isConfirmed);
  const hasSufficientData = Object.keys(activityLogs).length >= 3 || confirmedMemories.length > 0;
  const novaTopObservation = hasSufficientData
    ? 'Short walks have been fitting into your afternoons lately.'
    : 'I’m getting to know your rhythm.';

  // Representative 3 memories for Level-1 "What Nova knows"
  const representativeMemories = memories.slice(0, 3);
  const mattersMemories = memories.filter((m) => m.category === 'matters' && m.isConfirmed);
  const feelsRightMemories = memories.filter((m) => m.category === 'feels_right' && m.isConfirmed);
  const checkMemories = memories.filter((m) => !m.isConfirmed);

  // --- Handlers for Month Switching ---
  const handlePrevMonth = () => {
    setSlideDirection(-1);
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    setSlideDirection(1);
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectMonth = (targetYear: number, targetMonth: number) => {
    const currentTotal = viewYear * 12 + viewMonth;
    const targetTotal = targetYear * 12 + targetMonth;
    setSlideDirection(targetTotal >= currentTotal ? 1 : -1);
    setViewYear(targetYear);
    setViewMonth(targetMonth);
    setIsMonthPickerOpen(false);
  };

  const handleJumpToThisMonth = () => {
    const currentTotal = viewYear * 12 + viewMonth;
    const todayTotal = deviceToday.year * 12 + deviceToday.month;
    setSlideDirection(todayTotal >= currentTotal ? 1 : -1);
    setViewYear(deviceToday.year);
    setViewMonth(deviceToday.month);
  };

  // --- Handlers for Day Detail & Record Correction ---
  const handleOpenDayDetail = (dateStr: string) => {
    const existing = activityLogs[dateStr];
    setActiveDayModalDate(dateStr);
    if (existing) {
      setDayDraftType(existing.type);
      setDayDraftTitle(existing.title || (existing.type === 'rest' ? 'Mindful rest day' : '15-min mindful walk'));
      setDayDraftDuration(existing.durationMinutes ?? (existing.type === 'active' ? 15 : 0));
      setDayDraftNote(existing.note || '');
    } else {
      setDayDraftType('active');
      setDayDraftTitle('');
      setDayDraftDuration(15);
      setDayDraftNote('');
    }
  };

  const handleSaveDayRecord = () => {
    if (!activeDayModalDate) return;
    if (dayDraftType === 'active' && !dayDraftTitle.trim()) return;

    setActivityLogs((prev) => {
      const next = { ...prev };
      if (dayDraftType === 'none') {
        delete next[activeDayModalDate];
      } else {
        next[activeDayModalDate] = {
          date: activeDayModalDate,
          type: dayDraftType,
          title: dayDraftType === 'rest' ? 'Mindful rest day' : dayDraftTitle.trim(),
          durationMinutes: dayDraftType === 'rest' ? 0 : dayDraftDuration,
          note: dayDraftNote.trim() || (dayDraftType === 'rest' ? 'Restorative recovery day' : 'Logged manually'),
          isSample: false
        };
      }
      return next;
    });

    const label = dayDraftType === 'none' ? 'Record cleared' : dayDraftType === 'rest' ? 'Rest day saved' : 'Activity saved';
    setDayUpdateToast(label);
    setTimeout(() => setDayUpdateToast(null), 2600);
    setActiveDayModalDate(null);
  };

  // --- Handlers for Direction ---
  const handleStartEditDirection = () => {
    setDirectionDraft(direction);
    setIsEditingDirection(true);
  };

  const handleConfirmDirectionChanges = () => {
    setDirection(directionDraft);
    setIsEditingDirection(false);
    setDirectionToast(true);
    setTimeout(() => setDirectionToast(false), 2800);
  };

  const handleCancelDirectionChanges = () => {
    setDirectionDraft(direction);
    setIsEditingDirection(false);
  };

  const handleTogglePausePlan = () => {
    const nextStatus = direction.status === 'active' ? 'paused' : 'active';
    const updated = { ...direction, status: nextStatus as 'active' | 'paused' };
    setDirection(updated);
    setDirectionDraft(updated);
    setDirectionToast(true);
    setTimeout(() => setDirectionToast(false), 2800);
  };

  // Conversational Direction Adjustment with Nova (References memory without modifying memories)
  const handleOpenDirectionChat = () => {
    const referencedMem = confirmedMemories[0]?.title || 'your preference for midday walks and low-friction stretches';
    setDirectionChatInput('');
    setDirectionChatMessages([
      {
        id: `dir-ai-init-${Date.now()}`,
        sender: 'ai',
        text: `Right now your direction is “${direction.goalTitle}” (${direction.executionApproach}). Keeping in mind what I know about you — ${referencedMem.toLowerCase()} — how would you like to adjust your focus or pace?`
      }
    ]);
    setIsDirectionChatOpen(true);
  };

  const handleSendDirectionChat = (textOverride?: string) => {
    const raw = (textOverride ?? directionChatInput).trim();
    if (!raw) return;

    const userMsg = {
      id: `dir-user-${Date.now()}`,
      sender: 'user' as const,
      text: raw
    };

    const lower = raw.toLowerCase();
    let proposed = {
      goalTitle: direction.goalTitle,
      description: direction.description,
      executionApproach: raw,
      tailoredReason: 'Updated in conversation with Nova, referencing your known rhythm preferences.'
    };

    if (lower.includes('sleep') || lower.includes('evening') || lower.includes('night') || lower.includes('unwind')) {
      proposed = {
        goalTitle: 'Unwind for deeper evening rest',
        description: 'Release physical shoulder and neck tension before bedtime for smoother sleep onset.',
        executionApproach: '5–10 min evening floor stretches + 15 min screen-free wind-down audio',
        tailoredReason: 'Aligned with your known preference for low-friction home stretches and calm recovery.'
      };
    } else if (lower.includes('stiff') || lower.includes('neck') || lower.includes('shoulder') || lower.includes('desk')) {
      proposed = {
        goalTitle: 'Ease desk stiffness & posture fatigue',
        description: 'Counteract long sitting blocks with brief micro-mobility breaks.',
        executionApproach: '5 min neck & shoulder mobility flow twice a week + gentle midday walks',
        tailoredReason: 'References your afternoon shoulder stiffness memory while keeping sessions short.'
      };
    } else if (lower.includes('3') || lower.includes('lighter') || lower.includes('gentle') || lower.includes('slow')) {
      proposed = {
        goalTitle: direction.goalTitle,
        description: direction.description,
        executionApproach: '3 light 10-min afternoon walks per week + guilt-free rest days whenever work runs late',
        tailoredReason: 'Softened weekly frequency to match your no-pressure, nervous-system-first approach.'
      };
    }

    const aiMsg = {
      id: `dir-ai-${Date.now() + 1}`,
      sender: 'ai' as const,
      text: 'Here is the updated direction I drafted for you. It references your preferences without overwriting your saved memories. Would you like to apply it?',
      proposedDirection: proposed,
      accepted: false
    };

    setDirectionChatMessages((prev) => [...prev, userMsg, aiMsg]);
    if (!textOverride) setDirectionChatInput('');
  };

  const handleAcceptDirectionProposal = (msgId: string) => {
    const targetMsg = directionChatMessages.find((m) => m.id === msgId);
    if (!targetMsg || !targetMsg.proposedDirection) return;

    const { goalTitle, description, executionApproach, tailoredReason } = targetMsg.proposedDirection;
    const nextDir: DirectionState = {
      ...direction,
      goalTitle,
      description,
      executionApproach,
      tailoredReason
    };
    setDirection(nextDir);
    setDirectionDraft(nextDir);
    setDirectionChatMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, accepted: true } : m))
    );
    setDirectionToast(true);
    setTimeout(() => {
      setIsDirectionChatOpen(false);
    }, 550);
    setTimeout(() => setDirectionToast(false), 2800);
  };

  // --- Handlers for What Nova Knows (Memory) ---
  const showMemoryFeedback = (text: string) => {
    setDayUpdateToast(text);
    setTimeout(() => setDayUpdateToast(null), 2600);
  };

  const handleConfirmPendingMemory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMemories((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              category: 'feels_right',
              isConfirmed: true,
              updatedAt: 'Confirmed just now'
            }
          : m
      )
    );
    if (selectedMemory?.id === id) {
      setSelectedMemory((prev) =>
        prev ? { ...prev, category: 'feels_right', isConfirmed: true, updatedAt: 'Confirmed just now' } : null
      );
    }
    showMemoryFeedback('Memory confirmed and saved');
  };

  const handleDismissPendingMemory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMemories((prev) => prev.filter((m) => m.id !== id));
    if (selectedMemory?.id === id) {
      setSelectedMemory(null);
    }
    showMemoryFeedback('Observation discarded');
  };

  const handleDeleteMemoryConfirmed = () => {
    if (!memoryToDelete) return;
    const targetId = memoryToDelete.id;
    setMemories((prev) => prev.filter((m) => m.id !== targetId));
    if (selectedMemory?.id === targetId) {
      setSelectedMemory(null);
    }
    if (editingMemory?.id === targetId) {
      setEditingMemory(null);
      setIsMemoryChatOpen(false);
    }
    setMemoryToDelete(null);
    showMemoryFeedback('Removed from What Nova knows');
  };

  // Open Talk to Nova for either modifying a specific memory OR supplementing/adding/correcting from the section entry
  const handleStartTalkToNovaMemory = (item?: MemoryItem | null, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMemory(null);
    setEditingMemory(item || null);
    setMemoryChatInput('');

    if (item) {
      setMemoryChatMessages([
        {
          id: `mem-ai-init-${Date.now()}`,
          sender: 'ai',
          text: `Right now I have this noted: “${item.title}.” How should we update or refine this so it fits you better?`
        }
      ]);
    } else {
      setMemoryChatMessages([
        {
          id: `mem-ai-init-${Date.now()}`,
          sender: 'ai',
          text: `What would you like me to remember, update, or correct about your routine, preferences, or life state? I’ll always confirm with you before saving.`
        }
      ]);
    }
    setIsMemoryChatOpen(true);
  };

  const buildMemoryProposal = (userText: string, currentItem: MemoryItem | null): MemoryChatProposal => {
    const lower = userText.toLowerCase();

    if (currentItem) {
      if (lower.includes('evening') || lower.includes('night') || lower.includes('after dinner') || lower.includes('7 pm')) {
        return {
          mode: 'update',
          targetMemoryId: currentItem.id,
          newTitle: 'Prefers gentle evening walks or wind-downs after 6:30 PM',
          newSummary: 'Evening hours after work feel calmer and more realistic than midday windows.',
          newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
        };
      }
      if (lower.includes('morning') || lower.includes('9 am') || lower.includes('before work')) {
        return {
          mode: 'update',
          targetMemoryId: currentItem.id,
          newTitle: 'Prefers a quiet 10-minute morning walk before 9:30 AM',
          newSummary: 'Starting the day with light movement before meetings feels freshest.',
          newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
        };
      }
      if (lower.includes('10 min') || lower.includes('shorter') || lower.includes('5 min') || lower.includes('brief')) {
        return {
          mode: 'update',
          targetMemoryId: currentItem.id,
          newTitle: 'Keep sessions brief (5–10 minutes) on normal workdays',
          newSummary: 'Shorter 5-to-10 minute micro-sessions feel much more approachable than 15-minute blocks.',
          newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
        };
      }
      return {
        mode: 'update',
        targetMemoryId: currentItem.id,
        newTitle: userText.length > 68 ? `${userText.slice(0, 65)}...` : userText,
        newSummary: `Updated directly from your conversation with Nova: “${userText}”`,
        newCategory: currentItem.category === 'check' ? 'feels_right' : currentItem.category
      };
    }

    // Adding / supplementing a new memory or correcting existing preferences
    if (lower.includes('morning') || lower.includes('before work')) {
      return {
        mode: 'add',
        newTitle: 'Enjoys quiet 10-minute morning walks before work starts',
        newSummary: 'Gentle morning fresh air before opening laptops helps set a steady tone for the day.',
        newCategory: 'feels_right'
      };
    }
    if (lower.includes('knee') || lower.includes('back') || lower.includes('joint') || lower.includes('low-impact')) {
      return {
        mode: 'add',
        newTitle: 'Keep movements gentle and low-impact for joint comfort',
        newSummary: 'Avoids high-impact jumping or deep knee strain in favor of smooth mobility.',
        newCategory: 'matters'
      };
    }
    if (lower.includes('evening') || lower.includes('sleep') || lower.includes('after 8')) {
      return {
        mode: 'add',
        newTitle: 'Prefers calm, screen-free wind-downs after 8:30 PM',
        newSummary: 'Protecting late evenings for quiet relaxation supports deeper rest.',
        newCategory: 'feels_right'
      };
    }

    return {
      mode: 'add',
      newTitle: userText.length > 68 ? `${userText.slice(0, 65)}...` : userText,
      newSummary: `Shared with Nova: “${userText}”`,
      newCategory: 'feels_right'
    };
  };

  const handleSendMemoryChat = (textOverride?: string) => {
    const raw = (textOverride ?? memoryChatInput).trim();
    if (!raw) return;

    const userMsg: MemoryChatMessage = {
      id: `mem-user-${Date.now()}`,
      sender: 'user',
      text: raw
    };

    const proposal = buildMemoryProposal(raw, editingMemory);

    const aiMsg: MemoryChatMessage = {
      id: `mem-ai-${Date.now() + 1}`,
      sender: 'ai',
      text:
        proposal.mode === 'update'
          ? 'Got it. Before I update this memory, please confirm if this looks accurate:'
          : 'Thanks for sharing that. Before I save this to your memory, please confirm if this looks right:',
      proposal,
      proposalAccepted: false
    };

    setMemoryChatMessages((prev) => [...prev, userMsg, aiMsg]);
    if (!textOverride) setMemoryChatInput('');
  };

  const handleConfirmMemoryProposal = (messageId: string) => {
    const targetMsg = memoryChatMessages.find((m) => m.id === messageId);
    if (!targetMsg || !targetMsg.proposal) return;

    const { mode, targetMemoryId, newTitle, newSummary, newCategory } = targetMsg.proposal;

    if (mode === 'update' && targetMemoryId) {
      setMemories((prev) =>
        prev.map((m) =>
          m.id === targetMemoryId
            ? {
                ...m,
                title: newTitle,
                summary: newSummary,
                category: newCategory,
                isConfirmed: true,
                learnedFrom: 'Refined directly in conversation with Nova.',
                updatedAt: 'Updated just now'
              }
            : m
        )
      );
      showMemoryFeedback('Memory updated after your confirmation');
    } else {
      const newItem: MemoryItem = {
        id: `mem-custom-${Date.now()}`,
        category: newCategory,
        title: newTitle,
        summary: newSummary,
        learnedFrom: 'Shared directly in conversation with Nova.',
        howItHelps: 'Nova will factor this preference into your future daily suggestions and pacing.',
        updatedAt: 'Saved just now',
        isConfirmed: true
      };
      setMemories((prev) => [newItem, ...prev]);
      showMemoryFeedback('New memory saved after your confirmation');
    }

    setMemoryChatMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, proposalAccepted: true } : m))
    );

    setTimeout(() => {
      setIsMemoryChatOpen(false);
      setEditingMemory(null);
    }, 550);
  };

  return (
    <div className="flex-1 overflow-y-auto px-6 pt-1 pb-6 flex flex-col gap-3.5 z-10 scrollbar-none select-none">
      
      {/* Toast Notifications */}
      <AnimatePresence>
        {directionToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#5E5BAE] text-white px-4 py-2.5 rounded-[18px] text-xs font-semibold shadow-md flex items-center justify-between z-20 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Direction updated</span>
            </div>
            <span className="text-[11px] text-white/80">Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dayUpdateToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#5E5BAE] text-white px-4 py-2.5 rounded-[18px] text-xs font-semibold shadow-md flex items-center justify-between z-20 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{dayUpdateToast}</span>
            </div>
            <span className="text-[11px] text-white/80">Saved</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================================================ */}
      {/* 1. Nova's One-Sentence Observation (Top of Plan Level-1)     */}
      {/* ============================================================ */}
      <section
        id="plan-nova-observation"
        aria-label="Nova's observation"
        className="bg-white/75 backdrop-blur-md rounded-[22px] px-4 py-3 border border-white/85 shadow-[0_4px_18px_rgba(90,80,140,0.04)] flex items-center gap-3"
      >
        <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#E5DDFB] to-[#F3EEFE] border border-white shadow-2xs overflow-hidden shrink-0 flex items-center justify-center">
          <img
            src={NOVA_LISTENING_URL}
            alt="Nova"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover scale-125 translate-y-0.5"
          />
        </div>
        <p className="text-[13.5px] font-medium text-[#26263F] leading-snug flex-1">
          “{novaTopObservation}”
        </p>
      </section>

      {/* ============================================================ */}
      {/* 2. Module: Activity (Compact Illuminated Monthly Grid)       */}
      {/* ============================================================ */}
      <section
        id="plan-module-activity"
        className="bg-white/70 backdrop-blur-md rounded-[24px] p-4.5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] flex flex-col gap-2.5 relative"
        aria-label="Activity Monthly Records"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#26263F] tracking-tight">Activity</span>
            <button
              type="button"
              onClick={() => {
                setPickerYear(viewYear);
                setIsMonthPickerOpen(true);
              }}
              className="flex items-center gap-1 text-[12px] font-semibold text-[#26263F] bg-[#26263F]/[0.05] hover:bg-[#26263F]/[0.09] active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer"
              aria-label="Select month"
            >
              <span>{MONTH_NAMES[viewMonth]} {viewYear}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#5E5BAE] opacity-75" />
            </button>
          </div>

          {!isCurrentMonth && (
            <button
              type="button"
              onClick={handleJumpToThisMonth}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#5E5BAE] bg-[#5E5BAE]/10 hover:bg-[#5E5BAE]/18 active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer"
              aria-label="Return to this month"
            >
              <RotateCcw className="w-3 h-3 stroke-[2.2]" />
              <span>This month</span>
            </button>
          )}
        </div>

        {/* Weekday indicators */}
        <div className="grid grid-cols-7 gap-1.5 text-center select-none pt-0.5">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayInitial, idx) => (
            <span key={idx} className="text-[9.5px] font-bold text-[#8C8AA3] uppercase tracking-wider">
              {dayInitial}
            </span>
          ))}
        </div>

        {/* Compact Monthly Illuminated Dot Grid */}
        <div className="relative select-none overflow-hidden touch-pan-y">
          <motion.div
            key={`${viewYear}-${viewMonth}`}
            initial={{ opacity: 0, x: slideDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x > 40) handlePrevMonth();
              else if (info.offset.x < -40) handleNextMonth();
            }}
            className="grid grid-cols-7 gap-1.5 cursor-grab active:cursor-grabbing py-1"
          >
            {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
              <div key={`empty-prefix-${idx}`} className="aspect-square w-full" />
            ))}

            {Array.from({ length: daysInCurrentMonth }, (_, i) => i + 1).map((dayNum) => {
              const dStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const record = activityLogs[dStr];
              const isToday = viewYear === deviceToday.year && viewMonth === deviceToday.month && dayNum === deviceToday.day;
              const isFuture =
                viewYear > deviceToday.year ||
                (viewYear === deviceToday.year && viewMonth > deviceToday.month) ||
                (viewYear === deviceToday.year && viewMonth === deviceToday.month && dayNum > deviceToday.day);

              return (
                <button
                  type="button"
                  key={dStr}
                  onClick={() => handleOpenDayDetail(dStr)}
                  aria-label={`${dStr}: ${record?.type || 'no record'}`}
                  className={`aspect-square w-full max-w-[34px] mx-auto rounded-[8px] flex items-center justify-center transition-all duration-150 relative cursor-pointer active:scale-88 ${
                    isToday ? 'ring-2 ring-[#5E5BAE] ring-offset-2 ring-offset-white/80' : ''
                  } ${
                    record?.type === 'active'
                      ? 'bg-[#5E5BAE] shadow-[0_2px_8px_rgba(94,91,174,0.32)] hover:brightness-105'
                      : record?.type === 'rest'
                      ? 'bg-[#E59980] shadow-[0_2px_8px_rgba(229,153,128,0.32)] hover:brightness-105'
                      : isFuture
                      ? 'bg-[#26263F]/[0.025] border border-dashed border-[#26263F]/15 hover:bg-[#26263F]/[0.08]'
                      : 'bg-[#26263F]/[0.07] hover:bg-[#26263F]/[0.14]'
                  }`}
                >
                  {isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-1 right-1 shadow-xs pointer-events-none" />
                  )}
                </button>
              );
            })}
          </motion.div>
        </div>

        {/* Status Legend & Sample Data Label (No extra stats numbers) */}
        <div className="pt-2 border-t border-[#26263F]/[0.06] flex items-center justify-between text-[11px] text-[#7A7895]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#5E5BAE]" />
              <span className="text-[#26263F] font-medium">Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#E59980]" />
              <span className="text-[#26263F] font-medium">Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-[4px] bg-[#26263F]/15" />
              <span>No record</span>
            </div>
          </div>
          <span className="text-[10px] font-medium text-[#8C8AA3] bg-[#26263F]/[0.04] px-2 py-0.5 rounded-full">
            Sample data
          </span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. Module: Your rhythm (6-month curve + 2 metrics, NO Nova noticed duplication) */}
      {/* ============================================================ */}
      <section
        id="plan-module-rhythm"
        onClick={() => setSelectedModule('rhythm')}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('rhythm')}
        aria-label="View Your rhythm details"
        className="group bg-white/70 hover:bg-white/85 transition-all duration-200 backdrop-blur-md rounded-[24px] p-4.5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] flex flex-col gap-3 relative cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <span className="text-[16px] font-bold text-[#26263F] tracking-tight">Your rhythm</span>

          <div className="flex items-center gap-2">
            {/* 7 days / Month toggle (Stop propagation so toggling doesn't open sheet) */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#26263F]/[0.06] p-0.5 rounded-full inline-flex"
            >
              <button
                type="button"
                onClick={() => setRhythmFilter('7d')}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-all cursor-pointer ${
                  rhythmFilter === '7d'
                    ? 'bg-white text-[#5E5BAE] font-bold shadow-2xs'
                    : 'text-[#7A7895] font-medium hover:text-[#26263F]'
                }`}
              >
                7 days
              </button>
              <button
                type="button"
                onClick={() => setRhythmFilter('month')}
                className={`px-2.5 py-1 text-[11px] rounded-full transition-all cursor-pointer ${
                  rhythmFilter === 'month'
                    ? 'bg-white text-[#5E5BAE] font-bold shadow-2xs'
                    : 'text-[#7A7895] font-medium hover:text-[#26263F]'
                }`}
              >
                Month
              </button>
            </div>

            <ChevronRight className="w-4 h-4 text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform stroke-[2.2]" />
          </div>
        </div>

        {/* 6-Month Trend Curve */}
        <div className="bg-white/55 px-3.5 py-2.5 rounded-[18px] border border-white/75">
          <MonthlyTrendCurve compact={true} />
        </div>

        {/* Small amount of recent data: 2 compact metrics */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/60 px-3.5 py-2.5 rounded-[16px] border border-white/75 flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-[#7A7895]">Completed</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[17px] font-bold text-[#26263F] leading-none">
                {currentRecentData.completedCount}
              </span>
              <span className="text-[10.5px] text-[#7A7895]">sessions</span>
            </div>
          </div>

          <div className="bg-white/60 px-3.5 py-2.5 rounded-[16px] border border-white/75 flex items-baseline justify-between">
            <span className="text-[11px] font-medium text-[#7A7895]">Duration</span>
            <div className="flex items-baseline gap-1">
              <span className="text-[17px] font-bold text-[#26263F] leading-none">
                {currentRecentData.activeMinutes}
              </span>
              <span className="text-[10.5px] text-[#7A7895]">min</span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. Module: Your direction (Goal, 1-line approach, next review) */}
      {/* ============================================================ */}
      <section
        id="plan-module-direction"
        onClick={() => setSelectedModule('direction')}
        className="group bg-white/70 hover:bg-white/85 transition-all duration-200 backdrop-blur-md rounded-[24px] p-4.5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] cursor-pointer flex flex-col gap-2.5 relative"
        role="button"
        tabIndex={0}
        aria-label="View Your direction details"
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('direction')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#26263F] tracking-tight">Your direction</span>
            {direction.status === 'paused' && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#C27838]/15 text-[#C27838]">
                Paused
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform stroke-[2.2]" />
        </div>

        <div className="flex flex-col gap-1">
          <h4 className="text-[14.5px] font-bold text-[#26263F] tracking-tight leading-snug">
            {direction.goalTitle}
          </h4>
          <p className="text-[12.5px] text-[#5D5B78] truncate">
            {direction.executionApproach}
          </p>
        </div>

        <div className="pt-1 border-t border-[#26263F]/[0.05] flex items-center justify-between text-[11px] text-[#7A7895]">
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 stroke-[2] shrink-0 text-[#5E5BAE]" />
            <span>
              Next review: <strong className="text-[#26263F] font-semibold">{direction.nextReviewDate}</strong>
            </span>
          </span>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. Module: What Nova knows (2–3 representative items + Talk to Nova) */}
      {/* ============================================================ */}
      <section
        id="plan-module-memory"
        aria-label="What Nova knows"
        className="bg-white/70 backdrop-blur-md rounded-[24px] p-4.5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] flex flex-col gap-2.5 relative"
      >
        {/* Header: Clickable to open full Memory list sheet */}
        <button
          type="button"
          onClick={() => setSelectedModule('memory')}
          className="w-full flex items-center justify-between text-left group cursor-pointer"
          aria-label="View all memories in What Nova knows"
        >
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#26263F] tracking-tight">What Nova knows</span>
            {checkMemories.length > 0 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#5E5BAE]/10 text-[#5E5BAE]">
                {checkMemories.length} to check
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-[11.5px] font-semibold text-[#5E5BAE]">
            <span>All ({memories.length})</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform stroke-[2.2]" />
          </div>
        </button>

        {/* 2–3 Representative Preferences or Life States */}
        {representativeMemories.length === 0 ? (
          <div
            onClick={() => setSelectedModule('memory')}
            className="bg-white/55 rounded-[16px] p-3.5 border border-white/75 text-[12.5px] text-[#7A7895] cursor-pointer"
          >
            No preferences saved yet. Talk to Nova to share what works for you.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {representativeMemories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedMemory(item)}
                className="w-full bg-white/60 hover:bg-white/90 active:scale-[0.99] transition-all px-3.5 py-2.5 rounded-[16px] border border-white/80 flex items-center justify-between gap-2.5 text-left cursor-pointer group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5E5BAE] shrink-0" />
                  <span className="text-[13px] font-semibold text-[#26263F] truncate">
                    {item.title}
                  </span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#7A7895] group-hover:text-[#5E5BAE] shrink-0 stroke-[2.2]" />
              </button>
            ))}
          </div>
        )}

        {/* Conversational Entry: Modify, Supplement, or Correct via Nova */}
        <div className="pt-0.5 flex items-center justify-between">
          <button
            type="button"
            id="plan-memory-talk-btn"
            onClick={() => handleStartTalkToNovaMemory(null)}
            className="w-full py-2.5 px-3.5 rounded-[16px] bg-[#5E5BAE]/[0.08] hover:bg-[#5E5BAE]/[0.14] active:scale-[0.99] text-[#5E5BAE] text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>Talk to Nova to update or add</span>
          </button>
        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. Module: Health data (Only 2 core metrics + source status) */}
      {/* ============================================================ */}
      <section
        id="plan-module-health"
        onClick={() => setSelectedModule('health')}
        className="group bg-white/70 hover:bg-white/85 transition-all duration-200 backdrop-blur-md rounded-[24px] p-4.5 border border-white/80 shadow-[0_4px_20px_rgba(90,80,140,0.04)] cursor-pointer flex flex-col gap-3 relative"
        role="button"
        tabIndex={0}
        aria-label="View Health data details"
        onKeyDown={(e) => e.key === 'Enter' && setSelectedModule('health')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[16px] font-bold text-[#26263F] tracking-tight">Health data</span>
            <span
              className={`text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                isAppleHealthConnected
                  ? 'text-[#E11D48] bg-[#FFE4E6]/80'
                  : 'text-[#7A7895] bg-[#26263F]/[0.05]'
              }`}
            >
              <Heart className="w-2.5 h-2.5 fill-current" />
              {isAppleHealthConnected ? 'Sample sync' : 'Not connected'}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#5E5BAE] group-hover:translate-x-0.5 transition-transform stroke-[2.2]" />
        </div>

        {/* 2 Core Metrics Only on Level-1 (Resting Heart Rate & Sleep Duration) */}
        <div className="grid grid-cols-2 gap-2.5">
          {HEALTH_METRICS_DEFINITIONS.slice(0, 2).map((metric) => {
            const displayValue = isAppleHealthConnected
              ? metric.sampleValue
              : metric.id === 'rhr'
              ? 'Not connected'
              : 'No data';
            const displayUnit = isAppleHealthConnected ? metric.unit : '';

            return (
              <div
                key={metric.id}
                className="bg-white/60 px-3.5 py-3 rounded-[16px] border border-white/75 flex flex-col justify-between gap-1.5"
              >
                <span className="text-[11px] font-medium text-[#7A7895] leading-snug">
                  {metric.name}
                </span>

                <div className="flex items-baseline gap-1 flex-wrap">
                  <span
                    className={`font-bold text-[#26263F] tracking-tight leading-none ${
                      isAppleHealthConnected ? 'text-[18px]' : 'text-[12.5px] text-[#8E8EA8]'
                    }`}
                  >
                    {displayValue}
                  </span>
                  {displayUnit && (
                    <span className="text-[10.5px] text-[#7A7895] font-medium">{displayUnit}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================ */}
      {/* SECONDARY DETAIL SHEETS (Rendered via React Portal)           */}
      {/* ============================================================ */}
      {(() => {
        const sheetPortalContent = (
          <AnimatePresence>
            {selectedModule && (
              <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto overflow-hidden">
                {/* Dimmed backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    setSelectedModule(null);
                    setIsEditingDirection(false);
                  }}
                  className="absolute inset-0 bg-black/25 backdrop-blur-xs"
                />

                {/* Slide-up Sheet */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                  className="relative w-full max-h-[88%] bg-[#FAF7F2] rounded-t-[32px] p-6 shadow-2xl border-t border-white/90 overflow-y-auto z-10 flex flex-col gap-4 text-[#26263F]"
                  id="my-plan-secondary-sheet"
                >
                  {/* Sheet Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06] shrink-0">
                    <div>
                      <h3 className="text-[18px] font-bold text-[#26263F]">
                        {selectedModule === 'activity' && 'Activity History'}
                        {selectedModule === 'rhythm' && 'Your rhythm'}
                        {selectedModule === 'direction' && 'Your direction'}
                        {selectedModule === 'memory' && 'What Nova knows'}
                        {selectedModule === 'health' && 'Health data'}
                      </h3>
                      <span className="text-[11px] text-[#7A7895]">
                        {selectedModule === 'activity' && 'Monthly action log & intervals'}
                        {selectedModule === 'rhythm' && 'Long-term trends & recent summary'}
                        {selectedModule === 'direction' && 'Long-term focus & conversational pacing'}
                        {selectedModule === 'memory' && 'Preferences & context Nova remembers'}
                        {selectedModule === 'health' && 'Apple Health integration & metrics'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {selectedModule === 'memory' && (
                        <button
                          type="button"
                          onClick={() => setIsMemoryInfoModalOpen(true)}
                          className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#5E5BAE] transition-colors cursor-pointer"
                          aria-label="How memory works"
                        >
                          <HelpCircle className="w-4 h-4 stroke-[2.2]" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedModule(null);
                          setIsEditingDirection(false);
                        }}
                        className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] transition-colors cursor-pointer"
                        aria-label="Return to Plan"
                      >
                        <X className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    </div>
                  </div>

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 1: YOUR RHYTHM                           */}
                  {/* ======================================================= */}
                  {selectedModule === 'rhythm' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      <div className="flex items-center justify-between bg-white/75 p-1 rounded-full border border-white/90 shadow-2xs">
                        <span className="text-xs font-semibold text-[#26263F] pl-3">
                          Time range
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setRhythmFilter('7d')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              rhythmFilter === '7d'
                                ? 'bg-[#5E5BAE] text-white shadow-2xs'
                                : 'text-[#7A7895] hover:text-[#26263F]'
                            }`}
                          >
                            7 days
                          </button>
                          <button
                            type="button"
                            onClick={() => setRhythmFilter('month')}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                              rhythmFilter === 'month'
                                ? 'bg-[#5E5BAE] text-white shadow-2xs'
                                : 'text-[#7A7895] hover:text-[#26263F]'
                            }`}
                          >
                            Month
                          </button>
                        </div>
                      </div>

                      <div className="bg-[#5E5BAE]/[0.08] p-3.5 rounded-[20px] border border-[#5E5BAE]/20 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                          <span>Nova noticed</span>
                        </div>
                        <p className="text-[12.5px] leading-relaxed text-[#26263F]">
                          “{currentRecentData.novaObservation}”
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/75 p-3 rounded-[18px] border border-white/85 flex flex-col justify-between">
                          <span className="text-[10.5px] font-medium text-[#7A7895]">Completed</span>
                          <div className="mt-1">
                            <span className="text-[18px] font-bold text-[#26263F] leading-none">
                              {currentRecentData.completedCount}
                            </span>
                            <span className="text-[10px] text-[#7A7895] block mt-0.5">sessions</span>
                          </div>
                        </div>

                        <div className="bg-white/75 p-3 rounded-[18px] border border-white/85 flex flex-col justify-between">
                          <span className="text-[10.5px] font-medium text-[#7A7895]">Active time</span>
                          <div className="mt-1">
                            <span className="text-[18px] font-bold text-[#26263F] leading-none">
                              {currentRecentData.activeMinutes}
                            </span>
                            <span className="text-[10px] text-[#7A7895] block mt-0.5">minutes</span>
                          </div>
                        </div>

                        <div className="bg-white/75 p-3 rounded-[18px] border border-white/85 flex flex-col justify-between">
                          <span className="text-[10.5px] font-medium text-[#7A7895]">Rest days</span>
                          <div className="mt-1">
                            <span className="text-[18px] font-bold text-[#E59980] leading-none">
                              {currentRecentData.restDaysCount}
                            </span>
                            <span className="text-[10px] text-[#7A7895] block mt-0.5">rest days</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white/75 p-4 rounded-[22px] border border-white/85 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <BarChart2 className="w-3.5 h-3.5 text-[#5E5BAE]" />
                            <span className="font-bold text-[#26263F] text-[12.5px]">
                              Active minutes ({rhythmFilter === '7d' ? 'by day' : 'by week'})
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-[#5E5BAE]">
                            {currentRecentData.activeMinutes} min total
                          </span>
                        </div>

                        <ActiveMinutesBarChart timeframe={rhythmFilter} />

                        <div className="pt-2 border-t border-black/[0.04] flex items-center justify-between text-[10.5px] text-[#7A7895]">
                          <span>Purple bars: Guided resets</span>
                          <span className="text-[#E59980]">Peach bars: Rest days</span>
                        </div>
                      </div>

                      <div className="bg-white/75 p-4 rounded-[22px] border border-white/85 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-[#5E5BAE]" />
                            <span className="font-bold text-[#26263F] text-[12.5px]">
                              Monthly active days (Long-term trend)
                            </span>
                          </div>
                          <span className="text-[11px] text-[#7A7895]">
                            Jun – Nov 2026
                          </span>
                        </div>

                        <MonthlyTrendCurve compact={false} />

                        <p className="text-[11px] text-[#7A7895] pt-1 leading-relaxed">
                          Reflects days with recorded activity. Stable consistency without burnout.
                        </p>
                      </div>

                      <div className="bg-white/75 p-4 rounded-[22px] border border-white/85 flex flex-col gap-2.5">
                        <span className="font-bold text-[#26263F] text-[12.5px]">
                          Action breakdown ({currentRecentData.rangeLabel})
                        </span>

                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                          <div className="bg-white/70 p-2.5 rounded-[16px] border border-white/80">
                            <div className="w-2 h-2 rounded-full bg-[#5E5BAE] mx-auto mb-1" />
                            <div className="text-[16px] font-bold text-[#26263F]">
                              {currentRecentData.completedCount}
                            </div>
                            <span className="text-[10px] text-[#7A7895]">Completed</span>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-[16px] border border-white/80">
                            <div className="w-2 h-2 rounded-full bg-[#8E8CD6] mx-auto mb-1" />
                            <div className="text-[16px] font-bold text-[#26263F]">
                              {currentRecentData.rescheduledCount}
                            </div>
                            <span className="text-[10px] text-[#7A7895]">Rescheduled</span>
                          </div>

                          <div className="bg-white/70 p-2.5 rounded-[16px] border border-white/80">
                            <div className="w-2 h-2 rounded-full bg-[#E59980] mx-auto mb-1" />
                            <div className="text-[16px] font-bold text-[#26263F]">
                              {currentRecentData.restDaysCount}
                            </div>
                            <span className="text-[10px] text-[#7A7895]">Rest days</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsMethodologyOpen(true)}
                        className="w-full py-2.5 px-3 rounded-[16px] bg-white/60 hover:bg-white/85 border border-white/80 text-[11.5px] font-medium text-[#7A7895] hover:text-[#26263F] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <HelpCircle className="w-3.5 h-3.5 stroke-[2]" />
                        <span>Data source & calculation methodology</span>
                      </button>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 2: YOUR DIRECTION                        */}
                  {/* - References memory without duplicating/modifying it    */}
                  {/* - Retains both Nova conversation & manual adjustment    */}
                  {/* ======================================================= */}
                  {selectedModule === 'direction' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      {!isEditingDirection && (
                        <>
                          {/* Plan Status Header Pill */}
                          <div className="flex items-center justify-between p-3.5 rounded-[20px] bg-white/75 border border-white/85">
                            <div>
                              <span className="text-[10.5px] uppercase font-bold text-[#7A7895] tracking-wider block">
                                Plan Status
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span
                                  className={`w-2 h-2 rounded-full ${
                                    direction.status === 'active' ? 'bg-[#5E5BAE]' : 'bg-[#C27838]'
                                  }`}
                                />
                                <span className="text-[14px] font-bold text-[#26263F]">
                                  {direction.status === 'active' ? 'Active & Paced' : 'Paused for Recovery'}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={handleTogglePausePlan}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                                direction.status === 'active'
                                  ? 'bg-[#FAF8FD] text-[#5E5BAE] border-[#5E5BAE]/25 hover:bg-[#F3EEFE]'
                                  : 'bg-[#5E5BAE] text-white border-transparent'
                              }`}
                            >
                              {direction.status === 'active' ? (
                                <>
                                  <Pause className="w-3 h-3 stroke-[2.4]" />
                                  <span>Pause Plan</span>
                                </>
                              ) : (
                                <>
                                  <Play className="w-3 h-3 fill-current" />
                                  <span>Resume Plan</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* 1. Goal Card */}
                          <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Compass className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Current Goal</span>
                            </div>
                            <h4 className="text-[16px] font-bold text-[#26263F] leading-tight">
                              {direction.goalTitle}
                            </h4>
                            <p className="text-[12.5px] leading-relaxed text-[#5D5B78]">
                              {direction.description}
                            </p>
                          </div>

                          {/* 2. Current Approach */}
                          <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                              <span>Current Execution Approach</span>
                            </div>
                            <p className="text-[13px] font-medium text-[#26263F] leading-relaxed">
                              {direction.executionApproach}
                            </p>
                          </div>

                          {/* 3. Tailored Pacing (References memory without modifying it) */}
                          <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                              <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                              <span>Informed by what Nova knows</span>
                            </div>
                            <p className="text-[12.5px] leading-relaxed text-[#26263F]">
                              {direction.tailoredReason}
                            </p>
                          </div>

                          {/* Review Schedule Footer */}
                          <div className="p-3.5 rounded-[18px] bg-white/55 border border-white/75 flex items-center justify-between text-xs text-[#7A7895]">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 stroke-[2]" />
                              <span>
                                Next review: <strong className="text-[#26263F]">{direction.nextReviewDate}</strong>
                              </span>
                            </div>
                            <span>{direction.reviewDaysLeft} days remaining</span>
                          </div>

                          {/* Action Buttons: Talk to Nova OR Adjust Manually */}
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={handleOpenDirectionChat}
                              className="w-full py-3 rounded-[18px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-2xs flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
                            >
                              <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                              <span>Talk to Nova to adjust direction</span>
                            </button>

                            <button
                              type="button"
                              onClick={handleStartEditDirection}
                              className="w-full py-2.5 rounded-[16px] bg-white/80 hover:bg-white text-[#5E5BAE] border border-[#5E5BAE]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Sliders className="w-3.5 h-3.5 stroke-[2]" />
                              <span>Select preset or edit manually</span>
                            </button>
                          </div>
                        </>
                      )}

                      {isEditingDirection && (
                        <div className="flex flex-col gap-4">
                          <div className="bg-[#5E5BAE]/[0.08] p-3 rounded-[18px] border border-[#5E5BAE]/20 text-xs text-[#5E5BAE] flex items-center gap-2">
                            <Sliders className="w-4 h-4 stroke-[2] shrink-0" />
                            <span>Adjusting direction. Changes apply only after you confirm below.</span>
                          </div>

                          <div className="flex flex-col gap-2">
                            <span className="font-bold text-[#26263F] text-xs">
                              Select Health Focus Goal:
                            </span>
                            <div className="space-y-2">
                              {PRESET_DIRECTION_GOALS.map((preset) => {
                                const isSelected = directionDraft.goalId === preset.id;
                                return (
                                  <div
                                    key={preset.id}
                                    onClick={() => {
                                      setDirectionDraft((prev) => ({
                                        ...prev,
                                        goalId: preset.id,
                                        goalTitle: preset.title,
                                        description: preset.description,
                                        executionApproach: preset.defaultApproach,
                                        tailoredReason: preset.tailoredReason
                                      }));
                                    }}
                                    className={`p-3 rounded-[16px] border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-white border-[#5E5BAE] shadow-2xs ring-1 ring-[#5E5BAE]/20'
                                        : 'bg-white/60 border-white/75 hover:bg-white/80'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span
                                        className={`text-[13px] font-bold ${
                                          isSelected ? 'text-[#5E5BAE]' : 'text-[#26263F]'
                                        }`}
                                      >
                                        {preset.title}
                                      </span>
                                      {isSelected && <Check className="w-4 h-4 text-[#5E5BAE] stroke-[2.5]" />}
                                    </div>
                                    <p className="text-[11.5px] text-[#7A7895] mt-1 leading-relaxed">
                                      {preset.description}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="font-bold text-[#26263F] text-xs">
                              Execution Approach:
                            </span>
                            <textarea
                              rows={2}
                              value={directionDraft.executionApproach}
                              onChange={(e) =>
                                setDirectionDraft((prev) => ({ ...prev, executionApproach: e.target.value }))
                              }
                              className="w-full bg-white p-3 rounded-[16px] border border-[#26263F]/10 text-xs text-[#26263F] outline-none focus:border-[#5E5BAE] transition-all resize-none shadow-2xs"
                              placeholder="Describe your execution pace and time window..."
                            />
                          </div>

                          <div className="flex items-center justify-between p-3 rounded-[16px] bg-white/70 border border-white/85">
                            <span className="font-bold text-[#26263F] text-xs">
                              Plan Status:
                            </span>
                            <div className="bg-[#26263F]/[0.06] p-0.5 rounded-full inline-flex">
                              <button
                                type="button"
                                onClick={() => setDirectionDraft((prev) => ({ ...prev, status: 'active' }))}
                                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                                  directionDraft.status === 'active'
                                    ? 'bg-[#5E5BAE] text-white font-bold shadow-2xs'
                                    : 'text-[#7A7895] font-medium'
                                }`}
                              >
                                Active
                              </button>
                              <button
                                type="button"
                                onClick={() => setDirectionDraft((prev) => ({ ...prev, status: 'paused' }))}
                                className={`px-3 py-1 text-xs rounded-full transition-all cursor-pointer ${
                                  directionDraft.status === 'paused'
                                    ? 'bg-[#C27838] text-white font-bold shadow-2xs'
                                    : 'text-[#7A7895] font-medium'
                                }`}
                              >
                                Paused
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5 pt-2">
                            <button
                              type="button"
                              onClick={handleCancelDirectionChanges}
                              className="flex-1 py-3 rounded-[16px] bg-white/80 hover:bg-white text-[#7A7895] text-xs font-semibold border border-white/90 active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleConfirmDirectionChanges}
                              className="flex-1 py-3 rounded-[16px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4 stroke-[2.5]" />
                              <span>Confirm Changes</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 3: WHAT NOVA KNOWS (All Memories Sheet)  */}
                  {/* - Full grouped list from MemoryView                     */}
                  {/* - Supports pending confirmations, detail view, & chat   */}
                  {/* ======================================================= */}
                  {selectedModule === 'memory' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      {/* Conversational Supplement/Update Bar */}
                      <button
                        type="button"
                        onClick={() => handleStartTalkToNovaMemory(null)}
                        className="w-full p-3.5 rounded-[20px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
                      >
                        <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                        <span>Talk to Nova to add, refine, or correct</span>
                      </button>

                      {/* Group 1: What matters to you */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 px-1">
                          <Compass className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2.2]" />
                          <span className="text-[13px] font-bold text-[#26263F]">What matters to you</span>
                        </div>
                        {mattersMemories.length === 0 ? (
                          <div className="bg-white/60 rounded-[18px] p-3.5 border border-white/80 text-xs text-[#7A7895]">
                            No long-term focus items savedright now.
                          </div>
                        ) : (
                          mattersMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMemory(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
                              className="group bg-white/80 hover:bg-white rounded-[20px] p-3.5 border border-white/90 shadow-2xs flex flex-col gap-1.5 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-bold text-[#26263F] leading-snug">
                                  {item.title}
                                </h4>
                                <ChevronRight className="w-4 h-4 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2.2]" />
                              </div>
                              <p className="text-[12px] text-[#5D5B78] leading-relaxed line-clamp-2">
                                {item.summary}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Group 2: What feels right */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 px-1">
                          <Heart className="w-3.5 h-3.5 text-[#5E5BAE] stroke-[2.2]" />
                          <span className="text-[13px] font-bold text-[#26263F]">What feels right</span>
                        </div>
                        {feelsRightMemories.length === 0 ? (
                          <div className="bg-white/60 rounded-[18px] p-3.5 border border-white/80 text-xs text-[#7A7895]">
                            No rhythm preferences saved right now.
                          </div>
                        ) : (
                          feelsRightMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMemory(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
                              className="group bg-white/80 hover:bg-white rounded-[20px] p-3.5 border border-white/90 shadow-2xs flex flex-col gap-1.5 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-bold text-[#26263F] leading-snug">
                                  {item.title}
                                </h4>
                                <ChevronRight className="w-4 h-4 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2.2]" />
                              </div>
                              <p className="text-[12px] text-[#5D5B78] leading-relaxed line-clamp-2">
                                {item.summary}
                              </p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Group 3: Can I check something? */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#6865B8] stroke-[2.2]" />
                            <span className="text-[13px] font-bold text-[#26263F]">Can I check something?</span>
                          </div>
                          {checkMemories.length > 0 && (
                            <span className="text-[10px] font-bold text-[#5E5BAE] bg-[#5E5BAE]/10 px-2 py-0.5 rounded-full">
                              {checkMemories.length} new
                            </span>
                          )}
                        </div>
                        {checkMemories.length === 0 ? (
                          <div className="bg-white/60 rounded-[18px] p-3.5 border border-white/80 text-xs text-[#7A7895] flex items-center gap-2">
                            <Check className="w-4 h-4 text-[#5E5BAE] shrink-0" />
                            <span>All caught up — no pending observations to check.</span>
                          </div>
                        ) : (
                          checkMemories.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedMemory(item)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => e.key === 'Enter' && setSelectedMemory(item)}
                              className="bg-[#FAF8FD] hover:bg-white rounded-[20px] p-3.5 border border-[#5E5BAE]/25 shadow-2xs flex flex-col gap-2.5 cursor-pointer transition-all"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="text-[13.5px] font-bold text-[#26263F] leading-snug">
                                  {item.title}
                                </h4>
                                <ChevronRight className="w-4 h-4 text-[#5E5BAE] shrink-0 mt-0.5 stroke-[2.2]" />
                              </div>
                              <p className="text-[12px] text-[#5D5B78] leading-relaxed">
                                {item.summary}
                              </p>
                              <div className="pt-1 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={(e) => handleConfirmPendingMemory(item.id, e)}
                                  className="flex-1 py-2 px-3 rounded-[12px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Yes, save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleStartTalkToNovaMemory(item, e)}
                                  className="py-2 px-3 rounded-[12px] bg-white hover:bg-[#F3EEFE] text-[#5E5BAE] border border-[#5E5BAE]/20 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 stroke-[2]" />
                                  <span>Talk</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDismissPendingMemory(item.id, e)}
                                  className="py-2 px-2.5 rounded-[12px] bg-black/[0.04] hover:bg-black/[0.08] text-[#7A7895] text-xs font-medium cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {memories.length < INITIAL_MEMORIES.length && (
                        <button
                          type="button"
                          onClick={() => {
                            setMemories(INITIAL_MEMORIES);
                            showMemoryFeedback('Sample memories restored');
                          }}
                          className="self-center text-[11px] font-semibold text-[#7A7895] hover:text-[#5E5BAE] flex items-center gap-1 py-1 px-3 rounded-full bg-white/50 border border-white/70 transition-colors cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore sample memories</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 4: HEALTH DATA (Apple Health Details)    */}
                  {/* ======================================================= */}
                  {selectedModule === 'health' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      {/* 1. Connection Status Card & Demo Switcher */}
                      <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
                              <Heart className="w-4 h-4 fill-current" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-bold text-[#26263F]">
                                Apple Health Connection
                              </h4>
                              <span className="text-[11px] text-[#7A7895]">
                                {isAppleHealthConnected ? 'Sample sync active (Demo)' : 'Not connected'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsAppleHealthConnected(!isAppleHealthConnected)}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                              isAppleHealthConnected
                                ? 'bg-white text-[#E11D48] border-[#E11D48]/30 hover:bg-[#FFE4E6]/20'
                                : 'bg-[#5E5BAE] text-white border-transparent'
                            }`}
                          >
                            {isAppleHealthConnected ? 'Disconnect' : 'Connect Demo'}
                          </button>
                        </div>

                        <div className="p-3 rounded-[16px] bg-[#FAF8FD] border border-black/[0.04] text-[11.5px] leading-relaxed text-[#7A7895]">
                          {isAppleHealthConnected ? (
                            <span className="flex items-start gap-1.5">
                              <Info className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0 mt-0.5" />
                              <span>Frontend demo mode: Displays sample metrics with explicit attribution. No real HealthKit data is accessed.</span>
                            </span>
                          ) : (
                            <span className="flex items-start gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-[#7A7895] shrink-0 mt-0.5" />
                              <span>Apple Health is not connected. All indicators display “Not connected / No data” rather than false zero counts.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. Full 4 Metrics List with Source & Last Updated */}
                      <div className="flex flex-col gap-2.5">
                        <span className="font-bold text-[#26263F] text-xs">
                          Biometric Baseline Indicators
                        </span>

                        <div className="space-y-2.5">
                          {HEALTH_METRICS_DEFINITIONS.map((metric) => {
                            const IconComponent = metric.icon;
                            const isConnected = isAppleHealthConnected;
                            const valueText = isConnected
                              ? metric.sampleValue
                              : metric.id === 'rhr'
                              ? 'Not connected'
                              : 'No data';
                            const unitText = isConnected ? metric.unit : '';
                            const lastUpdatedText = isConnected ? metric.lastUpdated : 'Not synced';
                            const sourceText = isConnected ? metric.source : 'None';

                            return (
                              <div
                                key={metric.id}
                                className="p-3.5 rounded-[20px] bg-white/75 border border-white/85 flex flex-col gap-2 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-6 h-6 rounded-full ${metric.iconBg} ${metric.iconColor} flex items-center justify-center shrink-0`}
                                    >
                                      <IconComponent className="w-3.5 h-3.5 stroke-[2.2]" />
                                    </div>
                                    <span className="text-[13px] font-bold text-[#26263F]">
                                      {metric.name}
                                    </span>
                                  </div>

                                  <div className="flex items-baseline gap-1">
                                    <span
                                      className={`font-bold text-[#26263F] ${
                                        isConnected ? 'text-[17px]' : 'text-[12px] text-[#8E8EA8]'
                                      }`}
                                    >
                                      {valueText}
                                    </span>
                                    {unitText && (
                                      <span className="text-[11px] text-[#7A7895]">{unitText}</span>
                                    )}
                                  </div>
                                </div>

                                <div className="pt-1.5 border-t border-black/[0.04] flex items-center justify-between text-[10.5px] text-[#7A7895]">
                                  <span>
                                    Source: <strong className="text-[#26263F] font-medium">{sourceText}</strong>
                                  </span>
                                  <span>Updated: {lastUpdatedText}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 3. Explanation: How Plan B Uses Health Data */}
                      <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                          <span>How Plan B uses health data</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#5D5B78]">
                          Plan B reads resting heart rate and sleep consistency solely to detect physiological fatigue and automatically soften daily recommendations into gentle 5-minute living room stretches.
                        </p>
                      </div>

                      {/* 4. Reassuring Notice: Plan Works Fully Without Apple Health */}
                      <div className="p-4 rounded-[22px] bg-[#5E5BAE]/[0.08] border border-[#5E5BAE]/20 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                          <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                          <span>No Apple Health? No problem.</span>
                        </div>
                        <p className="text-[12px] leading-relaxed text-[#26263F]">
                          Plan B is completely functional without Apple Health or wearable sensors. Daily check-ins with Nova and manual progress tracking give you the complete experience.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ======================================================= */}
                  {/* SECONDARY PAGE 5: ACTIVITY HISTORY                      */}
                  {/* ======================================================= */}
                  {selectedModule === 'activity' && (
                    <div className="flex flex-col gap-4 text-xs text-[#5D5B78]">
                      <div className="p-4 rounded-[22px] bg-white/75 border border-white/85 flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#5E5BAE]/10 text-[#5E5BAE] flex items-center justify-center font-bold">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-[14px] font-bold text-[#26263F]">
                                {MONTH_NAMES[viewMonth]} {viewYear}
                              </h4>
                              <span className="text-[11px] text-[#7A7895]">
                                Monthly pacing & log overview
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsMonthPickerOpen(true)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[#5E5BAE]/10 hover:bg-[#5E5BAE]/20 text-[#5E5BAE] transition-all cursor-pointer"
                          >
                            Switch month
                          </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-black/[0.04] text-center">
                          <div className="bg-[#FAF8FD] p-2.5 rounded-[14px]">
                            <span className="text-[16px] font-bold text-[#5E5BAE] block leading-none">{activeDaysCount}</span>
                            <span className="text-[10px] text-[#7A7895] mt-0.5 block">active days</span>
                          </div>
                          <div className="bg-[#FAF8FD] p-2.5 rounded-[14px]">
                            <span className="text-[16px] font-bold text-[#E59980] block leading-none">{restDaysCount}</span>
                            <span className="text-[10px] text-[#7A7895] mt-0.5 block">mindful rests</span>
                          </div>
                          <div className="bg-[#FAF8FD] p-2.5 rounded-[14px]">
                            <span className="text-[16px] font-bold text-[#26263F] block leading-none">{totalMinutes}m</span>
                            <span className="text-[10px] text-[#7A7895] mt-0.5 block">logged</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(sheetPortalContent, phoneFrameRef.current);
        }
        return sheetPortalContent;
      })()}

      {/* ============================================================ */}
      {/* SINGLE MEMORY ITEM DETAIL SHEET (Portal to Phone Frame)      */}
      {/* ============================================================ */}
      {(() => {
        const memoryDetailPortal = (
          <AnimatePresence>
            {selectedMemory && (
              <div className="absolute inset-0 z-55 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedMemory(null)}
                  className="absolute inset-0 bg-black/30 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 290 }}
                  className="relative w-full max-h-[86%] bg-[#FAF7F2] rounded-t-[32px] p-6 shadow-2xl border-t border-white/95 overflow-y-auto z-10 flex flex-col gap-4 text-[#26263F]"
                  id="memory-detail-sheet"
                >
                  <div className="flex items-start justify-between gap-3 pb-2 border-b border-[#26263F]/[0.06]">
                    <div>
                      <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE] bg-[#5E5BAE]/10 px-2.5 py-0.5 rounded-full inline-block mb-1.5">
                        {selectedMemory.category === 'matters' && 'What matters to you'}
                        {selectedMemory.category === 'feels_right' && 'What feels right'}
                        {selectedMemory.category === 'check' && 'Can I check something?'}
                      </span>
                      <h3 className="text-[17px] font-bold text-[#26263F] leading-snug">
                        {selectedMemory.title}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedMemory(null)}
                      className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] shrink-0 cursor-pointer"
                      aria-label="Close memory detail"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-[20px] bg-white/80 border border-white/90 flex flex-col gap-1.5">
                    <span className="text-[11px] font-bold text-[#7A7895] uppercase tracking-wider">
                      Memory Summary
                    </span>
                    <p className="text-[13px] text-[#26263F] leading-relaxed">
                      {selectedMemory.summary}
                    </p>
                  </div>

                  {/* Where Nova learned this */}
                  <div className="p-4 rounded-[20px] bg-white/80 border border-white/90 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                      <Clock className="w-3.5 h-3.5 stroke-[2.2]" />
                      <span>How Nova learned this</span>
                    </div>
                    <p className="text-[12.5px] text-[#5D5B78] leading-relaxed">
                      {selectedMemory.learnedFrom}
                    </p>
                    <span className="text-[10.5px] text-[#8E8EA8] mt-0.5">
                      {selectedMemory.updatedAt}
                    </span>
                  </div>

                  {/* How this shapes your suggestions */}
                  <div className="p-4 rounded-[20px] bg-[#5E5BAE]/[0.07] border border-[#5E5BAE]/20 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#5E5BAE]">
                      <Sparkles className="w-3.5 h-3.5 text-[#6865B8]" />
                      <span>How this helps your plan</span>
                    </div>
                    <p className="text-[12.5px] text-[#26263F] leading-relaxed">
                      {selectedMemory.howItHelps}
                    </p>
                  </div>

                  {/* Pending Confirmation Banner if unconfirmed */}
                  {!selectedMemory.isConfirmed && (
                    <div className="p-3.5 rounded-[18px] bg-white border border-[#5E5BAE]/30 flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#26263F]">
                        Does this feel accurate?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleConfirmPendingMemory(selectedMemory.id)}
                          className="px-3 py-1.5 rounded-[12px] bg-[#5E5BAE] text-white text-xs font-semibold cursor-pointer"
                        >
                          Yes, save
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissPendingMemory(selectedMemory.id)}
                          className="px-2.5 py-1.5 rounded-[12px] bg-black/5 text-[#7A7895] text-xs font-medium cursor-pointer"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Primary & Secondary Actions */}
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleStartTalkToNovaMemory(selectedMemory)}
                      className="w-full py-3 rounded-[18px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 stroke-[2.2]" />
                      <span>Talk to Nova about this</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(selectedMemory)}
                      className="w-full py-2.5 rounded-[16px] bg-white/80 hover:bg-[#FFE4E6]/50 text-[#E11D48] border border-[#E11D48]/20 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      <span>Remove from memory</span>
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(memoryDetailPortal, phoneFrameRef.current);
        }
        return memoryDetailPortal;
      })()}

      {/* ============================================================ */}
      {/* TALK TO NOVA MEMORY CONVERSATION SHEET (Update / Add / Correct) */}
      {/* ============================================================ */}
      {(() => {
        const quickMemoryChips = editingMemory
          ? [
              'Prefer evenings after 6:30 PM instead',
              'Keep it shorter (5–10 minutes)',
              'Prefer quiet morning walks before work'
            ]
          : [
              'I prefer quiet 10-minute morning walks before work',
              'Keep movements low-impact for joint comfort',
              'I like calm screen-free wind-downs after 8:30 PM'
            ];

        const memoryChatPortal = (
          <AnimatePresence>
            {isMemoryChatOpen && (
              <div className="absolute inset-0 z-60 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => {
                    setIsMemoryChatOpen(false);
                    setEditingMemory(null);
                  }}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 290 }}
                  className="relative w-full h-[82%] bg-[#FAF7F2] rounded-t-[32px] shadow-2xl border-t border-white/95 z-10 flex flex-col overflow-hidden text-[#26263F]"
                  id="memory-talk-sheet"
                >
                  {/* Header */}
                  <div className="px-6 pt-5 pb-3 border-b border-[#26263F]/[0.06] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#E5DDFB] to-[#F3EEFE] border border-white shadow-xs overflow-hidden shrink-0">
                        <img
                          src={NOVA_LISTENING_URL}
                          alt="Nova"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover scale-125 translate-y-1"
                        />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-[#26263F] leading-tight">
                          Talk to Nova
                        </h4>
                        <span className="text-[11px] text-[#7A7895] block">
                          {editingMemory ? 'Refine memory • Confirms before saving' : 'Add or update what Nova knows'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMemoryChatOpen(false);
                        setEditingMemory(null);
                      }}
                      className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close conversation"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  {/* Referenced Memory Pill (if editing a specific item) */}
                  {editingMemory && (
                    <div className="mx-6 mt-3 px-3.5 py-2 rounded-[14px] bg-white/75 border border-white/90 flex items-center gap-2 text-[11.5px] text-[#5D5B78] shrink-0">
                      <CornerDownRight className="w-3.5 h-3.5 text-[#5E5BAE] shrink-0" />
                      <span className="truncate font-medium">{editingMemory.title}</span>
                    </div>
                  )}

                  {/* Messages Area */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 scrollbar-none">
                    {memoryChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#5E5BAE] text-white rounded-br-[6px]'
                              : 'bg-white/90 text-[#26263F] border border-white rounded-bl-[6px] shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {/* Staged Memory Update/Add Confirmation Card */}
                        {msg.proposal && (
                          <div className="mt-2.5 w-full max-w-[92%] bg-white rounded-[20px] p-4 border border-[#5E5BAE]/30 shadow-sm flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE]">
                                {msg.proposal.mode === 'update' ? 'Proposed Memory Update' : 'Proposed New Memory'}
                              </span>
                              <span className="text-[10px] text-[#7A7895] bg-[#FAF8FD] px-2 py-0.5 rounded-full border border-black/5">
                                Needs confirmation
                              </span>
                            </div>

                            <h5 className="text-[13.5px] font-bold text-[#26263F] leading-snug">
                              {msg.proposal.newTitle}
                            </h5>
                            <p className="text-[12px] text-[#5D5B78] leading-relaxed">
                              {msg.proposal.newSummary}
                            </p>

                            {msg.proposalAccepted ? (
                              <div className="py-2 px-3 rounded-[12px] bg-[#5E5BAE]/10 text-[#5E5BAE] text-xs font-bold flex items-center justify-center gap-1.5">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Confirmed & Saved</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmMemoryProposal(msg.id)}
                                  className="flex-1 py-2.5 px-3 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Confirm & Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsMemoryChatOpen(false);
                                    setEditingMemory(null);
                                  }}
                                  className="py-2.5 px-3 rounded-[14px] bg-black/5 hover:bg-black/10 text-[#7A7895] text-xs font-semibold cursor-pointer"
                                >
                                  Keep as is
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {memoryChatMessages.length === 1 && (
                      <div className="pt-1 flex flex-col items-start gap-1.5">
                        <span className="text-[11px] text-[#7A7895] pl-1">
                          Quick ways to {editingMemory ? 'adjust' : 'share'}:
                        </span>
                        {quickMemoryChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleSendMemoryChat(chip)}
                            className="text-left text-xs font-semibold text-[#5E5BAE] bg-white/85 hover:bg-white px-3.5 py-2 rounded-[16px] border border-[#5E5BAE]/20 shadow-2xs transition-all active:scale-98 cursor-pointer"
                          >
                            “{chip}”
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={memoryChatEndRef} />
                  </div>

                  {/* Input Bar */}
                  <div className="p-4 bg-white/80 backdrop-blur-md border-t border-[#26263F]/[0.06] flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={memoryChatInput}
                      onChange={(e) => setMemoryChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMemoryChat()}
                      placeholder="Tell Nova what feels right for you..."
                      className="flex-1 bg-white px-4 py-2.5 rounded-full text-xs text-[#26263F] placeholder-[#8E8EA8] border border-black/10 focus:outline-none focus:border-[#5E5BAE]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendMemoryChat()}
                      disabled={!memoryChatInput.trim()}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        memoryChatInput.trim()
                          ? 'bg-[#5E5BAE] text-white cursor-pointer shadow-xs'
                          : 'bg-black/10 text-black/30 cursor-not-allowed'
                      }`}
                      aria-label="Send message"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(memoryChatPortal, phoneFrameRef.current);
        }
        return memoryChatPortal;
      })()}

      {/* ============================================================ */}
      {/* TALK TO NOVA DIRECTION ADJUSTMENT SHEET                      */}
      {/* (Adjusts Direction only — never duplicates or modifies memory) */}
      {/* ============================================================ */}
      {(() => {
        const directionChips = [
          'Keep it to 3 light days a week',
          'Focus on unwinding for deeper evening rest',
          'Ease afternoon neck & desk stiffness'
        ];

        const directionChatPortal = (
          <AnimatePresence>
            {isDirectionChatOpen && (
              <div className="absolute inset-0 z-60 flex flex-col justify-end pointer-events-auto overflow-hidden">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsDirectionChatOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 290 }}
                  className="relative w-full h-[80%] bg-[#FAF7F2] rounded-t-[32px] shadow-2xl border-t border-white/95 z-10 flex flex-col overflow-hidden text-[#26263F]"
                  id="direction-talk-sheet"
                >
                  <div className="px-6 pt-5 pb-3 border-b border-[#26263F]/[0.06] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[#E5DDFB] to-[#F3EEFE] border border-white shadow-xs overflow-hidden shrink-0">
                        <img
                          src={NOVA_LISTENING_URL}
                          alt="Nova"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover scale-125 translate-y-1"
                        />
                      </div>
                      <div>
                        <h4 className="text-[15px] font-bold text-[#26263F] leading-tight">
                          Adjust direction with Nova
                        </h4>
                        <span className="text-[11px] text-[#7A7895] block">
                          References your memory • Confirms before updating
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDirectionChatOpen(false)}
                      className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close direction chat"
                    >
                      <X className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5 scrollbar-none">
                    {directionChatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[88%] rounded-[20px] px-4 py-3 text-[13px] leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#5E5BAE] text-white rounded-br-[6px]'
                              : 'bg-white/90 text-[#26263F] border border-white rounded-bl-[6px] shadow-2xs'
                          }`}
                        >
                          {msg.text}
                        </div>

                        {msg.proposedDirection && (
                          <div className="mt-2.5 w-full max-w-[92%] bg-white rounded-[20px] p-4 border border-[#5E5BAE]/30 shadow-sm flex flex-col gap-2">
                            <span className="text-[10.5px] font-bold uppercase tracking-wider text-[#5E5BAE]">
                              Proposed Direction Update
                            </span>
                            <h5 className="text-[14px] font-bold text-[#26263F] leading-snug">
                              {msg.proposedDirection.goalTitle}
                            </h5>
                            <p className="text-[12px] text-[#5D5B78] leading-relaxed">
                              {msg.proposedDirection.executionApproach}
                            </p>

                            {msg.accepted ? (
                              <div className="py-2 px-3 rounded-[12px] bg-[#5E5BAE]/10 text-[#5E5BAE] text-xs font-bold flex items-center justify-center gap-1.5">
                                <Check className="w-4 h-4 stroke-[2.5]" />
                                <span>Direction Updated</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleAcceptDirectionProposal(msg.id)}
                                  className="flex-1 py-2.5 px-3 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>Confirm Direction</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setIsDirectionChatOpen(false)}
                                  className="py-2.5 px-3 rounded-[14px] bg-black/5 hover:bg-black/10 text-[#7A7895] text-xs font-semibold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {directionChatMessages.length === 1 && (
                      <div className="pt-1 flex flex-col items-start gap-1.5">
                        <span className="text-[11px] text-[#7A7895] pl-1">
                          Quick ways to adjust your direction:
                        </span>
                        {directionChips.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => handleSendDirectionChat(chip)}
                            className="text-left text-xs font-semibold text-[#5E5BAE] bg-white/85 hover:bg-white px-3.5 py-2 rounded-[16px] border border-[#5E5BAE]/20 shadow-2xs transition-all active:scale-98 cursor-pointer"
                          >
                            “{chip}”
                          </button>
                        ))}
                      </div>
                    )}
                    <div ref={directionChatEndRef} />
                  </div>

                  <div className="p-4 bg-white/80 backdrop-blur-md border-t border-[#26263F]/[0.06] flex items-center gap-2 shrink-0">
                    <input
                      type="text"
                      value={directionChatInput}
                      onChange={(e) => setDirectionChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendDirectionChat()}
                      placeholder="Describe how you’d like to pace your plan..."
                      className="flex-1 bg-white px-4 py-2.5 rounded-full text-xs text-[#26263F] placeholder-[#8E8EA8] border border-black/10 focus:outline-none focus:border-[#5E5BAE]"
                    />
                    <button
                      type="button"
                      onClick={() => handleSendDirectionChat()}
                      disabled={!directionChatInput.trim()}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        directionChatInput.trim()
                          ? 'bg-[#5E5BAE] text-white cursor-pointer shadow-xs'
                          : 'bg-black/10 text-black/30 cursor-not-allowed'
                      }`}
                      aria-label="Send direction adjustment"
                    >
                      <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(directionChatPortal, phoneFrameRef.current);
        }
        return directionChatPortal;
      })()}

      {/* ============================================================ */}
      {/* DELETE MEMORY CONFIRMATION MODAL                             */}
      {/* ============================================================ */}
      {(() => {
        const deleteModalPortal = (
          <AnimatePresence>
            {memoryToDelete && (
              <div className="absolute inset-0 z-65 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setMemoryToDelete(null)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="relative bg-[#FAF7F2] rounded-[26px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[310px] flex flex-col gap-3.5 text-[#26263F]"
                >
                  <div className="flex items-center gap-2 text-[#E11D48]">
                    <Trash2 className="w-4 h-4 stroke-[2.2]" />
                    <h4 className="text-[15px] font-bold text-[#26263F]">Remove this memory?</h4>
                  </div>

                  <p className="text-xs text-[#5D5B78] leading-relaxed">
                    Nova will stop using <strong>“{memoryToDelete.title}”</strong> when personalizing your suggestions.
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setMemoryToDelete(null)}
                      className="flex-1 py-2.5 rounded-[14px] bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#26263F] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteMemoryConfirmed}
                      className="flex-1 py-2.5 rounded-[14px] bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(deleteModalPortal, phoneFrameRef.current);
        }
        return deleteModalPortal;
      })()}

      {/* ============================================================ */}
      {/* HOW MEMORY WORKS INFO MODAL                                  */}
      {/* ============================================================ */}
      {(() => {
        const memoryInfoPortal = (
          <AnimatePresence>
            {isMemoryInfoModalOpen && (
              <div className="absolute inset-0 z-65 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMemoryInfoModalOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  className="relative bg-[#FAF8FD] rounded-[24px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[320px] flex flex-col gap-3.5 text-[#26263F]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#26263F]">How Memory works</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMemoryInfoModalOpen(false)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#5D5B78] leading-relaxed">
                    <p>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Transparent & under your control
                      </strong>
                      Nova only remembers practical rhythm preferences and goals that help tailor your daily suggestions.
                    </p>
                    <p>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Nothing changes without your confirmation
                      </strong>
                      New observations wait in “Can I check something?” until you approve them, and conversational edits always show a confirmation preview first.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMemoryInfoModalOpen(false)}
                    className="w-full py-2.5 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs mt-1 transition-colors cursor-pointer"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(memoryInfoPortal, phoneFrameRef.current);
        }
        return memoryInfoPortal;
      })()}

      {/* ============================================================ */}
      {/* Lightweight Methodology Modal (Inside Your Rhythm)           */}
      {/* ============================================================ */}
      {(() => {
        const infoModalContent = (
          <AnimatePresence>
            {isMethodologyOpen && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-6 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMethodologyOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="relative bg-[#FAF8FD] rounded-[24px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[320px] flex flex-col gap-3.5 text-[#26263F]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#26263F]">How it’s measured</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMethodologyOpen(false)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-xs text-[#5D5B78] leading-relaxed">
                    <div>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Monthly active days (days/month)
                      </strong>
                      Count of unique calendar days where at least 1 Plan B activity or gentle stretch was marked completed.
                    </div>

                    <div>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Active minutes (minutes)
                      </strong>
                      Cumulative duration of completed audio sessions and timer resets.
                    </div>

                    <div>
                      <strong className="text-[#26263F] font-semibold block mb-0.5">
                        • Rest days
                      </strong>
                      Logged rest periods are recognized as intentional health recovery, never marked as missed quotas.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsMethodologyOpen(false)}
                    className="w-full py-2.5 rounded-[14px] bg-[#5E5BAE] hover:bg-[#524FA0] text-white text-xs font-semibold shadow-2xs mt-1 transition-colors cursor-pointer"
                  >
                    Got it
                  </button>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(infoModalContent, phoneFrameRef.current);
        }
        return infoModalContent;
      })()}

      {/* ============================================================ */}
      {/* Month Picker Modal                                           */}
      {/* ============================================================ */}
      {(() => {
        const monthPickerModalContent = (
          <AnimatePresence>
            {isMonthPickerOpen && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-5 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMonthPickerOpen(false)}
                  className="absolute inset-0 bg-black/35 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  className="relative bg-[#FAF8FD] rounded-[26px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[325px] flex flex-col gap-3 text-[#26263F]"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-[#5E5BAE]" />
                      <h4 className="text-[15px] font-bold text-[#26263F]">Select Month</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMonthPickerOpen(false)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/[0.03] rounded-[14px]">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y - 1)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#5E5BAE] hover:bg-black/5 active:scale-95 rounded-[8px] transition-all cursor-pointer"
                      aria-label="Previous year"
                    >
                      ‹ {pickerYear - 1}
                    </button>
                    <span className="text-[13px] font-bold text-[#26263F]">
                      {pickerYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y + 1)}
                      className="px-2.5 py-1 text-xs font-semibold text-[#5E5BAE] hover:bg-black/5 active:scale-95 rounded-[8px] transition-all cursor-pointer"
                      aria-label="Next year"
                    >
                      {pickerYear + 1} ›
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-0.5">
                    {MONTH_NAMES.map((monthName, idx) => {
                      const isSelected = pickerYear === viewYear && idx === viewMonth;
                      const isCurrent = pickerYear === deviceToday.year && idx === deviceToday.month;
                      const mPrefix = `${pickerYear}-${String(idx + 1).padStart(2, '0')}`;
                      const mRecords = Object.values(activityLogs).filter((r) => r.date.startsWith(mPrefix));
                      const mActive = mRecords.filter((r) => r.type === 'active').length;
                      const mRest = mRecords.filter((r) => r.type === 'rest').length;

                      return (
                        <button
                          key={`${pickerYear}-${idx}`}
                          type="button"
                          onClick={() => handleSelectMonth(pickerYear, idx)}
                          className={`w-full p-2.5 rounded-[16px] text-left flex items-center justify-between transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-[#5E5BAE] text-white font-bold shadow-sm'
                              : 'bg-white/75 hover:bg-white text-[#26263F] border border-black/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[13px]">{monthName}</span>
                            {isCurrent && (
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                  isSelected ? 'bg-white/20 text-white' : 'bg-[#5E5BAE]/10 text-[#5E5BAE]'
                                }`}
                              >
                                Current
                              </span>
                            )}
                          </div>
                          <span className={`text-[11px] ${isSelected ? 'text-white/80' : 'text-[#7A7895]'}`}>
                            {mActive} active • {mRest} rest
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(monthPickerModalContent, phoneFrameRef.current);
        }
        return monthPickerModalContent;
      })()}

      {/* ============================================================ */}
      {/* Day Detail & Correction Modal (Log, Correct, or Clear Record) */}
      {/* ============================================================ */}
      {(() => {
        const currentRecord = activeDayModalDate ? activityLogs[activeDayModalDate] : null;
        let formattedDateString = '';
        let isSelectedDayToday = false;

        if (activeDayModalDate) {
          const dObj = new Date(activeDayModalDate + 'T00:00:00');
          formattedDateString = dObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          });
          isSelectedDayToday = activeDayModalDate === deviceToday.dateStr;
        }

        const isSaveDisabled = dayDraftType === 'active' && !dayDraftTitle.trim();

        const dayModalContent = (
          <AnimatePresence>
            {activeDayModalDate && (
              <div className="absolute inset-0 z-60 flex items-center justify-center p-5 pointer-events-auto">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveDayModalDate(null)}
                  className="absolute inset-0 bg-black/40 backdrop-blur-xs"
                />

                <motion.div
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                  className="relative bg-[#FAF7F2] rounded-[26px] p-5 border border-white/95 shadow-2xl z-10 w-full max-w-[340px] flex flex-col gap-3.5 text-[#26263F] max-h-[88%] overflow-y-auto"
                >
                  <div className="flex items-start justify-between pb-2 border-b border-[#26263F]/[0.06]">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[15px] font-bold text-[#26263F]">
                          {formattedDateString}
                        </h4>
                        {isSelectedDayToday && (
                          <span className="bg-[#5E5BAE] text-white text-[9.5px] px-2 py-0.5 rounded-full font-bold">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#7A7895] block mt-0.5">
                        {currentRecord?.isSample
                          ? 'Sample record • Demo data'
                          : currentRecord
                          ? 'Logged in local session'
                          : 'No record yet • Tap below to log'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveDayModalDate(null)}
                      className="w-7 h-7 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-[#26263F] cursor-pointer shrink-0"
                      aria-label="Close"
                    >
                      <X className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>
                  </div>

                  <div
                    className={`p-3.5 rounded-[18px] border flex flex-col gap-1 ${
                      currentRecord?.type === 'active'
                        ? 'bg-[#5E5BAE]/[0.08] border-[#5E5BAE]/20 text-[#26263F]'
                        : currentRecord?.type === 'rest'
                        ? 'bg-[#E59980]/15 border-[#E59980]/30 text-[#26263F]'
                        : 'bg-black/[0.03] border-black/[0.05] text-[#7A7895]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A7895]">
                        Current Record Status
                      </span>
                      {currentRecord?.type === 'active' && (
                        <span className="text-[11px] font-bold text-[#5E5BAE]">
                          {currentRecord.durationMinutes} min active
                        </span>
                      )}
                      {currentRecord?.type === 'rest' && (
                        <span className="text-[11px] font-bold text-[#E59980]">
                          Mindful rest
                        </span>
                      )}
                    </div>
                    <div className="text-[13px] font-semibold text-[#26263F] mt-0.5">
                      {currentRecord?.type === 'active' && (currentRecord.title || 'Active session')}
                      {currentRecord?.type === 'rest' && (currentRecord.title || 'Mindful rest day')}
                      {(!currentRecord || currentRecord.type === 'none') && 'No activity or rest recorded for this day'}
                    </div>
                    {currentRecord?.note && (
                      <p className="text-[11.5px] text-[#5D5B78] italic mt-0.5">
                        “{currentRecord.note}”
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <span className="text-xs font-bold text-[#26263F]">
                      Log or Correct Record
                    </span>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/[0.04] rounded-[16px]">
                      <button
                        type="button"
                        onClick={() => {
                          setDayDraftType('active');
                          if (dayDraftType === 'rest') {
                            setDayDraftTitle('');
                            setDayDraftDuration(15);
                          }
                        }}
                        className={`py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'active'
                            ? 'bg-[#5E5BAE] text-white shadow-xs'
                            : 'text-[#7A7895] hover:text-[#26263F]'
                        }`}
                      >
                        Active
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDayDraftType('rest');
                          setDayDraftTitle('Mindful rest day');
                          setDayDraftDuration(0);
                        }}
                        className={`py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'rest'
                            ? 'bg-[#E59980] text-white shadow-xs'
                            : 'text-[#7A7895] hover:text-[#26263F]'
                        }`}
                      >
                        Rest
                      </button>

                      <button
                        type="button"
                        onClick={() => setDayDraftType('none')}
                        className={`py-1.5 rounded-[12px] text-xs font-semibold transition-all cursor-pointer ${
                          dayDraftType === 'none'
                            ? 'bg-white text-[#26263F] shadow-xs'
                            : 'text-[#7A7895] hover:text-[#26263F]'
                        }`}
                      >
                        Clear
                      </button>
                    </div>

                    {dayDraftType === 'active' && (
                      <div className="flex flex-col gap-2 pt-1">
                        <span className="text-[11px] font-medium text-[#7A7895]">Quick Presets</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {[
                            { title: '15-min mindful walk', dur: 15 },
                            { title: '5-min desk stretch', dur: 5 },
                            { title: '20-min nature stride', dur: 20 },
                            { title: '10-min breath reset', dur: 10 },
                          ].map((preset) => (
                            <button
                              key={preset.title}
                              type="button"
                              onClick={() => {
                                setDayDraftTitle(preset.title);
                                setDayDraftDuration(preset.dur);
                              }}
                              className={`p-2 rounded-[12px] text-left text-[11px] font-semibold border transition-all cursor-pointer ${
                                dayDraftTitle === preset.title
                                  ? 'bg-[#5E5BAE]/10 border-[#5E5BAE] text-[#5E5BAE]'
                                  : 'bg-white/70 border-black/[0.05] text-[#26263F] hover:bg-white'
                              }`}
                            >
                              <div className="truncate">{preset.title}</div>
                              <span className="text-[10px] text-[#7A7895] block mt-0.5">{preset.dur} min</span>
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-[11px] font-medium text-[#7A7895]">Duration</label>
                          <div className="flex items-center gap-1.5">
                            {[5, 10, 15, 20, 30].map((dur) => (
                              <button
                                key={dur}
                                type="button"
                                onClick={() => setDayDraftDuration(dur)}
                                className={`flex-1 py-1 rounded-[10px] text-xs font-semibold border transition-all cursor-pointer ${
                                  dayDraftDuration === dur
                                    ? 'bg-[#5E5BAE] text-white border-[#5E5BAE]'
                                    : 'bg-white/70 text-[#26263F] border-black/[0.05] hover:bg-white'
                                }`}
                              >
                                {dur}m
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 mt-1">
                          <label className="text-[11px] font-medium text-[#7A7895]">Activity Title</label>
                          <input
                            type="text"
                            value={dayDraftTitle}
                            onChange={(e) => setDayDraftTitle(e.target.value)}
                            placeholder="Select a preset above or type here..."
                            className="w-full px-3 py-2 rounded-[12px] bg-white border border-black/[0.08] text-xs text-[#26263F] focus:outline-none focus:ring-1 focus:ring-[#5E5BAE]"
                          />
                        </div>
                      </div>
                    )}

                    {dayDraftType === 'rest' && (
                      <div className="p-3 rounded-[16px] bg-[#E59980]/15 border border-[#E59980]/30 text-[11.5px] leading-relaxed text-[#26263F]">
                        <p>
                          <strong>Rest is an active health choice.</strong> In Plan B, restorative days count toward your consistent wellbeing and prevent cumulative fatigue.
                        </p>
                      </div>
                    )}

                    {dayDraftType !== 'none' && (
                      <div className="flex flex-col gap-1 mt-1">
                        <label className="text-[11px] font-medium text-[#7A7895]">Note (Optional)</label>
                        <input
                          type="text"
                          value={dayDraftNote}
                          onChange={(e) => setDayDraftNote(e.target.value)}
                          placeholder="e.g. Followed Plan B pacing calmly"
                          className="w-full px-3 py-2 rounded-[12px] bg-white border border-black/[0.08] text-xs text-[#26263F] focus:outline-none focus:ring-1 focus:ring-[#5E5BAE]"
                        />
                      </div>
                    )}
                  </div>

                  {isSaveDisabled && (
                    <p className="text-[11px] text-[#5E5BAE] font-medium text-center">
                      Select a preset or enter an activity name to save
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1 border-t border-black/[0.05]">
                    <button
                      type="button"
                      onClick={() => setActiveDayModalDate(null)}
                      className="flex-1 py-2.5 rounded-[14px] bg-black/5 hover:bg-black/10 text-xs font-semibold text-[#26263F] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={isSaveDisabled}
                      onClick={handleSaveDayRecord}
                      className={`flex-1 py-2.5 rounded-[14px] text-xs font-semibold shadow-sm transition-colors ${
                        isSaveDisabled
                          ? 'bg-[#5E5BAE]/40 text-white/70 cursor-not-allowed'
                          : 'bg-[#5E5BAE] hover:bg-[#524FA0] text-white cursor-pointer'
                      }`}
                    >
                      {dayDraftType === 'none' ? 'Clear Record' : 'Save Record'}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        );

        if (phoneFrameRef?.current) {
          return createPortal(dayModalContent, phoneFrameRef.current);
        }
        return dayModalContent;
      })()}
    </div>
  );
}
