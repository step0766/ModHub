let models = [];
let activeTag = "";
let activeAuthor = "";
let activeSource = "";
let onlyFavorites = false;
let onlyPrinted = false;
let displayedCount = 20;
let loadIncrement = 20;
let isTagsExpanded = false;
let isAuthorsExpanded = false;
let currentLightboxList = [];
let currentLightboxIndex = 0;
let multiSelectMode = false;
let selectedModels = new Set();

function initDropdown() {
  const dropdownBtn = document.getElementById('importDropdownBtn');
  const dropdownMenu = document.getElementById('importDropdownMenu');
  
  if (!dropdownBtn || !dropdownMenu) return;
  
  dropdownBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownMenu.classList.contains('show');
    dropdownMenu.classList.toggle('show');
    dropdownBtn.setAttribute('aria-expanded', !isOpen);
  });
  
  document.addEventListener('click', (e) => {
    if (!dropdownBtn.contains(e.target)) {
      dropdownMenu.classList.remove('show');
      dropdownBtn.setAttribute('aria-expanded', 'false');
    }
  });
  
  dropdownMenu.querySelectorAll('.dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      dropdownMenu.classList.remove('show');
      dropdownBtn.setAttribute('aria-expanded', 'false');
    });
  });
}

try {
  initDropdown();
} catch (e) {
}

const THEME_KEY = 'mw_theme_preference';

function initTheme() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  
  if (savedTheme) {
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } else {
    const hasMatchMedia = typeof window.matchMedia === 'function';
    let prefersDark = false;

    if (hasMatchMedia) {
      prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (prefersDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', toggleTheme);
  }
}

function toggleTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  
  if (themeToggleBtn) {
    themeToggleBtn.classList.add('spinning');
    setTimeout(() => {
      themeToggleBtn.classList.remove('spinning');
    }, 400);
  }
  
  if (isDark) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem(THEME_KEY, 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem(THEME_KEY, 'dark');
  }
}

try {
  initTheme();
} catch (e) {
  document.documentElement.removeAttribute('data-theme');
}

if (typeof window.matchMedia === 'function') {
  try {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      const savedTheme = localStorage.getItem(THEME_KEY);
      if (!savedTheme) {
        initTheme();
      }
    });
  } catch (e) {
  }
}
const filterChipLimit = 12;
const authorChipLimit = 10;
const statBlueprint = [
  { key: "likes", icon: "👍", label: "点赞" },
  { key: "favorites", icon: "⭐", label: "收藏" },
  { key: "downloads", icon: "⬇️", label: "下载" },
  { key: "prints", icon: "🖨️", label: "打印" },
  { key: "views", icon: "👁️", label: "浏览" }
];
const kwInput = document.getElementById("kw");
const filterChips = document.getElementById("filterChips");
const authorChips = document.getElementById("authorChips");
const sourceMenu = document.getElementById("sourceMenu");
const clearBtn = document.getElementById("clearBtn");
const resetSearchBtn = document.getElementById("resetSearchBtn");
const paginationWrap = document.getElementById("pagination");
const pageSizeInput = document.getElementById("pageSizeInput");
const totalCountEl = document.getElementById("totalCount");
const sortOrderSelect = document.getElementById("sortOrder");
const favOnlyBtn = document.getElementById("favOnlyBtn");
const printedOnlyBtn = document.getElementById("printedOnlyBtn");
const filterModal = document.getElementById("filterModal");
const filterModalTitle = document.getElementById("filterModalTitle");
const filterModalChips = document.getElementById("filterModalChips");
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxCaption = document.getElementById("lightbox-caption");
let favoriteSet = new Set();
let printedSet = new Set();

function getModelKey(m) {
  return String(m.dir || "");
}

async function loadFlags() {
  try {
    const res = await fetch("/api/gallery/flags");
    if (!res.ok) throw new Error("flags request failed");
    const data = await res.json();
    favoriteSet = new Set(Array.isArray(data.favorites) ? data.favorites : []);
    printedSet = new Set(Array.isArray(data.printed) ? data.printed : []);
  } catch (e) {
    console.warn("载入标记失败", e);
    favoriteSet = new Set();
    printedSet = new Set();
  }
}

async function saveFlags() {
  try {
    await fetch("/api/gallery/flags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        favorites: Array.from(favoriteSet),
        printed: Array.from(printedSet)
      })
    });
  } catch (e) {
    console.warn("保存标记失败", e);
  }
}

function clampPageSize(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return pageSize;
  return Math.min(100, Math.max(1, Math.floor(parsed)));
}

function formatDate(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("zh-CN");
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function selectTag(tag) {
  activeTag = tag;
  displayedCount = loadIncrement;
  renderFilters();
  renderAuthorFilters();
  render();
}

function selectAuthor(name) {
  activeAuthor = name;
  displayedCount = loadIncrement;
  renderFilters();
  renderAuthorFilters();
  render();
}

function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;
  
  const matrix = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return (maxLen - distance) / maxLen;
}

const SIMILARITY_THRESHOLD = 0.7;

