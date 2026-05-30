// Asset Allocation & Portfolio Rebalancing Calculator Core Logic (V2 - Flat Model)

// 1. ID Generation Helper
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// 2. Initial State using V2 Flat Model
let assets = [
  { id: generateId(), name: '미국 주식', mode: 'ratio', value: 50, currentAmount: null },
  { id: generateId(), name: '채권', mode: 'amount', value: 3000000, currentAmount: null },
  { id: generateId(), name: '금', mode: 'ratio', value: 20, currentAmount: null }
];
let totalAsset = 10000000;
let additionalInvestment = 0;
let allowSell = false; // Default to Buy-only (checkbox unchecked)
let currentMode = 'calculator';

// DOM Elements
const totalAssetInput = document.getElementById('totalAssetInput');
const additionalInvestmentInput = document.getElementById('additionalInvestmentInput');
const allowSellCheckbox = document.getElementById('allowSellCheckbox');
const assetRowsContainer = document.getElementById('assetRowsContainer');
const addAssetBtn = document.getElementById('addAssetBtn');
const resultsTableBody = document.getElementById('resultsTableBody');

const tabCalculator = document.getElementById('tabCalculator');
const tabRebalance = document.getElementById('tabRebalance');
const calculatorTotalAsset = document.getElementById('calculatorTotalAsset');
const rebalanceOptions = document.getElementById('rebalanceOptions');
const rebalanceColumnHint = document.getElementById('rebalanceColumnHint');
const calculatorResults = document.getElementById('calculatorResults');
const rebalanceResults = document.getElementById('rebalanceResults');
const rebalanceSummary = document.getElementById('rebalanceSummary');
const rebalanceTableBody = document.getElementById('rebalanceTableBody');
const rebalanceCardsContainer = document.getElementById('rebalanceCardsContainer');

// Theme Switcher Logic
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeToggleIcon = document.getElementById('themeToggleIcon');
const themeToggleText = document.getElementById('themeToggleText');

function setTheme(isDark) {
  if (isDark) {
    document.body.classList.add('dark-theme');
    themeToggleIcon.textContent = '🌙';
    themeToggleText.textContent = '다크 모드';
    localStorage.setItem('theme', 'dark');
  } else {
    document.body.classList.remove('dark-theme');
    themeToggleIcon.textContent = '☀️';
    themeToggleText.textContent = '라이트 모드';
    localStorage.setItem('theme', 'light');
  }
}

// Check saved theme or system preference
const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
  setTheme(true);
} else {
  setTheme(false);
}

themeToggleBtn.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-theme');
  setTheme(!isDark);
});

// 3. Currency and Ratio Formatting Helpers
function formatCurrency(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '₩0';
  }
  return '₩' + value.toLocaleString('ko-KR');
}

function formatRatio(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return value.toFixed(1) + '%';
}

// Helper to get total pool for rebalancing
function getRebalanceTotalPool() {
  const totalCurrent = assets.reduce((sum, asset) => sum + (asset.currentAmount || 0), 0);
  return totalCurrent + additionalInvestment;
}

// 4. Calculate Allocations
function calculateAllocations() {
  const activeTotal = currentMode === 'calculator' ? totalAsset : getRebalanceTotalPool();
  return assets.map(asset => {
    let calculatedAmount = 0;
    let calculatedRatio = 0;

    if (asset.mode === 'amount') {
      calculatedAmount = asset.value;
      calculatedRatio = activeTotal > 0 ? (asset.value / activeTotal) * 100 : 0;
    } else {
      calculatedAmount = activeTotal * (asset.value / 100);
      calculatedRatio = asset.value;
    }

    return {
      ...asset,
      calculatedAmount: Math.round(calculatedAmount),
      calculatedRatio: calculatedRatio
    };
  });
}

