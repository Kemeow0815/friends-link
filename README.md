# 友链数据仓库 & 监控系统

一个基于 GitHub Issues 的友链数据管理和监控系统，支持自动检测链接可用性、数据同步和可视化展示。

## 功能特性

### 🔗 友链管理
- 通过 GitHub Issues 提交友链申请
- 自动校验 JSON 格式
- 自动检测链接可用性
- 链接检测失败自动关闭 Issue
- 通过检测自动标记为 active

### 📊 数据同步
- 每天定时同步 active 状态的友链
- 自动去重
- 保存到 output 分支
- 生成 JSON 格式数据文件

### 🎨 监控页面
- 实时展示友链状态
- 30天可用性历史
- 明暗主题切换
- 响应式布局
- 分页展示
- Toast 提示

## 项目结构

```
friends-link/
├── .github/
│   ├── ISSUE_TEMPLATE/    # Issue 模板
│   ├── scripts/           # GitHub Actions 脚本
│   └── workflows/         # CI/CD 工作流
├── docs/                  # 监控页面（部署到 GitHub Pages）
├── butterfly-link-monitoring/ # 原始参考代码
└── README.md
```

## 快速开始

### 1. 提交友链

通过 GitHub Issues 提交你的友链：

1. 点击 [Issues](../../issues/new/choose)
2. 选择 "友链模板"
3. 填写以下信息：

```json
{
  "title": "站点名称",
  "screenshot": "站点预览图链接",
  "url": "站点链接",
  "avatar": "头像链接",
  "description": "站点描述",
  "keywords": "关键词，作为分组名"
}
```

### 2. 自动检测

提交后，GitHub Actions 会自动：
- ✅ 校验 JSON 格式
- ✅ 检测链接可用性（最多重试3次）
- ✅ 成功 → 添加 `active` 标签
- ❌ 失败 → 关闭 Issue，添加 `lost` 标签并评论原因

### 3. 数据同步

每天 UTC 7点（北京时间 15点）自动同步：
- 从 output 分支读取现有数据
- 获取所有带 `active` 标签的 Issues
- 去重合并
- 保存新的 `links.json`

## 本地开发

### 监控页面

```bash
cd docs

# 使用 Python 启动服务器
python -m http.server 8080

# 或使用 Node.js http-server
npm install -g http-server
http-server -p 8080
```

访问 http://localhost:8080 查看页面

### 修改配置

编辑 `docs/config.js` 自定义页面：

```javascript
CONFIG = {
  api: {
    baseUrl: 'https://blog-link-monitor.268682.xyz/api/data',
    timezone: 'Asia/Shanghai'
  },
  pagination: {
    itemsPerPage: 30,
    enabled: true
  },
  page: {
    title: '友链监控',
    subtitle: '实时监测友链可用性状态'
  }
  // ... 更多配置
}
```

## 部署说明

### GitHub Pages

1. 将 `docs/` 目录内容推送到仓库
2. 进入仓库 Settings → Pages
3. 配置：
   - Source: Deploy from a branch
   - Branch: main/docs
   - Folder: /docs
4. 点击 Save

### 标签说明

- `link wanted` - 新提交的友链申请（触发检测）
- `active` - 检测通过的友链（会被同步）
- `lost` - 检测失败的友链（不会被同步）

## API 数据格式

同步后的 `links.json` 格式：

```json
[
  {
    "title": "站点名称",
    "screenshot": "预览图链接",
    "url": "站点链接",
    "avatar": "头像链接",
    "description": "站点描述",
    "keywords": "关键词"
  }
]
```

## 技术栈

- **前端**: HTML5, CSS3, JavaScript (ES6+)
- **图标**: Iconify (MDI)
- **后端**: Python (GitHub Actions)
- **CI/CD**: GitHub Actions
- **部署**: GitHub Pages

## 参考项目

- [blog-link-monitoring](https://github.com/Kemeow0815/blog-link-monitoring) - 友链监控 API 服务
- [butterfly-link-monitoring](https://github.com/Kemeow0815/butterfly-link-monitoring) - Butterfly 主题友链监控插件

## 许可证

MIT License

---

## 加入友链

点击 [这里](../../issues/new?template=友链模板.md) 提交你的友链！