function buildSimilarityGroups(list) {
  const n = list.length;
  const similarityMatrix = new Map();
  
  for (let i = 0; i < n; i++) {
    const m1 = list[i];
    const title1 = (m1?.title || "").trim().toLowerCase();
    
    for (let j = i + 1; j < n; j++) {
      const m2 = list[j];
      const title2 = (m2?.title || "").trim().toLowerCase();
      
      if (!title1 || !title2) {
        continue;
      }
      
      const sim = calculateSimilarity(title1, title2);
      if (sim >= SIMILARITY_THRESHOLD) {
        if (!similarityMatrix.has(i)) similarityMatrix.set(i, new Map());
        if (!similarityMatrix.has(j)) similarityMatrix.set(j, new Map());
        similarityMatrix.get(i).set(j, sim);
        similarityMatrix.get(j).set(i, sim);
      }
    }
  }
  
  const visited = new Set();
  const groups = [];
  
  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;
    
    const group = { indices: [i], maxSim: 0 };
    visited.add(i);
    
    const queue = [i];
    while (queue.length > 0) {
      const current = queue.shift();
      const neighbors = similarityMatrix.get(current);
      if (neighbors) {
        for (const [neighbor, sim] of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
            group.indices.push(neighbor);
            if (sim > group.maxSim) group.maxSim = sim;
          }
        }
      }
    }
    
    groups.push(group);
  }
  
  return { groups, similarityMatrix };
}

function sortGroupIndices(indices, similarityMatrix, list) {
  if (indices.length <= 1) return indices;
  
  const sorted = [indices[0]];
  const remaining = new Set(indices.slice(1));
  
  while (remaining.size > 0) {
    let bestNext = null;
    let bestSim = -1;
    const lastIdx = sorted[sorted.length - 1];
    const neighbors = similarityMatrix.get(lastIdx);
    
    if (neighbors) {
      for (const idx of remaining) {
        const sim = neighbors.get(idx) || 0;
        if (sim > bestSim) {
          bestSim = sim;
          bestNext = idx;
        }
      }
    }
    
    if (bestNext === null) {
      bestNext = remaining.values().next().value;
    }
    
    sorted.push(bestNext);
    remaining.delete(bestNext);
  }
  
  return sorted;
}

function sortModelsDesc(list) {
  const sortMode = sortOrderSelect?.value || "collected";
  
  if (sortMode === "similarity") {
    const { groups, similarityMatrix } = buildSimilarityGroups(list);
    
    groups.sort((a, b) => {
      if (a.maxSim !== b.maxSim) return b.maxSim - a.maxSim;
      return a.indices.length > 0 && b.indices.length > 0 
        ? (list[a.indices[0]]?.title || "").localeCompare(list[b.indices[0]]?.title || "")
        : 0;
    });
    
    const result = [];
    for (const group of groups) {
      const sortedIndices = sortGroupIndices(group.indices, similarityMatrix, list);
      for (const idx of sortedIndices) {
        result.push(list[idx]);
      }
    }
    
    return result;
  }
  
  return list.slice().sort((a, b) => {
    const aPrimary = sortMode === "published" ? a?.publishedAt : a?.collectedAt;
    const bPrimary = sortMode === "published" ? b?.publishedAt : b?.collectedAt;
    const aFallback = sortMode === "published" ? a?.collectedAt : a?.publishedAt;
    const bFallback = sortMode === "published" ? b?.collectedAt : b?.publishedAt;
    const aTime = Date.parse(aPrimary || aFallback || "");
    const bTime = Date.parse(bPrimary || bFallback || "");
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid || bValid) {
      if (!aValid) return 1;
      if (!bValid) return -1;
      if (aTime !== bTime) return bTime - aTime;
    }
    const aName = (a?.title || a?.baseName || "").toLowerCase();
    const bName = (b?.title || b?.baseName || "").toLowerCase();
    return bName.localeCompare(aName);
  });
}

function getSourceValue(m) {
  const src = String((m && m.source) || "").trim().toLowerCase();
  if (src === "makerworld") return "makerworld";
  if (src === "localmodel" || src === "others" || src === "other") return "localmodel";
  const dir = m?.dir || "";
  if (dir.startsWith("LocalModel_")) return "localmodel";
  if (dir.startsWith("Others_")) return "localmodel";
  return "makerworld";
}

function formatSourceLabel(value) {
  if (value === "localmodel") return "手动导入";
  return "MakerWorld";
}

function selectSource(source) {
  activeSource = source;
  displayedCount = loadIncrement;
  renderSourceMenu();
  render();
}

function syncFlagFilterButtons() {
  if (favOnlyBtn) {
    favOnlyBtn.classList.toggle("active", onlyFavorites);
    favOnlyBtn.setAttribute("aria-pressed", onlyFavorites ? "true" : "false");
  }
  if (printedOnlyBtn) {
    printedOnlyBtn.classList.toggle("active", onlyPrinted);
    printedOnlyBtn.setAttribute("aria-pressed", onlyPrinted ? "true" : "false");
  }
}

// Updated to create Sidebar Items
function createFilterChip({ label, value, count, isActive, onSelect, extraClass }) {
  const btn = document.createElement("button");
  btn.type = "button";
  // Use .side-item for sidebar styling
  btn.className = "side-item" + (isActive ? " active" : "") + (extraClass ? ` ${extraClass}` : "");

  // Format: "Label (Count)"
  btn.innerHTML = `<span>${label}</span> <span style="font-size:12px; opacity:0.6;">${typeof count === "number" ? count : ""}</span>`;

  btn.addEventListener("click", () => onSelect(value));
  return btn;
}