// 5. Validate Ratio
function validateRatio(calculatedAssets) {
  const totalRatio = calculatedAssets.reduce((sum, asset) => sum + asset.calculatedRatio, 0);
  let status = 'ok';
  let message = '';

  const activeTotal = currentMode === 'calculator' ? totalAsset : getRebalanceTotalPool();

  if (activeTotal === 0) {
    status = 'warn';
    message = currentMode === 'calculator' 
      ? '총 자산이 0원이므로 비율 계산이 불가능합니다.' 
      : '총 자산(보유금+추가투자금)이 0원이므로 계산이 불가능합니다.';
    return {
      totalRatio: 0,
      status,
      message
    };
  }

  const diff = totalRatio - 100;
  if (Math.abs(diff) < 0.01) {
    status = 'ok';
    message = '정상';
  } else if (diff < 0) {
    status = 'warn';
    message = `${Math.abs(diff).toFixed(1)}% 부족`;
  } else {
    status = 'error';
    message = `${diff.toFixed(1)}% 초과`;
  }

  return {
    totalRatio,
    status,
    message
  };
}

// Update Status Banner UI
function updateStatusBanner(calculatedAssets) {
  const banner = document.getElementById('statusBanner');
  const statusMessage = document.getElementById('statusMessage');
  const totalRatioText = document.getElementById('totalRatioText');
  
  const validation = validateRatio(calculatedAssets);
  const activeTotal = currentMode === 'calculator' ? totalAsset : getRebalanceTotalPool();
  
  banner.className = 'status-banner';
  
  if (validation.status === 'ok') {
    banner.classList.add('status-ok');
    statusMessage.textContent = '총 비율 합계가 정상입니다 (100.0%).';
    totalRatioText.textContent = `현재 비율: ${validation.totalRatio.toFixed(1)}%`;
  } else if (validation.status === 'warn') {
    banner.classList.add('status-warn');
    if (activeTotal === 0) {
      statusMessage.textContent = validation.message;
      totalRatioText.textContent = '현재 비율: -%';
    } else {
      statusMessage.textContent = `비율이 부족합니다 (${validation.message}).`;
      totalRatioText.textContent = `현재 비율: ${validation.totalRatio.toFixed(1)}%`;
    }
  } else {
    banner.classList.add('status-error');
    statusMessage.textContent = `비율이 초과되었습니다 (${validation.message}).`;
    totalRatioText.textContent = `현재 비율: ${validation.totalRatio.toFixed(1)}%`;
  }
}

// Render Results Table (Calculator Mode)
function renderResults(calculatedAssets) {
  resultsTableBody.replaceChildren();

  if (calculatedAssets.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4;
    td.style.textAlign = 'center';
    td.style.color = 'var(--text-secondary)';
    td.textContent = '설정된 자산 항목이 없습니다.';
    tr.appendChild(td);
    resultsTableBody.appendChild(tr);
    return;
  }

  calculatedAssets.forEach(item => {
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = item.name.trim() || '이름 없는 자산';

    const valueTd = document.createElement('td');
    valueTd.style.textAlign = 'right';
    if (item.mode === 'ratio') {
      valueTd.textContent = `${item.value}%`;
    } else {
      valueTd.textContent = `${item.value.toLocaleString('ko-KR')} 원`;
    }

    const ratioTd = document.createElement('td');
    ratioTd.className = 'ratio-cell';
    if (totalAsset === 0 && item.mode === 'amount') {
      ratioTd.textContent = '0.0%';
    } else {
      ratioTd.textContent = formatRatio(item.calculatedRatio);
    }

    const amountTd = document.createElement('td');
    amountTd.className = 'amount-cell';
    amountTd.textContent = formatCurrency(item.calculatedAmount);

    tr.appendChild(nameTd);
    tr.appendChild(valueTd);
    tr.appendChild(ratioTd);
    tr.appendChild(amountTd);
    resultsTableBody.appendChild(tr);
  });
}

