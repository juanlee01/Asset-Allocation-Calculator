// Asset Allocation Calculator Core Logic

// 1. ID Generation Helper
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// 2. Initial State & Data Structures
let assets = [
  { id: generateId(), name: '미국 주식', target: { mode: 'ratio', value: 50 }, currentAmount: null },
  { id: generateId(), name: '채권', target: { mode: 'amount', value: 3000000 }, currentAmount: null },
  { id: generateId(), name: '금', target: { mode: 'ratio', value: 20 }, currentAmount: null }
];
let totalAsset = 10000000;
let currentMode = 'calculator'; // 'calculator' | 'rebalance'
let additionalInvestment = 0;
let allowSell = false;

// DOM Elements
const totalAssetInput = document.getElementById('totalAssetInput');
const additionalInvestmentInput = document.getElementById('additionalInvestmentInput');
const allowSellCheckbox = document.getElementById('allowSellCheckbox');
const assetRowsContainer = document.getElementById('assetRowsContainer');
const addAssetBtn = document.getElementById('addAssetBtn');
const resultsTableBody = document.getElementById('resultsTableBody');

// Mode Tab Elements
const tabCalculator = document.getElementById('tabCalculator');
const tabRebalance = document.getElementById('tabRebalance');
const calculatorTotalAsset = document.getElementById('calculatorTotalAsset');
const rebalanceOptions = document.getElementById('rebalanceOptions');
const calculatorResults = document.getElementById('calculatorResults');
const rebalanceResults = document.getElementById('rebalanceResults');
const rebalanceColumnHint = document.getElementById('rebalanceColumnHint');
const rebalanceTableBody = document.getElementById('rebalanceTableBody');
const rebalanceCardsContainer = document.getElementById('rebalanceCardsContainer');
const rebalanceSummary = document.getElementById('rebalanceSummary');

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
function formatCurrency(value, withSign = false) {
  if (value === undefined || value === null || isNaN(value)) {
    return '₩0';
  }
  const formatted = Math.abs(value).toLocaleString('ko-KR');
  if (withSign) {
    if (value > 0) return '+₩' + formatted;
    if (value < 0) return '-₩' + formatted;
    return '±₩0';
  }
  return '₩' + formatted;
}

function formatRatio(value) {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.0%';
  }
  return value.toFixed(1) + '%';
}

// 4. Calculate Allocations (Calculator Mode)
function calculateAllocations() {
  return assets.map(asset => {
    let calculatedAmount = 0;
    let calculatedRatio = 0;

    if (asset.target.mode === 'amount') {
      calculatedAmount = asset.target.value;
      calculatedRatio = totalAsset > 0 ? (asset.target.value / totalAsset) * 100 : 0;
    } else {
      calculatedAmount = totalAsset * (asset.target.value / 100);
      calculatedRatio = asset.target.value;
    }

    return {
      ...asset,
      calculatedAmount: Math.round(calculatedAmount),
      calculatedRatio: calculatedRatio
    };
  });
}

// 5. Calculate Rebalancing (Rebalance Mode)
function calculateRebalancing() {
  const totalCurrent = assets.reduce((sum, a) => sum + (a.currentAmount || 0), 0);
  const totalPool = totalCurrent + additionalInvestment;

  // Step 1: Calculate raw targets and differences
  let results = assets.map(asset => {
    let targetAmount = 0;
    let targetRatio = 0;

    if (asset.target.mode === 'amount') {
      targetAmount = asset.target.value;
      targetRatio = totalPool > 0 ? (targetAmount / totalPool) * 100 : 0;
    } else {
      targetAmount = Math.round(totalPool * (asset.target.value / 100));
      targetRatio = asset.target.value;
    }

    const currentAmount = asset.currentAmount || 0;
    let diff = targetAmount - currentAmount;
    
    const currentRatio = totalCurrent > 0 ? (currentAmount / totalCurrent) * 100 : 0;

    return {
      ...asset,
      currentRatio,
      targetRatio,
      targetAmount,
      currentAmount,
      diff,
      isFixed: asset.target.mode === 'amount'
    };
  });

  // Step 2: Normalize rounding errors for ratio assets
  results = normalizeRoundingError(results, totalPool);

  // Step 3: Apply Buy-only strategy if sell is not allowed
  if (!allowSell) {
    results = applyBuyOnlyStrategy(results, additionalInvestment);
  }

  return {
    results,
    totalCurrent,
    totalPool
  };
}

