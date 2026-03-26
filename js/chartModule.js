/**
 * chartModule.js – Budget distribution chart via Chart.js.
 */

const ChartModule = (() => {
  let chartInstance = null;

  function update(weeklyPlan) {
    const canvas = document.getElementById('budget-chart');
    if (!canvas) return;

    // Aggregate costs by meal type
    const totals = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };

    (weeklyPlan || []).forEach(day => {
      ['breakfast', 'lunch', 'dinner', 'snack'].forEach(m => {
        if (day[m]) totals[m] += Number(day[m].cost) || 0;
      });
    });

    const labels = Object.keys(totals).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const data   = Object.values(totals).map(v => parseFloat(v.toFixed(2)));
    const colors = ['#6c5ce7', '#00b894', '#0984e3', '#f39c12'];
    const borderColors = ['#5a4bd6', '#00a383', '#0874c9', '#e08c0a'];

    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets[0].data = data;
      chartInstance.update();
      return;
    }

    // Detect theme
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#9ba4b5' : '#5a6078';

    chartInstance = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: borderColors,
          borderWidth: 2,
          hoverOffset: 8,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              padding: 16,
              font: { family: "'Inter', sans-serif", size: 13, weight: '500' },
              usePointStyle: true,
              pointStyleWidth: 10,
            },
          },
          tooltip: {
            backgroundColor: isDark ? '#1c2333' : '#ffffff',
            titleColor: isDark ? '#e6edf3' : '#1a1d2e',
            bodyColor: isDark ? '#9ba4b5' : '#5a6078',
            borderColor: isDark ? '#2a3140' : '#e2e6f0',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            titleFont: { family: "'Inter', sans-serif", weight: '600' },
            bodyFont: { family: "'Inter', sans-serif" },
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ₦${ctx.parsed.toLocaleString()}`,
            },
          },
        },
      },
    });
  }

  function destroy() {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  }

  return { update, destroy };
})();