// 6. Rebalancing Core Business Logic
function calculateRebalance() {
  const totalCurrent = assets.reduce((sum, asset) => sum + (asset.currentAmount || 0), 0);
  const totalPool = totalCurrent + additionalInvestment;

  const calculatedAssets = calculateAllocations();
  let results = [];

  if (allowSell) {
    // Strategy A: Allow Sell (Full Rebalancing)
    results = calculatedAssets.map(asset => {
      const current = asset.currentAmount || 0;
      const target = asset.calculatedAmount;
      const diff = target - current;
      return {
        ...asset,
        currentAmount: current,
        targetAmount: target,
        diff: diff
      };
    });
  } else {
    // Strategy B: Buy-only (Water-filling via binary search)
    const sumTargetRatio = calculatedAssets.reduce((sum, a) => sum + a.calculatedRatio, 0);

    if (sumTargetRatio === 0 || totalPool === 0) {
      results = calculatedAssets.map(asset => {
        const current = asset.currentAmount || 0;
        return {
          ...asset,
          currentAmount: current,
          targetAmount: current,
          diff: 0
        };
      });
    } else {
      const p = calculatedAssets.map(a => a.calculatedRatio / sumTargetRatio);

      let low = 0;
      let high = totalPool;
      for (let iter = 0; iter < 60; iter++) {
        const mid = (low + high) / 2;
        let sum = 0;
        assets.forEach((asset, idx) => {
          const current = asset.currentAmount || 0;
          sum += Math.max(current, mid * p[idx]);
        });

        if (sum > totalPool) {
          high = mid;
        } else {
          low = mid;
        }
      }
      const S = low;

      results = calculatedAssets.map((asset, idx) => {
        const current = asset.currentAmount || 0;
        const newAmount = Math.max(current, S * p[idx]);
        const diff = newAmount - current;
        return {
          ...asset,
          currentAmount: current,
          targetAmount: Math.round(newAmount),
          diff: Math.round(diff)
        };
      });

      // Handle integer rounding errors in buy-only to avoid exceeding additional investment
      let currentTotalBuy = results.reduce((sum, r) => sum + r.diff, 0);
      if (currentTotalBuy > additionalInvestment) {
        let over = currentTotalBuy - additionalInvestment;
        const sorted = [...results].filter(r => r.diff > 0).sort((a, b) => b.diff - a.diff);
        for (let i = 0; i < sorted.length && over > 0; i++) {
          const item = results.find(r => r.id === sorted[i].id);
          const deduction = Math.min(item.diff, over);
          item.diff -= deduction;
          item.targetAmount -= deduction;
          over -= deduction;
        }
      }
    }
  }

  let totalBuy = 0;
  let totalSell = 0;
  results.forEach(item => {
    if (item.diff > 0) {
      totalBuy += item.diff;
    } else if (item.diff < 0) {
      totalSell += Math.abs(item.diff);
    }
  });

  return {
    results,
    totalCurrent,
    totalPool,
    totalBuy,
    totalSell
  };
}

