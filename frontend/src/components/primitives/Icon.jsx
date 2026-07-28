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