function openFilterModal({ type, items, total }) {
  if (!filterModal || !filterModalChips || !filterModalTitle) return;
  const isTag = type === "tag";
  const activeValue = isTag ? activeTag : activeAuthor;
  const allLabel = isTag ? "全部模型" : "全部作者";
  const selectFn = isTag ? selectTag : selectAuthor;
  filterModalTitle.textContent = isTag ? "全部分类" : "全部作者";
  filterModalChips.innerHTML = "";

  filterModalChips.appendChild(createFilterChip({
    label: allLabel,
    value: "",
    count: total,
    isActive: activeValue === "",
    onSelect: (value) => { selectFn(value); closeFilterModal(); }
  }));

  items.forEach(([value, count]) => {
    filterModalChips.appendChild(createFilterChip({
      label: value,
      value,
      count,
      isActive: activeValue === value,
      onSelect: (val) => { selectFn(val); closeFilterModal(); }
    }));
  });

  filterModal.style.display = "flex";
  filterModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeFilterModal() {
  if (!filterModal) return;
  filterModal.style.display = "none";
  filterModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function toggleFavorite(m) {
  const key = getModelKey(m);
  if (!key) return;
  if (favoriteSet.has(key)) { favoriteSet.delete(key); } else { favoriteSet.add(key); }
  saveFlags();
  render();
}

function togglePrinted(m) {
  const key = getModelKey(m);
  if (!key) return;
  if (printedSet.has(key)) { printedSet.delete(key); } else { printedSet.add(key); }
  saveFlags();
  render();
}

// Alert Modal Functions
function showAlertModal(title, message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const modalTitle = document.getElementById('confirmModalTitle');
  const modalMessage = document.getElementById('confirmModalMessage');
  const confirmBtn = document.getElementById('confirmModalConfirm');
  const cancelBtn = document.getElementById('confirmModalCancel');
  
  if (!modal || !modalTitle || !modalMessage || !confirmBtn || !cancelBtn) return;
  
  // Set content
  modalTitle.textContent = title || '提示';
  modalMessage.textContent = message || '';
  
  // Show modal
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  // Hide cancel button for alert mode
  cancelBtn.style.display = 'none';
  
  // Remove existing event listeners by cloning the buttons
  const newConfirmBtn = confirmBtn.cloneNode(true);
  
  // Ensure buttons have correct text
  newConfirmBtn.textContent = '确定';
  
  // Replace the buttons
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  
  // Add new event listeners
  newConfirmBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    cancelBtn.style.display = ''; // Reset cancel button visibility
    if (onConfirm) onConfirm();
  });
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      cancelBtn.style.display = ''; // Reset cancel button visibility
      if (onConfirm) onConfirm();
    }
  });
}

// Confirmation Modal Functions
function showConfirmModal(title, message, onConfirm, onCancel) {
  const modal = document.getElementById('confirmModal');
  const modalTitle = document.getElementById('confirmModalTitle');
  const modalMessage = document.getElementById('confirmModalMessage');
  const confirmBtn = document.getElementById('confirmModalConfirm');
  const cancelBtn = document.getElementById('confirmModalCancel');
  
  if (!modal || !modalTitle || !modalMessage || !confirmBtn || !cancelBtn) return;
  
  // Set content
  modalTitle.textContent = title || '确认操作';
  modalMessage.textContent = message || '';
  
  // Show modal
  modal.style.display = 'flex';
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  
  // Show cancel button for confirm mode
  cancelBtn.style.display = '';
  
  // Remove existing event listeners by cloning the buttons
  const newConfirmBtn = confirmBtn.cloneNode(true);
  const newCancelBtn = cancelBtn.cloneNode(true);
  
  // Ensure buttons have correct text
  newConfirmBtn.textContent = '确定';
  newCancelBtn.textContent = '取消';
  
  // Replace the buttons
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  
  // Add new event listeners
  newCancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (onCancel) onCancel();
  });
  
  newConfirmBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (onConfirm) onConfirm();
  });
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (onCancel) onCancel();
    }
  });
}

function deleteModel(m) {
  const key = getModelKey(m);
  if (!key) return;
  const name = m.title || m.baseName || m.dir || "该模型";
  
  showConfirmModal(
    '确认删除',
    `确定物理删除「${name}」? 删除后无法恢复。`,
    async () => {
      try {
        const res = await fetch(`/api/models/${encodeURIComponent(key)}/delete`, { method: "POST" });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.detail || "delete failed");
        }
        // 删除成功，更新前端状态
        models = models.filter(item => getModelKey(item) !== key);
        favoriteSet.delete(key);
        printedSet.delete(key);
        // 异步保存 flags，不阻塞 UI 更新
        saveFlags().catch(() => {});
        displayedCount = loadIncrement;
        renderFilters();
        renderAuthorFilters();
        renderSourceMenu();
        render();
      } catch (e) {
        console.error("删除失败", e);
        showAlertModal('操作失败', '删除失败，请检查服务器日志');
      }
    }
  );
}

async function load() {
  try {
    await loadFlags();
    const res = await fetch("/api/gallery");
    models = await res.json();
  } catch (e) {
    console.error("载入模型失败", e);
    models = [];
  }
  renderFilters();
  renderAuthorFilters();
  renderSourceMenu();
  syncFlagFilterButtons();
  displayedCount = loadIncrement;
  render();
  setupInfiniteScroll();
}

