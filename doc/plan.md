# RollCall 课堂随机点名系统 — 实现计划

## Context

基于 `doc/REQ.md` 需求文档，从零搭建一个课堂随机点名与积分管理工具。项目当前只有需求文档，无任何代码。目标是一次性实现完整可用的桌面应用，界面现代美观，动效丰富。

**技术选型确认：**
- 运行模式：Wails v2 桌面端（.exe），不做独立 Web 服务器模式
- 前端：React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- 后端：Go + Wails v2 绑定，前端直接调用 Go 方法
- 数据库：SQLite（modernc.org/sqlite，纯 Go 无 CGO）
- 配置：YAML + fsnotify 热更新
- 词云动画：Canvas 2D
- UI 语言：中文

---

## 项目结构

```
RollCall/
├── main.go                        # Wails 入口
├── go.mod / go.sum
├── wails.json
├── build/                         # Wails 构建资源（图标等）
├── config/
│   └── config.yaml                # 默认配置
├── data/                          # SQLite 数据库运行时目录
├── doc/
│   └── REQ.md
├── internal/
│   ├── app/
│   │   ├── app.go                 # Wails 绑定的 App 结构体 + 生命周期
│   │   ├── class_handler.go       # 班级 CRUD 方法
│   │   ├── student_handler.go     # 学生 CRUD + 导入导出
│   │   ├── rollcall_handler.go    # 点名方法
│   │   ├── score_handler.go       # 积分方法
│   │   └── config_handler.go      # 配置读写方法
│   ├── config/
│   │   ├── config.go              # Config 结构体、加载、默认值
│   │   └── watcher.go             # fsnotify 热更新
│   ├── database/
│   │   ├── db.go                  # 打开数据库、连接配置
│   │   └── migrations.go          # 建表 SQL
│   ├── model/
│   │   ├── class.go
│   │   ├── student.go
│   │   ├── score_log.go
│   │   └── rollcall_log.go
│   ├── repository/
│   │   ├── class_repo.go
│   │   ├── student_repo.go
│   │   ├── score_repo.go
│   │   └── rollcall_repo.go
│   ├── service/
│   │   ├── class_service.go
│   │   ├── student_service.go     # 含 CSV/Excel 导入导出逻辑
│   │   ├── rollcall_service.go    # 三种点名算法
│   │   └── score_service.go
│   └── util/
│       ├── csv.go
│       └── excel.go
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── components.json            # shadcn/ui 配置
│   ├── wailsjs/                   # Wails 自动生成的绑定
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                 # 路由 + 全局 Provider
│       ├── index.css               # Tailwind + shadcn CSS 变量
│       ├── lib/
│       │   ├── utils.ts            # cn() 等工具
│       │   └── api.ts              # 封装 Wails 绑定调用
│       ├── store/
│       │   └── appStore.ts         # Zustand 全局状态
│       ├── pages/
│       │   ├── HomePage.tsx        # 词云 + 点名主页
│       │   ├── ClassPage.tsx       # 班级管理
│       │   ├── StudentPage.tsx     # 学生管理
│       │   ├── ScorePage.tsx       # 积分管理
│       │   └── SettingsPage.tsx    # 设置页
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   └── MainLayout.tsx
│       │   ├── rollcall/
│       │   │   ├── WordCloud.tsx          # Canvas 词云组件
│       │   │   ├── WordCloudCanvas.ts     # Canvas 渲染引擎
│       │   │   ├── RollCallControls.tsx   # 点名控制面板
│       │   │   └── ResultDisplay.tsx      # 全屏结果展示
│       │   ├── class/
│       │   │   ├── ClassList.tsx
│       │   │   └── ClassDialog.tsx
│       │   ├── student/
│       │   │   ├── StudentTable.tsx
│       │   │   ├── StudentDialog.tsx
│       │   │   └── ImportDialog.tsx
│       │   ├── score/
│       │   │   ├── ScorePanel.tsx
│       │   │   └── ScoreLogTable.tsx
│       │   └── ui/                 # shadcn/ui 组件
│       └── types/
│           └── index.ts
```

---

## 数据库设计

4 张表，SQLite，WAL 模式，外键开启：

**classes**: `id` INTEGER PK, `name` TEXT UNIQUE, `is_default` INTEGER(0/1), `created_at` TEXT
**students**: `id` INTEGER PK, `class_id` FK→classes, `name` TEXT, `gender` TEXT, `score` INTEGER DEFAULT 0, `status` TEXT('active'/'disabled'), `created_at` TEXT
**score_logs**: `id` INTEGER PK, `student_id` FK→students, `delta` INTEGER, `reason` TEXT, `created_at` TEXT
**rollcall_logs**: `id` INTEGER PK, `class_id` FK→classes, `mode` TEXT, `count` INTEGER, `result` TEXT(JSON), `created_at` TEXT

