// Asset Allocation Calculator Core Logic (Asset Mode Selector)

// 1. ID Generation Helper
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// 2. Initial State (Scenarios matching verification criteria)
let assets = [
  { id: generateId(), name: '미국 주식', mode: 'ratio', value: 50 },
  { id: generateId(), name: '채권', mode: 'amount', value: 3000000 },
  { id: generateId(), name: '금', mode: 'ratio', value: 20 }
];
let totalAsset = 10000000;

// DOM Elements
const totalAssetInput = document.getElementById('totalAssetInput');
const assetRowsContainer = document.getElementById('assetRowsContainer');
const addAssetBtn = document.getElementById('addAssetBtn');
const resultsTableBody = document.getElementById('resultsTableBody');

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

// 4. Calculate Allocations
// Calculates the derived investment amount and actual ratio representation for all assets
function calculateAllocations() {
  return assets.map(asset => {
    let calculatedAmount = 0;
    let calculatedRatio = 0;

    if (asset.mode === 'amount') {
      calculatedAmount = asset.value;
      calculatedRatio = totalAsset > 0 ? (asset.value / totalAsset) * 100 : 0;
    } else {
      calculatedAmount = totalAsset * (asset.value / 100);
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
// Checks if the sum of all ratios equals 100% with tolerance for floating point calculations
function validateRatio(calculatedAssets) {
  const totalRatio = calculatedAssets.reduce((sum, asset) => sum + asset.calculatedRatio, 0);
  let status = 'ok'; // ok, warn, error
  let message = '';

  if (totalAsset === 0) {
    status = 'warn';
    message = '총 자산이 0원이므로 비율 계산이 불가능합니다.';
    return {
      totalRatio: 0,
      status,
      message
    };
  }

  const diff = totalRatio - 100;
  // Floating point tolerance of 0.01%
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
  
  banner.className = 'status-banner';
  
  if (validation.status === 'ok') {
    banner.classList.add('status-ok');
    statusMessage.textContent = '총 비율 합계가 정상입니다 (100.0%).';
    totalRatioText.textContent = `현재 비율: ${validation.totalRatio.toFixed(1)}%`;
  } else if (validation.status === 'warn') {
    banner.classList.add('status-warn');
    if (totalAsset === 0) {
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

// Render Results Table (using secure DOM manipulation)
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

    // Asset Name
    const nameTd = document.createElement('td');
    nameTd.textContent = item.name.trim() || '이름 없는 자산';

    // Original input value
    const valueTd = document.createElement('td');
    valueTd.style.textAlign = 'right';
    if (item.mode === 'ratio') {
      valueTd.textContent = `${item.value}%`;
    } else {
      valueTd.textContent = item.value.toLocaleString('ko-KR');
    }

    // Calculated actual ratio
    const ratioTd = document.createElement('td');
    ratioTd.className = 'ratio-cell';
    if (totalAsset === 0 && item.mode === 'amount') {
      ratioTd.textContent = '0.0%';
    } else {
      ratioTd.textContent = formatRatio(item.calculatedRatio);
    }

    // Calculated investment amount
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

// LocalStorage Persistence Helpers
function saveToLocalStorage() {
  try {
    const data = {
      totalAsset: totalAsset,
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
      if (Array.isArray(parsed.assets) && parsed.assets.length > 0) {
        assets = parsed.assets;
      }
    }
  } catch (e) {
    console.error('로컬 저장소 데이터 로드에 실패했습니다.', e);
  }
}

// Update outputs dynamically
function updateCalculations() {
  const calculatedAssets = calculateAllocations();
  updateStatusBanner(calculatedAssets);
  renderResults(calculatedAssets);
  saveToLocalStorage();
}

// 6. Render Assets Input Rows (using secure DOM manipulation)
function renderAssets() {
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
        assets[index].value = 0; // reset value to prevent mismatch
        renderAssets();
        updateCalculations();
      }
    });

    amountBtn.addEventListener('click', () => {
      if (asset.mode !== 'amount') {
        assets[index].mode = 'amount';
        assets[index].value = 0; // reset value to prevent mismatch
        renderAssets();
        updateCalculations();
      }
    });

    modeGroup.appendChild(ratioBtn);
    modeGroup.appendChild(amountBtn);

    // Value Input Wrapper
    const valWrapper = document.createElement('div');
    valWrapper.className = 'ratio-wrapper'; // reusing wrapper style for absolute suffix spacing

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

    // Safe cursor formatting on focus/blur
    valInput.addEventListener('focus', (e) => {
      if (asset.mode === 'amount') {
        // Strip commas for easy numeric input
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
        // Allow decimals for percentage mode
        let raw = e.target.value.replace(/[^0-9.]/g, '');
        const parts = raw.split('.');
        if (parts.length > 2) {
          raw = parts[0] + '.' + parts.slice(1).join('');
        }
        
        let numVal = raw === '' ? 0 : parseFloat(raw);
        if (isNaN(numVal)) numVal = 0;
        if (numVal > 100) {
          numVal = 100;
          raw = '100';
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

    // Delete Button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = '삭제';
    deleteBtn.setAttribute('aria-label', `${asset.name || (index + 1) + '번째 자산'} 삭제`);
    
    // Minimum 1 asset limit
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
    row.appendChild(deleteBtn);

    assetRowsContainer.appendChild(row);
  });
}

// 7. Event Listeners for main layout controls

// Safe cursor formatting on focus/blur for Total Asset Input
totalAssetInput.addEventListener('focus', (e) => {
  if (totalAsset > 0) {
    e.target.value = totalAsset.toString();
  }
});

totalAssetInput.addEventListener('input', (e) => {
  let val = e.target.value.replace(/[^0-9]/g, '');
  if (val === '') {
    totalAsset = 0;
  } else {
    totalAsset = parseInt(val, 10);
  }
  updateCalculations();
});

totalAssetInput.addEventListener('blur', (e) => {
  if (totalAsset === 0) {
    e.target.value = '';
  } else {
    e.target.value = totalAsset.toLocaleString('ko-KR');
  }
});

addAssetBtn.addEventListener('click', () => {
  assets.push({
    id: generateId(),
    name: '',
    mode: 'ratio',
    value: 0
  });
  renderAssets();
  updateCalculations();
});

// Initial Setup
loadFromLocalStorage();
totalAssetInput.value = totalAsset === 0 ? '' : totalAsset.toLocaleString('ko-KR');
renderAssets();
updateCalculations();