function renderFilters() {
  if (!filterChips) return;
  const counts = {};
  models.forEach(m => (m.tags || []).forEach(tag => {
    counts[tag] = (counts[tag] || 0) + 1;
  }));
  filterChips.innerHTML = "";
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const displayLimit = isTagsExpanded ? entries.length : filterChipLimit;

  entries.slice(0, displayLimit)
    .forEach(([tag, count]) => filterChips.appendChild(createFilterChip({
      label: tag,
      value: tag,
      count,
      isActive: activeTag === tag,
      onSelect: selectTag
    })));

  if (entries.length > filterChipLimit) {
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "side-item";
    moreBtn.style.textAlign = "center";
    moreBtn.style.color = "var(--color-primary)";
    moreBtn.textContent = isTagsExpanded ? `收起标签` : `更多标签 (${entries.length - filterChipLimit})+`;
    moreBtn.addEventListener("click", () => {
      isTagsExpanded = !isTagsExpanded;
      renderFilters();
    });
    filterChips.appendChild(moreBtn);
  }
}

function renderAuthorFilters() {
  if (!authorChips) return;
  const counts = {};
  models.forEach(m => {
    const name = (m.author && m.author.name) ? m.author.name : "未知作者";
    counts[name] = (counts[name] || 0) + 1;
  });
  authorChips.innerHTML = "";
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const displayLimit = isAuthorsExpanded ? entries.length : authorChipLimit;

  entries.slice(0, displayLimit)
    .forEach(([name, count]) => authorChips.appendChild(createFilterChip({
      label: name,
      value: name,
      count,
      isActive: activeAuthor === name,
      onSelect: selectAuthor
    })));

  if (entries.length > authorChipLimit) {
    const moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "side-item";
    moreBtn.style.textAlign = "center";
    moreBtn.style.color = "var(--color-primary)";
    moreBtn.textContent = isAuthorsExpanded ? `收起作者` : `更多作者 (${entries.length - authorChipLimit})+`;
    moreBtn.addEventListener("click", () => {
      isAuthorsExpanded = !isAuthorsExpanded;
      renderAuthorFilters();
    });
    authorChips.appendChild(moreBtn);
  }
}

function renderSourceMenu() {
  if (!sourceMenu) return;
  const counts = {};
  models.forEach(m => {
    const key = getSourceValue(m);
    counts[key] = (counts[key] || 0) + 1;
  });
  const total = models.length || 0;
  const labels = { makerworld: "MakerWorld", localmodel: "手动导入" };
  const order = ["makerworld", "localmodel"];
  sourceMenu.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  // Sidebar style
  allBtn.className = "side-item" + (activeSource === "" ? " active" : "");
  allBtn.innerHTML = `<span>全部</span> <span style="font-size:12px;opacity:0.6;">${total}</span>`;
  allBtn.addEventListener("click", () => selectSource(""));
  sourceMenu.appendChild(allBtn);

  order.forEach((key) => {
    if (!(key in counts)) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "side-item" + (activeSource === key ? " active" : "");
    btn.innerHTML = `<span>${labels[key]}</span> <span style="font-size:12px;opacity:0.6;">${counts[key] || 0}</span>`;
    btn.addEventListener("click", () => selectSource(key));
    sourceMenu.appendChild(btn);
  });
}

function updateLoadMoreIndicator(hasMore) {
  const grid = document.getElementById("grid");
  if (!grid) return;

  let indicator = document.getElementById("loadMoreIndicator");
  if (hasMore) {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "loadMoreIndicator";
      indicator.className = "load-more-indicator";
      indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载更多...';
      grid.parentElement.appendChild(indicator);
    }
    indicator.style.display = "block";
  } else {
    if (indicator) indicator.style.display = "none";
  }
}

function setupInfiniteScroll() {
  const content = document.querySelector('.content');
  if (!content) return;

  let isLoading = false;

  content.addEventListener('scroll', () => {
    if (isLoading) return;

    const scrollTop = content.scrollTop;
    const scrollHeight = content.scrollHeight;
    const clientHeight = content.clientHeight;

    // Load more when scrolled to 80% of content
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      isLoading = true;
      displayedCount += loadIncrement;
      render(true);
      setTimeout(() => { isLoading = false; }, 300);
    }
  });
}

function openLightbox(list, index) {
  if (!list || !list.length) return;
  currentLightboxList = list;
  currentLightboxIndex = index;
  const m = list[index];
  const imgPath = `/files/${m.dir}/images/${m.cover || 'design_01.png'}`;
  lightboxImg.src = imgPath;
  lightboxImg.alt = m.title || m.baseName || '';
  lightboxImg.classList.remove('zoomed');
  lightboxCaption.textContent = m.title || m.baseName || '';
  lightbox.style.display = 'flex';
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const closeBtn = lightbox.querySelector('.lightbox-close');
  if (closeBtn) closeBtn.focus();
}
function closeLightbox() {
  lightbox.style.display = 'none';
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImg.src = '';
  document.body.style.overflow = '';
}
function lightboxPrev() {
  if (currentLightboxIndex > 0) { currentLightboxIndex--; openLightbox(currentLightboxList, currentLightboxIndex); }
}
function lightboxNext() {
  if (currentLightboxIndex < currentLightboxList.length - 1) { currentLightboxIndex++; openLightbox(currentLightboxList, currentLightboxIndex); }
}