// Render Rebalance Summary Card
function renderRebalanceSummary(rebalanceData) {
  const { totalCurrent, totalPool, totalBuy, totalSell } = rebalanceData;

  rebalanceSummary.replaceChildren();

  rebalanceSummary.appendChild(createSummaryItem('총 보유 자산', formatCurrency(totalCurrent)));

  const plusOp = document.createElement('span');
  plusOp.className = 'summary-operator';
  plusOp.textContent = '+';
  rebalanceSummary.appendChild(plusOp);

  const addValFormatted = `₩${additionalInvestment.toLocaleString('ko-KR')}`;
  rebalanceSummary.appendChild(createSummaryItem('추가 투자금', addValFormatted, additionalInvestment > 0));

  const eqOp = document.createElement('span');
  eqOp.className = 'summary-operator';
  eqOp.textContent = '=';
  rebalanceSummary.appendChild(eqOp);

  rebalanceSummary.appendChild(createSummaryItem('합계 자산 (Pool)', formatCurrency(totalPool), false, true));

  if (totalCurrent > 0 || additionalInvestment > 0) {
    const divider = document.createElement('div');
    divider.style.width = '100%';
    divider.style.height = '1px';
    divider.style.backgroundColor = 'var(--border-color)';
    divider.style.margin = '0.5rem 0';
    rebalanceSummary.appendChild(divider);

    if (allowSell) {
      rebalanceSummary.appendChild(createSummaryItem('총 매수 금액', formatCurrency(totalBuy), totalBuy > 0));
      rebalanceSummary.appendChild(createSummaryItem('총 매도 금액', formatCurrency(totalSell), totalSell > 0));
    } else {
      rebalanceSummary.appendChild(createSummaryItem('총 매수 금액', formatCurrency(totalBuy), totalBuy > 0));
      const remainingCash = Math.max(0, additionalInvestment - totalBuy);
      rebalanceSummary.appendChild(createSummaryItem('남는 예수금', formatCurrency(remainingCash), remainingCash > 0));
    }
  }
}

function createSummaryItem(label, value, isHighlighted = false, isHighlightAccent = false) {
  const item = document.createElement('div');
  item.className = 'summary-item';
  if (isHighlightAccent) {
    item.classList.add('highlight');
  }

  const labelSpan = document.createElement('span');
  labelSpan.textContent = label;

  const valueSpan = document.createElement('span');
  valueSpan.textContent = value;
  if (isHighlighted && !isHighlightAccent) {
    valueSpan.style.color = 'var(--accent)';
  }

  item.appendChild(labelSpan);
  item.appendChild(valueSpan);
  return item;
}

