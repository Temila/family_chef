/**
 * MD3 Sheet Composite (Phase 14 — responsive modal/sheet)
 *
 * 响应式弹层：桌面（≥1024px）居中 modal，移动端（<1024px）底部 sheet。
 * 通过 `<Modal variant="bottom-sheet">` 委托，继承全部 MD3 modal 行为
 * （focus trap + ESC 关闭 + 背景滚动锁定 + 焦点归还），零重复逻辑。
 *
 * 公开 API（与 Modal 一致，去掉 variant — 调用方无法覆盖响应式行为）：
 *   open           控制渲染（false → return null）
 *   onClose        backdrop / ESC / close icon 触发的关闭回调
 *   title          标题文本
 *   closeIcon      是否渲染右上角 ✕（默认 true）
 *   header         自定义 header slot
 *   footer         自定义 footer slot
 *   actions        ReactNode 数组
 *   children       sheet-body 内容
 *   closeOnBackdrop 点击 backdrop 是否触发 onClose（默认 true）
 *   labelledBy     aria-labelledby id
 *   describedBy    aria-describedby id
 *   initialFocusRef 可选，打开时聚焦元素
 *   className      附加 class
 *   style          桌面居中模式下的样式覆写
 */

import Modal from './Modal';
import './Sheet.css';

export default function Sheet({
  open = true,
  onClose,
  title,
  closeIcon = true,
  header,
  footer,
  actions,
  children,
  closeOnBackdrop = true,
  labelledBy,
  describedBy,
  initialFocusRef,
  className = '',
  style,
}) {
  return (
    <Modal
      variant="bottom-sheet"
      open={open}
      onClose={onClose}
      title={title}
      closeIcon={closeIcon}
      header={header}
      footer={footer}
      actions={actions}
      closeOnBackdrop={closeOnBackdrop}
      labelledBy={labelledBy}
      describedBy={describedBy}
      initialFocusRef={initialFocusRef}
      className={className}
      style={style}
    >
      {children}
    </Modal>
  );
}