function getFilteredList() {
  const keyword = (kwInput?.value || "").trim().toLowerCase();
  let list = models;
  if (keyword) {
    list = list.filter(m => {
      const title = (m.title || m.baseName || "").toLowerCase();
      const tags = (m.tags || []).map(t => t.toLowerCase());
      return title.includes(keyword) || tags.some(t => t.includes(keyword));
    });
  }
  if (activeTag) {
    list = list.filter(m => (m.tags || []).includes(activeTag));
  }
  if (activeAuthor) {
    list = list.filter(m => (m.author?.name || "未知作者") === activeAuthor);
  }
  if (activeSource) {
    list = list.filter(m => getSourceValue(m) === activeSource);
  }
  if (onlyFavorites) {
    list = list.filter(m => favoriteSet.has(getModelKey(m)));
  }
  if (onlyPrinted) {
    list = list.filter(m => printedSet.has(getModelKey(m)));
  }

  return sortModelsDesc(list);
}

function render(append = false) {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  if (!grid) return;

  const list = getFilteredList();
  const total = list.length;
  if (totalCountEl) totalCountEl.textContent = String(total);

  // Infinite scroll: slice based on displayedCount
  const displayList = list.slice(0, displayedCount);

  if (!append) grid.innerHTML = "";

  if (!displayList.length) {
    const tips = [];
    const currentKeyword = (kwInput?.value || "").trim();
    if (activeTag) tips.push(`标签「${activeTag}」`);
    if (currentKeyword) tips.push(`关键词「${currentKeyword}」`);
    if (activeAuthor) tips.push(`作者「${activeAuthor}」`);
    if (activeSource) tips.push(`来源「${formatSourceLabel(activeSource)}」`);
    if (onlyFavorites) tips.push("收藏");
    if (onlyPrinted) tips.push("已打印");
    empty.textContent = tips.length ? `未找到匹配 ${tips.join("、")}` : "暂无模型";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const startIdx = append ? grid.children.length : 0;

  displayList.slice(startIdx).forEach((m, idx) => {
    const modelKey = getModelKey(m);
    const isFavorite = modelKey && favoriteSet.has(modelKey);
    const isPrinted = modelKey && printedSet.has(modelKey);

    const card = document.createElement("article");
    card.className = "card";
    card.setAttribute('role', 'listitem');
    card.setAttribute('data-model-key', modelKey);
    card.tabIndex = 0;
    
    // Add click event for multi-select
    card.addEventListener('click', (e) => {
      if (multiSelectMode) {
        e.stopPropagation();
        toggleModelSelection(modelKey);
      }
    });

    // Cover Area (Clean, No Overlay)
    const coverWrap = document.createElement("div");
    coverWrap.className = "card-cover";
    coverWrap.onclick = (e) => {
      if (!multiSelectMode) {
        window.open(getModelDetailUrl(m), `_blank`);
      } else {
        e.stopPropagation();
        toggleModelSelection(modelKey);
      }
    };

    const cover = document.createElement("img");
    const coverName = m.cover || "design_01.png";
    cover.src = `/files/${m.dir}/images/${coverName}`;
    cover.loading = 'lazy';
    cover.alt = m.title || m.baseName || "模型封面";
    cover.onerror = () => { cover.src = '/static/imgs/no-image.png'; };
    coverWrap.appendChild(cover);

    // Card Body - Simplified (only title in default state)
    const body = document.createElement("div");
    body.className = "card-body";

    // Title only in default state
    const title = document.createElement("h3");
    title.className = "title";
    title.title = m.title || m.baseName || "未知模型";
    title.textContent = m.title || m.baseName || "未知模型";
    title.onclick = (e) => {
      if (!multiSelectMode) {
        window.open(getModelDetailUrl(m), `_blank`);
      } else {
        e.stopPropagation();
        toggleModelSelection(modelKey);
      }
    };
    body.appendChild(title);
    
    // Archive failure notification
    if (m.archiveFailed) {
      const failureNotice = document.createElement("div");
      failureNotice.className = "archive-failure-notice";
      failureNotice.textContent = m.failureReason || "归档失败";
      body.appendChild(failureNotice);
    }

    // Hover Overlay - Detailed info on hover
    const hoverOverlay = document.createElement("div");
    hoverOverlay.className = "card-hover-overlay";

    const hoverContent = document.createElement("div");
    hoverContent.className = "hover-content";

    // Hover Title
    const hoverTitle = document.createElement("h4");
    hoverTitle.className = "hover-title";
    hoverTitle.textContent = m.title || m.baseName || "未知模型";
    hoverContent.appendChild(hoverTitle);

    // Hover Stats Grid (2 columns)
    const hoverStats = document.createElement("div");
    hoverStats.className = "hover-stats";

    // Likes
    if (m.stats?.likes > 0) {
      hoverStats.appendChild(createHoverStat("fas fa-thumbs-up", m.stats.likes, "点赞"));
    }
    // Favorites
    if (m.stats?.favorites > 0) {
      hoverStats.appendChild(createHoverStat("fas fa-star", m.stats.favorites, "收藏"));
    }
    // Prints
    if (m.stats?.prints > 0) {
      hoverStats.appendChild(createHoverStat("fas fa-print", m.stats.prints, "打印"));
    }
    // Downloads
    if (m.stats?.downloads > 0 || m.downloadCount > 0) {
      const dlCount = m.stats?.downloads || m.downloadCount;
      hoverStats.appendChild(createHoverStat("fas fa-download", dlCount, "下载"));
    }
    // Views
    if (m.stats?.views > 0) {
      hoverStats.appendChild(createHoverStat("fas fa-eye", m.stats.views, "浏览"));
    }

    if (hoverStats.children.length > 0) {
      hoverContent.appendChild(hoverStats);
    }

    // Hover Dates
    const hoverDates = document.createElement("div");
    hoverDates.className = "hover-dates";

    if (m.publishedAt) {
      const pubDate = document.createElement("div");
      pubDate.className = "hover-date-item";
      pubDate.innerHTML = `<i class="far fa-calendar-alt"></i> <span>发布: ${formatDate(m.publishedAt)}</span>`;
      hoverDates.appendChild(pubDate);
    }

    if (m.collectedAt) {
      const colDate = document.createElement("div");
      colDate.className = "hover-date-item";
      colDate.innerHTML = `<i class="fas fa-archive"></i> <span>采集: ${formatDate(m.collectedAt)}</span>`;
      hoverDates.appendChild(colDate);
    }

    if (hoverDates.children.length > 0) {
      hoverContent.appendChild(hoverDates);
    }

    hoverOverlay.appendChild(hoverContent);

    // Quick Action Buttons on Hover Overlay
    const quickActions = document.createElement("div");
    quickActions.className = "hover-quick-actions";
    quickActions.style.cssText = "position:absolute;top:12px;right:12px;display:flex;gap:8px;opacity:0;transform:translateY(-10px);transition:all 0.3s ease;";

    // Favorite Quick Button
    const favQuickBtn = document.createElement("button");
    favQuickBtn.className = "hover-action-btn" + (isFavorite ? " active" : "");
    favQuickBtn.style.cssText = "width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.95);color:" + (isFavorite ? "#ff4757" : "#666") + ";display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:all 0.2s ease;";
    favQuickBtn.innerHTML = isFavorite ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    favQuickBtn.onclick = (e) => { 
      e.stopPropagation(); 
      toggleFavorite(m);
      // Update button appearance
      const newIsFav = favoriteSet.has(getModelKey(m));
      favQuickBtn.className = "hover-action-btn" + (newIsFav ? " active" : "");
      favQuickBtn.style.color = newIsFav ? "#ff4757" : "#666";
      favQuickBtn.innerHTML = newIsFav ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
    };
    quickActions.appendChild(favQuickBtn);

    // Printed Quick Button
    const printedQuickBtn = document.createElement("button");
    printedQuickBtn.className = "hover-action-btn" + (isPrinted ? " active" : "");
    printedQuickBtn.style.cssText = "width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.95);color:" + (isPrinted ? "#2ed573" : "#666") + ";display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:all 0.2s ease;";
    printedQuickBtn.innerHTML = isPrinted ? '<i class="fas fa-check-circle"></i>' : '<i class="far fa-check-circle"></i>';
    printedQuickBtn.onclick = (e) => { 
      e.stopPropagation(); 
      togglePrinted(m);
      // Update button appearance
      const newIsPrinted = printedSet.has(getModelKey(m));
      printedQuickBtn.className = "hover-action-btn" + (newIsPrinted ? " active" : "");
      printedQuickBtn.style.color = newIsPrinted ? "#2ed573" : "#666";
      printedQuickBtn.innerHTML = newIsPrinted ? '<i class="fas fa-check-circle"></i>' : '<i class="far fa-check-circle"></i>';
    };
    quickActions.appendChild(printedQuickBtn);

    // Delete Quick Button
    const deleteQuickBtn = document.createElement("button");
    deleteQuickBtn.className = "hover-action-btn danger";
    deleteQuickBtn.style.cssText = "width:36px;height:36px;border-radius:50%;border:none;background:rgba(255,255,255,0.95);color:#ff4757;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.15);transition:all 0.2s ease;";
    deleteQuickBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
    deleteQuickBtn.title = "删除模型";
    deleteQuickBtn.onclick = (e) => { 
      e.stopPropagation(); 
      deleteModel(m);
    };
    quickActions.appendChild(deleteQuickBtn);

    coverWrap.appendChild(quickActions);

    // Show quick actions on card hover
    card.addEventListener('mouseenter', () => {
      quickActions.style.opacity = '1';
      quickActions.style.transform = 'translateY(0)';
    });
    card.addEventListener('mouseleave', () => {
      quickActions.style.opacity = '0';
      quickActions.style.transform = 'translateY(-10px)';
    });

    // Append elements to card
    card.appendChild(coverWrap);
    card.appendChild(body);
    card.appendChild(hoverOverlay);
    grid.appendChild(card);
  });

  // Show load more indicator if there are more items
  updateLoadMoreIndicator(displayedCount < total);
}

// Helper to create simple stat icon
function createStatIcon(iconClass, count, title) {
  const span = document.createElement("span");
  span.className = "stat-chip";
  span.title = title || "";
  span.innerHTML = `<i class="${iconClass}"></i> ${count}`;
  return span;
}

// Helper to create hover stat item
function createHoverStat(iconClass, count, label) {
  const div = document.createElement("div");
  div.className = "hover-stat-item";
  div.title = label;
  div.innerHTML = `<i class="${iconClass}"></i> <span class="stat-value">${count}</span>`;
  return div;
}

function getModelDetailUrl(m) {
  var safeDir = encodeURIComponent(m.dir);
  return `/v2/files/${safeDir}`;
}

// Multi-select mode functions
function toggleMultiSelectMode() {
  multiSelectMode = !multiSelectMode;
  
  if (multiSelectMode) {
    document.body.classList.add('multi-select-mode');
    document.getElementById('multiSelectMode').style.display = 'flex';
    document.getElementById('multiSelectBtn').innerHTML = '<i class="fas fa-times"></i> 取消';
    selectedModels.clear();
    updateSelectedCount();
  } else {
    document.body.classList.remove('multi-select-mode');
    document.getElementById('multiSelectMode').style.display = 'none';
    document.getElementById('multiSelectBtn').innerHTML = '<i class="fas fa-check-square"></i> 多选';
    selectedModels.clear();
    updateSelectedCount();
    // Remove selected class from all cards
    document.querySelectorAll('.card.selected').forEach(card => {
      card.classList.remove('selected');
    });
  }
}

function updateSelectedCount() {
  document.getElementById('selectedCount').textContent = selectedModels.size;
}

function toggleModelSelection(modelKey) {
  if (!multiSelectMode) return;
  
  if (selectedModels.has(modelKey)) {
    selectedModels.delete(modelKey);
  } else {
    selectedModels.add(modelKey);
  }
  
  updateSelectedCount();
  
  // Update card UI
  const card = document.querySelector(`.card[data-model-key="${modelKey}"]`);
  if (card) {
    card.classList.toggle('selected', selectedModels.has(modelKey));
  }
}

async function batchDeleteSelected() {
  if (selectedModels.size === 0) {
    showAlertModal('提示', '请先选择要删除的模型');
    return;
  }
  
  showConfirmModal(
    '确认删除',
    `确定要删除选中的 ${selectedModels.size} 个模型吗？删除后无法恢复。`,
    async () => {
      let deletedCount = 0;
      let failedCount = 0;
      
      for (const modelKey of selectedModels) {
        try {
          const res = await fetch(`/api/models/${encodeURIComponent(modelKey)}/delete`, { method: "POST" });
          if (!res.ok) {
            throw new Error('删除失败');
          }
          deletedCount++;
          
          // Update frontend state
          models = models.filter(item => getModelKey(item) !== modelKey);
          favoriteSet.delete(modelKey);
          printedSet.delete(modelKey);
        } catch (e) {
          console.error(`删除模型 ${modelKey} 失败:`, e);
          failedCount++;
        }
      }
      
      // Save flags asynchronously
      saveFlags().catch(() => {});
      
      // Reset multi-select mode
      toggleMultiSelectMode();
      
      // Update UI
      displayedCount = loadIncrement;
      renderFilters();
      renderAuthorFilters();
      renderSourceMenu();
      render();
    },
    null
  );
}

function escapeHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

if (kwInput) {
  kwInput.addEventListener("input", () => { displayedCount = loadIncrement; render(); });
}
if (clearBtn && kwInput) {
  clearBtn.addEventListener("click", () => {
    kwInput.value = "";
    displayedCount = loadIncrement;
    render();
  });
}

// Reset all filters button
if (resetSearchBtn) {
  resetSearchBtn.addEventListener("click", () => {
    // Clear search input
    if (kwInput) kwInput.value = "";

    // Clear filters
    activeTag = "";
    activeAuthor = "";
    activeSource = "";
    onlyFavorites = false;
    onlyPrinted = false;

    // Collapse expanded lists
    isTagsExpanded = false;
    isAuthorsExpanded = false;

    // Reset display count
    displayedCount = loadIncrement;

    // Update UI
    syncFlagFilterButtons();
    renderFilters();
    renderAuthorFilters();
    renderSourceMenu();
    render();
  });
}

// Removed legacy reset button listener that used non-existent currentPage


// Removed pageSize input - using infinite scroll now

if (sortOrderSelect) {
  sortOrderSelect.addEventListener("change", () => {
    displayedCount = loadIncrement;
    render();
  });
}

if (favOnlyBtn) {
  favOnlyBtn.addEventListener("click", () => {
    onlyFavorites = !onlyFavorites;
    displayedCount = loadIncrement;
    syncFlagFilterButtons();
    render();
  });
}
if (printedOnlyBtn) {
  printedOnlyBtn.addEventListener("click", () => {
    onlyPrinted = !onlyPrinted;
    displayedCount = loadIncrement;
    syncFlagFilterButtons();
    render();
  });
}

// Setup infinite scroll
function setupInfiniteScroll() {
  const content = document.querySelector('.content');
  if (!content) return;

  let isLoading = false;

  content.addEventListener('scroll', () => {
    if (isLoading) return;

    const scrollTop = content.scrollTop;
    const scrollHeight = content.scrollHeight;
    const clientHeight = content.clientHeight;

    // Load more when scrolled to 80% of content
    if (scrollTop + clientHeight >= scrollHeight * 0.8) {
      const list = getFilteredList();
      const total = list.length;

      if (displayedCount < total) {
        isLoading = true;
        displayedCount += loadIncrement;
        render(true);
        setTimeout(() => { isLoading = false; }, 300);
      }
    }
  });
}

function updateLoadMoreIndicator(hasMore) {
  const grid = document.getElementById("grid");
  if (!grid) return;

  let indicator = document.getElementById("loadMoreIndicator");
  if (hasMore) {
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "loadMoreIndicator";
      indicator.className = "load-more-indicator";
      indicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 加载更多...';
      grid.parentElement.appendChild(indicator);
    }
    indicator.style.display = "block";
  } else {
    if (indicator) indicator.style.display = "none";
  }
}

