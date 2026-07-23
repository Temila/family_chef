"""H-3 deep-link highlight 回归测试。

断言：当 user1（已拥有 ≥3 条愿望）依次访问 /wishes/1、/wishes/2、/wishes/3 时，
即使在 /api/wishes 被 1.5s 节流（暴露 requestSeqRef 丢弃窗口）的情况下，
"未找到该愿望，可能已撤销或需要切换标签" toast 也不应出现。

同时验证：访问 /wishes/999999（确实不存在）时，missing-wish toast 必须出现恰好一次
（证明修复没有误伤合法的"未找到"提示路径）。

前置条件：
  - 后端 dev server 运行在 http://localhost:8000（./scripts/run-dev.sh）
  - 前端 dev server 运行在 http://localhost:5173
  - user1 / 123456 已存在且拥有 ≥3 条愿望

用法：
  python3 repro_h3_regression.py

退出码：
  0  PASS — 深链导航期间未观测到 "未找到该愿望" toast，且缺失 id 路径出现恰好 1 次 toast
  1  FAIL — 断言失败（出现非法 toast / 缺失合法 toast）
  2  ERROR — 前置条件不满足（登录失败、测试数据不足、dev server 不可达）
"""

import sys
import time
import urllib.request
import urllib.error
from playwright.sync_api import sync_playwright

CHROME = '/home/temila/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome'
BACKEND = 'http://localhost:8000'
FRONTEND = 'http://localhost:5173'
MISSING_TOAST_SUBSTRING = '未找到该愿望'
SAMPLE_INTERVALS = [0.2, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0]
EXISTING_WISH_IDS = ['1', '2', '3']
MISSING_WISH_ID = '999999'


def setup_error(msg):
    print(f'[SETUP-ERROR] {msg}', file=sys.stderr)
    sys.exit(2)


def http_json_post(url, payload):
    """通过 urllib 发送 JSON POST（避免对 requests 的依赖）。"""
    import json
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        url, data=data, headers={'Content-Type': 'application/json'}, method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        setup_error(f'登录失败：HTTP {exc.code} {exc.reason}')


