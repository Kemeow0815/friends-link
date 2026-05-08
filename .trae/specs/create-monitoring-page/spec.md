# 友链监控展示页面 Spec

## Why
需要创建一个可部署到 GitHub Pages 的独立前端页面，用于展示友链监控数据。该页面将从 `https://blog-link-monitor.268682.xyz/` API 获取数据，展示各友链站点的可用性状态和最近30天的监控历史。

## What Changes
- 创建独立的 HTML/CSS/JS 前端项目
- 适配多端响应式布局（移动端、平板、桌面端）
- 使用 Iconify 图标库
- 支持明暗主题切换
- 参考 butterfly-link-monitoring 的卡片设计和交互模式

## Impact
- 新增项目：独立的监控展示页面
- 可部署到 GitHub Pages
- 数据源：blog-link-monitor.268682.xyz API

## ADDED Requirements

### Requirement: 页面结构与布局
The system SHALL provide a responsive monitoring dashboard page.

#### Scenario: 页面加载
- **WHEN** 用户访问页面
- **THEN** 页面显示标题、主题切换按钮、友链监控卡片网格

#### Scenario: 响应式适配
- **WHEN** 用户在桌面端访问
- **THEN** 显示 4-5 列网格布局
- **WHEN** 用户在平板端访问
- **THEN** 显示 2-3 列网格布局
- **WHEN** 用户在移动端访问
- **THEN** 显示 1 列网格布局

### Requirement: 数据展示
The system SHALL fetch and display monitoring data from the API.

#### Scenario: 获取监控数据
- **WHEN** 页面加载完成
- **THEN** 调用 `GET /api/data` 获取所有站点数据
- **AND** 每个站点显示为卡片，包含：头像、标题、URL、截图、当前状态

#### Scenario: 显示30天状态条
- **WHEN** 卡片渲染完成
- **THEN** 调用 `GET /api/recent-stats` 获取所有站点最近30天数据
- **AND** 在卡片底部显示30天状态条（绿色=正常，黄色=部分异常，红色=异常，灰色=无数据）

#### Scenario: 历史记录弹窗
- **WHEN** 用户点击卡片上的历史按钮
- **THEN** 显示弹窗展示该站点的月度统计和每日明细

### Requirement: 主题切换
The system SHALL support light/dark theme toggle.

#### Scenario: 主题切换
- **WHEN** 用户点击主题切换按钮
- **THEN** 页面在明暗主题间切换
- **AND** 主题偏好保存到 localStorage
- **AND** 默认跟随系统偏好

### Requirement: 图标系统
The system SHALL use Iconify icon library.

#### Scenario: 图标显示
- **WHEN** 页面渲染图标
- **THEN** 使用 Iconify Web Component 或 API 加载图标
- **AND** 包括：历史记录图标、主题切换图标、链接图标等

## API Reference

### GET /api/data
返回所有监控站点数据：
```json
{
  "success": true,
  "count": 1,
  "data": [{
    "_id": "...",
    "url": "https://blog.zhilu.site",
    "title": "纸鹿摸鱼处",
    "avatar": "https://...",
    "screenshot": "https://...",
    "available": true,
    "status": 200,
    "responseTime": 536,
    "checkedAt": "2026-05-08T13:20:32.103Z"
  }]
}
```

### GET /api/recent-stats
返回所有站点最近30天统计数据：
```json
{
  "success": true,
  "data": [{
    "url": "https://blog.zhilu.site",
    "stats": [{
      "date": "2026-05-08",
      "totalChecks": 24,
      "successfulChecks": 24,
      "failedChecks": 0,
      "totalResponseTime": 12000
    }]
  }]
}
```

### GET /api/recent-stats?url={url}
返回单个站点最近30天统计数据。

## UI Design Reference
参考 butterfly-link-monitoring 的设计风格：
- 卡片式布局，顶部状态指示条
- 头像 + 标题 + URL 头部区域
- 站点截图展示
- 底部30天状态条（类似 GitHub contributions）
- 历史记录弹窗（月度统计 + 每日明细）
