"""
家味 · Family Chef - FastAPI 应用入口
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.config import settings
from app.database import init_db

# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="家庭点菜系统后端 API",
)

# 配置 CORS 中间件
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
    await init_db()
    
    # 创建初始化数据
    from app.initial_data import create_initial_data, create_preset_categories
    await create_initial_data()
    await create_preset_categories()
    
    # 创建上传目录
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    
    # 挂载静态文件服务
    if os.path.exists(settings.UPLOAD_DIR):
        app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    
    print(f"✅ {settings.APP_NAME} v{settings.APP_VERSION} 启动成功")


@app.on_event("shutdown")
async def shutdown():
    """应用关闭事件"""
    print("👋 应用关闭")


@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "ok"}


# 注册路由
from app.routers import auth, users, dishes, orders, ingredients, categories, favorites, preferences, chefs, admin, feishu, tools, upload

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(users.router, prefix="/api/users", tags=["用户管理"])
app.include_router(dishes.router, prefix="/api/dishes", tags=["菜品管理"])
app.include_router(orders.router, prefix="/api/orders", tags=["订单管理"])
app.include_router(ingredients.router, prefix="/api/ingredients", tags=["食材管理"])
app.include_router(categories.router, prefix="/api/categories", tags=["分类管理"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["收藏管理"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["口味偏好"])
app.include_router(chefs.router, prefix="/api/chefs", tags=["厨师管理"])
app.include_router(admin.router, prefix="/api/admin", tags=["系统管理"])
app.include_router(feishu.router, prefix="/api/feishu", tags=["飞书集成"])
app.include_router(tools.router, prefix="/api/tools", tags=["工具"])
app.include_router(upload.router, prefix="/api/upload", tags=["文件上传"])

# 挂载前端静态文件（在 /app/ 路径下，避免与 /api/ 冲突）
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/app", StaticFiles(directory=frontend_dir, html=True), name="frontend")
    # 根路径重定向到 /app/
    from fastapi.responses import RedirectResponse
    @app.get("/")
    async def root_redirect():
        return RedirectResponse(url="/app/")