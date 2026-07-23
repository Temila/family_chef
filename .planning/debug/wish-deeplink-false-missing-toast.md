# Debug Session: 深链高亮误触发"未找到该愿望"toast（H-3）

## 现象

用户报告（user1 角色，登录后）：

- 访问 `/wishes/1`、`/wishes/2`、`/wishes/3` 均弹出"未找到该愿望，可能已撤销或需要切换标签"
- 后端数据已确认：3 条愿望的 user_id 均为 4（user1）
- GET `/api/wishes` 在 user1 token 下返回 4 条愿望，包含 id 1/2/3/4
- H-1 已通过（列表直接打开正常）

CR-01 修复（commit f9d1839）在 `UserWishesPage.jsx:147` 增加了 `if (loading) return undefined;` 守卫，但实测仍触发 toast。

## 复现路径

通过 Playwright + 注入调试日志，在 dev 服务器（Vite）复现：

1. user1 登录，token 写入 localStorage（key: `fc_access_token`、`fc_user`）
2. `page.goto('/wishes/1')`
3. 注入 MutationObserver 监听 `.toast` 节点插入

调试日志输出顺序：

```
[DBG-MNT] discarded 1                              # mount 请求被 requestSeqRef 抢占
[DBG-MNT] finally setLoading(false)                # .finally 仍翻 loading
[DBG-HL] run {highlightId: 1, wishesCount: 0, loading: false}   # 高亮 effect 看到 loading=false, wishes=[]
[DBG-HL] targetWish? false
[DBG-HL] not found, loading= false                 # 排程 setTimeout(0) for toast
[DBG-MNT] setWishes 4                              # 后台请求成功，wishes 填充
[DBG-MNT] finally setLoading(false)
[DBG-HL] SCHEDULING TOAST                          # setTimeout(0) 已弹出 toast（抢先于 cleanup）
[DBG-HL] run {highlightId: 1, wishesCount: 4, loading: false}   # effect 重新运行时才找到 wish
[DBG-HL] targetWish? true
```

## 根因

`frontend/src/pages/UserWishesPage.jsx:105-118` 的 mount effect：

```jsx
useEffect(() => {
  const seq = ++requestSeqRef.current;
  api.getWishes({page: 1, page_size: PAGE_SIZE})
    .then((res) => {
      if (seq !== requestSeqRef.current) return;   // 过期响应丢弃，但 .finally 仍执行
      const items = res.items || [];
      setWishes(items);
      ...
    })
    .catch(() => showToast('加载愿望失败', 'error'))
    .finally(() => setLoading(false));             // ← 即使 .then 提前 return，也会执行
}, [loadRelatedDishNames, showToast]);
```

触发 requestSeqRef 抢占的两种典型场景：

1. **React 19 StrictMode 二次挂载**（dev only，但 production 在 fast refresh / HMR 下也可能）：effect cleanup → 再次挂载，seq 从 1 → 2，初次请求 seq=1 必然被丢弃
2. **focus/visibilitychange 触发 background 刷新**：visibility effect（line 121-137）注册的 `window.addEventListener('focus', refresh)` 在新页面获得焦点时立即调用 `loadWishes({page:1, background:true})`，seq 提升到下一值

被丢弃请求的 `.finally(() => setLoading(false))` **仍会执行**，于是进入：

```
wishes = []      (setWishes 没被调用)
loading = false  (.finally 已翻)
```

高亮 effect（line 142-185）看到 `loading === false` 且 `wishes` 不含目标 id → 进入 `if (loading) return undefined;` 之后的分支：

```jsx
const missingTimer = setTimeout(() => {
  showToast('未找到该愿望，可能已撤销或需要切换标签', 'error');
  setSearchParams(...);  // 移除 ?wish=
  setHighlightedId(null);
}, 0);
return () => clearTimeout(missingTimer);
```

排程 `setTimeout(0)`。在 React 19 的 `scheduler` 调度下，effect cleanup **不与下一轮 setWishes 在同一 tick 内同步执行**——当下一轮 `.then` 触发 `setWishes([4])` 后，commit → cleanup → 新 effect body 这一连串动作发生在后续的 microtask；而 `setTimeout(0)` 已被加入 macrotask 队列，按浏览器规范最快 4ms 触发。结果：

- macrotask `setTimeout(0)` 触发 → `showToast` 已被调用
- microtask `setWishes` → React commit → cleanup 调用 `clearTimeout`，但已经太晚

`ChefWishesPage.jsx:166-207` 是完全同构的代码，`AdminWishesPage` 通过 `viewAsAdmin` 复用 `ChefWishesPage`，因此三个页面共享同一个 race。

## 修复方向

任选其一即可闭合 race（建议组合 1 + 3）：

1. **引入 `fetchedOnce` 标志**：仅当 wishes 至少被成功填充过一次（即 `.then` 中实际执行 `setWishes`）才允许 missing toast；`.finally` 不再单独翻 `fetchedOnce`
2. **mount effect 改写**：把"过期响应丢弃"逻辑移到 `.then` 之外，避免 `.finally` 与丢弃耦合（例如改用 `if (seq !== current) return` 包住整个 `.then` 体，或改用 abort controller）
3. **延迟 missing toast**：把 `setTimeout(0)` 改成 `setTimeout(100)`，给 commit+cleanup 一个窗口
4. **ToastContext 增加幂等**：同 `key` 在 1s 内不重复弹，避免抖动叠多个

最稳的方案是 **1 + 3**：`fetchedOnce` 守门从根本上解决 race，`setTimeout(100)` 兜底防止其它未知 race。

## 验证步骤

修复后跑：

```bash
cd /home/temila/family_chef && python3 repro_final.py
```

预期：`[toast-log] 0 toast(s) appeared`，且 `wishesCount === 4` 的 effect run 先于 missing toast 排程发生。

修复完成后回归 H-3 手工测试：user1 登录，依次访问 `/wishes/1`、`/wishes/2`、`/wishes/3`，不出现 toast，对应卡片蓝色描边 4 秒。

## 关联

- 触发评审：`.planning/phases/07-wish-list-frontend/07-REVIEW.md` CR-01（commit f9d1839）
- UAT 入口：`.planning/phases/07-wish-list-frontend/07-HUMAN-UAT.md` H-3
- 复现脚本：`repro_bug.py` / `repro_final.py`（仓库根，已加 .gitignore）