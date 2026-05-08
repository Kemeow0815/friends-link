/**
 * 友链监控页面脚本
 * API: https://blog-link-monitor.268682.xyz/
 */

(function() {
  'use strict';

  // Load configuration from config.js
  const CONFIG = window.CONFIG || {};
  
  // Configuration with defaults
  const API_BASE_URL = CONFIG.api?.baseUrl || 'https://blog-link-monitor.268682.xyz';
  const TIMEZONE = CONFIG.api?.timezone || 'Asia/Shanghai';
  const ITEMS_PER_PAGE = CONFIG.pagination?.itemsPerPage || 30;
  const PAGINATION_ENABLED = CONFIG.pagination?.enabled !== false;
  const SHOW_SCREENSHOT = CONFIG.card?.showScreenshot !== false;
  const SHOW_STATUS_BAR = CONFIG.card?.showStatusBar !== false;
  const SHOW_HISTORY_BUTTON = CONFIG.card?.showHistoryButton !== false;
  const DEFAULT_AVATAR = CONFIG.card?.defaultAvatar || 'https://via.placeholder.com/48';
  const STATUS_BAR_DAYS = CONFIG.statusBar?.days || 30;
  
  // DOM Elements
  const container = document.getElementById('monitoring-container');
  const themeToggle = document.getElementById('themeToggle');
  const modal = document.getElementById('history-modal');
  const modalClose = document.getElementById('modalClose');
  const modalBody = document.getElementById('modalBody');
  const modalSiteTitle = document.getElementById('modal-site-title');
  const modalOverlay = modal.querySelector('.history-modal-overlay');
  const paginationContainer = document.getElementById('pagination');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const currentPageSpan = document.getElementById('currentPage');
  const totalPagesSpan = document.getElementById('totalPages');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  // State
  let currentTheme = localStorage.getItem('theme') || (CONFIG.theme?.default || 'auto');
  let recentStatsMap = new Map();
  let allLinksData = [];
  let currentPage = 1;
  let totalPages = 1;

  // ========================================
  // Theme Management
  // ========================================
  
  function initTheme() {
    applyTheme(currentTheme);
    
    // Listen for system theme changes
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', (e) => {
        if (currentTheme === 'auto') {
          applySystemTheme(e.matches);
        }
      });
    }
  }

  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    if (theme === 'auto') {
      const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      applySystemTheme(isDark);
    } else {
      document.documentElement.removeAttribute('data-system-theme');
    }
  }

  function applySystemTheme(isDark) {
    document.documentElement.setAttribute('data-system-theme', isDark ? 'dark' : 'light');
  }

  function toggleTheme() {
    const themes = ['light', 'dark', 'auto'];
    const currentIndex = themes.indexOf(currentTheme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    applyTheme(nextTheme);
    showThemeToast(nextTheme);
  }

  function showThemeToast(theme) {
    const themeNames = {
      light: '浅色模式',
      dark: '深色模式',
      auto: '跟随系统'
    };
    
    // 销毁上一个 toast
    hideToast();
    
    // 显示新 toast
    toastMessage.textContent = themeNames[theme] || theme;
    toast.classList.add('show');
    
    // 3秒后自动隐藏
    setTimeout(() => {
      hideToast();
    }, 3000);
  }

  function hideToast() {
    toast.classList.remove('show');
  }

  // ========================================
  // Data Fetching
  // ========================================

  async function fetchMonitoringData() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
      throw error;
    }
  }

  async function fetchRecentStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recent-stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        // Build URL -> stats map
        result.data.forEach(item => {
          if (item.url) {
            recentStatsMap.set(item.url, item);
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Failed to fetch recent stats:', error);
      return null;
    }
  }

  async function fetchSiteHistory(url) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/recent-stats?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch site history:', error);
      throw error;
    }
  }

  // ========================================
  // Date Utilities
  // ========================================

  function getRecentDates(days = 30) {
    const dates = [];
    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const parts = formatter.formatToParts(d);
      const map = {};
      parts.forEach(p => { if(p.type !== 'literal') map[p.type] = p.value });
      dates.push(`${map.year}-${map.month}-${map.day}`);
    }

    return dates;
  }

  function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) return '-';
    return `${Number(value).toFixed(2)}%`;
  }

  // ========================================
  // Card Rendering
  // ========================================

  function createMonitorCard(data) {
    const card = document.createElement('div');
    card.className = `monitor-card ${data.available ? 'status-available' : 'status-unavailable'}`;
    card.dataset.url = data.url;

    // Header
    const header = document.createElement('div');
    header.className = 'card-header';

    // Avatar
    const avatar = document.createElement('div');
    avatar.className = 'site-avatar';
    const avatarImg = document.createElement('img');
    avatarImg.src = data.avatar || DEFAULT_AVATAR;
    avatarImg.alt = data.title || 'Site Avatar';
    avatarImg.onerror = () => { avatarImg.src = DEFAULT_AVATAR; };
    avatar.appendChild(avatarImg);

    // Site Info
    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    
    const title = document.createElement('div');
    title.className = 'site-title';
    title.textContent = data.title || data.url;
    title.title = data.title || data.url;
    
    const url = document.createElement('a');
    url.className = 'site-url';
    url.href = data.url;
    url.target = '_blank';
    url.rel = 'noopener noreferrer';
    url.textContent = data.url;
    url.title = data.url;
    
    siteInfo.appendChild(title);
    siteInfo.appendChild(url);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'card-actions';
    
    if (SHOW_HISTORY_BUTTON) {
      const historyBtn = document.createElement('button');
      historyBtn.className = 'action-btn';
      historyBtn.title = '查看历史记录';
      historyBtn.innerHTML = '<iconify-icon icon="mdi:history" width="20" height="20"></iconify-icon>';
      historyBtn.onclick = (e) => {
        e.stopPropagation();
        openHistoryModal(data);
      };
      actions.appendChild(historyBtn);
    }
    
    const linkBtn = document.createElement('a');
    linkBtn.className = 'action-btn';
    linkBtn.href = data.url;
    linkBtn.target = '_blank';
    linkBtn.rel = 'noopener noreferrer';
    linkBtn.title = '访问站点';
    linkBtn.innerHTML = '<iconify-icon icon="mdi:open-in-new" width="18" height="18"></iconify-icon>';
    actions.appendChild(linkBtn);

    header.appendChild(avatar);
    header.appendChild(siteInfo);
    header.appendChild(actions);

    // Screenshot
    let screenshot = null;
    if (SHOW_SCREENSHOT && data.screenshot) {
      screenshot = document.createElement('div');
      screenshot.className = 'card-screenshot';
      const screenImg = document.createElement('img');
      screenImg.src = data.screenshot;
      screenImg.alt = `Screenshot of ${data.title}`;
      screenImg.loading = 'lazy';
      screenshot.appendChild(screenImg);
    }

    // Footer with status bar
    const footer = document.createElement('div');
    footer.className = 'card-footer';
    
    if (SHOW_STATUS_BAR) {
      const statusBar = document.createElement('div');
      statusBar.className = 'daily-status-bar';
      statusBar.innerHTML = '<div class="daily-status-loading" style="width:100%;height:100%;background:linear-gradient(90deg,#f0f0f0 25%,#e0e0e0 50%,#f0f0f0 75%);background-size:200% 100%;animation:loading 1.5s infinite;"></div>';
      footer.appendChild(statusBar);
    }

    // Assemble card
    card.appendChild(header);
    if (screenshot) card.appendChild(screenshot);
    if (SHOW_STATUS_BAR) card.appendChild(footer);

    return card;
  }

  function renderDailyStatusBar(container, data, dateList) {
    container.innerHTML = '';
    
    const statsMap = {};
    if (data && Array.isArray(data.stats)) {
      data.stats.forEach(stat => {
        statsMap[stat.date] = stat;
      });
    }

    dateList.forEach(dateStr => {
      const dayStat = statsMap[dateStr];
      const strip = document.createElement('div');
      strip.className = 'daily-status-item';
      
      if (dayStat) {
        const uptime = dayStat.totalChecks > 0 
          ? (dayStat.successfulChecks / dayStat.totalChecks) 
          : 0;
        
        if (uptime >= 1.0) {
          strip.classList.add('status-success');
        } else if (uptime > 0) {
          strip.classList.add('status-partial');
        } else {
          strip.classList.add('status-fail');
        }
        
        const uptimePercent = Math.round(uptime * 100);
        const avgTime = dayStat.totalChecks > 0 
          ? Math.round(dayStat.totalResponseTime / dayStat.totalChecks) 
          : 0;

        strip.innerHTML = `
          <div class="daily-status-tooltip">
            ${dateStr}<br>
            可用率: ${uptimePercent}%<br>
            响应: ${avgTime}ms<br>
            检测: ${dayStat.totalChecks}次
          </div>
        `;
      } else {
        strip.classList.add('status-none');
        strip.innerHTML = `<div class="daily-status-tooltip">${dateStr}<br>无数据</div>`;
      }
      
      container.appendChild(strip);
    });
  }

  async function renderStatusBars() {
    if (!SHOW_STATUS_BAR) return;
    
    const recentDates = getRecentDates(STATUS_BAR_DAYS);
    const cards = document.querySelectorAll('.monitor-card');
    
    cards.forEach(card => {
      const url = card.dataset.url;
      const statusContainer = card.querySelector('.daily-status-bar');
      if (!statusContainer) return;

      const itemData = recentStatsMap.get(url);
      if (itemData) {
        renderDailyStatusBar(statusContainer, itemData, recentDates);
      } else {
        renderEmptyStatusBar(statusContainer, recentDates);
      }
    });
  }

  function renderEmptyStatusBar(container, dateList) {
    container.innerHTML = '';
    dateList.forEach(dateStr => {
      const strip = document.createElement('div');
      strip.className = 'daily-status-item status-none';
      strip.innerHTML = `<div class="daily-status-tooltip">${dateStr}<br>无数据</div>`;
      container.appendChild(strip);
    });
  }

  // ========================================
  // History Modal
  // ========================================

  async function openHistoryModal(data) {
    modalSiteTitle.textContent = `${data.title || data.url} - 历史记录`;
    modalBody.innerHTML = `
      <div class="loading-message">
        <iconify-icon icon="mdi:loading" class="spin" width="32" height="32"></iconify-icon>
        加载中...
      </div>
    `;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    try {
      const result = await fetchSiteHistory(data.url);
      
      if (result.success && result.data && Array.isArray(result.data.stats)) {
        renderHistoryContent(result.data);
      } else {
        modalBody.innerHTML = '<div class="none-message">暂无历史记录</div>';
      }
    } catch (error) {
      modalBody.innerHTML = `<div class="error-message">加载失败: ${error.message}</div>`;
    }
  }

  function closeHistoryModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function renderHistoryContent(data) {
    modalBody.innerHTML = '';
    const stats = data.stats;

    // Aggregate by month
    const monthlyStats = {};
    stats.forEach(dayStat => {
      const month = dayStat.date.substring(0, 7);
      
      if (!monthlyStats[month]) {
        monthlyStats[month] = {
          month: month,
          totalChecks: 0,
          successfulChecks: 0,
          failedChecks: 0,
          totalResponseTime: 0
        };
      }
      
      monthlyStats[month].totalChecks += dayStat.totalChecks;
      monthlyStats[month].successfulChecks += dayStat.successfulChecks;
      monthlyStats[month].failedChecks += dayStat.failedChecks;
      monthlyStats[month].totalResponseTime += dayStat.totalResponseTime;
    });

    const monthlySummary = Object.values(monthlyStats).sort((a, b) => b.month.localeCompare(a.month));

    // Monthly Summary Section
    if (monthlySummary.length > 0) {
      const monthlyTitle = document.createElement('div');
      monthlyTitle.className = 'history-section-title';
      monthlyTitle.innerHTML = '<span>月度存活率统计</span>';
      modalBody.appendChild(monthlyTitle);

      const monthlyList = document.createElement('ul');
      monthlyList.className = 'history-list';

      monthlySummary.forEach(summary => {
        const uptime = summary.totalChecks > 0 
          ? (summary.successfulChecks / summary.totalChecks) * 100 
          : 0;
        
        let statusClass = 'fail';
        if (uptime >= 100) statusClass = 'success';
        else if (uptime >= 95) statusClass = 'warning';

        const item = document.createElement('li');
        item.className = `history-item history-monthly ${statusClass}`;
        
        const barColor = uptime >= 100 ? '#52c41a' : (uptime >= 90 ? '#faad14' : '#ff4d4f');
        
        item.innerHTML = `
          <div class="history-time">${summary.month}</div>
          <div style="flex:2;margin:0 15px;">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width:${uptime}%;background:${barColor};"></div>
            </div>
          </div>
          <div class="history-meta">
            <span style="font-weight:bold;color:${barColor}">${formatPercentage(uptime)}</span>
          </div>
        `;
        
        monthlyList.appendChild(item);
      });

      modalBody.appendChild(monthlyList);
    }

    // Daily Detail Section (Collapsible)
    if (stats.length > 0) {
      const detailTitle = document.createElement('div');
      detailTitle.className = 'history-section-title';
      detailTitle.innerHTML = `
        <span>每日明细</span>
        <iconify-icon icon="mdi:chevron-down" class="toggle-icon"></iconify-icon>
      `;
      modalBody.appendChild(detailTitle);

      const detailContainer = document.createElement('div');
      detailContainer.style.display = 'none';

      const detailList = document.createElement('ul');
      detailList.className = 'history-list history-detail-list';

      const sortedStats = [...stats].sort((a, b) => b.date.localeCompare(a.date));
      
      sortedStats.forEach(dayStat => {
        const uptime = dayStat.totalChecks > 0 
          ? (dayStat.successfulChecks / dayStat.totalChecks) * 100 
          : 0;
        const avgTime = dayStat.totalChecks > 0 
          ? Math.round(dayStat.totalResponseTime / dayStat.totalChecks) 
          : 0;
        
        let statusClass = 'fail';
        let statusText = '异常';
        if (uptime >= 100) {
          statusClass = 'success';
          statusText = '正常';
        } else if (uptime > 0) {
          statusClass = 'warning';
          statusText = '部分异常';
        }

        const item = document.createElement('li');
        item.className = `history-item ${statusClass}`;
        item.innerHTML = `
          <div class="history-time">${dayStat.date}</div>
          <div class="history-status">${statusText}</div>
          <div class="history-meta">
            <span>${formatPercentage(uptime)}</span> | 
            <span>${avgTime}ms</span>
          </div>
        `;
        detailList.appendChild(item);
      });

      detailContainer.appendChild(detailList);
      modalBody.appendChild(detailContainer);

      // Toggle functionality
      detailTitle.addEventListener('click', () => {
        const isHidden = detailContainer.style.display === 'none';
        detailContainer.style.display = isHidden ? 'block' : 'none';
        detailTitle.classList.toggle('collapsed', !isHidden);
      });
    }
  }

  // ========================================
  // Pagination
  // ========================================

  function initPagination() {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderCurrentPage();
        scrollToTop();
      }
    });

    nextPageBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderCurrentPage();
        scrollToTop();
      }
    });
  }

  function updatePagination() {
    if (!PAGINATION_ENABLED) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    totalPages = Math.ceil(allLinksData.length / ITEMS_PER_PAGE);
    
    if (totalPages <= 1) {
      paginationContainer.style.display = 'none';
      return;
    }
    
    paginationContainer.style.display = 'flex';
    currentPageSpan.textContent = currentPage;
    totalPagesSpan.textContent = totalPages;
    
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
  }

  function renderCurrentPage() {
    // Clear container
    container.innerHTML = '';
    
    // Calculate slice
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, allLinksData.length);
    const pageData = allLinksData.slice(startIndex, endIndex);
    
    // Render cards for current page
    pageData.forEach(linkData => {
      const card = createMonitorCard(linkData);
      container.appendChild(card);
    });
    
    // Render status bars for current page
    renderStatusBars();
    
    // Update pagination UI
    updatePagination();
  }

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // ========================================
  // Main Initialization
  // ========================================

  function applyPageConfig() {
    // Apply page title
    if (CONFIG.page?.title) {
      document.title = CONFIG.page.title;
      const siteTitleEl = document.getElementById('site-title');
      if (siteTitleEl) siteTitleEl.textContent = CONFIG.page.title;
    }
    
    // Apply page subtitle
    if (CONFIG.page?.subtitle) {
      const siteSubtitleEl = document.getElementById('site-subtitle');
      if (siteSubtitleEl) siteSubtitleEl.textContent = CONFIG.page.subtitle;
    }
    
    // Apply page description
    if (CONFIG.page?.description) {
      const descEl = document.getElementById('page-description');
      if (descEl) descEl.content = CONFIG.page.description;
    }
    
    // Apply join link
    if (CONFIG.links?.joinLink) {
      const joinBtn = document.getElementById('join-btn');
      if (joinBtn) joinBtn.href = CONFIG.links.joinLink;
    }
    
    // Apply data source
    if (CONFIG.links?.dataSource) {
      const dataSourceEl = document.getElementById('data-source');
      if (dataSourceEl) {
        dataSourceEl.href = CONFIG.links.dataSource.url;
        dataSourceEl.textContent = CONFIG.links.dataSource.text;
      }
    }
    
    // Hide theme toggle if disabled
    if (CONFIG.theme?.allowToggle === false) {
      const themeToggleEl = document.getElementById('themeToggle');
      if (themeToggleEl) themeToggleEl.style.display = 'none';
    }
    
    // Apply favicon
    if (CONFIG.favicon?.path) {
      const faviconEl = document.getElementById('favicon');
      if (faviconEl) {
        faviconEl.href = CONFIG.favicon.path;
        // Auto-detect type if not specified
        if (CONFIG.favicon.type) {
          faviconEl.type = CONFIG.favicon.type;
        } else {
          // Auto-detect based on file extension
          const path = CONFIG.favicon.path.toLowerCase();
          if (path.endsWith('.png')) faviconEl.type = 'image/png';
          else if (path.endsWith('.svg')) faviconEl.type = 'image/svg+xml';
          else if (path.endsWith('.webp')) faviconEl.type = 'image/webp';
          else if (path.endsWith('.gif')) faviconEl.type = 'image/gif';
          else faviconEl.type = 'image/x-icon';
        }
      }
    }
  }

  async function init() {
    // Apply page configuration
    applyPageConfig();
    
    // Initialize theme
    initTheme();
    themeToggle.addEventListener('click', toggleTheme);

    // Initialize pagination
    initPagination();

    // Modal events
    modalClose.addEventListener('click', closeHistoryModal);
    modalOverlay.addEventListener('click', closeHistoryModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeHistoryModal();
    });

    // Fetch and render data
    try {
      // Fetch both data and stats in parallel
      const [dataResult] = await Promise.all([
        fetchMonitoringData(),
        fetchRecentStats()
      ]);

      if (!dataResult.success || !dataResult.data || dataResult.data.length === 0) {
        container.innerHTML = '<div class="none-message"><iconify-icon icon="mdi:inbox-outline" width="48" height="48"></iconify-icon>暂无监控数据</div>';
        return;
      }

      // Store all data
      allLinksData = dataResult.data;
      
      // Render first page
      renderCurrentPage();

    } catch (error) {
      container.innerHTML = `
        <div class="error-message">
          <iconify-icon icon="mdi:alert-circle-outline" width="48" height="48"></iconify-icon>
          加载失败: ${error.message}
        </div>
      `;
    }
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
