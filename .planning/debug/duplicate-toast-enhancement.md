---
status: diagnosed
trigger: "通过，但同名的错误提示不够明显，除当前的错误提示外，需要再通过弹出式的卡片来提醒"
created: 2026-08-06
updated: 2026-08-06
---

## Current Focus

hypothesis: 缺失的不是后端错误，也不是 Toast 系统 — 而是 ThemeEditorPage 的 catch 分支只设置了 setNameError，未并行调用 showToast
test: 静态读 + 跨文件验证
expecting: 锁定 ThemeEditorPage.jsx:264-265 这行为唯一根因
next_action: 已诊断完毕，等待规划阶段处理 fix

## Symptoms

expected: 重名时除 Input 内联错误外，还应有弹出式 Toast 卡片提醒
actual: 内联 Input `error` 显示「已存在同名主题：xxx」，但屏幕顶部无 Snackbar 弹出
errors: 无运行时错误；纯功能缺失（缺少并行通知通道）
reproduction: UAT Test 8 (18-UAT.md:147-156) — 新建/重命名为同名时只看到 Input 错误
started: UAT 2026-08-06

## Eliminated

- hypothesis: 后端未抛「已存在同名主题」
  evidence: backend/app/services/custom_theme_service.py:36, 86 显式 `raise ValueError(f"已存在同名主题: ...")`；tests/test_themes.py:222, 307 已验证 detail 中含「已存在同名主题」字符串
  timestamp: 2026-08-06
- hypothesis: 前端正则未命中
  evidence: ThemeEditorPage.jsx:264 `/同名|已存在|duplicate/i` 同时覆盖「已存在」「同名」两 token；后端消息为 `已存在同名主题: <name>`，必然命中
  timestamp: 2026-08-06
- hypothesis: useToast 未在 ThemeEditorPage 中导入
  evidence: ThemeEditorPage.jsx:27 `import { useToast } from '../contexts/ToastContext.jsx';`；:139 `const { showToast } = useToast();`
  timestamp: 2026-08-06
- hypothesis: ToastContext 不支持 'error' 变体
  evidence: ToastContext.jsx:20-25 `DURATION_BY_TYPE.error = 6000`；:27-32 `ICON_BY_TYPE.error = 'error'`；:87-91 `.md-snackbar__bar--error` 样式齐全
  timestamp: 2026-08-06
- hypothesis: 需要新建 Toast.jsx 组件
  evidence: 不存在；Snackbar UI 完全内联在 ToastContext.jsx:322-358（`<div class="md-snackbar md-snackbar--${type}">`），通过 `<SnackbarProvider>` 自动挂载
  timestamp: 2026-08-06

## Evidence

- timestamp: 2026-08-06
  checked: ThemeEditorPage.jsx handleSave catch 分支
  found: ThemeEditorPage.jsx:262-272
  ```
  } catch (err) {
    const message = String(err?.message || '保存失败');
    if (/同名|已存在|duplicate/i.test(message)) {
      setNameError(`已存在同名主题：${finalName}`);   // ← 仅设置内联错误
    } else if (message.includes('主题名称不能为空') || message.includes('不能为空')) {
      setNameError('主题名称不能为空');
    } else if (message.includes('颜色值')) {
      showToast('颜色值不合法', 'error');
    } else {
      showToast(message, 'error');
    }
  }
  ```
  implication: 重名分支没有任何 showToast 调用 — 这就是「无弹出卡片」的直接原因
- timestamp: 2026-08-06
  checked: 同文件其他分支
  found: '颜色值不合法' (line 269) 与 'fallback message' (line 271) 都用 `showToast(..., 'error')`；唯独重名分支只走 setNameError
  implication: 编辑者已经形成「setNameError 用于字段级提示、showToast 用于全局提示」的双通道惯例；要并行只需在重名分支加一行
- timestamp: 2026-08-06
  checked: backend custom_theme_service
  found: line 36 `raise ValueError(f"已存在同名主题: {theme_data.name}")`；line 86 `raise ValueError(f"已存在同名主题: {patch['name']}")`
  implication: POST 创建和 PUT 重命名两条路径都会触发同一中文消息字符串，前端正则必然命中
- timestamp: 2026-08-06
  checked: Toast 渲染
  found: ToastContext.jsx:318-360 SnackbarProvider 在树根渲染 `<div class="md-snackbar-stack">`，每条 `items` 渲染为 `.md-snackbar--error` 卡片（fixed 顶部居中，z-index 1000，48dp 触控目标）
  implication: 一次 `showToast('已存在同名主题：xxx', 'error')` 就会立刻在屏幕顶部弹出红色 4dp-bar + 错误图标的 Snackbar（MD3 spec 中的「弹出式卡片」），时长 6s
- timestamp: 2026-08-06
  checked: 全局 useToast 注入
  found: App.jsx 必须包含 `<SnackbarProvider>` 包裹路由；ThemeEditorPage.jsx:139 取出的 showToast 是稳定回调（useCallback in ToastContext.jsx:260）
  implication: 无需新增 Provider；showToast 可直接在重名分支调用，无额外上下文问题

## Resolution

root_cause: ThemeEditorPage.jsx:264-265 的 catch 分支命中 `/同名|已存在|duplicate/i` 时只调用了 `setNameError(\`已存在同名主题：${finalName}\`)`，没有并行触发 `showToast(...)`。后端 400 + 中文字符串 + 前端正则 + useToast 导入 + Toast 'error' 变体 + SnackbarProvider 全部就绪 — 唯一缺失的是这一行 showToast 调用。
fix: 在 line 265 的 setNameError 之后（或之前）追加 `showToast(\`已存在同名主题：${finalName}\`, 'error');`，使 Snackbar 与 Input 内联错误同时出现
verification: 重命名/新建到已存在名称 → Input 显示中文错误 + 屏幕顶部弹出红色 md-snackbar 错误卡片（6s 自动消失）
files_changed: [/home/temila/family_chef/frontend/src/pages/ThemeEditorPage.jsx]
