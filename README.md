# 家味 · Family Chef

家庭点菜系统 - 解决家庭成员之间的菜品选择、口味偏好管理和厨师协作问题。

## 项目结构

```
family_chef/
├── backend/                  # 后端项目 (FastAPI + Python)
│   ├── app/
│   │   ├── main.py           # FastAPI 应用入口
│   │   ├── config.py         # 配置管理
│   │   ├── database.py       # 数据库连接
│   │   ├── models/           # SQLAlchemy 模型
│   │   ├── schemas/          # Pydantic 数据模型
│   │   ├── routers/          # API 路由
│   │   ├── services/         # 业务逻辑层
│   │   ├── utils/            # 工具函数
│   │   └── integrations/     # 外部集成（飞书等）
│   ├── tests/                # 测试文件
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend/                 # 前端项目 (React + Vite)
│   └── ...
│
├── docker/                   # Docker 配置
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx.conf
│
├── docs-dev/                 # 开发文档
│   ├── 01-requirements.md    # 需求文档
│   ├── 02-technical.md       # 技术文档
│   └── 03-backend-development-plan.md  # 后端开发计划
│
└── front-end-portotype/      # 前端原型
    ├── v1/                   # 旧版原型
    └── v2/                   # 新版响应式原型
```

## 技术栈

- **后端**: Python 3.11+ / FastAPI / SQLAlchemy / SQLite
- **前端**: React 18 / Vite / Zustand
- **部署**: Docker / Nginx

## 快速开始

### 后端开发

```bash
cd backend

# 安装依赖
uv sync

# 复制配置文件
cp .env.example .env

# 启动开发服务器
uv run uvicorn app.main:app --reload

# 访问 API 文档
# http://localhost:8000/docs
```

### 运行测试

```bash
cd backend
uv run pytest tests/ -v --cov=app
```

## 开发计划

详见 [后端开发计划](docs-dev/03-backend-development-plan.md)

## 许可证

Private
