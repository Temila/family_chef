/**
 * Icon Component - Material Symbols SVG tree-shaking（Phase 10 — D-05/D-06/D-07）
 *
 * 内部维护 30 + (Phase 10 必要扩展) 个 name → SVG 组件的静态映射表。
 * 每个图标从 @material-symbols-svg/react 个别 import（Vite 自动 tree-shake 未用图标）。
 *
 * 调用方 API 与 Phase 9 完全一致：
 *   <Icon name="home" size={24} fill={0} weight={400} grade={0} className="" />
 *
 * Unknown name: dev console warn + render null（不显示破损文字或 fallback emoji）。
 */

import {
  // Navigation
  Home as HomeIcon,
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  MoreVert as MoreVertIcon,
  MoreHoriz as MoreHorizIcon,
  // 注：包内无 Place 导出（@material-symbols-svg/react@0.13.0），改用语义等价的 LocationOn（Material "place pin" 图标）
  LocationOn as PlaceIcon,
  // Actions
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Share as ShareIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  // People / food
  Restaurant as RestaurantIcon,
  Person as PersonIcon,
  SoupKitchen as ChefIcon,
  // Status
  // 注：包内无 FavoriteBorder 导出（@material-symbols-svg/react@0.13.0）。
  //   favorite -> FavoriteFill（实心红心，表示"已收藏"）
  //   favorite-border -> Favorite（描边红心，表示"未收藏"）
  FavoriteFill as FavoriteIcon,
  Star as StarIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  // Settings / privacy
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  // Phase 10 必要扩展（CONTEXT D-07 注脚允许）
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  ContentCopy as ContentCopyIcon,
  Favorite as FavoriteBorderIcon,
  // Phase 11 必要扩展（Sidebar / BottomBar 导航图标）
  Dashboard as DashboardIcon,
  Eco as EcoIcon,
  Folder as FolderIcon,
  Group as GroupIcon,
  BarChart as BarChartIcon,
  Description as DescriptionIcon,
  Lightbulb as LightbulbIcon,
  Spa as SpaIcon,
  // Phase 12 — D-EMOJI-01 emoji→Icon 全量替换扩展
  // 详见 12-RESEARCH.md §6 icon mapping table + 12-UI-SPEC.md Iconography Contract
  SetMeal as SetMealIcon,          // 🍽️/🍳/🥗/🥩/🦐 — 菜品/食材分类复用
  Inventory2 as Inventory2Icon,    // 📋/📦 — 订单/愿望容器
  Mail as MailIcon,                // 📭 — 空收件箱/空状态默认
  ShoppingCart as ShoppingCartIcon,// 🛒 — 访客购物车
  NewLabel as NewLabelIcon,        // 🆕 — 匹配食材标识（verified: dist/icons/new-label.js）
  RamenDining as RamenDiningIcon,  // 🍲 — 汤锅/家常菜隐喻（verified: dist/icons/ramen-dining.js）
  Circle as CircleIcon,            // 🔴 — 过敏/错误圆点（verified: dist/icons/circle.js）
  Lock as LockIcon,                // 🔒 — 锁定/权限
  MoodBad as MoodBadIcon,          // 😔 — 空/错误状态
  Bolt as BoltIcon,                // ⚡ — 快捷/闪电
  TrendingUp as TrendingUpIcon,    // 📈 — 趋势上升
  Send as SendIcon,                // 🚀 — 发送/分享
  // Phase 17 必要扩展（ThemePage 入口 + 重置按钮）
  Palette as PaletteIcon,          // 🎨 — /theme 入口按钮（Header.D-18）
  RestartAlt as RestartAltIcon,    // 🔄 — ThemePage 重置默认主题按钮
} from '@material-symbols-svg/react';

// 静态映射表：调用方 name → 内部 SVG 组件
const ICONS = {
  // Navigation
  home: HomeIcon,
  menu: MenuIcon,
  'arrow-back': ArrowBackIcon,
  'arrow-forward': ArrowForwardIcon,
  'more-vert': MoreVertIcon,
  'more-horiz': MoreHorizIcon,
  place: PlaceIcon,
  // Actions
  search: SearchIcon,
  add: AddIcon,
  edit: EditIcon,
  delete: DeleteIcon,
  check: CheckIcon,
  close: CloseIcon,
  share: ShareIcon,
  refresh: RefreshIcon,
  filter: FilterIcon,
  sort: SortIcon,
  // People / food
  restaurant: RestaurantIcon,
  person: PersonIcon,
  chef: ChefIcon,
  // Status
  favorite: FavoriteIcon,
  star: StarIcon,
  schedule: ScheduleIcon,
  notifications: NotificationsIcon,
  info: InfoIcon,
  warning: WarningIcon,
  error: ErrorIcon,
  // Settings / privacy
  settings: SettingsIcon,
  logout: LogoutIcon,
  visibility: VisibilityIcon,
  'visibility-off': VisibilityOffIcon,
  // Phase 10 必要扩展
  'light-mode': LightModeIcon,
  'dark-mode': DarkModeIcon,
  'content-copy': ContentCopyIcon,
  'favorite-border': FavoriteBorderIcon,
  // Phase 11 必要扩展（Sidebar / BottomBar 导航）
  dashboard: DashboardIcon,
  eco: EcoIcon,
  folder: FolderIcon,
  group: GroupIcon,
  'bar-chart': BarChartIcon,
  description: DescriptionIcon,
  lightbulb: LightbulbIcon,
  spa: SpaIcon,
  // Phase 12 — D-EMOJI-01 emoji→Icon 全量替换扩展
  'set-meal': SetMealIcon,
  'inventory-2': Inventory2Icon,
  mail: MailIcon,
  'shopping-cart': ShoppingCartIcon,
  'new-label': NewLabelIcon,
  'ramen-dining': RamenDiningIcon,
  circle: CircleIcon,
  lock: LockIcon,
  'mood-bad': MoodBadIcon,
  bolt: BoltIcon,
  'trending-up': TrendingUpIcon,
  send: SendIcon,
  // Phase 17 必要扩展（ThemePage 入口 + 重置按钮）
  palette: PaletteIcon,
  'restart-alt': RestartAltIcon,
};

export default function Icon({
  name,
  size = 24,
  fill = 0,
  weight = 400,
  grade = 0,
  className = '',
  style,
}) {
  const Component = ICONS[name];

  if (!Component) {
    if (import.meta.env.DEV) {
      console.warn(`[Icon] unknown name: ${name}`);
    }
    return null;
  }

  return (
    <Component
      style={{ fontSize: size, color: 'currentColor', ...style }}
      fill={fill}
      weight={weight}
      grade={grade}
      className={className}
      aria-hidden="true"
    />
  );
}