if (filterModal) {
  const closeBtn = filterModal.querySelector(".filter-modal__close");
  if (closeBtn) closeBtn.addEventListener("click", closeFilterModal);
  filterModal.addEventListener("click", (e) => { if (e.target === filterModal) closeFilterModal(); });
}

// lightbox controls
if (lightbox) {
  const closeBtn = lightbox.querySelector('.lightbox-close');
  const prevBtn = lightbox.querySelector('.lightbox-prev');
  const nextBtn = lightbox.querySelector('.lightbox-next');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', lightboxPrev);
  if (nextBtn) nextBtn.addEventListener('click', lightboxNext);

  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

  let touchStartX = 0; let touchStartY = 0; let touchStartTime = 0; let lastTap = 0;
  lightboxImg.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches.length === 1) {
      touchStartX = e.touches[0].clientX; touchStartY = e.touches[0].clientY; touchStartTime = Date.now();
    }
  }, { passive: true });
  lightboxImg.addEventListener('touchend', (e) => {
    const dt = Date.now() - touchStartTime;
    const now = Date.now();
    if (now - lastTap < 300) { lightboxImg.classList.toggle('zoomed'); lastTap = 0; return; }
    lastTap = now;
    if (dt < 500 && e.changedTouches && e.changedTouches.length === 1) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) lightboxNext(); else lightboxPrev();
      }
    }
  }, { passive: true });

  lightboxImg.addEventListener('dblclick', (e) => { e.preventDefault(); lightboxImg.classList.toggle('zoomed'); });

  window.addEventListener('keydown', (e) => {
    const lightboxOpen = lightbox.style.display !== 'none';
    const modalOpen = filterModal && filterModal.style.display !== 'none';
    if (e.key === 'Escape') {
      if (modalOpen) { closeFilterModal(); return; }
      if (lightboxOpen) closeLightbox();
    }
    if (lightboxOpen) {
      if (e.key === 'ArrowLeft') lightboxPrev();
      if (e.key === 'ArrowRight') lightboxNext();
    }
  });
}

