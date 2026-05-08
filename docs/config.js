/**
 * 友链监控页面配置文件
 * 修改此文件来自定义页面行为和显示
 */

const CONFIG = {
  // API 配置
  api: {
    // API 基础地址
    baseUrl: "https://blog-link-monitor.268682.xyz",
    // 时区设置
    timezone: "Asia/Shanghai",
  },

  // 分页配置
  pagination: {
    // 每页显示的卡片数量
    itemsPerPage: 30,
    // 是否显示分页（false 则显示所有）
    enabled: true,
  },

  // 页面信息配置
  page: {
    // 页面标题
    title: "友链监控",
    // 页面副标题
    subtitle: "实时监测友链可用性状态",
    // 页面描述（用于 SEO）
    description: "友链可用性监控面板，实时展示各站点状态",
  },

  // 链接配置
  links: {
    // 加入友链的链接
    joinLink: "https://github.com/Kemeow0815/link-data",
    // 数据来源链接
    dataSource: {
      url: "https://blog-link-monitor.268682.xyz/",
      text: "blog-link-monitor.268682.xyz",
    },
  },

  // 主题配置
  theme: {
    // 默认主题: 'light' | 'dark' | 'auto'
    default: "auto",
    // 是否允许用户切换主题
    allowToggle: true,
  },

  // 卡片显示配置
  card: {
    // 是否显示站点截图
    showScreenshot: true,
    // 是否显示30天状态条
    showStatusBar: true,
    // 是否显示历史记录按钮
    showHistoryButton: true,
    // 默认头像（当站点没有头像时显示）
    defaultAvatar: "https://via.placeholder.com/48",
  },

  // 状态条配置
  statusBar: {
    // 显示的天数
    days: 30,
    // 状态颜色阈值
    thresholds: {
      // 100% 可用
      success: 1.0,
      // 部分可用（大于0但小于100%）
      partial: 0,
    },
  },

  // Favicon 配置
  favicon: {
    // Favicon 路径（相对于页面目录）
    // 支持格式: .ico, .png, .svg, .webp
    // 示例: './favicon.ico' 或 './images/favicon.png'
    path: "./favicon.ico",
    // 图标类型（可选，自动检测）
    type: "image/x-icon",
  },
};

// 导出配置（兼容不同模块系统）
if (typeof module !== "undefined" && module.exports) {
  module.exports = CONFIG;
}