// Render Rebalance Results View (Table / Cards)
function renderRebalanceResults(rebalanceData) {
  const { results, totalCurrent, totalPool } = rebalanceData;

  rebalanceTableBody.replaceChildren();
  rebalanceCardsContainer.replaceChildren();

  if (results.length === 0) {
    const emptyMsg = '설정된 자산 항목이 없습니다.';
    
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.style.textAlign = 'center';
    td.style.color = 'var(--text-secondary)';
    td.textContent = emptyMsg;
    tr.appendChild(td);
    rebalanceTableBody.appendChild(tr);

    const card = document.createElement('div');
    card.style.textAlign = 'center';
    card.style.padding = '2rem';
    card.style.color = 'var(--text-secondary)';
    card.textContent = emptyMsg;
    rebalanceCardsContainer.appendChild(card);
    return;
  }

  if (totalPool === 0) {
    const emptyMsg = '보유 자산이나 추가 투자금을 먼저 입력해주세요.';
    
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.style.textAlign = 'center';
    td.style.color = 'var(--status-warn)';
    td.style.fontWeight = 'bold';
    td.style.padding = '1.5rem';
    td.textContent = emptyMsg;
    tr.appendChild(td);
    rebalanceTableBody.appendChild(tr);

    const card = document.createElement('div');
    card.style.textAlign = 'center';
    card.style.padding = '2rem';
    card.style.color = 'var(--status-warn)';
    card.style.fontWeight = 'bold';
    card.textContent = emptyMsg;
    rebalanceCardsContainer.appendChild(card);
    return;
  }

  results.forEach(item => {
    const current = item.currentAmount || 0;
    const currentRatio = totalPool > 0 ? (current / totalPool) * 100 : 0;
    const targetRatio = item.calculatedRatio;
    const target = item.targetAmount;
    const diff = item.diff;

    // --- Desktop: Table ---
    const tr = document.createElement('tr');

    const nameTd = document.createElement('td');
    nameTd.textContent = item.name.trim() || '이름 없는 자산';
    tr.appendChild(nameTd);

    const currentTd = document.createElement('td');
    currentTd.style.textAlign = 'right';
    currentTd.textContent = formatCurrency(current);
    tr.appendChild(currentTd);

    const curRatioTd = document.createElement('td');
    curRatioTd.className = 'ratio-cell';
    curRatioTd.textContent = formatRatio(currentRatio);
    tr.appendChild(curRatioTd);

    const tgtRatioTd = document.createElement('td');
    tgtRatioTd.className = 'ratio-cell';
    tgtRatioTd.textContent = formatRatio(targetRatio);
    tr.appendChild(tgtRatioTd);

    const targetTd = document.createElement('td');
    targetTd.style.textAlign = 'right';
    targetTd.textContent = formatCurrency(target);
    tr.appendChild(targetTd);

    const actionTd = document.createElement('td');
    actionTd.style.textAlign = 'right';
    actionTd.style.fontWeight = '700';

    if (diff > 0) {
      actionTd.className = 'diff-positive';
      actionTd.textContent = `+${diff.toLocaleString('ko-KR')}원 (매수)`;
    } else if (diff < 0) {
      actionTd.className = 'diff-negative';
      actionTd.textContent = `-${Math.abs(diff).toLocaleString('ko-KR')}원 (매도)`;
    } else {
      actionTd.className = 'diff-neutral';
      actionTd.textContent = '유지';
    }
    tr.appendChild(actionTd);
    rebalanceTableBody.appendChild(tr);

    // --- Mobile: Card ---
    const card = document.createElement('div');
    card.className = 'rebalance-card';

    const header = document.createElement('div');
    header.className = 'rebalance-card-header';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'asset-name';
    nameSpan.textContent = item.name.trim() || '이름 없는 자산';
    header.appendChild(nameSpan);

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'diff-badge';
    if (diff > 0) {
      badgeSpan.className = 'diff-badge diff-positive';
      badgeSpan.textContent = `+${diff.toLocaleString('ko-KR')}원 (매수)`;
    } else if (diff < 0) {
      badgeSpan.className = 'diff-badge diff-negative';
      badgeSpan.textContent = `-${Math.abs(diff).toLocaleString('ko-KR')}원 (매도)`;
    } else {
      badgeSpan.className = 'diff-badge diff-neutral';
      badgeSpan.textContent = '유지';
    }
    header.appendChild(badgeSpan);
    card.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'rebalance-card-grid';

    grid.appendChild(createGridItem('현재 보유액', formatCurrency(current)));
    grid.appendChild(createGridItem('현재 비율', formatRatio(currentRatio)));
    grid.appendChild(createGridItem('목표 비율', formatRatio(targetRatio)));
    grid.appendChild(createGridItem('목표 금액', formatCurrency(target)));

    card.appendChild(grid);
    rebalanceCardsContainer.appendChild(card);
  });
}

function createGridItem(label, value) {
  const item = document.createElement('div');
  item.className = 'grid-item';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'label';
  labelSpan.textContent = label;

  const valueSpan = document.createElement('span');
  valueSpan.className = 'value';
  valueSpan.textContent = value;

  item.appendChild(labelSpan);
  item.appendChild(valueSpan);
  return item;
}

// 7. LocalStorage Persistence Helpers & Data Migration
function migrateAssetData(asset) {
  if (!asset) {
    return {
      id: generateId(),
      name: '',
      mode: 'ratio',
      value: 0,
      currentAmount: null
    };
  }

  // Handle conversion if target is a nested object from previous buggy attempts
  if (asset.target && typeof asset.target === 'object') {
    return {
      id: asset.id || generateId(),
      name: asset.name || '',
      mode: asset.target.mode || 'ratio',
      value: asset.target.value !== undefined ? asset.target.value : 0,
      currentAmount: asset.currentAmount !== undefined ? asset.currentAmount : null
    };
  }

  // Regular flat conversion
  return {
    id: asset.id || generateId(),
    name: asset.name || '',
    mode: asset.mode || 'ratio',
    value: asset.value !== undefined ? asset.value : 0,
    currentAmount: asset.currentAmount !== undefined ? asset.currentAmount : null
  };
}

