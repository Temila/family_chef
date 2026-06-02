"""
家味 · Family Chef - FastAPI 应用入口
"""

import asyncio
import os
import sys
import threading

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings, smart_settings
from app.database import init_db

BANNER = r"""
   _____ _             _    _____  __
  |  ___| | _____  ___| | _|  ___|/ _| __ _  ___ ___
  | |_  | |/ _ \ \/ / | | | |__ | |_ / _` |/ __/ _ \
  |  _| | |  |>  <| | |_| |__| _|  _| (_| | (_|  __/
  |_|   |_|_/_/\_\_|\___/    |_| |_|  \__,_|\___\___|
"""

PORT = int(os.environ.get("PORT", "8000"))

_log_lock = threading.Lock()


def _log(msg: str):
    with _log_lock:
        sys.stderr.write(msg + "\n")
        sys.stderr.flush()


def _print_startup_info():
    _log(BANNER)
    _log(f"  {settings.APP_NAME} v{settings.APP_VERSION}")
    _log(f"  Debug: {settings.DEBUG}")
    _log(f"  Smart: {'ON' if smart_settings.SMART_ENABLED else 'OFF'}")
    _log("")
    _log(f"  Local:   http://localhost:{PORT}")
    if os.environ.get("DOCKER_MODE") == "1":
        host_port = os.environ.get("HOST_PORT", str(PORT))
        _log(f"  Exposed: http://localhost:{host_port}")
    _log("")


class _DownloadProgress:
    """实时进度条，输出到 Docker 日志（stderr）"""

    BAR_WIDTH = 25
    REFRESH_INTERVAL = 2.0

    def __init__(self, **kwargs):
        self.total = kwargs.get("total", 0) or 0
        self.desc = kwargs.get("desc", "").strip()
        if len(self.desc) > 35:
            self.desc = "..." + self.desc[-32:]
        self.n = kwargs.get("initial", 0)
        self._start_time = None
        self._last_time = 0
        self._last_n = 0
        self._speed_samples = []

    def _format_size(self, n):
        if n < 1024:
            return f"{n:.0f} B"
        if n < 1024 * 1024:
            return f"{n / 1024:.1f} KB"
        return f"{n / (1024 * 1024):.1f} MB"

    def _format_speed(self, speed):
        if speed < 1024:
            return f"{speed:.0f} B/s"
        if speed < 1024 * 1024:
            return f"{speed / 1024:.1f} KB/s"
        return f"{speed / (1024 * 1024):.1f} MB/s"

    def _format_time(self, seconds):
        if seconds < 0:
            return "---"
        if seconds < 60:
            return f"{seconds:.0f}s"
        if seconds < 3600:
            return f"{seconds / 60:.0f}m{seconds % 60:.0f}s"
        return f"{seconds / 3600:.0f}h{(seconds % 3600) / 60:.0f}m"

    def _render(self):
        import time

        now = time.time()
        if self._start_time is None:
            self._start_time = now
            self._last_time = now
            self._last_n = self.n
            return

        if now - self._last_time < self.REFRESH_INTERVAL:
            return

        if self.total <= 0:
            pct = 0
            filled = 0
        else:
            pct = min(self.n / self.total, 1.0)
            filled = int(self.BAR_WIDTH * pct)

        dt = now - self._last_time
        if dt > 0:
            speed = (self.n - self._last_n) / dt
            self._speed_samples.append(speed)
            if len(self._speed_samples) > 10:
                self._speed_samples.pop(0)
        self._last_time = now
        self._last_n = self.n

        avg_speed = (
            sum(self._speed_samples) / len(self._speed_samples)
            if self._speed_samples
            else 0
        )

        bar = "█" * filled + "░" * (self.BAR_WIDTH - filled)
        pct_str = f"{pct * 100:5.1f}%"
        size_str = f"{self._format_size(self.n)}/{self._format_size(self.total)}"
        speed_str = self._format_speed(avg_speed) if avg_speed > 0 else "---"

        if avg_speed > 0 and self.total > self.n:
            eta = (self.total - self.n) / avg_speed
            eta_str = self._format_time(eta)
        else:
            eta_str = "---"

        line = f"  ⬇ |{bar}| {pct_str} {size_str} {speed_str} ETA {eta_str}"
        _log(line)

    def update(self, n=1):
        self.n += n
        self._render()

    def close(self):
        if self._start_time is not None:
            import time

            elapsed = time.time() - self._start_time
            size_str = self._format_size(self.n)
            avg_speed = self.n / elapsed if elapsed > 0 else 0
            speed_str = self._format_speed(avg_speed)
            bar = "█" * self.BAR_WIDTH
            _log(f"  ✅ |{bar}| 100.0% {size_str} {speed_str} 完成")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()

    @staticmethod
    def write(*args, **kwargs):
        pass


