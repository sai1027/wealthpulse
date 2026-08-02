import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatPercent } from '../api';
import { useTheme } from '../App';
import Icon from '../components/Icon';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

export default function Dashboard({ categories }) {
  const { theme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getDashboard().then(d => { setData(d); setLoading(false); }).catch(console.error);
  }, []);

  if (loading || !data) {
    return (
      <>
        <div className="page-header">
          <div className="page-header-left">
            <div className="page-title"><span className="page-title-icon">🏠</span> Dashboard</div>
          </div>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">⏳</div>
            <div className="empty-state-title">Loading your financial overview...</div>
          </div>
        </div>
      </>
    );
  }

  const investmentCats = data.categories.filter(c => c.category_type === 'investment');
  const otherCats = data.categories.filter(c => c.category_type !== 'investment');

  const totalInvested = investmentCats.reduce((s, c) => s + c.total_invested, 0);
  const totalCurrent = investmentCats.reduce((s, c) => s + c.total_current, 0);
  const totalReturns = totalCurrent - totalInvested;
  const returnsPercent = totalInvested > 0 ? (totalReturns / totalInvested * 100) : 0;
  const totalBankBalance = data.categories.filter(c => c.category_type === 'bank').reduce((s, c) => s + c.total_balance, 0);
  const netWorth = totalCurrent + totalBankBalance;

  const totalCoverage = data.categories.filter(c => c.category_type === 'insurance').reduce((s, c) => s + c.total_coverage, 0);
  const cardCount = data.categories.filter(c => c.category_type === 'credit_card').reduce((s, c) => s + c.item_count, 0);

  // Asset allocation chart
  const allocationData = investmentCats.filter(c => c.total_current > 0);
  const CHART_COLORS = {
    'Stocks': '#4f46e5',
    'Mutual Funds': '#10b981',
    'REITs': '#f59e0b',
    'Gold': '#eab308',
    'Cash & Others': '#64748b',
    'Cash': '#64748b',
    'US Stocks': '#06b6d4',
  };
  const getChartColor = (name, index) => CHART_COLORS[name] || ['#4f46e5', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'][index % 5];

  const doughnutData = {
    labels: allocationData.map(c => c.name),
    datasets: [{
      data: allocationData.map(c => c.total_current),
      backgroundColor: allocationData.map((c, i) => getChartColor(c.name, i)),
      borderWidth: 0,
      hoverOffset: 4
    }]
  };

  const isDark = theme === 'dark';
  const textColor = isDark ? '#aeaeb2' : '#8e8e93';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)';
  const tooltipBg = isDark ? 'rgba(28, 28, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';
  const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';
  const tooltipText = isDark ? '#f2f2f7' : '#1c1c1e';

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: textColor, font: { family: 'Inter', size: 12 }, padding: 16, usePointStyle: true, pointStyleWidth: 8 }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: tooltipText,
        bodyColor: textColor,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (ctx) => `${ctx.label}: ${formatCurrency(ctx.raw)}`
        }
      }
    }
  };

  // Trend chart
  const trendData = {
    labels: data.monthly_trend.map(t => {
      const [y, m] = t.month.split('-');
      return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }),
    datasets: [{
      label: 'Net Worth',
      data: data.monthly_trend.map(t => t.total_current),
      borderColor: '#4f46e5',
      backgroundColor: 'rgba(79, 70, 229, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#4f46e5',
      pointBorderColor: isDark ? '#1b2028' : '#ffffff',
      pointBorderWidth: 2,
    }, {
      label: 'Invested',
      data: data.monthly_trend.map(t => t.total_invested),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#10b981',
      pointBorderColor: isDark ? '#1b2028' : '#ffffff',
      pointBorderWidth: 2,
      borderDash: [5, 5],
    }]
  };

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { family: 'Inter', size: 11 }, callback: v => formatCurrency(v) } }
    },
    plugins: {
      legend: { labels: { color: textColor, font: { family: 'Inter', size: 12 }, usePointStyle: true, padding: 16 } },
      tooltip: {
        backgroundColor: tooltipBg, titleColor: tooltipText, bodyColor: textColor,
        borderColor: tooltipBorder, borderWidth: 1, padding: 12,
        callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}` }
      }
    }
  };

  const goTo = (cat) => {
    if (cat.category_type === 'credit_card') navigate(`/credit-cards/${cat.slug}`);
    else navigate(`/category/${cat.slug}`);
  };

  const getIconColor = (name) => {
    const map = {
      'Stocks': '#06b6d4',
      'ETFs': '#f59e0b',
      'Mutual Funds': '#10b981',
      'REITs': '#8b5cf6',
      'US Stocks': '#4f46e5',
      'Unlisted Stocks': '#eab308',
      'Credit Cards': '#3b82f6',
      'Term Insurance': '#3b82f6',
      'Life Insurance': '#ec4899',
    };
    return map[name] || 'currentColor';
  };

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title"><span className="page-title-icon" style={{ color: '#eab308' }}><Icon name="LayoutDashboard" size={24} /></span> Dashboard</div>
          <div className="page-subtitle">Your complete financial overview</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => api.exportExcel()}>
            <Icon name="Download" size={16} /> Export All
          </button>
        </div>
      </div>
      <div className="page-body">
        {/* Summary Stats */}
        <div className="dashboard-summary-row mb-24 animate-in">
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', flexShrink: 0 }}>
              <Icon name="Wallet" size={24} />
            </div>
            <div>
              <div className="stat-card-label">Net Worth</div>
              <div className="stat-card-value" style={{ color: '#ffffff' }}>{formatCurrency(netWorth)}</div>
              <div className="stat-card-sub">Entire Wealth</div>
            </div>
          </div>
          
          <div className="summary-symbol" style={{ color: textColor }}>=</div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', flexShrink: 0 }}>
              <Icon name="HandCoins" size={24} />
            </div>
            <div>
              <div className="stat-card-label">Invested</div>
              <div className="stat-card-value" style={{ color: '#4F46E5' }}>{formatCurrency(totalInvested)}</div>
              <div className="stat-card-sub">Across {investmentCats.reduce((s, c) => s + c.item_count, 0)} holdings</div>
            </div>
          </div>

          <div className="summary-symbol" style={{ color: textColor }}>{totalReturns >= 0 ? '+' : '-'}</div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', flexShrink: 0 }}>
              <Icon name="TrendingUp" size={24} />
            </div>
            <div>
              <div className="stat-card-label">Returns</div>
              <div className="stat-card-value" style={{ color: totalReturns >= 0 ? '#10b981' : '#ef4444' }}>
                {formatPercent(returnsPercent)}
              </div>
              <div className={`stat-card-sub ${totalReturns >= 0 ? 'returns-positive' : 'returns-negative'}`}>
                <Icon name={totalReturns >= 0 ? "ArrowUpRight" : "ArrowDownRight"} size={14} style={{display: 'inline', verticalAlign: 'middle'}}/> {formatCurrency(Math.abs(totalReturns))}
              </div>
            </div>
          </div>

          <div className="summary-symbol" style={{ color: textColor }}>+</div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', flexShrink: 0 }}>
              <Icon name="Landmark" size={24} />
            </div>
            <div>
              <div className="stat-card-label">Bank Balance</div>
              <div className="stat-card-value">{formatCurrency(totalBankBalance)}</div>
              <div className="stat-card-sub">{data.categories.filter(c => c.category_type === 'bank').reduce((s, c) => s + c.item_count, 0)} accounts</div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid-2 mb-24">
          <div className="card animate-in stagger-1">
            <div className="card-title">Asset Allocation</div>
            {allocationData.length > 0 ? (
              <div className="chart-container" style={{ height: 280 }}>
                <Doughnut data={doughnutData} options={doughnutOptions} />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Icon name="PieChart" size={32} /></div>
                <div className="empty-state-text">Add investments to see allocation</div>
              </div>
            )}
          </div>
          <div className="card animate-in stagger-2">
            <div className="card-title">Net Worth Trend</div>
            {data.monthly_trend.length > 0 ? (
              <div className="chart-container" style={{ height: 280 }}>
                <Line data={trendData} options={trendOptions} />
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Icon name="TrendingUp" size={32} /></div>
                <div className="empty-state-text">Add monthly snapshots to see trends</div>
              </div>
            )}
          </div>
        </div>

        {/* Category Cards */}
        <div className="section-header">
          <div className="section-title"><Icon name="Folder" size={16} style={{display: 'inline', verticalAlign: 'middle', marginRight: 8}}/> Categories</div>
        </div>
        <div className="grid-4 mb-24">
          {data.categories.map((cat, i) => (
            <div key={cat.id} className={`category-card animate-in stagger-${Math.min(i + 1, 6)}`} onClick={() => goTo(cat)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="category-card-icon" style={{ margin: 0, fontSize: '20px' }}><Icon name={cat.icon} size={20} color={getIconColor(cat.name)} /></div>
                <div className="category-card-name" style={{ margin: 0 }}>{cat.name}</div>
              </div>
              <div className="category-card-value">
                {cat.category_type === 'investment' && formatCurrency(cat.total_current)}
                {cat.category_type === 'insurance' && formatCurrency(cat.total_coverage)}
                {cat.category_type === 'bank' && formatCurrency(cat.total_balance)}
                {cat.category_type === 'credit_card' && `${cat.item_count} cards`}
              </div>
              <div className="category-card-meta">
                {cat.category_type === 'investment' && cat.total_invested > 0 && (
                  <span className={cat.returns_percent >= 0 ? 'returns-positive' : 'returns-negative'}>
                    {cat.returns_percent >= 0 ? '↑' : '↓'} {formatPercent(cat.returns_percent)} returns
                  </span>
                )}
                {cat.category_type === 'investment' && cat.total_invested === 0 && `${cat.item_count} items`}
                {cat.category_type === 'insurance' && `${cat.item_count} policies · ₹${Math.round(cat.total_premium).toLocaleString('en-IN')}/yr premium`}
                {cat.category_type === 'bank' && `${cat.item_count} accounts`}
                {cat.category_type === 'credit_card' && (cat.item_count > 0 ? 'Click to compare' : 'No cards added')}
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming */}
        {data.upcoming.length > 0 && (
          <div className="card animate-in">
            <div className="card-title">⏰ Upcoming Payments</div>
            {data.upcoming.map((u, i) => (
              <div key={i} className="upcoming-item">
                <div className="upcoming-icon">{u.icon}</div>
                <div className="upcoming-info">
                  <div className="upcoming-name">{u.name}</div>
                  <div className="upcoming-date">{u.category} · Due: {u.due_date}</div>
                </div>
                <div className="upcoming-amount">{formatCurrency(u.amount)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