---

## 后端架构（三层）

### Repository 层
直接操作 `database/sql`，每个 Repo 接收 `*sql.DB`：
- `ClassRepo`: Create/List/GetByID/Update/Delete/SetDefault/GetDefault
- `StudentRepo`: Create/List/ListActive/Update/Delete/BatchCreate/UpdateScore/BatchUpdateScore/Search
- `ScoreRepo`: Create/ListByStudent/ListByClass
- `RollCallRepo`: Create/ListByClass/GetRecentPickedStudentIDs(classID, windowSize)

### Service 层
业务逻辑，调用 Repository：
- `ClassService`: 班级 CRUD，设置默认班级（事务：先清除所有 is_default，再设置目标）
- `StudentService`: 学生 CRUD，CSV/Excel 导入导出（使用 excelize 库处理 Excel）
- `RollCallService`: 核心点名算法（详见下方）
- `ScoreService`: 加减分 + 记录日志，批量操作

### Handler 层（App 结构体方法）
Wails 绑定的公开方法，前端通过 `wailsjs/go/app/App` 直接调用：

**班级**: `GetClasses`, `CreateClass`, `UpdateClass`, `DeleteClass`, `SetDefaultClass`, `GetDefaultClass`
**学生**: `GetStudents`, `CreateStudent`, `UpdateStudent`, `DeleteStudent`, `SearchStudents`, `ImportStudents(classID, filePath)`, `ExportStudents(classID, filePath)`
**点名**: `DoRollCall(classID, count)` → 返回选中学生列表, `GetRollCallLogs`
**积分**: `AddScore`, `BatchAddScore`, `GetScoreLogs`, `GetScoreLogsByClass`
**配置**: `GetConfig`, `UpdateConfig`
**文件对话框**: `OpenFileDialog`, `SaveFileDialog`（使用 Wails runtime API）

---

## 点名算法（三种模式）

### 纯随机模式 (random)
所有活跃学生等权重，随机选 N 人（不重复）。

### 公平模式 (fair) — 默认
权重公式：`w = 1.0 / (1 + recentPickCount)`
- 从 rollcall_logs 取最近 `avoidRepeatWindow` 条记录
- 统计每个学生被选中次数
- 被选次数越多，权重越低
- 从未被选中的学生权重为 1.0

### 积分权重模式 (weighted)
权重公式：`w = max(1, score + baseOffset)`
- 积分越高，被选中概率越高
- 可叠加公平模式的衰减

### 防重复
- 单次点名内不重复（加权无放回抽样）
- 跨次防重复：通过 `avoidRepeatWindow` 配置，最近 N 次被选中的学生权重大幅降低

### 加权无放回抽样算法
使用 Efraimidis-Spirakis 算法：为每个候选人生成 key = random()^(1/weight)，取 top-N。

---

## 前端设计

### 页面与路由
| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | HomePage | 词云 + 点名主界面 |
| `/classes` | ClassPage | 班级管理 |
| `/students` | StudentPage | 学生管理表格 |
| `/scores` | ScorePage | 积分管理 + 日志 |
| `/settings` | SettingsPage | 配置编辑 |

### 布局
- 左侧 Sidebar：导航菜单（图标 + 文字），当前班级显示，底部设置入口
- 右侧主内容区：各页面内容
- 使用 shadcn/ui 的 `Sheet` 或自定义侧边栏，带收起/展开动画

### 核心组件与 shadcn/ui 使用

**通用**: Button, Dialog, Input, Select, Badge, Card, Table, Tabs, Toast/Sonner, Switch, Separator, DropdownMenu, Tooltip, ScrollArea, Sheet, Skeleton, AlertDialog

**HomePage 词云点名**:
- `WordCloud`: Canvas 2D 渲染，所有学生姓名随机分布，字体大小随机或按权重
- 点名动画：名字快速随机移动/闪烁 → 逐渐减速 → 停止并高亮选中者
- `RollCallControls`: 人数选择（Select）、模式显示（Badge）、开始按钮（Button，大号渐变）
- `ResultDisplay`: 全屏遮罩，选中学生大字号居中显示，带入场动画（scale + fade），confetti 效果

**ClassPage**:
- Card 列表展示班级，每个 Card 含名称、学生数、默认标记（Badge）
- Dialog 创建/编辑班级
- AlertDialog 确认删除