def _download_model_async():
    """在后台线程中下载 LLM 模型到 config.yaml 配置的路径"""

    def _download():
        try:
            from pathlib import Path

            from huggingface_hub import hf_hub_download

            repo = smart_settings.LLM_MODEL_REPO
            filename = smart_settings.LLM_MODEL_FILENAME
            model_dir = Path(smart_settings.LLM_MODEL_DIR)
            local_path = model_dir / filename

            if local_path.exists():
                _log(f"  ✅ 模型已存在: {local_path}")
                return

            model_dir.mkdir(parents=True, exist_ok=True)

            endpoint = smart_settings.HF_MIRROR
            source = endpoint if endpoint else "huggingface.co"
            _log(f"  ⬇ 下载模型 {repo}/{filename}")
            _log(f"  ⬇ 来源: {source}")
            _log(f"  ⬇ 存放: {model_dir.resolve()}")

            kwargs = {
                "repo_id": repo,
                "filename": filename,
                "local_dir": str(model_dir.resolve()),
                "tqdm_class": _DownloadProgress,
            }
            if endpoint:
                kwargs["endpoint"] = endpoint

            hf_hub_download(**kwargs)
            _log(f"  ✅ 模型已下载: {local_path}")
        except ImportError:
            _log("  ⚠ 缺少依赖 huggingface-hub，请运行: pip install huggingface-hub")
        except Exception as e:
            _log(f"  ⚠ 模型下载失败: {e}")
            _log("  ⚠ 首次使用智能功能时将重试下载")

    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, _download)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="家庭点菜系统后端 API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """应用启动事件"""
    _print_startup_info()

    await init_db()

    from app.initial_data import create_initial_data, create_preset_categories, create_preset_ingredients

    await create_initial_data()
    await create_preset_categories()
    await create_preset_ingredients()

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    _log(f"  ✅ {settings.APP_NAME} v{settings.APP_VERSION} 启动成功")
    _log(f"  🌐 访问地址: http://localhost:{PORT}")
    _log("")

    if smart_settings.needs_model():
        _download_model_async()


@app.on_event("shutdown")
async def shutdown():
    """应用关闭事件"""
    _log("  👋 应用关闭")


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}


from app.routers import (
    admin,
    auth,
    categories,
    chefs,
    dishes,
    favorites,
    feishu,
    guest,
    ingredients,
    orders,
    preferences,
    tools,
    upload,
    users,
)

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户管理"])
app.include_router(dishes.router, prefix="/api/dishes", tags=["菜品管理"])
app.include_router(orders.router, prefix="/api/orders", tags=["订单管理"])
app.include_router(guest.router, prefix="/api/guest", tags=["访客邀请"])
app.include_router(ingredients.router, prefix="/api/ingredients", tags=["食材管理"])
app.include_router(categories.router, prefix="/api/categories", tags=["分类管理"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["收藏管理"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["口味偏好"])
app.include_router(chefs.router, prefix="/api/chefs", tags=["厨师管理"])
app.include_router(admin.router, prefix="/api/admin", tags=["系统管理"])
app.include_router(feishu.router, prefix="/api/feishu", tags=["飞书集成"])
app.include_router(tools.router, prefix="/api/tools", tags=["工具"])
app.include_router(upload.router, prefix="/api/upload", tags=["文件上传"])

frontend_dist_dir = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend/dist"
)
if os.path.exists(frontend_dist_dir):
    index_html = os.path.join(frontend_dist_dir, "index.html")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("uploads/"):
            file_path = os.path.join(".", full_path)
            if os.path.isfile(file_path):
                return FileResponse(file_path)
        file_path = os.path.join(frontend_dist_dir, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(index_html)