function normalizeRoundingError(results, totalPool) {
  const ratioAssets = results.filter(r => !r.isFixed);
  if (ratioAssets.length === 0) return results;

  const sumTargets = results.reduce((s, r) => s + r.targetAmount, 0);
  const error = totalPool - sumTargets;

  if (error !== 0) {
    // Find the largest ratio asset to absorb the error
    const largest = ratioAssets.reduce((a, b) => a.targetAmount > b.targetAmount ? a : b);
    largest.targetAmount += error;
    largest.diff += error;
  }
  return results;
}

function applyBuyOnlyStrategy(results, additionalInvestment) {
  // Identify assets that need selling
  let sellAmount = 0;
  
  results.forEach(r => {
    // We treat amount mode assets as fixed; they must be bought/sold to reach their target.
    // However, if the user explicitly wants NO selling, we prevent it for ALL assets.
    // As per user request, Buy-only (allowSell = false) means diff < 0 -> diff = 0
    if (r.diff < 0) {
      sellAmount += Math.abs(r.diff);
      r.diff = 0;
      r.targetAmount = r.currentAmount; // Keep what we have
    }
  });

  if (sellAmount === 0) return results;

  // We need to redistribute the `additionalInvestment` among ratio assets that need buying.
  // We cannot use the raw `diff` because we aren't selling.
  // The available pool to buy is just `additionalInvestment`.
  
  // Calculate total target ratio of ratio-assets that want to buy
  const buyingRatioAssets = results.filter(r => !r.isFixed && r.targetAmount > r.currentAmount);
  const sumTargetRatios = buyingRatioAssets.reduce((s, r) => s + r.targetRatio, 0);

  if (sumTargetRatios > 0) {
    let remainingInvest = additionalInvestment;
    
    buyingRatioAssets.forEach((r, index) => {
      if (index === buyingRatioAssets.length - 1) {
        // Last one gets the remainder to avoid rounding issues
        r.diff = remainingInvest;
      } else {
        const share = Math.round(additionalInvestment * (r.targetRatio / sumTargetRatios));
        r.diff = share;
        remainingInvest -= share;
      }
      r.targetAmount = r.currentAmount + r.diff;
    });
  }

  return results;
}