function saveToLocalStorage() {
  try {
    const data = {
      totalAsset: totalAsset,
      additionalInvestment: additionalInvestment,
      allowSell: allowSell,
      currentMode: currentMode,
      assets: assets
    };
    localStorage.setItem('asset_allocation_data', JSON.stringify(data));
  } catch (e) {
    console.error('로컬 저장소 데이터 저장에 실패했습니다.', e);
  }
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('asset_allocation_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.totalAsset !== undefined) {
        totalAsset = parsed.totalAsset;
      }
      if (parsed.additionalInvestment !== undefined) {
        additionalInvestment = parsed.additionalInvestment;
      }
      if (parsed.allowSell !== undefined) {
        allowSell = parsed.allowSell;
      }
      if (parsed.currentMode !== undefined) {
        currentMode = parsed.currentMode;
      }
      if (Array.isArray(parsed.assets) && parsed.assets.length > 0) {
        assets = parsed.assets.map(migrateAssetData);
      }
    }
  } catch (e) {
    console.error('로컬 저장소 데이터 로드에 실패했습니다.', e);
  }
}

// Update outputs dynamically
function updateCalculations() {
  try {
    const calculatedAssets = calculateAllocations();
    updateStatusBanner(calculatedAssets);

    if (currentMode === 'calculator') {
      renderResults(calculatedAssets);
    } else {
      const rebalanceData = calculateRebalance();
      renderRebalanceSummary(rebalanceData);
      renderRebalanceResults(rebalanceData);
    }
    saveToLocalStorage();
  } catch (e) {
    console.error('[Asset Allocation Calculator] Error updating calculations:', e);
  }
}