def login_and_probe():
    """登录并探测测试数据。返回 (access_token, refresh_token, user, wish_ids)。"""
    login = http_json_post(f'{BACKEND}/api/auth/login', {'username': 'user1', 'password': '123456'})
    access = login.get('access_token')
    refresh = login.get('refresh_token')
    user = login.get('user')
    if not access or not user:
        setup_error('登录响应缺少 access_token 或 user 字段')
    # 探测愿望列表
    import json
    req = urllib.request.Request(
        f'{BACKEND}/api/wishes?page=1&page_size=50',
        headers={'Authorization': f'Bearer {access}'},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            wishes_resp = json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as exc:
        setup_error(f'GET /api/wishes 失败：HTTP {exc.code}（是否 ./scripts/run-dev.sh 未启动？）')
    items = wishes_resp.get('items', [])
    ids = [str(w.get('id')) for w in items if w.get('id') is not None]
    print(f'[probe] user1 拥有 {len(ids)} 条愿望：{ids}')
    missing = [wid for wid in EXISTING_WISH_IDS if wid not in ids]
    if missing:
        setup_error(
            f'测试数据不足 — user1 需拥有愿望 id {EXISTING_WISH_IDS}，'
            f'当前缺少 {missing}。请先创建测试愿望（脚本不会自动创建，避免掩盖数据正确性问题）。'
        )
    return access, refresh, user, ids


def install_throttle(ctx):
    """对 /api/wishes** 注入 1.5s 延迟，暴露 requestSeqRef 丢弃窗口。"""
    def slowdown(route):
        time.sleep(1.5)
        route.continue_()
    ctx.route('**/api/wishes**', slowdown)


# add_init_script：每次新文档（导航）加载时自动执行，确保 MutationObserver 在目标页面
# （而非 /login 中转页）上挂载，且 window.__toastLog 每次导航后重置。
# 直接 page.evaluate 安装的 observer 会在 page.goto 目标深链时随旧 document 被销毁。
TOAST_OBSERVER_INIT = """
window.__toastLog = [];
window.__resetToastLog = function () { window.__toastLog = []; };
function __attachToastObserver() {
    if (!document.body) {
        setTimeout(__attachToastObserver, 10);
        return;
    }
    if (window.__toastObserver) return;
    const collect = (node) => {
        if (!node || node.nodeType !== 1) return;
        const matches = (node.classList && node.classList.contains('toast'))
            || (node.getAttribute && node.getAttribute('role') === 'alert');
        if (matches) {
            window.__toastLog.push({ ts: Date.now(), text: node.innerText || '' });
        }
    };
    const obs = new MutationObserver((muts) => {
        for (const m of muts) {
            for (const n of m.addedNodes) collect(n);
        }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    window.__toastObserver = obs;
}
__attachToastObserver();
"""


def install_toast_observer(ctx):
    """注册跨导航持久的 MutationObserver（每次新 document 自动重挂）。"""
    ctx.add_init_script(TOAST_OBSERVER_INIT)


def reset_toast_log(page):
    page.evaluate('window.__resetToastLog()')


def read_toast_log(page):
    return page.evaluate('window.__toastLog') or []


def count_missing_toasts(log):
    return sum(1 for e in log if MISSING_TOAST_SUBSTRING in (e.get('text') or ''))


def navigate_with_token(ctx, access, refresh, user, path):
    """导航到指定深链。每个 page 使用全新 context page 以隔离 toast 日志。"""
    page = ctx.new_page()
    page.on('console', lambda msg: print(f'[console.{msg.type}] {msg.text}'))
    page.on('pageerror', lambda err: print(f'[pageerror] {err}'))
    # 先到 /login 域下注入 localStorage，再导航到目标深链
    page.goto(f'{FRONTEND}/login', wait_until='domcontentloaded')
    page.evaluate(
        """([a, r, u]) => {
            localStorage.setItem('fc_access_token', a);
            localStorage.setItem('fc_refresh_token', r);
            localStorage.setItem('fc_user', JSON.stringify(u));
        }""",
        [access, refresh, user],
    )
    print(f'[navigate] {path}（/api/wishes 已节流 1.5s）')
    page.goto(f'{FRONTEND}{path}', wait_until='domcontentloaded')
    # add_init_script 已在本次 goto 时重挂 observer 并重置 __toastLog；
    # 此处再显式重置一次，确保采样窗口从导航完成时刻起算。
    reset_toast_log(page)
    return page


def poll_toasts(page, label):
    """按 SAMPLE_INTERVALS 轮询 toast 日志，返回最终日志列表。"""
    last_t = 0
    for t in SAMPLE_INTERVALS:
        time.sleep(t - last_t)
        last_t = t
        log = read_toast_log(page)
        url = page.url
        missing_n = count_missing_toasts(log)
        cards = len(page.query_selector_all('[data-wish-id]'))
        print(f'  [{label}] t≈{t:.1f}s url={url} missing-toast={missing_n} cards={cards}')
    return read_toast_log(page)


def main():
    access, refresh, user, _ = login_and_probe()

    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx = browser.new_context(viewport={'width': 1280, 'height': 720})
        install_throttle(ctx)
        # 注册一次即可：add_init_script 在每个新 document（含每次 page.goto）自动执行
        install_toast_observer(ctx)

        failures = []

        # 正向用例：/wishes/1、/wishes/2、/wishes/3 — 不应出现 missing-wish toast
        for wid in EXISTING_WISH_IDS:
            page = navigate_with_token(ctx, access, refresh, user, f'/wishes/{wid}')
            log = poll_toasts(page, label=f'existing-{wid}')
            page.close()
            missing_n = count_missing_toasts(log)
            if missing_n > 0:
                failures.append(
                    f'/wishes/{wid}: 期望 0 条 "未找到该愿望" toast，实际 {missing_n} 条'
                )
                print(f'[FAIL] /wishes/{wid}: 观测到 {missing_n} 条 missing-toast')
            else:
                print(f'[PASS] /wishes/{wid}: 零 missing-toast')

        # 负向用例：/wishes/999999 — missing-wish toast 必须出现恰好 1 次
        page = navigate_with_token(ctx, access, refresh, user, f'/wishes/{MISSING_WISH_ID}')
        log = poll_toasts(page, label=f'missing-{MISSING_WISH_ID}')
        page.close()
        missing_n = count_missing_toasts(log)
        if missing_n != 1:
            failures.append(
                f'/wishes/{MISSING_WISH_ID}: 期望恰好 1 条 "未找到该愿望" toast，实际 {missing_n} 条'
            )
            print(f'[FAIL] /wishes/{MISSING_WISH_ID}: 观测到 {missing_n} 条 missing-toast（期望 1）')
        else:
            print(f'[PASS] /wishes/{MISSING_WISH_ID}: 恰好 1 条 missing-toast')

        browser.close()

    if failures:
        print('\n[RESULT] FAIL — 断言失败：')
        for f in failures:
            print(f'  - {f}')
        sys.exit(1)

    print('\n[RESULT] PASS — 所有断言通过（H-3 回归闭合）')
    sys.exit(0)


if __name__ == '__main__':
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:  # noqa: BLE001
        print(f'[ERROR] 未预期异常：{type(exc).__name__}: {exc}', file=sys.stderr)
        sys.exit(2)