**StudentPage**:
- DataTable（shadcn Table + 自定义排序/筛选）
- 顶部工具栏：搜索 Input、导入/导出 Button
- ImportDialog：文件选择、模式切换（Tabs）、预览表格、错误提示
- StudentDialog：单条编辑表单

**ScorePage**:
- 左侧学生列表 + 快捷加减分按钮
- 右侧积分日志 Table
- 批量加减分 Dialog

**SettingsPage**:
- 表单布局：Select（点名模式）、Input（防重复窗口）、Switch（各功能开关）
- 保存按钮，Toast 提示

### 动效设计
- 页面切换：framer-motion 的 `AnimatePresence` + fade/slide 过渡
- 列表项：staggered fade-in 动画
- Dialog/Sheet：shadcn 内置的 open/close 动画
- 按钮：hover scale + 颜色过渡
- 词云：Canvas requestAnimationFrame 60fps 动画循环
- 点名结果：scale-up + bounce + confetti（canvas-confetti 库）
- 表格行：hover 高亮过渡
- Toast 通知：slide-in 动画（sonner）
- Skeleton 加载态：数据加载时显示骨架屏

---

## 配置热更新

`internal/config/watcher.go`:
- 使用 `fsnotify` 监听 `config/config.yaml`
- 文件变更时重新解析 YAML，原子替换内存中的配置（`sync.RWMutex`）
- 前端可通过 `GetConfig()` 获取最新配置
- 影响范围：点名模式、权重策略、功能开关

---

## 实现顺序（分 8 步）

### Step 1: 项目脚手架
- `wails init` 初始化项目（React + TS 模板）
- 配置 Tailwind CSS
- 安装并初始化 shadcn/ui
- 安装前端依赖：zustand, react-router-dom, framer-motion, sonner, canvas-confetti, lucide-react
- 安装后端依赖：modernc.org/sqlite, gopkg.in/yaml.v3, github.com/fsnotify/fsnotify, github.com/xuri/excelize/v2
- 验证 `wails dev` 能正常启动

### Step 2: 数据库 + 模型 + 配置
- 实现 `internal/model/` 所有结构体
- 实现 `internal/database/db.go` + `migrations.go`
- 实现 `internal/config/config.go` + `watcher.go`
- 创建默认 `config/config.yaml`

### Step 3: Repository 层
- 实现 4 个 Repo 的所有方法
- 单元测试关键方法

### Step 4: Service 层
- 实现 4 个 Service
- 重点：`RollCallService` 的三种算法
- 实现 CSV/Excel 导入导出工具

### Step 5: Handler 层 + Wails 绑定
- 实现 App 结构体和所有 handler 方法
- 在 `main.go` 中完成依赖注入和 Wails 启动
- 验证 Wails 绑定生成正确

### Step 6: 前端基础框架
- 布局组件：Sidebar + MainLayout
- 路由配置
- Zustand store
- API 封装层（调用 wailsjs 绑定）
- 安装所有需要的 shadcn/ui 组件

### Step 7: 前端页面实现
- ClassPage：班级管理
- StudentPage：学生管理 + 导入导出
- ScorePage：积分管理
- SettingsPage：配置页
- 各页面动效

### Step 8: 词云点名（核心页面）
- Canvas 词云渲染引擎
- 点名动画流程
- 结果展示全屏遮罩
- HomePage 整合

---

## 关键依赖库

**Go:**
- `github.com/wailsapp/wails/v2` — 桌面框架
- `modernc.org/sqlite` — 纯 Go SQLite
- `gopkg.in/yaml.v3` — YAML 解析
- `github.com/fsnotify/fsnotify` — 文件监听
- `github.com/xuri/excelize/v2` — Excel 读写

**Frontend:**
- `react`, `react-dom`, `react-router-dom` — 基础框架
- `tailwindcss`, `@tailwindcss/postcss` — 样式
- `shadcn/ui` 组件集 — UI 组件
- `zustand` — 状态管理
- `framer-motion` — 页面/组件动画
- `sonner` — Toast 通知
- `canvas-confetti` — 点名结果庆祝效果
- `lucide-react` — 图标
- `papaparse` — CSV 解析

---

## 验证方式

1. `wails dev` 启动开发模式，确认前后端联通
2. 创建班级 → 添加学生 → 执行点名 → 查看结果，完整流程走通
3. 导入 CSV/Excel 文件，验证学生数据正确导入
4. 测试三种点名模式，验证公平模式的权重衰减
5. 加减分操作，验证积分日志记录
6. 修改 config.yaml，验证热更新生效（无需重启）
7. 添加 1000 个测试学生，验证词云动画流畅度
8. `wails build` 打包为 .exe，验证独立运行