// 8. Render Assets Input Rows
function renderAssets() {
  try {
    assetRowsContainer.replaceChildren();

    assets.forEach((asset, index) => {
      const row = document.createElement('div');
      row.className = 'asset-row';
      row.dataset.id = asset.id;

      // Asset Name Input
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'asset-name-input';
      nameInput.value = asset.name;
      nameInput.placeholder = '자산 이름 (예: 미국 주식)';
      nameInput.setAttribute('aria-label', `${index + 1}번째 자산 이름`);
      nameInput.addEventListener('input', (e) => {
        assets[index].name = e.target.value;
        updateCalculations();
      });

      // Mode Selector (Segmented Toggle Buttons)
      const modeGroup = document.createElement('div');
      modeGroup.className = 'mode-toggle-group';
      modeGroup.setAttribute('role', 'group');
      modeGroup.setAttribute('aria-label', `${index + 1}번째 자산 입력 방식`);

      const ratioBtn = document.createElement('button');
      ratioBtn.type = 'button';
      ratioBtn.className = 'mode-toggle-btn' + (asset.mode === 'ratio' ? ' active' : '');
      ratioBtn.textContent = '비율';
      ratioBtn.setAttribute('aria-pressed', asset.mode === 'ratio');

      const amountBtn = document.createElement('button');
      amountBtn.type = 'button';
      amountBtn.className = 'mode-toggle-btn' + (asset.mode === 'amount' ? ' active' : '');
      amountBtn.textContent = '금액';
      amountBtn.setAttribute('aria-pressed', asset.mode === 'amount');

      ratioBtn.addEventListener('click', () => {
        if (asset.mode !== 'ratio') {
          assets[index].mode = 'ratio';
          assets[index].value = 0;
          renderAssets();
          updateCalculations();
        }
      });

      amountBtn.addEventListener('click', () => {
        if (asset.mode !== 'amount') {
          assets[index].mode = 'amount';
          assets[index].value = 0;
          renderAssets();
          updateCalculations();
        }
      });

      modeGroup.appendChild(ratioBtn);
      modeGroup.appendChild(amountBtn);

      // Value Input Wrapper (Target Ratio or Target Amount)
      const valWrapper = document.createElement('div');
      valWrapper.className = 'ratio-wrapper';

      const valInput = document.createElement('input');
      valInput.className = 'asset-value-input';
      valInput.placeholder = '0';
      valInput.setAttribute('aria-label', `${index + 1}번째 자산 설정값`);

      if (asset.mode === 'amount') {
        valInput.type = 'text';
        valInput.inputMode = 'numeric';
        valInput.value = asset.value === 0 ? '' : asset.value.toLocaleString('ko-KR');
      } else {
        valInput.type = 'number';
        valInput.step = 'any';
        valInput.value = asset.value === 0 ? '' : asset.value.toString();
      }

      valInput.addEventListener('focus', (e) => {
        if (asset.mode === 'amount') {
          e.target.value = asset.value === 0 ? '' : asset.value.toString();
        }
      });

      valInput.addEventListener('input', (e) => {
        if (asset.mode === 'amount') {
          let raw = e.target.value.replace(/[^0-9]/g, '');
          if (raw.length > 1 && raw.startsWith('0')) {
            raw = raw.substring(1);
          }
          let numVal = raw === '' ? 0 : parseInt(raw, 10);
          assets[index].value = numVal;
        } else {
          let raw = e.target.value.replace(/[^0-9.]/g, '');
          const parts = raw.split('.');
          if (parts.length > 2) {
            raw = parts[0] + '.' + parts.slice(1).join('');
          }
          let numVal = raw === '' ? 0 : parseFloat(raw);
          if (isNaN(numVal)) numVal = 0;
          if (numVal > 100) {
            numVal = 100;
            e.target.value = '100';
          }
          assets[index].value = numVal;
        }
        updateCalculations();
      });

      valInput.addEventListener('blur', (e) => {
        if (asset.mode === 'amount') {
          e.target.value = asset.value === 0 ? '' : asset.value.toLocaleString('ko-KR');
        } else {
          e.target.value = asset.value === 0 ? '' : asset.value.toString();
        }
      });

      const suffix = document.createElement('span');
      suffix.className = 'suffix';
      suffix.textContent = asset.mode === 'ratio' ? '%' : '원';

      valWrapper.appendChild(valInput);
      valWrapper.appendChild(suffix);

      // Current Asset Value Input (Only in Rebalancing Mode)
      let currentInputWrapper = null;
      if (currentMode === 'rebalance') {
        row.classList.add('asset-row--rebalance');

        currentInputWrapper = document.createElement('div');
        currentInputWrapper.className = 'ratio-wrapper current-amount-wrapper';

        const curInput = document.createElement('input');
        curInput.type = 'text';
        curInput.inputMode = 'numeric';
        curInput.className = 'asset-current-input';
        curInput.placeholder = '현재 보유액';
        curInput.setAttribute('aria-label', `${index + 1}번째 자산 현재 보유액`);
        curInput.value = asset.currentAmount === null || asset.currentAmount === 0 ? '' : asset.currentAmount.toLocaleString('ko-KR');

        curInput.addEventListener('focus', (e) => {
          if (asset.currentAmount > 0) {
            e.target.value = asset.currentAmount.toString();
          }
        });

        curInput.addEventListener('input', (e) => {
          let raw = e.target.value.replace(/[^0-9]/g, '');
          if (raw.length > 1 && raw.startsWith('0')) {
            raw = raw.substring(1);
          }
          let numVal = raw === '' ? 0 : parseInt(raw, 10);
          assets[index].currentAmount = numVal;
          updateCalculations();
        });

        curInput.addEventListener('blur', (e) => {
          e.target.value = asset.currentAmount === null || asset.currentAmount === 0 ? '' : asset.currentAmount.toLocaleString('ko-KR');
        });

        const curSuffix = document.createElement('span');
        curSuffix.className = 'suffix';
        curSuffix.textContent = '원';

        currentInputWrapper.appendChild(curInput);
        currentInputWrapper.appendChild(curSuffix);
      }

      // Delete Button
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'delete-btn';
      deleteBtn.textContent = '삭제';
      deleteBtn.setAttribute('aria-label', `${asset.name || (index + 1) + '번째 자산'} 삭제`);
      
      if (assets.length <= 1) {
        deleteBtn.disabled = true;
      }

      deleteBtn.addEventListener('click', () => {
        if (assets.length > 1) {
          assets.splice(index, 1);
          renderAssets();
          updateCalculations();
        }
      });

      row.appendChild(nameInput);
      row.appendChild(modeGroup);
      row.appendChild(valWrapper);
      if (currentInputWrapper) {
        row.appendChild(currentInputWrapper);
      }
      row.appendChild(deleteBtn);

      assetRowsContainer.appendChild(row);
    });
  } catch (e) {
    console.error('[Asset Allocation Calculator] Error in renderAssets:', e);
  }
}