// 6. Validate Ratio
function validateRatio() {
  // Use target values for validation
  let totalRatio = 0;
  assets.forEach(asset => {
    if (asset.target.mode === 'ratio') {
      totalRatio += asset.target.value;
    } else {
      // In calculator mode, use totalAsset. In rebalance mode, use totalPool
      const pool = currentMode === 'calculator' ? totalAsset : 
                   (assets.reduce((sum, a) => sum + (a.currentAmount || 0), 0) + additionalInvestment);
      totalRatio += pool > 0 ? (asset.target.value / pool) * 100 : 0;
    }
  });

  let status = 'ok';
  let message = '';

  const pool = currentMode === 'calculator' ? totalAsset : 
               (assets.reduce((sum, a) => sum + (a.currentAmount || 0), 0) + additionalInvestment);

  if (pool === 0) {
    status = 'warn';
    message = currentMode === 'calculator' ? '총 자산이 0원이므로 비율 계산이 불가능합니다.' : '보유 자산과 추가 투자금이 0원입니다.';
    return { totalRatio: 0, status, message };
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

  return { totalRatio, status, message };
}

// Update Status Banner UI
function updateStatusBanner() {
  const banner = document.getElementById('statusBanner');
  const statusMessage = document.getElementById('statusMessage');
  const totalRatioText = document.getElementById('totalRatioText');
  
  const validation = validateRatio();
  
  banner.className = 'status-banner';
  
  if (validation.status === 'ok') {
    banner.classList.add('status-ok');
    statusMessage.textContent = '총 비율 합계가 정상입니다 (100.0%).';
    totalRatioText.textContent = `현재 비율: ${validation.totalRatio.toFixed(1)}%`;
  } else if (validation.status === 'warn') {
    banner.classList.add('status-warn');
    const pool = currentMode === 'calculator' ? totalAsset : 
               (assets.reduce((sum, a) => sum + (a.currentAmount || 0), 0) + additionalInvestment);
    if (pool === 0) {
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
function renderCalculatorResults(calculatedAssets) {
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
    if (item.target.mode === 'ratio') {
      valueTd.textContent = `${item.target.value}%`;
    } else {
      valueTd.textContent = `${item.target.value.toLocaleString('ko-KR')} 원`;
    }

    const ratioTd = document.createElement('td');
    ratioTd.className = 'ratio-cell';
    if (totalAsset === 0 && item.target.mode === 'amount') {
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

// Render Rebalance Results
function renderRebalanceResults(rebalanceData) {
  const { results, totalCurrent } = rebalanceData;
  const isMobile = window.innerWidth <= 768;

  // Summary logic
  let totalBuy = 0;
  let totalSell = 0;
  results.forEach(r => {
    if (r.diff > 0) totalBuy += r.diff;
    if (r.diff < 0) totalSell += Math.abs(r.diff);
  });

  rebalanceSummary.innerHTML = `
    <div class="summary-item">
      <span>총 매수</span>
      <span class="diff-positive">${formatCurrency(totalBuy)}</span>
    </div>
    <div class="summary-operator">−</div>
    <div class="summary-item">
      <span>총 매도</span>
      <span class="diff-negative">${formatCurrency(totalSell)}</span>
    </div>
    <div class="summary-operator">=</div>
    <div class="summary-item highlight">
      <span>추가 투자금</span>
      <span>${formatCurrency(additionalInvestment)}</span>
    </div>
  `;

  if (isMobile) {
    // Mobile Cards
    document.getElementById('rebalanceTableContainer').hidden = true;
    rebalanceCardsContainer.hidden = false;
    rebalanceCardsContainer.replaceChildren();

    if (results.length === 0) {
       rebalanceCardsContainer.innerHTML = '<div style="text-align:center; padding: 2rem; color: var(--text-secondary)">설정된 자산이 없습니다.</div>';
       return;
    }

    results.forEach(item => {
      const card = document.createElement('div');
      card.className = 'rebalance-card';
      
      let diffClass = 'diff-neutral';
      if (item.diff > 0) diffClass = 'diff-positive';
      else if (item.diff < 0) diffClass = 'diff-negative';

      card.innerHTML = `
        <div class="rebalance-card-header">
          <span class="asset-name">${item.name.trim() || '이름 없는 자산'}</span>
          <span class="diff-badge ${diffClass}">${formatCurrency(item.diff, true)}</span>
        </div>
        <div class="rebalance-card-grid">
          <div class="grid-item">
            <span class="label">현재 금액</span>
            <span class="value">${formatCurrency(item.currentAmount)}</span>
          </div>
          <div class="grid-item">
            <span class="label">목표 금액</span>
            <span class="value">${formatCurrency(item.targetAmount)}</span>
          </div>
          <div class="grid-item">
            <span class="label">현재 비율</span>
            <span class="value">${formatRatio(item.currentRatio)}</span>
          </div>
          <div class="grid-item">
            <span class="label">목표 비율</span>
            <span class="value">${formatRatio(item.targetRatio)}</span>
          </div>
        </div>
      `;
      rebalanceCardsContainer.appendChild(card);
    });

  } else {
    // Desktop Table
    document.getElementById('rebalanceTableContainer').hidden = false;
    rebalanceCardsContainer.hidden = true;
    rebalanceTableBody.replaceChildren();

    if (results.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.style.textAlign = 'center';
      td.style.color = 'var(--text-secondary)';
      td.textContent = '설정된 자산 항목이 없습니다.';
      tr.appendChild(td);
      rebalanceTableBody.appendChild(tr);
      return;
    }

    results.forEach(item => {
      const tr = document.createElement('tr');

      const nameTd = document.createElement('td');
      nameTd.textContent = item.name.trim() || '이름 없는 자산';

      const currentAmountTd = document.createElement('td');
      currentAmountTd.style.textAlign = 'right';
      currentAmountTd.textContent = formatCurrency(item.currentAmount);

      const currentRatioTd = document.createElement('td');
      currentRatioTd.style.textAlign = 'center';
      currentRatioTd.textContent = formatRatio(item.currentRatio);

      const targetRatioTd = document.createElement('td');
      targetRatioTd.style.textAlign = 'center';
      targetRatioTd.textContent = formatRatio(item.targetRatio);

      const targetAmountTd = document.createElement('td');
      targetAmountTd.style.textAlign = 'right';
      targetAmountTd.textContent = formatCurrency(item.targetAmount);

      const diffTd = document.createElement('td');
      diffTd.style.textAlign = 'right';
      diffTd.style.fontWeight = '700';
      if (item.diff > 0) {
        diffTd.className = 'diff-positive';
        diffTd.textContent = formatCurrency(item.diff, true);
      } else if (item.diff < 0) {
        diffTd.className = 'diff-negative';
        diffTd.textContent = formatCurrency(item.diff, true);
      } else {
        diffTd.className = 'diff-neutral';
        diffTd.textContent = formatCurrency(item.diff, true);
      }

      tr.appendChild(nameTd);
      tr.appendChild(currentAmountTd);
      tr.appendChild(currentRatioTd);
      tr.appendChild(targetRatioTd);
      tr.appendChild(targetAmountTd);
      tr.appendChild(diffTd);
      rebalanceTableBody.appendChild(tr);
    });
  }
}

// 7. Render Assets Input Rows
function renderAssets() {
  assetRowsContainer.replaceChildren();

  // Show column hint in rebalance mode
  rebalanceColumnHint.hidden = currentMode !== 'rebalance';

  assets.forEach((asset, index) => {
    const row = document.createElement('div');
    row.className = 'asset-row';
    if (currentMode === 'rebalance') {
      row.classList.add('asset-row--rebalance');
    }
    row.dataset.id = asset.id;

    // Asset Name Input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'asset-name-input';
    nameInput.value = asset.name;
    nameInput.placeholder = '자산 이름';
    nameInput.setAttribute('aria-label', `${index + 1}번째 자산 이름`);
    nameInput.addEventListener('input', (e) => {
      assets[index].name = e.target.value;
      updateCalculations();
    });

    // Mode Selector (Segmented Toggle Buttons)
    const modeGroup = document.createElement('div');
    modeGroup.className = 'mode-toggle-group';
    modeGroup.setAttribute('role', 'group');

    const ratioBtn = document.createElement('button');
    ratioBtn.type = 'button';
    ratioBtn.className = 'mode-toggle-btn' + (asset.target.mode === 'ratio' ? ' active' : '');
    ratioBtn.textContent = '비율';

    const amountBtn = document.createElement('button');
    amountBtn.type = 'button';
    amountBtn.className = 'mode-toggle-btn' + (asset.target.mode === 'amount' ? ' active' : '');
    amountBtn.textContent = '금액';

    ratioBtn.addEventListener('click', () => {
      if (asset.target.mode !== 'ratio') {
        assets[index].target.mode = 'ratio';
        assets[index].target.value = 0;
        renderAssets();
        updateCalculations();
      }
    });

    amountBtn.addEventListener('click', () => {
      if (asset.target.mode !== 'amount') {
        assets[index].target.mode = 'amount';
        assets[index].target.value = 0;
        renderAssets();
        updateCalculations();
      }
    });

    modeGroup.appendChild(ratioBtn);
    modeGroup.appendChild(amountBtn);

    // Target Value Input Wrapper
    const valWrapper = document.createElement('div');
    valWrapper.className = 'ratio-wrapper';

    const valInput = document.createElement('input');
    valInput.className = 'asset-value-input';
    valInput.placeholder = '0';

    if (asset.target.mode === 'amount') {
      valInput.type = 'text';
      valInput.inputMode = 'numeric';
      valInput.value = asset.target.value === 0 ? '' : asset.target.value.toLocaleString('ko-KR');
    } else {
      valInput.type = 'number';
      valInput.step = 'any';
      valInput.value = asset.target.value === 0 ? '' : asset.target.value.toString();
    }

    valInput.addEventListener('focus', (e) => {
      if (asset.target.mode === 'amount') {
        e.target.value = asset.target.value === 0 ? '' : asset.target.value.toString();
      }
    });

    valInput.addEventListener('input', (e) => {
      if (asset.target.mode === 'amount') {
        let raw = e.target.value.replace(/[^0-9]/g, '');
        if (raw.length > 1 && raw.startsWith('0')) {
          raw = raw.substring(1);
        }
        assets[index].target.value = raw === '' ? 0 : parseInt(raw, 10);
      } else {
        let raw = e.target.value.replace(/[^0-9.]/g, '');
        const parts = raw.split('.');
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
        let numVal = raw === '' ? 0 : parseFloat(raw);
        if (isNaN(numVal)) numVal = 0;
        if (numVal > 100) { numVal = 100; e.target.value = '100'; }
        assets[index].target.value = numVal;
      }
      updateCalculations();
    });

    valInput.addEventListener('blur', (e) => {
      if (asset.target.mode === 'amount') {
        e.target.value = asset.target.value === 0 ? '' : asset.target.value.toLocaleString('ko-KR');
      } else {
        e.target.value = asset.target.value === 0 ? '' : asset.target.value.toString();
      }
    });

    const suffix = document.createElement('span');
    suffix.className = 'suffix';
    suffix.textContent = asset.target.mode === 'ratio' ? '%' : '원';
    valWrapper.appendChild(valInput);
    valWrapper.appendChild(suffix);

    row.appendChild(nameInput);
    row.appendChild(modeGroup);
    row.appendChild(valWrapper);

    // Current Amount Input (Rebalance Mode Only)
    if (currentMode === 'rebalance') {
      const currentValWrapper = document.createElement('div');
      currentValWrapper.className = 'ratio-wrapper current-amount-wrapper';
      
      const currentInput = document.createElement('input');
      currentInput.type = 'text';
      currentInput.inputMode = 'numeric';
      currentInput.placeholder = '보유 금액 (원)';
      currentInput.value = asset.currentAmount ? asset.currentAmount.toLocaleString('ko-KR') : '';
      
      currentInput.addEventListener('focus', (e) => {
        e.target.value = asset.currentAmount ? asset.currentAmount.toString() : '';
      });

      currentInput.addEventListener('input', (e) => {
        let raw = e.target.value.replace(/[^0-9]/g, '');
        if (raw.length > 1 && raw.startsWith('0')) raw = raw.substring(1);
        assets[index].currentAmount = raw === '' ? null : parseInt(raw, 10);
        updateCalculations();
      });

      currentInput.addEventListener('blur', (e) => {
        e.target.value = asset.currentAmount ? asset.currentAmount.toLocaleString('ko-KR') : '';
      });

      const currentSuffix = document.createElement('span');
      currentSuffix.className = 'suffix';
      currentSuffix.textContent = '원';
      
      currentValWrapper.appendChild(currentInput);
      currentValWrapper.appendChild(currentSuffix);
      row.appendChild(currentValWrapper);
    }

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '삭제';
    if (assets.length <= 1) deleteBtn.disabled = true;

    deleteBtn.addEventListener('click', () => {
      if (assets.length > 1) {
        assets.splice(index, 1);
        renderAssets();
        updateCalculations();
      }
    });

    row.appendChild(deleteBtn);
    assetRowsContainer.appendChild(row);
  });
}

// 8. Main Update Cycle
function updateCalculations() {
  updateStatusBanner();
  
  if (currentMode === 'calculator') {
    const calculatedAssets = calculateAllocations();
    renderCalculatorResults(calculatedAssets);
  } else {
    const rebalanceData = calculateRebalancing();
    renderRebalanceResults(rebalanceData);
  }
  
  saveToLocalStorage();
}

// 9. Mode Switching
function switchMode(mode) {
  currentMode = mode;
  
  calculatorTotalAsset.hidden = (mode !== 'calculator');
  calculatorResults.hidden = (mode !== 'calculator');
  
  rebalanceOptions.hidden = (mode !== 'rebalance');
  rebalanceResults.hidden = (mode !== 'rebalance');
  
  tabCalculator.setAttribute('aria-selected', mode === 'calculator');
  tabRebalance.setAttribute('aria-selected', mode === 'rebalance');
  tabCalculator.classList.toggle('active', mode === 'calculator');
  tabRebalance.classList.toggle('active', mode === 'rebalance');
  
  renderAssets(); // Re-render to add/remove currentAmount column
  updateCalculations();
}

// 10. LocalStorage Migration & Persistence
function migrateAsset(raw) {
  if (raw.target) return raw; // Already migrated
  return {
    id: raw.id,
    name: raw.name,
    target: { mode: raw.mode ?? 'ratio', value: raw.value ?? 0 },
    currentAmount: null
  };
}

function loadFromLocalStorage() {
  try {
    const savedData = localStorage.getItem('asset_allocation_data');
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.totalAsset !== undefined) totalAsset = parsed.totalAsset;
      if (parsed.currentMode) currentMode = parsed.currentMode;
      if (parsed.additionalInvestment !== undefined) additionalInvestment = parsed.additionalInvestment;
      if (parsed.allowSell !== undefined) allowSell = parsed.allowSell;
      if (Array.isArray(parsed.assets) && parsed.assets.length > 0) {
        assets = parsed.assets.map(migrateAsset);
      }
    }
  } catch (e) {
    console.error('Failed to load local storage data', e);
  }
}

function saveToLocalStorage() {
  try {
    const data = {
      totalAsset,
      currentMode,
      additionalInvestment,
      allowSell,
      assets
    };
    localStorage.setItem('asset_allocation_data', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save local storage data', e);
  }
}

// 11. Event Listeners
tabCalculator.addEventListener('click', () => switchMode('calculator'));
tabRebalance.addEventListener('click', () => switchMode('rebalance'));

totalAssetInput.addEventListener('focus', (e) => {
  if (totalAsset > 0) e.target.value = totalAsset.toString();
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
  if (additionalInvestment > 0) e.target.value = additionalInvestment.toString();
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
    target: { mode: 'ratio', value: 0 },
    currentAmount: null
  });
  renderAssets();
  updateCalculations();
});

window.addEventListener('resize', () => {
  if (currentMode === 'rebalance') {
    // Re-render to handle table vs cards
    updateCalculations();
  }
});

// Initialization
loadFromLocalStorage();

// Sync UI states with loaded data
totalAssetInput.value = totalAsset === 0 ? '' : totalAsset.toLocaleString('ko-KR');
additionalInvestmentInput.value = additionalInvestment === 0 ? '' : additionalInvestment.toLocaleString('ko-KR');
allowSellCheckbox.checked = allowSell;

switchMode(currentMode); // Triggers renderAssets and updateCalculations