// Sidebar toggle functionality
const sidebar = document.querySelector('.sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarToggleMobile = document.getElementById('sidebarToggleMobile');

// Load saved state from localStorage (desktop only)
const savedState = localStorage.getItem('sidebarState');
if (savedState === 'collapsed') {
    sidebar.classList.add('collapsed');
}

if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        // Save state to localStorage
        const isCollapsed = sidebar.classList.contains('collapsed');
        localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
    });
}

// Mobile sidebar toggle - default collapsed, tap to expand
let mobileSidebarAutoCollapseTimer = null;

function closeMobileSidebar() {
  if (window.innerWidth <= 992) {
    sidebar.classList.remove('expanded');
  }
}

if (sidebarToggleMobile) {
  sidebarToggleMobile.addEventListener('click', () => {
    sidebar.classList.toggle('expanded');
    
    // Clear any existing auto-collapse timer
    if (mobileSidebarAutoCollapseTimer) {
      clearTimeout(mobileSidebarAutoCollapseTimer);
    }
    
    // Auto-collapse after 10 seconds if expanded
    if (sidebar.classList.contains('expanded')) {
      mobileSidebarAutoCollapseTimer = setTimeout(closeMobileSidebar, 10000);
    }
  });
}

// Close mobile sidebar when clicking outside
document.addEventListener('click', (e) => {
  if (window.innerWidth <= 992 && sidebar.classList.contains('expanded')) {
    if (!sidebar.contains(e.target)) {
      closeMobileSidebar();
    }
  }
});

