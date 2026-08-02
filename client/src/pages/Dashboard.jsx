import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, formatCurrency, formatPercent } from '../api';
import { useTheme } from '../App';
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
  const colors = ['#6c5ce7', '#00cec9', '#fd79a8', '#fdcb6e', '#e17055', '#74b9ff', '#a29bfe', '#00b894'];

  const doughnutData = {
    labels: allocationData.map(c => c.name),
    datasets: [{
      data: allocationData.map(c => c.total_current),
      backgroundColor: colors.slice(0, allocationData.length),
      borderWidth: 0,
      hoverOffset: 8,
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
      borderColor: '#6c5ce7',
      backgroundColor: 'rgba(108, 92, 231, 0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: '#6c5ce7',
      pointBorderColor: '#0e0e18',
      pointBorderWidth: 2,
    }, {
      label: 'Invested',
      data: data.monthly_trend.map(t => t.total_invested),
      borderColor: '#00cec9',
      backgroundColor: 'rgba(0, 206, 201, 0.05)',
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointHoverRadius: 5,
      pointBackgroundColor: '#00cec9',
      pointBorderColor: '#0e0e18',
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

  return (
    <>
      <div className="page-header">
        <div className="page-header-left">
          <div className="page-title"><span className="page-title-icon">🏠</span> Dashboard</div>
          <div className="page-subtitle">Your complete financial overview</div>
        </div>
        <div className="page-header-actions">
          <button className="btn btn-secondary" onClick={() => api.exportExcel()}>⬇️ Export All</button>
        </div>
      </div>
      <div className="page-body">
        {/* Summary Stats */}
        <div className="grid-4 mb-24 animate-in">
          <div className="stat-card">
            <div className="stat-card-label">💰 Net Worth</div>
            <div className="stat-card-value">{formatCurrency(netWorth)}</div>
            <div className="stat-card-sub">Investments + Bank Balance</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">📈 Invested</div>
            <div className="stat-card-value">{formatCurrency(totalInvested)}</div>
            <div className="stat-card-sub">Across {investmentCats.reduce((s, c) => s + c.item_count, 0)} holdings</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">📊 Returns</div>
            <div className="stat-card-value" style={{ background: totalReturns >= 0 ? 'var(--gradient-green)' : 'var(--gradient-red)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {formatPercent(returnsPercent)}
            </div>
            <div className={`stat-card-sub ${totalReturns >= 0 ? 'returns-positive' : 'returns-negative'}`}>
              {totalReturns >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(totalReturns))}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-label">🏦 Bank Balance</div>
            <div className="stat-card-value">{formatCurrency(totalBankBalance)}</div>
            <div className="stat-card-sub">{data.categories.filter(c => c.category_type === 'bank').reduce((s, c) => s + c.item_count, 0)} accounts</div>
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
                <div className="empty-state-icon">📊</div>
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
                <div className="empty-state-icon">📈</div>
                <div className="empty-state-text">Add monthly snapshots to see trends</div>
              </div>
            )}
          </div>
        </div>

        {/* Category Cards */}
        <div className="section-header">
          <div className="section-title">📂 Categories</div>
        </div>
        <div className="grid-4 mb-24">
          {data.categories.map((cat, i) => (
            <div key={cat.id} className={`category-card animate-in stagger-${Math.min(i + 1, 6)}`} onClick={() => goTo(cat)}>
              <div className="category-card-icon">{cat.icon}</div>
              <div className="category-card-name">{cat.name}</div>
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
