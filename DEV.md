# RollCall 开发说明

本文档面向开发和维护人员，记录项目结构、技术栈、运行方式和构建命令。用户使用说明见 `README.md`。

## 技术栈

- 后端：Go、SQLite、YAML、fsnotify
- 桌面端：Wails v2
- 前端：React、TypeScript、Vite、Tailwind CSS、shadcn/ui
- 数据库：SQLite，使用 `modernc.org/sqlite`
- 导入导出：CSV、Excel

## 环境要求

- Go 1.25 或更高版本
- Node.js 与 npm
- Wails CLI
- Bash 环境：用于运行 `scripts/build.sh`

安装 Wails CLI：

```bash
go install github.com/wailsapp/wails/v2/cmd/wails@latest
```

安装前端依赖：

```bash
cd frontend
npm install
```

## 开发运行

桌面端开发模式：

```bash
wails dev
```

前端独立开发：

```bash
cd frontend
npm run dev
```

Server 模式从源码运行：

```bash
cd frontend
npm run build
cd ..
go run -tags server .
```

Server 默认监听 `http://localhost:8080`，端口读取 `config/config.yaml` 中的 `app.port`。

## 构建

使用脚本：

```bash
./scripts/build.sh desktop
./scripts/build.sh server
./scripts/build.sh frontend
./scripts/build.sh all
```

使用 Makefile：

```bash
make build-desktop
make build-server
make build-all
```

构建脚本会向 `internal/version` 注入版本信息：

- 当前提交正好是 `v*` tag 时，`Version` 使用该 tag。
- 否则 `Version` 使用当前分支名。
- `CommitID` 使用当前短提交哈希。

Server 构建产物：

```text
build/bin/rollcall-server
```

Windows 下为：

```text
build/bin/rollcall-server.exe
```

## 常用命令

```bash
# 运行 Go 测试
go test ./...

# 构建前端
cd frontend && npm run build

# 构建桌面应用
wails build

# 构建 Server 二进制
go build -tags server -o build/bin/rollcall-server .
```

## 项目结构

```text
.
├── main.go                 # Wails 桌面端入口
├── main_server.go          # Server 模式入口
├── internal/
│   ├── app/                # Wails 绑定方法
│   ├── config/             # 配置加载、保存、监听
│   ├── database/           # SQLite 初始化与迁移
│   ├── model/              # 数据模型
│   ├── repository/         # 数据访问层
│   ├── server/             # HTTP API 与静态资源路由
│   ├── service/            # 业务逻辑
│   └── version/            # 构建版本信息
├── frontend/               # React 前端
├── config/                 # 默认配置
├── data/                   # 本地运行数据
├── scripts/                # 构建脚本
├── build/                  # Wails 构建资源与产物目录
└── doc/                    # 需求与计划文档
```

## 运行模式

桌面端：

- `main.go` 使用 `//go:build !server`。
- Wails 直接绑定 `internal/app` 中的公开方法。
- 前端通过 `frontend/wailsjs` 调用 Go 方法。
- 配置和数据目录由 `appDataDir()` 决定。

Server 模式：

- `main_server.go` 使用 `//go:build server`。
- 前端资源从 `frontend/dist` 嵌入。
- HTTP API 位于 `internal/server`。
- 前端在非 Wails 环境下通过 `/api` 调用后端。
- 配置目录为 `./config`，数据目录为 `./data`。

## 配置

默认配置文件：

```text
config/config.yaml
```

配置结构：

```yaml
app:
  port: 8080
  mode: desktop
  navigationMode: bottom
  adminPasswordHash: ""
feature:
  enableScore: true
  enableAnimation: true
  animationDuration: 5
  animationStyle: slotMachine
random:
  mode: weighted
  avoidRepeatWindow: 5
  weightByScore: false
```

`internal/config` 会加载默认配置、创建缺失配置文件，并监听配置变更。

## 数据库

数据库文件：

```text
data/rollcall.db
```

主要表：

- `classes`
- `students`
- `score_logs`
- `rollcall_logs`

迁移逻辑位于 `internal/database/migrations.go`。当前连接启用 WAL 和外键，并将最大连接数设置为 1。

## 点名算法

核心逻辑位于 `internal/service/rollcall_service.go`。

- `random`：所有正常状态学生权重相同。
- `fair`：最近点中过的学生权重按次数降低。
- `weighted`：积分越低权重越高，同时结合最近点名记录降低重复概率。

抽样使用 Efraimidis-Spirakis 加权无放回抽样算法。

## 前端 API 切换

`frontend/src/lib/api.ts` 根据运行环境选择 API：

- Wails 环境：调用 `frontend/wailsjs/go/app/App`。
- 浏览器 Server 环境：调用 `frontend/src/lib/api-http.ts` 中的 HTTP API。

这使同一套前端页面可以同时服务于桌面端和 Server 模式。