// Close mobile sidebar when selecting an item
document.querySelectorAll('.sidebar .side-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 992) {
      // Delay to allow the selection to register
      setTimeout(closeMobileSidebar, 300);
    }
  });
});

// Mobile sidebar section collapse functionality
function initMobileSidebarCollapse() {
  const isMobile = window.innerWidth <= 992;
  const sidebarContent = document.querySelector('.sidebar-content');
  if (!sidebarContent) return;
  
  const sideTitles = sidebarContent.querySelectorAll('.side-title');
  
  sideTitles.forEach(title => {
    const menu = title.nextElementSibling;
    if (menu && menu.classList.contains('side-menu')) {
      // Load saved collapse state
      const sectionKey = 'sidebarSection_' + title.textContent.trim();
      const isCollapsed = localStorage.getItem(sectionKey) === 'collapsed';
      
      if (isMobile && isCollapsed) {
        title.classList.add('collapsed');
        menu.classList.add('collapsed');
      }
      
      // Remove old listeners by cloning
      const newTitle = title.cloneNode(true);
      title.parentNode.replaceChild(newTitle, title);
      
      newTitle.addEventListener('click', (e) => {
        if (window.innerWidth <= 992) {
          e.preventDefault();
          newTitle.classList.toggle('collapsed');
          menu.classList.toggle('collapsed');
          
          // Save state
          const collapsed = newTitle.classList.contains('collapsed');
          localStorage.setItem(sectionKey, collapsed ? 'collapsed' : 'expanded');
        }
      });
    }
  });
}

// Re-initialize on resize
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    initMobileSidebarCollapse();
    // Close mobile sidebar when switching to desktop
    if (window.innerWidth > 992) {
      sidebar.classList.remove('expanded');
    }
  }, 250);
});

// Initialize on load
setTimeout(initMobileSidebarCollapse, 100);

load();
setupInfiniteScroll();