// 9. Event Listeners for main layout controls
tabCalculator.addEventListener('click', () => switchMode('calculator'));
tabRebalance.addEventListener('click', () => switchMode('rebalance'));

totalAssetInput.addEventListener('focus', (e) => {
  if (totalAsset > 0) {
    e.target.value = totalAsset.toString();
  }
});

totalAssetInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '');
  totalAsset = val === '' ? 0 : parseInt(val, 10);
  updateCalculations();
});

totalAssetInput.addEventListener('blur', (e) => {
  e.target.value = totalAsset === 0 ? '' : totalAsset.toLocaleString('ko-KR');
});

additionalInvestmentInput.addEventListener('focus', (e) => {
  if (additionalInvestment > 0) {
    e.target.value = additionalInvestment.toString();
  }
});

additionalInvestmentInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '');
  additionalInvestment = val === '' ? 0 : parseInt(val, 10);
  updateCalculations();
});

additionalInvestmentInput.addEventListener('blur', (e) => {
  e.target.value = additionalInvestment === 0 ? '' : additionalInvestment.toLocaleString('ko-KR');
});

allowSellCheckbox.addEventListener('change', (e) => {
  allowSell = e.target.checked;
  updateCalculations();
});

addAssetBtn.addEventListener('click', () => {
  assets.push({
    id: generateId(),
    name: '',
    mode: 'ratio',
    value: 0,
    currentAmount: null
  });
  renderAssets();
  updateCalculations();
});

window.addEventListener('resize', () => {
  if (currentMode === 'rebalance') {
    const rebalanceData = calculateRebalance();
    renderRebalanceResults(rebalanceData);
  }
});

// Mode Switching Handler
function switchMode(mode) {
  currentMode = mode;

  if (mode === 'calculator') {
    tabCalculator.classList.add('active');
    tabCalculator.setAttribute('aria-selected', 'true');
    tabRebalance.classList.remove('active');
    tabRebalance.setAttribute('aria-selected', 'false');

    calculatorTotalAsset.hidden = false;
    rebalanceOptions.hidden = true;
    rebalanceColumnHint.hidden = true;
    calculatorResults.hidden = false;
    rebalanceResults.hidden = true;
  } else {
    tabCalculator.classList.remove('active');
    tabCalculator.setAttribute('aria-selected', 'false');
    tabRebalance.classList.add('active');
    tabRebalance.setAttribute('aria-selected', 'true');

    calculatorTotalAsset.hidden = true;
    rebalanceOptions.hidden = false;
    rebalanceColumnHint.hidden = false;
    calculatorResults.hidden = true;
    rebalanceResults.hidden = false;
  }

  renderAssets();
  updateCalculations();
}

// Initialization
loadFromLocalStorage();

// Sync loaded state with DOM elements
totalAssetInput.value = totalAsset === 0 ? '' : totalAsset.toLocaleString('ko-KR');
additionalInvestmentInput.value = additionalInvestment === 0 ? '' : additionalInvestment.toLocaleString('ko-KR');
allowSellCheckbox.checked = allowSell;

switchMode(currentMode);
