/* =========================================================
   Seating Studio — 班级座位编排
   Vanilla JS, no external dependencies.
   ========================================================= */

(() => {
  'use strict';

  const STORAGE_KEY = 'seating-studio.v1';
  const BACKUP_FORMAT = 'seating-studio.backup';
  const BACKUP_VERSION = 2;
  const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  const ROWS = 6;
  const EXAM_ROWS = 6;
  const EXAM_COLS = 9;
  const EXAM_MIDDLE_COL = 5;
  const MAX_FILE_BYTES = 15 * 1024 * 1024;
  const HISTORY_LIMIT = 60;
  const DEFAULT_CLASS_NAME = '我的班级';
  const SAMPLE_CLASS_NAME = '高一（4）班';
  const SAMPLE_ROSTER = `杨智清,1
王冯超,2
涂沁慈,3
李昕怡,4
蒋沁轩,5
钟明哲,6
余少为,7
曹博宇,8
傅梓莹,9
李昕芮,10
张邵迪,11
郭靖怡,12
江岱宸,13
吴天晴,14
焦申博,15
刘昕宇,16
王一菲,17
胡彧忻,18
胡林轩,19
毛怡漩,20
朱莜羽,21
余陈子骞,22
卞韩棋,23
李雅楠,24
程俊洲,25
康仕捷,26
乐艺菁,27
刘鑫铄,28
戴钰,29
樊志豪,30
朱时宇,31
龙文钰,32
胡可欣,33
范力文,34
潘则宇,35
彭文睿,36
彭南景,37
吴睿杰,38
彭文宇,39
王子卿,40
雷荟馨,41
程俊洋,42
章思杰,43
林政宇,44
计叔恺,45
涂峻之,46
刘可馨,47
汪思思,48
胡许子萱,49
叶茹颜,50
汪梓燕,51
章喆宇,52
樊威宏,53
程文浩,54
彭雨嘉,55`.trim().split('\n').map((line) => {
    const [name, number] = line.split(',');
    return { name: name.trim(), number: number.trim() };
  });

  const BLOCK_META = {
    window: { key: 'window', label: '靠窗区', short: '靠窗', cols: 2 },
    middle: { key: 'middle', label: '中间区', short: '中间', cols: 5 },
    door: { key: 'door', label: '靠门区', short: '靠门', cols: 2 }
  };

  const SEAT_DEFS = [
    { id: 'front-1', block: 'front', row: 0, col: 1, label: '靠窗加座', short: '靠窗加座' }
  ];

  Object.values(BLOCK_META).forEach((block) => {
    for (let row = 1; row <= ROWS; row += 1) {
      for (let col = 1; col <= block.cols; col += 1) {
        SEAT_DEFS.push({
          id: `${block.key}-${row}-${col}`,
          block: block.key,
          row,
          col,
          label: `${block.label} 第${row}排第${col}座`,
          short: `${block.short} ${row}排${col}座`
        });
      }
    }
  });

  const SEAT_MAP = new Map(SEAT_DEFS.map((seat) => [seat.id, seat]));
  const TOTAL_SEATS = SEAT_DEFS.length;

  const EXAM_SLOT_DEFS = [];
  for (let row = 1; row <= EXAM_ROWS; row += 1) {
    for (let col = 1; col <= EXAM_COLS; col += 1) {
      const isMiddle = col === EXAM_MIDDLE_COL;
      EXAM_SLOT_DEFS.push({
        id: `exam-${row}-${col}`,
        row,
        col,
        isMiddle,
        label: `第${row}排第${col}位${isMiddle ? '（中间位）' : ''}`,
        short: `第${row}排${col}位${isMiddle ? ' · 中间位' : ''}`
      });
    }
  }
  const EXAM_SLOT_MAP = new Map(EXAM_SLOT_DEFS.map((slot) => [slot.id, slot]));
  const TOTAL_EXAM_SLOTS = EXAM_SLOT_DEFS.length;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const els = {
    classNameInput: $('#classNameInput'),
    rosterCount: $('#rosterCount'),
    importBtn: $('#importBtn'),
    clearRosterBtn: $('#clearRosterBtn'),
    searchInput: $('#searchInput'),
    searchClearBtn: $('#searchClearBtn'),
    searchKbd: $('#searchKbd'),
    rosterScroll: $('#rosterScroll'),
    studentList: $('#studentList'),
    emptyRoster: $('#emptyRoster'),
    loadSampleBtn: $('#loadSampleBtn'),
    noResults: $('#noResults'),
    rosterDropHint: $('#rosterDropHint'),
    saveState: $('#saveState'),
    saveText: $('#saveText'),
    undoBtn: $('#undoBtn'),
    redoBtn: $('#redoBtn'),
    projectBtn: $('#projectBtn'),
    printBtn: $('#printBtn'),
    exportBtn: $('#exportBtn'),
    modeBadge: $('#modeBadge'),
    workspaceTitle: $('#workspaceTitle'),
    layoutSummary: $('#layoutSummary'),
    filterAllLabel: $('#filterAllLabel'),
    filterUnassignedLabel: $('#filterUnassignedLabel'),
    filterAssignedLabel: $('#filterAssignedLabel'),
    viewBtns: $$('.view-btn'),
    chartCard: $('#chartCard'),
    examCard: $('#examCard'),
    examBoard: $('#examBoard'),
    examPrintClassName: $('#examPrintClassName'),
    examPrintDate: $('#examPrintDate'),
    examPrintMode: $('#examPrintMode'),
    examHint: $('#examHint'),
    workspaceFootnoteText: $('#workspaceFootnoteText'),
    assignedCount: $('#assignedCount'),
    assignedLabel: $('#assignedLabel'),
    emptyCount: $('#emptyCount'),
    emptyLabel: $('#emptyLabel'),
    exportLabel: $('#exportLabel'),
    seatTotalText: $('#seatTotalText'),
    clearSeatsBtn: $('#clearSeatsBtn'),
    seatArea: $('#seatArea'),
    frontSeatSlot: $('#frontSeatSlot'),
    blockWindow: $('#blockWindow'),
    blockMiddle: $('#blockMiddle'),
    blockDoor: $('#blockDoor'),
    chartScroll: $('#chartScroll'),
    chartHint: $('#chartHint'),
    printClassName: $('#printClassName'),
    printDate: $('#printDate'),
    printMode: $('#printMode'),
    seatMenu: $('#seatMenu'),
    seatMenuTag: $('#seatMenuTag'),
    seatMenuBody: $('#seatMenuBody'),
    seatMenuClose: $('#seatMenuClose'),
    seatMenuRemove: $('#seatMenuRemove'),
    backupBtn: $('#backupBtn'),
    helpBtn: $('#helpBtn'),
    backupDialog: $('#backupDialog'),
    backupCloseBtn: $('#backupCloseBtn'),
    backupCancelBtn: $('#backupCancelBtn'),
    backupScopeSeats: $('#backupScopeSeats'),
    backupScopeExam: $('#backupScopeExam'),
    backupSummary: $('#backupSummary'),
    backupExportBtn: $('#backupExportBtn'),
    backupExportError: $('#backupExportError'),
    backupImportBtn: $('#backupImportBtn'),
    backupImportError: $('#backupImportError'),
    backupFileInput: $('#backupFileInput'),
    helpDialog: $('#helpDialog'),
    helpCloseBtn: $('#helpCloseBtn'),
    helpDoneBtn: $('#helpDoneBtn'),
    importDialog: $('#importDialog'),
    importCloseBtn: $('#importCloseBtn'),
    importCancelBtn: $('#importCancelBtn'),
    importConfirmBtn: $('#importConfirmBtn'),
    importConfirmText: $('#importConfirmText'),
    dropZone: $('#dropZone'),
    dropTitle: $('#dropTitle'),
    dropSub: $('#dropSub'),
    fileInput: $('#fileInput'),
    importText: $('#importText'),
    importMeta: $('#importMeta'),
    importPreview: $('#importPreview'),
    overwriteCheck: $('#overwriteCheck'),
    confirmDialog: $('#confirmDialog'),
    confirmTitle: $('#confirmTitle'),
    confirmText: $('#confirmText'),
    confirmOkBtn: $('#confirmOkBtn'),
    confirmCancelBtn: $('#confirmCancelBtn'),
    projectionUi: $('#projectionUi'),
    projectionClass: $('#projectionClass'),
    projectionMeta: $('#projectionMeta'),
    exitProjectionBtn: $('#exitProjectionBtn'),
    toastRegion: $('#toastRegion')
  };

  const state = {
    className: DEFAULT_CLASS_NAME,
    students: [],
    seats: {},
    examRows: {},
    mode: 'anonymous'
  };

  let activeView = 'seats';
  let selectedStudentId = null;
  let filter = 'all';
  let query = '';
  let history = [];
  let redoStack = [];
  let dragPayload = null;
  let lastDragAt = 0;
  let seatMenuTargetId = null;
  let seatMenuType = 'seat';
  let confirmResolve = null;
  let saveTimer = null;
  let idCounter = 0;
  let importResult = null;
  let importSourceName = '';
  let pendingScrollSeatId = null;
  let pendingScrollExamId = null;
  let isProjecting = false;

  const DROP_DEFAULT_TITLE = '点击选择，或把文件拖到这里';
  const DROP_DEFAULT_SUB = '支持 Excel (.xlsx)、CSV、TXT，大小不超过 15 MB';

  const AVATAR_PALETTE = [
    ['#e7efe8', '#2f5a4a'],
    ['#f6e9dd', '#965a34'],
    ['#eae8f3', '#5d5686'],
    ['#e3edf2', '#356477'],
    ['#f4ecda', '#80612c'],
    ['#f2e6e6', '#8a4f50'],
    ['#e9efe1', '#516b36'],
    ['#f0e9f0', '#755477']
  ];

  const HTML_ESCAPES = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
  }

  function normalizeForSearch(value) {
    return String(value == null ? '' : value).trim().toLocaleLowerCase();
  }

  function makeStudentId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `s_${window.crypto.randomUUID()}`;
    }
    idCounter += 1;
    return `s_${Date.now().toString(36)}_${idCounter.toString(36)}`;
  }

  function getStudent(studentId) {
    return state.students.find((student) => student.id === studentId) || null;
  }

  function getSeatOfStudent(studentId) {
    for (const [seatId, seatedStudentId] of Object.entries(state.seats)) {
      if (seatedStudentId === studentId) return seatId;
    }
    return null;
  }

  function getSeatDef(seatId) {
    return SEAT_MAP.get(seatId) || null;
  }

  function seatLabel(seatId) {
    const def = getSeatDef(seatId);
    return def ? def.label : '座位';
  }

  function seatShortLabel(seatId) {
    const def = getSeatDef(seatId);
    return def ? def.short : '座位';
  }

  function getExamSlotOfStudent(studentId) {
    for (const [slotId, selectedStudentId] of Object.entries(state.examRows)) {
      if (selectedStudentId === studentId) return slotId;
    }
    return null;
  }

  function getExamSlotDef(slotId) {
    return EXAM_SLOT_MAP.get(slotId) || null;
  }

  function examSlotLabel(slotId) {
    const def = getExamSlotDef(slotId);
    return def ? def.label : '选排位';
  }

  function examSlotShortLabel(slotId) {
    const def = getExamSlotDef(slotId);
    return def ? def.short : '选排位';
  }

  function getCurrentAssignment(studentId) {
    return activeView === 'exam'
      ? getExamSlotOfStudent(studentId)
      : getSeatOfStudent(studentId);
  }

  function currentAssignmentLabel(studentId) {
    return activeView === 'exam'
      ? (getExamSlotOfStudent(studentId) ? examSlotShortLabel(getExamSlotOfStudent(studentId)) : '')
      : (getSeatOfStudent(studentId) ? seatShortLabel(getSeatOfStudent(studentId)) : '');
  }

  function currentAssignedCount() {
    return activeView === 'exam' ? Object.keys(state.examRows).length : Object.keys(state.seats).length;
  }

  function currentTotal() {
    return activeView === 'exam' ? TOTAL_EXAM_SLOTS : TOTAL_SEATS;
  }

  function studentKey(student) {
    const number = String(student.number || '').trim().toLocaleLowerCase();
    if (number) return `number:${number}`;
    return `name:${String(student.name || '').trim().toLocaleLowerCase()}`;
  }

  function matchesQuery(student, rawQuery) {
    const q = normalizeForSearch(rawQuery);
    if (!q) return true;
    return normalizeForSearch(student.name).includes(q) || normalizeForSearch(student.number).includes(q);
  }

  function fileSafeDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function displayDate(date = new Date()) {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  /* ---------------- Persistence ---------------- */

  function sanitizeState() {
    const seenStudentIds = new Set();
    state.students = state.students
      .filter((student) => student && typeof student === 'object')
      .map((student) => {
        const name = String(student.name || '').trim();
        const number = String(student.number || '').trim();
        let id = String(student.id || '');
        if (!id || seenStudentIds.has(id)) id = makeStudentId();
        seenStudentIds.add(id);
        return { id, name, number };
      })
      .filter((student) => student.name);

    const validStudentIds = new Set(state.students.map((student) => student.id));
    const usedStudents = new Set();
    const cleanSeats = {};

    Object.entries(state.seats || {}).forEach(([seatId, studentId]) => {
      if (!SEAT_MAP.has(seatId)) return;
      if (!validStudentIds.has(studentId)) return;
      if (usedStudents.has(studentId)) return;
      usedStudents.add(studentId);
      cleanSeats[seatId] = studentId;
    });

    const usedExamStudents = new Set();
    const cleanExamRows = {};
    Object.entries(state.examRows || {}).forEach(([slotId, studentId]) => {
      if (!EXAM_SLOT_MAP.has(slotId)) return;
      if (!validStudentIds.has(studentId)) return;
      if (usedExamStudents.has(studentId)) return;
      usedExamStudents.add(studentId);
      cleanExamRows[slotId] = studentId;
    });

    state.seats = cleanSeats;
    state.examRows = cleanExamRows;
    state.mode = state.mode === 'named' ? 'named' : 'anonymous';
    if (!state.className) state.className = DEFAULT_CLASS_NAME;

    if (selectedStudentId && !validStudentIds.has(selectedStudentId)) {
      selectedStudentId = null;
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== 'object') return;

      state.className = String(saved.className || '').trim() || DEFAULT_CLASS_NAME;
      state.students = Array.isArray(saved.students) ? saved.students : [];
      state.seats = saved.seats && typeof saved.seats === 'object' ? saved.seats : {};
      state.examRows = saved.examRows && typeof saved.examRows === 'object' ? saved.examRows : {};
      state.mode = saved.mode === 'named' ? 'named' : 'anonymous';
      sanitizeState();
    } catch (error) {
      console.warn('读取本地数据失败：', error);
      state.students = [];
      state.seats = {};
      state.examRows = {};
    }
  }

  function setSaveUI(mode) {
    els.saveState.classList.toggle('is-saving', mode === 'saving');
    els.saveState.classList.toggle('is-error', mode === 'error');
    if (mode === 'saving') els.saveText.textContent = '保存中…';
    else if (mode === 'error') els.saveText.textContent = '无法保存到本机';
    else if (mode === 'saved') els.saveText.textContent = '已自动保存';
    else els.saveText.textContent = '自动保存在本机';
  }

  function saveStateNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        className: state.className,
        students: state.students,
        seats: state.seats,
        examRows: state.examRows,
        mode: state.mode
      }));
      setSaveUI('saved');
    } catch (error) {
      console.warn('保存失败：', error);
      setSaveUI('error');
    }
  }

  function scheduleSave() {
    setSaveUI('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveStateNow, 220);
  }

  /* ---------------- History ---------------- */

  function snapshot() {
    return JSON.stringify({
      className: state.className,
      students: state.students,
      seats: state.seats,
      examRows: state.examRows,
      mode: state.mode
    });
  }

  function pushHistory() {
    history.push(snapshot());
    if (history.length > HISTORY_LIMIT) history.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function updateHistoryButtons() {
    els.undoBtn.disabled = history.length === 0;
    els.redoBtn.disabled = redoStack.length === 0;
  }

  function restoreSnapshot(raw) {
    try {
      const parsed = JSON.parse(raw);
      state.className = String(parsed.className || '').trim() || DEFAULT_CLASS_NAME;
      state.students = Array.isArray(parsed.students) ? parsed.students : [];
      state.seats = parsed.seats && typeof parsed.seats === 'object' ? parsed.seats : {};
      state.examRows = parsed.examRows && typeof parsed.examRows === 'object' ? parsed.examRows : {};
      state.mode = parsed.mode === 'named' ? 'named' : 'anonymous';
      els.classNameInput.value = state.className;
      selectedStudentId = null;
      closeSeatMenu();
      sanitizeState();
      scheduleSave();
      renderAll();
      updateHistoryButtons();
    } catch (error) {
      console.warn('恢复历史记录失败：', error);
    }
  }

  function undo() {
    if (!history.length) return;
    redoStack.push(snapshot());
    const previous = history.pop();
    restoreSnapshot(previous);
    showToast('已撤销上一步', { type: 'info' });
  }

  function redo() {
    if (!redoStack.length) return;
    history.push(snapshot());
    const next = redoStack.pop();
    restoreSnapshot(next);
    showToast('已重做', { type: 'info' });
  }

  /* ---------------- Rendering ---------------- */

  function avatarStyle(key) {
    let hash = 0;
    const text = String(key || '');
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    const pair = AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
    return `--avatar-bg:${pair[0]};--avatar-ink:${pair[1]}`;
  }

  function highlightText(value, rawQuery) {
    const text = String(value == null ? '' : value);
    const q = String(rawQuery || '').trim();
    if (!q) return esc(text);
    const lower = text.toLocaleLowerCase();
    const needle = q.toLocaleLowerCase();
    let position = 0;
    let result = '';
    let index = lower.indexOf(needle, position);

    while (index !== -1) {
      result += esc(text.slice(position, index));
      result += `<mark>${esc(text.slice(index, index + needle.length))}</mark>`;
      position = index + needle.length;
      index = lower.indexOf(needle, position);
    }
    result += esc(text.slice(position));
    return result;
  }

  function seatButtonHTML(seatId) {
    const def = getSeatDef(seatId);
    if (!def) return '';

    const studentId = state.seats[seatId] || null;
    const student = studentId ? getStudent(studentId) : null;
    const occupied = Boolean(student);
    const selectedSeatId = selectedStudentId ? getSeatOfStudent(selectedStudentId) : null;
    const searchHit = query && state.mode === 'named' && student && matchesQuery(student, query);
    const classes = ['seat'];

    if (occupied) classes.push('occupied');
    else classes.push('empty');
    if (def.block === 'front') classes.push('is-front');
    if (occupied && selectedSeatId === seatId) classes.push('is-focus');
    if (searchHit) classes.push('search-hit');

    let label = def.label;
    if (occupied) {
      label += state.mode === 'named' ? `，${student.name}` : '，已安排';
    } else {
      label += '，空位';
    }

    let content = '';
    if (occupied) {
      if (state.mode === 'named') {
        const nameLength = Array.from(student.name).length;
        content = `<span class="seat-named">
          <span class="seat-name${nameLength > 4 ? ' is-long' : ''}">${esc(student.name)}</span>
          ${student.number ? `<span class="seat-id">${esc(student.number)}</span>` : ''}
        </span>`;
      } else {
        content = `<span class="seat-check" aria-hidden="true"><svg class="icon"><use href="#i-check"></use></svg></span>`;
      }
    }

    return `<button type="button" class="${classes.join(' ')}" data-seat-id="${esc(seatId)}"${occupied ? ` data-student-id="${esc(student.id)}" draggable="true"` : ''} aria-label="${esc(label)}" title="${esc(label)}">${content}</button>`;
  }

  function renderSeats() {
    els.frontSeatSlot.innerHTML = seatButtonHTML('front-1');
    els.blockWindow.innerHTML = SEAT_DEFS
      .filter((seat) => seat.block === 'window')
      .map((seat) => seatButtonHTML(seat.id))
      .join('');
    els.blockMiddle.innerHTML = SEAT_DEFS
      .filter((seat) => seat.block === 'middle')
      .map((seat) => seatButtonHTML(seat.id))
      .join('');
    els.blockDoor.innerHTML = SEAT_DEFS
      .filter((seat) => seat.block === 'door')
      .map((seat) => seatButtonHTML(seat.id))
      .join('');

    if (pendingScrollSeatId) {
      const seatId = pendingScrollSeatId;
      pendingScrollSeatId = null;
      requestAnimationFrame(() => scrollSeatIntoView(seatId));
    }
  }

  function examSlotHTML(slotId) {
    const def = getExamSlotDef(slotId);
    if (!def) return '';

    const studentId = state.examRows[slotId] || null;
    const student = studentId ? getStudent(studentId) : null;
    const occupied = Boolean(student);
    const selectedSlotId = selectedStudentId ? getExamSlotOfStudent(selectedStudentId) : null;
    const searchHit = query && state.mode === 'named' && student && matchesQuery(student, query);
    const classes = ['exam-slot'];

    if (occupied) classes.push('occupied');
    else classes.push('empty');
    if (def.isMiddle) classes.push('is-middle');
    if (occupied && selectedSlotId === slotId) classes.push('is-focus');
    if (searchHit) classes.push('search-hit');

    let label = def.label;
    if (occupied) {
      label += state.mode === 'named' ? `，${student.name}` : '，已选排';
    } else {
      label += '，空位';
    }

    const marker = def.isMiddle
      ? '<span class="exam-middle-tag">中间 5</span>'
      : `<span class="exam-slot-index">${def.col}</span>`;

    let content = marker;
    if (occupied) {
      if (state.mode === 'named') {
        const nameLength = Array.from(student.name).length;
        content += `<span class="exam-named">
          <span class="exam-name${nameLength > 4 ? ' is-long' : ''}">${esc(student.name)}</span>
          ${student.number ? `<span class="exam-id">${esc(student.number)}</span>` : ''}
        </span>`;
      } else {
        content += '<span class="exam-check" aria-hidden="true"><svg class="icon"><use href="#i-check"></use></svg></span>';
      }
    }

    return `<button type="button" class="${classes.join(' ')}" data-exam-slot="${esc(slotId)}"${occupied ? ` data-student-id="${esc(student.id)}" draggable="true"` : ''} aria-label="${esc(label)}" title="${esc(label)}">${content}</button>`;
  }

  function renderExamBoard() {
    els.examBoard.innerHTML = Array.from({ length: EXAM_ROWS }, (_, index) => {
      const row = index + 1;
      const slots = EXAM_SLOT_DEFS.filter((slot) => slot.row === row);
      const count = slots.filter((slot) => state.examRows[slot.id]).length;
      const full = count === EXAM_COLS;
      return `<section class="exam-row${full ? ' is-full' : ''}" data-exam-row="${row}" aria-label="第${row}排">
        <div class="exam-row-label" data-exam-row-label="${row}" title="拖到这里可自动放入本排空位">
          <span class="exam-row-title">第${row}排${row === 1 ? '<small>前</small>' : ''}</span>
          <span class="exam-row-count">${count}<span> / ${EXAM_COLS}</span></span>
        </div>
        <div class="exam-slots">${slots.map((slot) => examSlotHTML(slot.id)).join('')}</div>
      </section>`;
    }).join('');

    if (pendingScrollExamId) {
      const slotId = pendingScrollExamId;
      pendingScrollExamId = null;
      requestAnimationFrame(() => scrollExamSlotIntoView(slotId));
    }
  }

  function renderRoster(options = {}) {
    const keepScroll = options.keepScroll !== false;
    const previousScrollTop = els.rosterScroll.scrollTop;
    const isExam = activeView === 'exam';
    const assignedIds = new Set(Object.values(isExam ? state.examRows : state.seats));

    const filtered = state.students.filter((student) => {
      const isAssigned = assignedIds.has(student.id);
      if (filter === 'assigned' && !isAssigned) return false;
      if (filter === 'unassigned' && isAssigned) return false;
      if (query && !matchesQuery(student, query)) return false;
      return true;
    });

    els.rosterCount.textContent = String(state.students.length);
    els.emptyRoster.hidden = state.students.length > 0;
    els.noResults.hidden = !(state.students.length > 0 && filtered.length === 0);
    const anonymous = state.mode === 'anonymous';
    els.studentList.innerHTML = filtered.map((student) => {
      const assignmentId = isExam ? getExamSlotOfStudent(student.id) : getSeatOfStudent(student.id);
      const assigned = Boolean(assignmentId);
      const selected = student.id === selectedStudentId;
      const nameLength = Array.from(student.name).length;
      const metaParts = [];
      if (student.number) metaParts.push(`<span class="student-no">${highlightText(student.number, query)}</span>`);
      else metaParts.push('<span class="student-no">未填学号</span>');
      if (assignmentId && !anonymous) {
        metaParts.push(`<span class="student-loc">${esc(isExam ? examSlotShortLabel(assignmentId) : seatShortLabel(assignmentId))}</span>`);
      }

      const title = assignmentId
        ? (anonymous ? `匿名模式下不显示该生的${isExam ? '选排位置' : '座位'}，切换到姓名模式可查看` : `点击定位：${isExam ? examSlotLabel(assignmentId) : seatLabel(assignmentId)}`)
        : `点击选择，再点击空${isExam ? '选排位' : '座位'}安排`;

      return `<button type="button" class="student-card${assigned ? ' is-assigned' : ''}${selected ? ' is-selected' : ''}" data-student-id="${esc(student.id)}" draggable="${assigned ? 'false' : 'true'}" role="listitem" aria-pressed="${selected}" title="${esc(title)}">
        <span class="student-avatar" style="${avatarStyle(student.name + student.number)}">${esc(Array.from(student.name)[0] || '?')}</span>
        <span class="student-main">
          <span class="student-name">${highlightText(student.name, query)}</span>
          <span class="student-meta">${metaParts.join('')}</span>
        </span>
        <span class="student-state${assigned ? ' is-check' : ''}" aria-hidden="true">
          <svg class="icon"><use href="${assigned ? '#i-check' : '#i-grip'}"></use></svg>
        </span>
        ${nameLength > 12 ? '' : ''}
      </button>`;
    }).join('');

    if (keepScroll) {
      els.rosterScroll.scrollTop = previousScrollTop;
    } else {
      els.rosterScroll.scrollTop = 0;
    }

    const counts = {
      all: state.students.length,
      unassigned: state.students.length - assignedIds.size,
      assigned: assignedIds.size
    };
    Object.entries(counts).forEach(([key, value]) => {
      const target = document.querySelector(`[data-count="${key}"]`);
      if (target) target.textContent = String(value);
    });

    els.searchClearBtn.hidden = !query;
    els.searchKbd.hidden = Boolean(query) || document.activeElement === els.searchInput;
  }

  function renderChrome() {
    const isExam = activeView === 'exam';
    const assigned = isExam ? Object.keys(state.examRows).length : Object.keys(state.seats).length;
    const total = isExam ? TOTAL_EXAM_SLOTS : TOTAL_SEATS;
    const empty = Math.max(0, total - assigned);

    els.assignedCount.textContent = String(assigned);
    els.emptyCount.textContent = String(empty);
    els.assignedLabel.textContent = isExam ? '已选排' : '已安排';
    els.emptyLabel.textContent = isExam ? '未选排' : '空位';
    els.seatTotalText.textContent = isExam ? `共 ${TOTAL_EXAM_SLOTS} 个选排位` : `共 ${TOTAL_SEATS} 个座位`;
    els.clearSeatsBtn.disabled = assigned === 0;
    els.clearRosterBtn.disabled = state.students.length === 0;
    els.exportLabel.textContent = isExam ? '导出选排图' : '导出座位图';
    els.workspaceTitle.textContent = isExam ? '考试选排' : '座位分布';
    els.layoutSummary.textContent = isExam ? '6 排 × 每排 9 位 · 每排第 5 位为中间位' : '靠窗 2 × 6 + 1 加座 · 中间 5 × 6 · 靠门 2 × 6';
    els.filterUnassignedLabel.textContent = isExam ? '未选排' : '未安排';
    els.filterAssignedLabel.textContent = isExam ? '已选排' : '已安排';
    els.clearSeatsBtn.title = isExam ? '清空所有考试选排' : '清空所有座位安排';
    els.clearSeatsBtn.setAttribute('aria-label', isExam ? '清空所有考试选排' : '清空所有座位安排');
    els.chartCard.hidden = isExam;
    els.examCard.hidden = !isExam;
    els.workspaceFootnoteText.textContent = isExam
      ? '每排 9 个选排位，第 5 位为中间位；考试成绩公布后可按学生意愿调整，拖动学生到排头可自动放入空位。'
      : '座位布局固定为「靠窗 2 列 + 中间 5 列 + 靠门 2 列」，每区 6 排；靠窗区最前方另有 1 个独立加座。';

    els.viewBtns.forEach((button) => {
      const active = button.dataset.view === activeView;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    $$('.mode-btn').forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });

    els.modeBadge.classList.toggle('is-named', state.mode === 'named');
    els.modeBadge.innerHTML = state.mode === 'named'
      ? '<svg class="icon" aria-hidden="true"><use href="#i-eye"></use></svg><span>姓名展示</span>'
      : '<svg class="icon" aria-hidden="true"><use href="#i-lock"></use></svg><span>匿名展示</span>';

    if (selectedStudentId) {
      const selected = getStudent(selectedStudentId);
      if (selected) {
        const noun = isExam ? '选排位' : '座位';
        els.chartHint.classList.add('is-selecting');
        els.chartHint.textContent = state.mode === 'named'
          ? `已选择 ${selected.name} · 点击${noun}安排（Esc 取消）`
          : `已选择 1 名学生 · 点击${noun}安排（Esc 取消）`;
      }
    } else {
      els.chartHint.classList.remove('is-selecting');
      els.chartHint.textContent = isExam ? '拖动调整位置 · 点击选排位管理' : '拖动调整位置 · 点击座位管理';
    }

    els.examHint.classList.toggle('is-selecting', Boolean(selectedStudentId));
    if (selectedStudentId) {
      const selected = getStudent(selectedStudentId);
      els.examHint.textContent = state.mode === 'named' && selected
        ? `已选择 ${selected.name} · 点击选排位安排（Esc 取消）`
        : '已选择 1 名学生 · 点击选排位安排（Esc 取消）';
    } else {
      els.examHint.textContent = '拖动调整位置 · 点击选排位管理';
    }

    els.printClassName.textContent = state.className || DEFAULT_CLASS_NAME;
    els.printDate.textContent = displayDate();
    els.printMode.textContent = state.mode === 'named' ? '姓名版' : '匿名版';
    els.examPrintClassName.textContent = state.className || DEFAULT_CLASS_NAME;
    els.examPrintDate.textContent = displayDate();
    els.examPrintMode.textContent = state.mode === 'named' ? '姓名版' : '匿名版';

    els.projectionClass.textContent = state.className || DEFAULT_CLASS_NAME;
    els.projectionMeta.textContent = `${state.mode === 'named' ? '姓名模式' : '匿名模式'} · ${assigned} / ${total} ${isExam ? '已选排' : '已安排'}`;

    document.title = `${state.className || DEFAULT_CLASS_NAME} · ${isExam ? '考试选排' : '座位编排'}`;
    updateHistoryButtons();
  }

  function renderAll() {
    renderRoster();
    renderSeats();
    renderExamBoard();
    renderChrome();
  }

  function setView(view) {
    const nextView = view === 'exam' ? 'exam' : 'seats';
    if (activeView === nextView) return;
    activeView = nextView;
    selectedStudentId = null;
    pendingScrollSeatId = null;
    pendingScrollExamId = null;
    closeSeatMenu();
    renderAll();
    els.chartScroll.scrollTop = 0;
    els.chartScroll.scrollLeft = 0;
  }

  function scrollSeatIntoView(seatId) {
    if (!seatId) return;
    const seat = $(`.seat[data-seat-id="${seatId}"]`, els.seatArea);
    if (!seat) return;
    seat.classList.add('is-focus');
    seat.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    window.setTimeout(() => seat.classList.remove('is-focus'), 2400);
  }

  function scrollExamSlotIntoView(slotId) {
    if (!slotId) return;
    const slot = $(`.exam-slot[data-exam-slot="${slotId}"]`, els.examBoard);
    if (!slot) return;
    slot.classList.add('is-focus');
    slot.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    window.setTimeout(() => slot.classList.remove('is-focus'), 2400);
  }

  /* ---------------- Mode / selection ---------------- */

  function setMode(mode, options = {}) {
    const nextMode = mode === 'named' ? 'named' : 'anonymous';
    if (state.mode === nextMode) return;
    state.mode = nextMode;
    selectedStudentId = null;
    closeSeatMenu();
    scheduleSave();
    renderAll();
    if (!options.silent) {
      showToast(nextMode === 'named' ? '已切换为姓名模式' : '已切换为匿名模式', { type: 'info' });
    }
  }

  function selectStudent(studentId) {
    const student = getStudent(studentId);
    if (!student) return;

    if (selectedStudentId === studentId) {
      selectedStudentId = null;
      renderAll();
      return;
    }

    const isExam = activeView === 'exam';
    const assignmentId = isExam ? getExamSlotOfStudent(studentId) : getSeatOfStudent(studentId);
    if (assignmentId && state.mode === 'anonymous') {
      showToast(`匿名模式下不显示学生${isExam ? '选排位置' : '座位'}，切换到「姓名」后可定位`, { type: 'info' });
      return;
    }

    selectedStudentId = studentId;
    closeSeatMenu();
    if (isExam) {
      pendingScrollExamId = assignmentId || null;
    } else {
      pendingScrollSeatId = assignmentId || null;
    }
    renderAll();
    if (assignmentId && ((isExam && pendingScrollExamId === null) || (!isExam && pendingScrollSeatId === null))) {
      requestAnimationFrame(() => (isExam ? scrollExamSlotIntoView(assignmentId) : scrollSeatIntoView(assignmentId)));
    }
  }

  function clearSelection() {
    if (!selectedStudentId) return;
    selectedStudentId = null;
    renderAll();
  }

  /* ---------------- Assignment ---------------- */

  function feedbackName(student) {
    if (!student) return '该学生';
    return state.mode === 'named' ? student.name : '1 名学生';
  }

  function assignStudent(studentId, seatId, sourceSeatId = null) {
    const student = getStudent(studentId);
    const targetDef = getSeatDef(seatId);
    if (!student || !targetDef) return;

    const currentSeatId = getSeatOfStudent(studentId);
    if (currentSeatId === seatId) return;

    pushHistory();

    const targetStudentId = state.seats[seatId] || null;
    const targetStudent = targetStudentId && targetStudentId !== studentId ? getStudent(targetStudentId) : null;
    let displacedStudent = null;
    let swapped = false;

    if (currentSeatId) delete state.seats[currentSeatId];

    if (targetStudentId && targetStudentId !== studentId) {
      if (sourceSeatId && sourceSeatId !== seatId && !state.seats[sourceSeatId]) {
        state.seats[sourceSeatId] = targetStudentId;
        swapped = true;
      } else {
        displacedStudent = targetStudent;
      }
    }

    state.seats[seatId] = studentId;
    selectedStudentId = null;
    closeSeatMenu();
    pendingScrollSeatId = seatId;
    scheduleSave();
    renderAll();

    let message;
    if (swapped && targetStudent) {
      message = state.mode === 'named'
        ? `已交换 ${student.name} 与 ${targetStudent.name} 的座位`
        : '已交换两个座位';
    } else if (displacedStudent) {
      message = state.mode === 'named'
        ? `${student.name} 已安排到 ${targetDef.short}，${displacedStudent.name} 已移回待选区`
        : `已安排到 ${targetDef.short}，原座位学生已移回待选区`;
    } else {
      message = state.mode === 'named'
        ? `${student.name} 已安排到 ${targetDef.short}`
        : `已安排 1 名学生到 ${targetDef.short}`;
    }
    showToast(message, { type: 'success' });
  }

  function unassignSeat(seatId, options = {}) {
    const studentId = state.seats[seatId];
    if (!studentId) return;
    const student = getStudent(studentId);

    pushHistory();
    delete state.seats[seatId];
    if (selectedStudentId === studentId) selectedStudentId = null;
    closeSeatMenu();
    scheduleSave();
    renderAll();

    if (!options.silent) {
      showToast(state.mode === 'named' && student ? `${student.name} 已移出座位` : '已移出 1 个座位', { type: 'info' });
    }
  }

  function assignExam(studentId, slotId, sourceSlotId = null) {
    const student = getStudent(studentId);
    const targetDef = getExamSlotDef(slotId);
    if (!student || !targetDef) return;

    const currentSlotId = getExamSlotOfStudent(studentId);
    if (currentSlotId === slotId) return;

    pushHistory();

    const targetStudentId = state.examRows[slotId] || null;
    const targetStudent = targetStudentId && targetStudentId !== studentId ? getStudent(targetStudentId) : null;
    let displacedStudent = null;
    let swapped = false;

    if (currentSlotId) delete state.examRows[currentSlotId];

    if (targetStudentId && targetStudentId !== studentId) {
      if (sourceSlotId && sourceSlotId !== slotId && !state.examRows[sourceSlotId]) {
        state.examRows[sourceSlotId] = targetStudentId;
        swapped = true;
      } else {
        displacedStudent = targetStudent;
      }
    }

    state.examRows[slotId] = studentId;
    selectedStudentId = null;
    closeSeatMenu();
    pendingScrollExamId = slotId;
    scheduleSave();
    renderAll();

    let message;
    if (swapped && targetStudent) {
      message = state.mode === 'named'
        ? `已交换 ${student.name} 与 ${targetStudent.name} 的选排位置`
        : '已交换两个选排位置';
    } else if (displacedStudent) {
      message = state.mode === 'named'
        ? `${student.name} 已选到 ${targetDef.short}，${displacedStudent.name} 已移回未选排`
        : `已选到 ${targetDef.short}，原选排学生已移回未选排`;
    } else {
      message = state.mode === 'named'
        ? `${student.name} 已选到 ${targetDef.short}`
        : `已安排 1 名学生到 ${targetDef.short}`;
    }
    showToast(message, { type: 'success' });
  }

  function unassignExam(slotId, options = {}) {
    const studentId = state.examRows[slotId];
    if (!studentId) return;
    const student = getStudent(studentId);

    pushHistory();
    delete state.examRows[slotId];
    if (selectedStudentId === studentId) selectedStudentId = null;
    closeSeatMenu();
    scheduleSave();
    renderAll();

    if (!options.silent) {
      showToast(state.mode === 'named' && student ? `${student.name} 已移出选排` : '已移出 1 个选排位', { type: 'info' });
    }
  }

  function firstEmptyExamSlot(row) {
    for (let col = 1; col <= EXAM_COLS; col += 1) {
      const slotId = `exam-${row}-${col}`;
      if (!state.examRows[slotId]) return slotId;
    }
    return null;
  }

  async function clearAllExam() {
    if (Object.keys(state.examRows).length === 0) return;
    const ok = await confirmAction({
      title: '清空所有考试选排？',
      text: '所有学生都会回到未选排状态，学生名单会保留。这个操作可以用 Ctrl+Z 撤销。',
      confirmLabel: '清空选排',
      danger: true
    });
    if (!ok) return;

    pushHistory();
    state.examRows = {};
    selectedStudentId = null;
    closeSeatMenu();
    scheduleSave();
    renderAll();
    showToast('已清空所有考试选排', { type: 'info' });
  }

  async function clearAllSeats() {
    if (Object.keys(state.seats).length === 0) return;
    const ok = await confirmAction({
      title: '清空所有座位？',
      text: '所有学生都会回到待选区，学生名单会保留。这个操作可以用 Ctrl+Z 撤销。',
      confirmLabel: '清空座位',
      danger: true
    });
    if (!ok) return;

    pushHistory();
    state.seats = {};
    selectedStudentId = null;
    closeSeatMenu();
    scheduleSave();
    renderAll();
    showToast('已清空所有座位安排', { type: 'info' });
  }

  /* ---------------- Seat menu ---------------- */

  function openAssignmentMenu(targetId, type) {
    const isExam = type === 'exam';
    const studentId = isExam ? state.examRows[targetId] : state.seats[targetId];
    if (!studentId) return;
    const student = getStudent(studentId);
    if (!student) return;

    selectedStudentId = null;
    renderAll();

    seatMenuTargetId = targetId;
    seatMenuType = type;
    const noun = isExam ? '选排位' : '座位';
    els.seatMenuTag.textContent = `${isExam ? examSlotLabel(targetId) : seatLabel(targetId)} · ${isExam ? '已选排' : '已安排'}`;

    if (state.mode === 'named') {
      els.seatMenuBody.innerHTML = `<div class="seat-person">
        <span class="student-avatar" style="${avatarStyle(student.name + student.number)}">${esc(Array.from(student.name)[0] || '?')}</span>
        <span class="seat-person-copy">
          <span class="seat-person-name">${esc(student.name)}</span>
          <span class="seat-person-no">${student.number ? `学号 ${esc(student.number)}` : '未填写学号'}</span>
        </span>
      </div>`;
    } else {
      els.seatMenuBody.innerHTML = `<div class="seat-anon">
        <span class="seat-anon-icon"><svg class="icon" aria-hidden="true"><use href="#i-lock"></use></svg></span>
        <div>
          <strong>此${noun}已有学生</strong>
          <span>当前为匿名模式，不显示学生姓名。切换到“姓名”即可查看。</span>
        </div>
      </div>`;
    }

    els.seatMenuRemove.innerHTML = `<svg class="icon" aria-hidden="true"><use href="#i-undo"></use></svg>${isExam ? '移出选排' : '移出座位'}`;
    els.seatMenu.hidden = false;
    els.seatMenu.style.visibility = 'hidden';
    const menuRect = els.seatMenu.getBoundingClientRect();
    const targetEl = isExam
      ? $(`.exam-slot[data-exam-slot="${targetId}"]`, els.examBoard)
      : $(`.seat[data-seat-id="${targetId}"]`, els.seatArea);
    if (!targetEl) {
      closeSeatMenu();
      return;
    }
    const targetRect = targetEl.getBoundingClientRect();
    const margin = 10;
    let left = targetRect.left + targetRect.width / 2 - menuRect.width / 2;
    let top = targetRect.bottom + 9;

    left = Math.max(margin, Math.min(left, window.innerWidth - menuRect.width - margin));
    if (top + menuRect.height > window.innerHeight - margin) {
      top = targetRect.top - menuRect.height - 9;
    }
    top = Math.max(margin, top);

    els.seatMenu.style.left = `${Math.round(left)}px`;
    els.seatMenu.style.top = `${Math.round(top)}px`;
    els.seatMenu.style.visibility = 'visible';
    els.seatMenuRemove.focus({ preventScroll: true });
  }

  function openSeatMenu(seatId) {
    openAssignmentMenu(seatId, 'seat');
  }

  function openExamMenu(slotId) {
    openAssignmentMenu(slotId, 'exam');
  }

  function closeSeatMenu() {
    if (els.seatMenu.hidden) return;
    els.seatMenu.hidden = true;
    seatMenuTargetId = null;
  }

  function removeFromMenu() {
    if (!seatMenuTargetId) return;
    const targetId = seatMenuTargetId;
    const type = seatMenuType;
    closeSeatMenu();
    if (type === 'exam') unassignExam(targetId);
    else unassignSeat(targetId);
  }

  /* ---------------- Drag & drop ---------------- */

  function markDragStart(event, payload, sourceElement) {
    dragPayload = payload;
    lastDragAt = Date.now();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try {
        event.dataTransfer.setData('text/plain', JSON.stringify(payload));
      } catch (error) {
        // Some browsers restrict custom drag data; the in-memory payload still works.
      }
    }
    document.body.classList.add('is-dragging');
    if (sourceElement) sourceElement.classList.add('is-dragging');
    if (payload.fromSeatId) els.rosterDropHint.hidden = false;
  }

  function endDrag() {
    dragPayload = null;
    document.body.classList.remove('is-dragging', 'is-over-roster');
    $$('.drag-over', document).forEach((node) => node.classList.remove('drag-over'));
    $$('.is-dragging', document).forEach((node) => node.classList.remove('is-dragging'));
    els.rosterDropHint.hidden = true;
    lastDragAt = Date.now();
  }

  function handleStudentDrop(event, seatId) {
    event.preventDefault();
    event.stopPropagation();
    if (!dragPayload) return;
    if (dragPayload.fromSeatId === seatId) {
      endDrag();
      return;
    }
    const payload = dragPayload;
    endDrag();
    assignStudent(payload.studentId, seatId, payload.fromSeatId || null);
  }

  function bindDragEvents() {
    els.studentList.addEventListener('dragstart', (event) => {
      const card = event.target.closest('.student-card');
      if (!card) return;
      const studentId = card.dataset.studentId;
      const isAssigned = activeView === 'exam' ? getExamSlotOfStudent(studentId) : getSeatOfStudent(studentId);
      if (!studentId || isAssigned) {
        event.preventDefault();
        return;
      }
      markDragStart(event, { studentId, fromSeatId: null, fromType: activeView }, card);
    });

    els.seatArea.addEventListener('dragstart', (event) => {
      const seat = event.target.closest('.seat.occupied');
      if (!seat) return;
      const studentId = seat.dataset.studentId;
      const seatId = seat.dataset.seatId;
      if (!studentId || !seatId) {
        event.preventDefault();
        return;
      }
      markDragStart(event, { studentId, fromSeatId: seatId, fromType: 'seats' }, seat);
    });

    els.examBoard.addEventListener('dragstart', (event) => {
      const slot = event.target.closest('.exam-slot.occupied');
      if (!slot) return;
      const studentId = slot.dataset.studentId;
      const slotId = slot.dataset.examSlot;
      if (!studentId || !slotId) {
        event.preventDefault();
        return;
      }
      markDragStart(event, { studentId, fromSeatId: slotId, fromType: 'exam' }, slot);
    });

    els.seatArea.addEventListener('dragover', (event) => {
      if (!dragPayload) return;
      const seat = event.target.closest('.seat');
      if (!seat) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      $$('.drag-over', els.seatArea).forEach((node) => {
        if (node !== seat) node.classList.remove('drag-over');
      });
      seat.classList.add('drag-over');
    });

    els.seatArea.addEventListener('dragleave', (event) => {
      const seat = event.target.closest('.seat');
      if (!seat) return;
      if (event.relatedTarget && seat.contains(event.relatedTarget)) return;
      seat.classList.remove('drag-over');
    });

    els.seatArea.addEventListener('drop', (event) => {
      const seat = event.target.closest('.seat');
      if (!seat) return;
      handleStudentDrop(event, seat.dataset.seatId);
    });

    els.examBoard.addEventListener('dragover', (event) => {
      if (!dragPayload) return;
      const slot = event.target.closest('.exam-slot');
      const row = event.target.closest('.exam-row');
      if (!slot && !row) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      $$('.drag-over', els.examBoard).forEach((node) => {
        if (node !== (slot || row)) node.classList.remove('drag-over');
      });
      (slot || row).classList.add('drag-over');
    });

    els.examBoard.addEventListener('dragleave', (event) => {
      const target = event.target.closest('.exam-slot, .exam-row');
      if (!target) return;
      if (event.relatedTarget && target.contains(event.relatedTarget)) return;
      target.classList.remove('drag-over');
    });

    els.examBoard.addEventListener('drop', (event) => {
      if (!dragPayload) return;
      const slot = event.target.closest('.exam-slot');
      const row = event.target.closest('.exam-row');
      if (!slot && !row) return;
      event.preventDefault();
      event.stopPropagation();
      const payload = dragPayload;
      const fromType = payload.fromType || activeView;
      if (fromType !== 'exam') {
        endDrag();
        showToast('座位表和考试选排是两套独立安排，请分别拖入', { type: 'info' });
        return;
      }
      let slotId = slot ? slot.dataset.examSlot : null;
      if (!slotId && row) {
        slotId = firstEmptyExamSlot(Number(row.dataset.examRow));
        if (!slotId) {
          endDrag();
          showToast('这一排的 9 个位置都已经选满', { type: 'info' });
          return;
        }
      }
      if (!slotId) return;
      if (payload.fromSeatId === slotId) {
        endDrag();
        return;
      }
      endDrag();
      assignExam(payload.studentId, slotId, payload.fromSeatId || null);
    });

    const rosterDropZone = els.rosterScroll;
    rosterDropZone.addEventListener('dragover', (event) => {
      if (!dragPayload || !dragPayload.fromSeatId) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      document.body.classList.add('is-over-roster');
      els.rosterDropHint.hidden = false;
    });

    rosterDropZone.addEventListener('dragleave', (event) => {
      if (event.relatedTarget && rosterDropZone.contains(event.relatedTarget)) return;
      document.body.classList.remove('is-over-roster');
    });

    rosterDropZone.addEventListener('drop', (event) => {
      if (!dragPayload || !dragPayload.fromSeatId) {
        endDrag();
        return;
      }
      event.preventDefault();
      const targetId = dragPayload.fromSeatId;
      const fromType = dragPayload.fromType || activeView;
      endDrag();
      if (fromType === 'exam') unassignExam(targetId);
      else unassignSeat(targetId);
    });

    window.addEventListener('dragend', endDrag);
    window.addEventListener('blur', endDrag);
  }

  /* ---------------- Click interactions ---------------- */

  function handleSeatClick(seatId) {
    if (Date.now() - lastDragAt < 280) return;
    const occupiedStudentId = state.seats[seatId] || null;

    if (selectedStudentId) {
      const selectedSeatId = getSeatOfStudent(selectedStudentId);
      if (selectedSeatId === seatId) {
        openSeatMenu(seatId);
        return;
      }
      const selected = getStudent(selectedStudentId);
      if (!selected) {
        selectedStudentId = null;
        return;
      }
      assignStudent(selectedStudentId, seatId, selectedSeatId || null);
      return;
    }

    if (occupiedStudentId) {
      openSeatMenu(seatId);
    } else {
      showToast('请先在左侧名单中选择一名学生', { type: 'info' });
    }
  }

  function handleExamClick(slotId) {
    if (Date.now() - lastDragAt < 280) return;
    const occupiedStudentId = state.examRows[slotId] || null;

    if (selectedStudentId) {
      const selectedSlotId = getExamSlotOfStudent(selectedStudentId);
      if (selectedSlotId === slotId) {
        openExamMenu(slotId);
        return;
      }
      const selected = getStudent(selectedStudentId);
      if (!selected) {
        selectedStudentId = null;
        return;
      }
      assignExam(selectedStudentId, slotId, selectedSlotId || null);
      return;
    }

    if (occupiedStudentId) {
      openExamMenu(slotId);
    } else {
      showToast('请先在左侧名单中选择一名学生', { type: 'info' });
    }
  }

  function bindClickEvents() {
    els.studentList.addEventListener('click', (event) => {
      const card = event.target.closest('.student-card');
      if (!card) return;
      if (Date.now() - lastDragAt < 280) return;
      selectStudent(card.dataset.studentId);
    });

    els.seatArea.addEventListener('click', (event) => {
      const seat = event.target.closest('.seat');
      if (!seat) return;
      if (Date.now() - lastDragAt < 280) return;
      handleSeatClick(seat.dataset.seatId);
    });

    els.viewBtns.forEach((button) => {
      button.addEventListener('click', () => setView(button.dataset.view));
    });

    els.examBoard.addEventListener('click', (event) => {
      const slot = event.target.closest('.exam-slot');
      if (slot) {
        if (Date.now() - lastDragAt < 280) return;
        handleExamClick(slot.dataset.examSlot);
        return;
      }
      const rowLabel = event.target.closest('.exam-row-label');
      if (!rowLabel || !selectedStudentId) return;
      const slotId = firstEmptyExamSlot(Number(rowLabel.dataset.examRowLabel));
      if (!slotId) {
        showToast('这一排的 9 个位置都已经选满', { type: 'info' });
        return;
      }
      assignExam(selectedStudentId, slotId, getExamSlotOfStudent(selectedStudentId));
    });

    $$('.filter-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        filter = chip.dataset.filter || 'all';
        $$('.filter-chip').forEach((item) => item.classList.toggle('is-active', item === chip));
        renderRoster({ keepScroll: false });
      });
    });

    $$('.mode-btn').forEach((button) => {
      button.addEventListener('click', () => setMode(button.dataset.mode));
    });

    els.searchInput.addEventListener('input', () => {
      query = els.searchInput.value.trim();
      renderRoster({ keepScroll: false });
      renderSeats();
      renderExamBoard();
    });

    els.searchInput.addEventListener('focus', () => {
      els.searchKbd.hidden = true;
    });

    els.searchInput.addEventListener('blur', () => {
      els.searchKbd.hidden = Boolean(query);
    });

    els.searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        els.searchInput.value = '';
        query = '';
        renderRoster({ keepScroll: false });
        renderSeats();
        renderExamBoard();
        els.searchInput.blur();
      }
    });

    els.searchClearBtn.addEventListener('click', () => {
      els.searchInput.value = '';
      query = '';
      els.searchInput.focus();
      renderRoster({ keepScroll: false });
      renderSeats();
      renderExamBoard();
    });

    els.seatMenuClose.addEventListener('click', closeSeatMenu);
    els.seatMenuRemove.addEventListener('click', removeFromMenu);

    document.addEventListener('pointerdown', (event) => {
      if (els.seatMenu.hidden) return;
      if (els.seatMenu.contains(event.target)) return;
      if (event.target.closest('.seat, .exam-slot')) return;
      closeSeatMenu();
    });

    els.chartScroll.addEventListener('scroll', closeSeatMenu, { passive: true });
    $('.exam-board-wrap').addEventListener('scroll', closeSeatMenu, { passive: true });
    window.addEventListener('resize', closeSeatMenu);

    els.undoBtn.addEventListener('click', undo);
    els.redoBtn.addEventListener('click', redo);

    els.clearSeatsBtn.addEventListener('click', () => {
      if (activeView === 'exam') clearAllExam();
      else clearAllSeats();
    });
  }

  /* ---------------- Import dialog ---------------- */

  function resetImportDialog() {
    importResult = null;
    importSourceName = '';
    els.fileInput.value = '';
    els.importText.value = '';
    els.importMeta.hidden = true;
    els.importMeta.classList.remove('is-warning');
    els.importMeta.innerHTML = '';
    els.importPreview.hidden = true;
    els.importPreview.innerHTML = '';
    els.overwriteCheck.checked = false;
    els.importConfirmBtn.disabled = true;
    els.importConfirmText.textContent = '导入名单';
    els.dropZone.classList.remove('is-loaded', 'is-dragover');
    els.dropTitle.textContent = DROP_DEFAULT_TITLE;
    els.dropSub.textContent = DROP_DEFAULT_SUB;
  }

  function openImportDialog() {
    resetImportDialog();
    if (typeof els.importDialog.showModal === 'function') {
      els.importDialog.showModal();
    } else {
      els.importDialog.setAttribute('open', '');
    }
    window.setTimeout(() => els.importText.focus(), 80);
  }

  function closeImportDialog() {
    if (typeof els.importDialog.close === 'function') {
      els.importDialog.close();
    } else {
      els.importDialog.removeAttribute('open');
    }
  }

  function setImportMeta(message, warning = false) {
    els.importMeta.hidden = !message;
    els.importMeta.classList.toggle('is-warning', warning);
    els.importMeta.innerHTML = message
      ? `<svg class="icon" aria-hidden="true"><use href="${warning ? '#i-alert' : '#i-info'}"></use></svg><span>${message}</span>`
      : '';
  }

  function updateImportPreview() {
    const text = els.importText.value;
    if (!text.trim()) {
      importResult = null;
      setImportMeta('', false);
      els.importPreview.hidden = true;
      els.importConfirmBtn.disabled = true;
      els.importConfirmText.textContent = '导入名单';
      return;
    }

    const result = parseRosterText(text);
    importResult = result;

    if (!result.records.length) {
      setImportMeta(result.warnings[0] || '没有识别到有效学生，请检查姓名和学号是否在同一行。', true);
      els.importPreview.hidden = true;
      els.importConfirmBtn.disabled = true;
      els.importConfirmText.textContent = '导入名单';
      return;
    }

    const metaParts = [`识别到 ${result.records.length} 名学生`];
    metaParts.push(result.headerDetected ? '已识别表头' : '按姓名 / 学号识别');
    if (importSourceName) metaParts.push(`来源：${esc(importSourceName)}`);
    if (result.skipped) metaParts.push(`跳过 ${result.skipped} 行`);
    if (result.duplicates) metaParts.push(`合并 ${result.duplicates} 条重复`);
    if (result.warnings.length) metaParts.push(esc(result.warnings[0]));
    setImportMeta(metaParts.join(' · '), result.warnings.length > 0 || result.skipped > 0);

    const previewRows = result.records.slice(0, 5);
    els.importPreview.innerHTML = `<table>
      <thead><tr><th class="preview-index">#</th><th>姓名</th><th>学号</th></tr></thead>
      <tbody>
        ${previewRows.map((record, index) => `<tr>
          <td class="preview-index">${index + 1}</td>
          <td class="preview-name">${esc(record.name)}</td>
          <td>${record.number ? esc(record.number) : '<span style="color:#aaa">未填写</span>'}</td>
        </tr>`).join('')}
      </tbody>
    </table>${result.records.length > previewRows.length ? `<div class="preview-more">还有 ${result.records.length - previewRows.length} 名学生…</div>` : ''}`;
    els.importPreview.hidden = false;
    els.importConfirmBtn.disabled = false;
    els.importConfirmText.textContent = `导入 ${result.records.length} 名学生`;
  }

  async function handleImportFile(file) {
    if (!file) return;
    const ext = (file.name.split('.').pop() || '').toLocaleLowerCase();

    if (file.size > MAX_FILE_BYTES) {
      showToast('文件超过 15 MB，请拆分后再导入', { type: 'warning' });
      return;
    }

    if (ext === 'xls') {
      setImportMeta('旧版 .xls 暂不支持，请在 Excel / WPS 中另存为 .xlsx 或 .csv 后再导入。', true);
      return;
    }

    if (!['xlsx', 'csv', 'tsv', 'txt'].includes(ext)) {
      setImportMeta('不支持这个文件格式，请选择 .xlsx、.csv 或 .txt 文件。', true);
      return;
    }

    els.dropTitle.textContent = '正在读取文件…';
    els.dropSub.textContent = file.name;
    els.dropZone.classList.add('is-loaded');
    els.dropZone.classList.remove('is-dragover');

    try {
      if (ext === 'xlsx') {
        const buffer = await file.arrayBuffer();
        const rows = await parseXlsx(buffer);
        const result = rowsToRoster(rows);
        if (!result.records.length) {
          throw new Error(result.warnings[0] || '表格里没有识别到学生。');
        }
        importSourceName = file.name;
        els.importText.value = result.records
          .map((record) => `${csvCell(record.name)}, ${csvCell(record.number)}`)
          .join('\n');
        updateImportPreview();
      } else {
        const buffer = await file.arrayBuffer();
        const text = decodeTextBuffer(buffer);
        importSourceName = file.name;
        els.importText.value = text.replace(/^\uFEFF/, '');
        updateImportPreview();
      }
      els.dropTitle.textContent = file.name;
      const suffix = ext === 'xlsx' ? 'Excel 文件' : '文本文件';
      els.dropSub.textContent = `${suffix} · 已读取，可在下方检查或修改`;
    } catch (error) {
      console.warn('导入文件失败：', error);
      els.dropTitle.textContent = DROP_DEFAULT_TITLE;
      els.dropSub.textContent = DROP_DEFAULT_SUB;
      els.dropZone.classList.remove('is-loaded');
      setImportMeta(`读取失败：${esc(error && error.message ? error.message : '文件无法解析')}`, true);
      showToast('文件读取失败，请检查格式', { type: 'warning' });
    } finally {
      els.fileInput.value = '';
    }
  }

  async function commitImport() {
    if (!importResult || !importResult.records.length) return;
    const incoming = importResult.records;
    const overwrite = els.overwriteCheck.checked;

    if (overwrite && state.students.length > 0) {
      const ok = await confirmAction({
        title: '覆盖现有名单？',
        text: '当前名单和所有座位安排都会被替换。这个操作可以用 Ctrl+Z 撤销。',
        confirmLabel: '覆盖并导入',
        danger: true
      });
      if (!ok) return;
    }

    if (overwrite) {
      pushHistory();
      state.students = incoming.map((record) => ({
        id: makeStudentId(),
        name: record.name,
        number: record.number
      }));
      state.seats = {};
      state.examRows = {};
      selectedStudentId = null;
      closeSeatMenu();
      scheduleSave();
      resetRosterView();
      renderAll();
      closeImportDialog();
      showToast(`已导入 ${state.students.length} 名学生，座位已清空`, { type: 'success' });
      return;
    }

    const existingKeys = new Set(state.students.map(studentKey));
    const additions = [];
    incoming.forEach((record) => {
      const key = studentKey(record);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      additions.push({
        id: makeStudentId(),
        name: record.name,
        number: record.number
      });
    });

    if (!additions.length) {
      showToast('这些学生都已经在名单里了', { type: 'info' });
      return;
    }

    pushHistory();
    state.students = state.students.concat(additions);
    scheduleSave();
    resetRosterView();
    renderAll();
    closeImportDialog();
    showToast(`已添加 ${additions.length} 名学生`, { type: 'success' });
  }

  function resetRosterView() {
    query = '';
    filter = 'all';
    els.searchInput.value = '';
    $$('.filter-chip').forEach((chip) => chip.classList.toggle('is-active', chip.dataset.filter === 'all'));
  }

  /* ---------------- Backup / restore ---------------- */

  function setBackupError(target, message) {
    if (!target) return;
    target.textContent = message || '';
    target.hidden = !message;
  }

  function backupSummaryText() {
    const assigned = Object.keys(state.seats).length;
    const examAssigned = Object.keys(state.examRows).length;
    return `${state.students.length} 名学生 · 座位 ${assigned}/${TOTAL_SEATS} · 选排 ${examAssigned}/${TOTAL_EXAM_SLOTS}`;
  }

  function backupScope() {
    const seats = Boolean(els.backupScopeSeats.checked);
    const exam = Boolean(els.backupScopeExam.checked);
    if (seats && exam) return 'all';
    if (seats) return 'seating';
    if (exam) return 'exam';
    return '';
  }

  function openBackupDialog() {
    setBackupError(els.backupExportError, '');
    setBackupError(els.backupImportError, '');
    els.backupFileInput.value = '';
    els.backupScopeSeats.checked = true;
    els.backupScopeExam.checked = true;
    els.backupSummary.textContent = backupSummaryText();
    if (!els.backupDialog.open) els.backupDialog.showModal();
    window.setTimeout(() => els.backupScopeSeats.focus(), 40);
  }

  function closeBackupDialog() {
    if (els.backupDialog.open) els.backupDialog.close();
  }

  function resetBackupDialog() {
    setBackupError(els.backupExportError, '');
    setBackupError(els.backupImportError, '');
    els.backupFileInput.value = '';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2500);
  }

  function exportBackup() {
    setBackupError(els.backupExportError, '');
    if (!state.students.length) {
      setBackupError(els.backupExportError, '当前还没有学生名单，先导入名单再备份。');
      return;
    }
    const scope = backupScope();
    if (!scope) {
      setBackupError(els.backupExportError, '请至少选择「座位表」或「考试选排」中的一项。');
      return;
    }

    const payload = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      scope,
      exportedAt: new Date().toISOString(),
      className: state.className || DEFAULT_CLASS_NAME,
      students: state.students.map((student) => ({
        id: student.id,
        name: student.name,
        number: student.number
      })),
      mode: state.mode
    };
    if (scope === 'seating' || scope === 'all') payload.seats = { ...state.seats };
    if (scope === 'exam' || scope === 'all') payload.examRows = { ...state.examRows };

    const scopeName = scope === 'all' ? '全部' : (scope === 'exam' ? '考试选排' : '座位表');
    const safeClass = String(payload.className).replace(/[\\/:*?"<>|]/g, '').trim() || '班级';
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    downloadBlob(blob, `${safeClass}_${scopeName}备份_${fileSafeDate()}.json`);
    closeBackupDialog();
    showToast(`已导出${scopeName}备份`, { type: 'success' });
  }

  function parseBackupData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('备份文件内容为空或格式不正确');
    }
    if (raw.format !== BACKUP_FORMAT) {
      throw new Error('这不是本工具导出的备份文件');
    }
    const version = Number(raw.version);
    if (![1, 2].includes(version)) {
      throw new Error('备份版本不兼容，请用当前版本重新导出');
    }
    if (!Array.isArray(raw.students) || raw.students.length === 0) {
      throw new Error('备份里没有学生名单');
    }

    const seenIds = new Set();
    const students = [];
    raw.students.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const name = String(item.name || '').trim().slice(0, 40);
      if (!name) return;
      const number = String(item.number || '').trim().slice(0, 40);
      let id = String(item.id || '').trim();
      if (!id || seenIds.has(id)) id = makeStudentId();
      seenIds.add(id);
      students.push({ id, name, number });
    });

    if (!students.length) throw new Error('备份里没有有效的学生');

    const validStudentIds = new Set(students.map((student) => student.id));
    const usedStudents = new Set();
    const seats = {};
    Object.entries(raw.seats && typeof raw.seats === 'object' ? raw.seats : {}).forEach(([seatId, studentId]) => {
      if (!SEAT_MAP.has(seatId)) return;
      if (!validStudentIds.has(studentId)) return;
      if (usedStudents.has(studentId)) return;
      usedStudents.add(studentId);
      seats[seatId] = studentId;
    });

    const usedExamStudents = new Set();
    const examRows = {};
    Object.entries(raw.examRows && typeof raw.examRows === 'object' ? raw.examRows : {}).forEach(([slotId, studentId]) => {
      if (!EXAM_SLOT_MAP.has(slotId)) return;
      if (!validStudentIds.has(studentId)) return;
      if (usedExamStudents.has(studentId)) return;
      usedExamStudents.add(studentId);
      examRows[slotId] = studentId;
    });

    const hasSeats = version === 1 || raw.scope === 'seating' || raw.scope === 'all';
    const hasExam = version >= 2 && (raw.scope === 'exam' || raw.scope === 'all');
    const scope = hasSeats && hasExam ? 'all' : (hasExam ? 'exam' : 'seating');

    return {
      className: String(raw.className || '').trim().slice(0, 30) || DEFAULT_CLASS_NAME,
      students,
      seats: hasSeats ? seats : null,
      examRows: hasExam ? examRows : null,
      scope,
      mode: raw.mode === 'named' ? 'named' : 'anonymous',
      exportedAt: String(raw.exportedAt || '')
    };
  }

  function remapAssignments(assignments, students, idMap) {
    const byId = new Map();
    const byKey = new Map();
    students.forEach((student) => {
      byId.set(student.id, student.id);
      byKey.set(studentKey(student), student.id);
    });
    const next = {};
    Object.entries(assignments || {}).forEach(([slotId, oldStudentId]) => {
      const mappedId = idMap.get(oldStudentId) || byId.get(oldStudentId);
      if (!mappedId) return;
      next[slotId] = mappedId;
    });
    return next;
  }

  function applyBackup(backup) {
    pushHistory();
    const scope = backup.scope || 'all';
    const previousStudents = state.students;
    const previousExamRows = state.examRows;

    if (scope === 'all') {
      state.className = backup.className;
      state.students = backup.students;
      state.seats = backup.seats || {};
      state.examRows = backup.examRows || {};
    } else if (scope === 'seating') {
      const oldToNew = new Map();
      const oldByKey = new Map(previousStudents.map((student) => [studentKey(student), student.id]));
      backup.students.forEach((student) => {
        const oldId = oldByKey.get(studentKey(student));
        if (oldId) oldToNew.set(oldId, student.id);
      });
      state.className = backup.className;
      state.students = backup.students;
      state.seats = backup.seats || {};
      state.examRows = remapAssignments(previousExamRows, backup.students, oldToNew);
    } else {
      state.className = backup.className || state.className;
      if (!state.students.length) state.students = backup.students;
      const backupById = new Map(backup.students.map((student) => [student.id, student]));
      const currentById = new Map(state.students.map((student) => [student.id, student.id]));
      const currentByKey = new Map(state.students.map((student) => [studentKey(student), student.id]));
      const mapped = {};
      Object.entries(backup.examRows || {}).forEach(([slotId, oldId]) => {
        const source = backupById.get(oldId);
        if (!source) return;
        const targetId = currentById.get(oldId) || currentByKey.get(studentKey(source));
        if (targetId) mapped[slotId] = targetId;
      });
      state.examRows = mapped;
    }

    state.mode = backup.mode;
    selectedStudentId = null;
    els.classNameInput.value = state.className;
    closeSeatMenu();
    resetRosterView();
    sanitizeState();
    closeBackupDialog();
    scheduleSave();
    renderAll();
    const scopeName = scope === 'all' ? '全部' : (scope === 'exam' ? '考试选排' : '座位表');
    showToast(`已恢复${scopeName}备份：${state.students.length} 名学生`, { type: 'success' });
  }

  async function handleBackupFile(file) {
    if (!file) return;
    setBackupError(els.backupImportError, '');

    if (file.size > MAX_BACKUP_BYTES) {
      setBackupError(els.backupImportError, '备份文件超过 5 MB，无法读取。');
      els.backupFileInput.value = '';
      return;
    }

    try {
      const text = await file.text();
      let raw;
      try {
        raw = JSON.parse(text);
      } catch (error) {
        throw new Error('文件不是有效的 JSON，请选择本工具导出的备份文件');
      }
      const backup = parseBackupData(raw);
      const scopeText = backup.scope === 'all'
        ? `座位表（${Object.keys(backup.seats || {}).length} 个已安排座位）和考试选排（${Object.keys(backup.examRows || {}).length} 个已选排位）`
        : (backup.scope === 'exam'
          ? `考试选排（${Object.keys(backup.examRows || {}).length} 个已选排位）`
          : `座位表（${Object.keys(backup.seats || {}).length} 个已安排座位）`);
      const ok = await confirmAction({
        title: '恢复这份备份？',
        text: `备份包含：${scopeText}。确认后会恢复对应内容，未包含的部分保持当前状态。`,
        confirmLabel: '恢复备份',
        danger: true
      });
      if (ok) applyBackup(backup);
    } catch (error) {
      setBackupError(els.backupImportError, error && error.message ? error.message : '备份文件无法读取');
    } finally {
      els.backupFileInput.value = '';
    }
  }

  function openHelpDialog() {
    if (!els.helpDialog.open) els.helpDialog.showModal();
  }

  function closeHelpDialog() {
    if (els.helpDialog.open) els.helpDialog.close();
  }

  async function clearRoster() {
    if (!state.students.length) return;
    const ok = await confirmAction({
      title: '清空学生名单？',
      text: '学生名单和所有座位安排都会被清空。这个操作可以用 Ctrl+Z 撤销。',
      confirmLabel: '清空名单',
      danger: true
    });
    if (!ok) return;

    pushHistory();
    state.students = [];
    state.seats = {};
    state.examRows = {};
    selectedStudentId = null;
    closeSeatMenu();
    resetRosterView();
    scheduleSave();
    renderAll();
    showToast('已清空学生名单', { type: 'info' });
  }

  function loadSampleRoster() {
    if (state.students.length) {
      confirmAction({
        title: '载入示例名单？',
        text: '将载入高一（4）班的 55 人名单，当前名单和座位安排会被替换；班级名若仍为默认，也会同步更新。可以用 Ctrl+Z 撤销。',
        confirmLabel: '载入示例',
        danger: false
      }).then((ok) => {
        if (ok) applySampleRoster();
      });
      return;
    }
    applySampleRoster();
  }

  function applySampleRoster() {
    pushHistory();
    if (!state.className || state.className === DEFAULT_CLASS_NAME) {
      state.className = SAMPLE_CLASS_NAME;
      els.classNameInput.value = SAMPLE_CLASS_NAME;
    }
    state.students = SAMPLE_ROSTER.map((student) => ({
      id: makeStudentId(),
      name: student.name,
      number: student.number
    }));
    state.seats = {};
    state.examRows = {};
    selectedStudentId = null;
    resetRosterView();
    scheduleSave();
    renderAll();
    showToast(`已载入 ${state.students.length} 名示例学生`, { type: 'success' });
  }

  /* ---------------- Roster parsing ---------------- */

  function detectDelimiter(text) {
    const sample = text.split(/\r?\n/).slice(0, 25).join('\n');
    const candidates = ['\t', ',', '，', ';', '；', '|'];
    let best = null;
    let bestCount = 0;

    candidates.forEach((candidate) => {
      let count = 0;
      let inQuotes = false;
      for (let i = 0; i < sample.length; i += 1) {
        const char = sample[i];
        if (char === '"') inQuotes = !inQuotes;
        if (!inQuotes && char === candidate) count += 1;
      }
      if (count > bestCount) {
        best = candidate;
        bestCount = count;
      }
    });

    if (best === '\t' && bestCount > 0) return '\t';
    return bestCount > 0 ? best : null;
  }

  function parseDelimited(text, delimiter) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (inQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"' && field.trim() === '') {
        inQuotes = true;
        field = '';
      } else if (char === delimiter) {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else if (char !== '\r') {
        field += char;
      }
    }

    if (field !== '' || row.length) {
      row.push(field);
      rows.push(row);
    }
    return rows;
  }

  function parseLooseRows(text) {
    const lines = text.split(/\r?\n/);
    const rows = [];
    lines.forEach((line) => {
      if (!line.trim()) return;
      let parts;
      if (line.includes('\t')) {
        parts = line.split('\t');
      } else if (/\s{2,}/.test(line)) {
        parts = line.split(/\s{2,}/);
      } else {
        parts = line.trim().split(/\s+/);
        if (parts.length === 1) parts = [line.trim()];
      }
      rows.push(parts);
    });
    return rows;
  }

  function rowsToRoster(inputRows) {
    const rows = (inputRows || [])
      .map((row) => (Array.isArray(row) ? row : [row]).map((cell) => String(cell == null ? '' : cell).replace(/^\uFEFF/, '').trim()))
      .filter((row) => row.some((cell) => cell !== ''));

    if (!rows.length) {
      return {
        records: [],
        headerDetected: false,
        skipped: 0,
        duplicates: 0,
        warnings: ['没有读取到任何内容。']
      };
    }

    const nameHeaders = new Set(['姓名', '学生姓名', '名字', '学生名字', '学生', 'name', 'studentname', 'fullname']);
    const idHeaders = new Set(['学号', '学生学号', '学籍号', '学生编号', '编号', 'id', 'studentid', 'studentno', 'sno', 'number', 'no']);
    const normalizeHeader = (value) => String(value || '').toLocaleLowerCase().replace(/[\s:：()（）\-_/]/g, '');

    let headerIndex = -1;
    let nameCol = -1;
    let idCol = -1;

    const scanLimit = Math.min(rows.length, 8);
    for (let r = 0; r < scanLimit; r += 1) {
      const normalized = rows[r].map(normalizeHeader);
      const foundName = normalized.findIndex((cell) => nameHeaders.has(cell));
      if (foundName === -1) continue;
      const foundId = normalized.findIndex((cell) => idHeaders.has(cell));
      headerIndex = r;
      nameCol = foundName;
      idCol = foundId;
      break;
    }

    const headerDetected = headerIndex !== -1;

    if (!headerDetected) {
      const sample = rows.slice(0, 15);
      const columnCount = Math.max(...sample.map((row) => row.length));
      const stats = [];

      for (let col = 0; col < columnCount; col += 1) {
        let nameScore = 0;
        let idScore = 0;
        let indexScore = 0;
        let idLength = 0;

        sample.forEach((row) => {
          const value = String(row[col] || '').trim();
          if (!value) return;
          if (looksLikeName(value)) nameScore += 1;
          if (looksLikeId(value) && !looksLikeName(value)) {
            idScore += 1;
            idLength += value.length;
          }
          if (/^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 200) indexScore += 1;
        });

        stats.push({ col, nameScore, idScore, indexScore, avgIdLength: idScore ? idLength / idScore : 0 });
      }

      const nameCandidate = stats.slice().sort((a, b) => b.nameScore - a.nameScore)[0];
      nameCol = nameCandidate && nameCandidate.nameScore > 0 ? nameCandidate.col : 0;

      const idCandidate = stats
        .filter((item) => item.col !== nameCol)
        .sort((a, b) => (b.idScore - a.idScore) || (b.avgIdLength - a.avgIdLength))[0];

      if (idCandidate && idCandidate.idScore > 0) {
        const isLikelyIndex = idCandidate.indexScore >= Math.max(3, idCandidate.idScore * 0.8) && idCandidate.avgIdLength <= 3;
        idCol = isLikelyIndex ? -1 : idCandidate.col;
      } else {
        idCol = -1;
      }

      if (idCol === -1 && nameCol + 1 < columnCount) {
        const right = stats.find((item) => item.col === nameCol + 1);
        if (right && right.idScore > 0) idCol = right.col;
      }
    }

    const dataStart = headerDetected ? headerIndex + 1 : 0;
    const records = [];
    const seen = new Set();
    const warnings = [];
    let skipped = 0;
    let duplicates = 0;

    for (let r = dataStart; r < rows.length; r += 1) {
      const row = rows[r];
      const nonEmpty = row.filter((cell) => String(cell).trim() !== '');
      if (!nonEmpty.length) continue;

      if (nonEmpty.length === 1) {
        const single = String(nonEmpty[0]).trim();
        if (/^(班级|年级|班主任|学生名单|名单|座位表)/.test(single) && single.length < 40) {
          skipped += 1;
          continue;
        }
      }

      let name = String(row[nameCol] == null ? '' : row[nameCol]).trim();
      let number = idCol >= 0 ? String(row[idCol] == null ? '' : row[idCol]).trim() : '';

      if (!name) {
        if (nonEmpty.length) {
          skipped += 1;
          if (warnings.length < 3) warnings.push(`第 ${r + 1} 行缺少姓名，已跳过`);
        }
        continue;
      }

      const normalizedName = normalizeHeader(name);
      if (nameHeaders.has(normalizedName)) {
        skipped += 1;
        continue;
      }

      if (name.length > 30) {
        skipped += 1;
        if (warnings.length < 3) warnings.push(`第 ${r + 1} 行姓名过长，已跳过`);
        continue;
      }

      if (!number && idCol === -1 && row.length > nameCol + 1) {
        const possibleNumber = String(row[nameCol + 1] || '').trim();
        if (possibleNumber) number = possibleNumber;
      }

      const key = number ? `number:${number.toLocaleLowerCase()}` : `name:${name.toLocaleLowerCase()}`;
      if (seen.has(key)) {
        duplicates += 1;
        continue;
      }
      seen.add(key);
      records.push({ name, number });
    }

    if (!records.length && !warnings.length) {
      warnings.push('没有识别到学生，请确认姓名和学号在同一行。');
    }

    return {
      records,
      headerDetected,
      nameCol,
      idCol,
      skipped,
      duplicates,
      warnings
    };
  }

  function looksLikeName(value) {
    const text = String(value || '').trim();
    if (!text || text.length > 20) return false;
    if (/^\d+$/.test(text)) return false;
    if (/^[\d\s.,:;+\-_/]+$/.test(text)) return false;
    if (/^\d{1,2}[月./-]\d{1,2}/.test(text)) return false;
    if (/^(姓名|学号|学生|编号|序号|name|id|no)$/i.test(text)) return false;
    return /[\u3400-\u9fffA-Za-z]/.test(text);
  }

  function looksLikeId(value) {
    const text = String(value || '').trim();
    if (!text || text.length > 40) return false;
    if (!/\d/.test(text)) return false;
    if (/^\d{1,2}[月./-]\d{1,2}/.test(text)) return false;
    return /^[A-Za-z0-9][A-Za-z0-9._\-/]*$/.test(text) || /^\d+$/.test(text);
  }

  function parseRosterText(text) {
    const source = String(text || '').replace(/^\uFEFF/, '');
    if (!source.trim()) {
      return { records: [], headerDetected: false, skipped: 0, duplicates: 0, warnings: ['名单还是空的。'] };
    }

    const delimiter = detectDelimiter(source);
    const rows = delimiter ? parseDelimited(source, delimiter) : parseLooseRows(source);
    return rowsToRoster(rows);
  }

  function csvCell(value) {
    const text = String(value == null ? '' : value);
    if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function decodeTextBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return new TextDecoder('utf-16le').decode(bytes);
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return new TextDecoder('utf-16be').decode(bytes);
    }

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch (error) {
      try {
        return new TextDecoder('gb18030').decode(bytes);
      } catch (fallbackError) {
        return new TextDecoder('utf-8').decode(bytes);
      }
    }
  }

  /* ---------------- XLSX reader ---------------- */

  const XML_REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

  function xmlElements(root, localName) {
    let elements = Array.from(root.getElementsByTagNameNS('*', localName));
    if (!elements.length) elements = Array.from(root.getElementsByTagName(localName));
    return elements;
  }

  function parseXml(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) {
      throw new Error('XML 结构解析失败');
    }
    return doc;
  }

  async function inflateRawBytes(bytes) {
    if (typeof DecompressionStream !== 'function') {
      throw new Error('当前浏览器不支持读取 .xlsx，请另存为 CSV 后导入。');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    const inflated = await new Response(stream).arrayBuffer();
    return new Uint8Array(inflated);
  }

  async function unzipXlsx(buffer) {
    const view = new DataView(buffer);
    const length = view.byteLength;
    if (length < 22) throw new Error('文件不完整，无法读取。');

    let eocd = -1;
    const min = Math.max(0, length - 22 - 0xFFFF);
    for (let i = length - 22; i >= min; i -= 1) {
      if (view.getUint32(i, true) === 0x06054b50) {
        eocd = i;
        break;
      }
    }
    if (eocd === -1) throw new Error('这不是有效的 .xlsx 文件。');

    const entryCount = view.getUint16(eocd + 10, true);
    let offset = view.getUint32(eocd + 16, true);
    const files = new Map();
    if (entryCount === 0xFFFF) throw new Error('暂不支持过大的 Excel 文件。');

    for (let index = 0; index < entryCount; index += 1) {
      if (offset + 46 > length || view.getUint32(offset, true) !== 0x02014b50) break;

      const flags = view.getUint16(offset + 8, true);
      const method = view.getUint16(offset + 10, true);
      const compressedSize = view.getUint32(offset + 20, true);
      const fileNameLength = view.getUint16(offset + 28, true);
      const extraLength = view.getUint16(offset + 30, true);
      const commentLength = view.getUint16(offset + 32, true);
      const localOffset = view.getUint32(offset + 42, true);
      const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
      const name = new TextDecoder(flags & 0x800 ? 'utf-8' : 'utf-8').decode(nameBytes);

      if (localOffset + 30 <= length && view.getUint32(localOffset, true) === 0x04034b50) {
        const localNameLength = view.getUint16(localOffset + 26, true);
        const localExtraLength = view.getUint16(localOffset + 28, true);
        const dataStart = localOffset + 30 + localNameLength + localExtraLength;
        if (dataStart + compressedSize <= length) {
          const compressed = new Uint8Array(buffer, dataStart, compressedSize);
          let content;
          if (method === 0) {
            content = compressed;
          } else if (method === 8) {
            content = await inflateRawBytes(compressed);
          } else {
            throw new Error('Excel 文件使用了不支持的压缩方式。');
          }
          files.set(name, content);
        }
      }

      offset += 46 + fileNameLength + extraLength + commentLength;
    }

    return files;
  }

  function resolveZipPath(basePath, target) {
    if (!target) return '';
    if (target.startsWith('/')) return target.replace(/^\/+/, '');
    const baseParts = basePath.split('/');
    baseParts.pop();
    target.split('/').forEach((part) => {
      if (!part || part === '.') return;
      if (part === '..') baseParts.pop();
      else baseParts.push(part);
    });
    return baseParts.join('/');
  }

  function columnIndexFromRef(ref) {
    const match = String(ref || '').match(/^([A-Za-z]+)/);
    if (!match) return -1;
    let index = 0;
    const letters = match[1].toUpperCase();
    for (let i = 0; i < letters.length; i += 1) {
      index = index * 26 + (letters.charCodeAt(i) - 64);
    }
    return index - 1;
  }

  function cellText(cell, sharedStrings) {
    const type = cell.getAttribute('t');
    if (type === 'inlineStr') {
      const inline = cell.getElementsByTagNameNS('*', 'is')[0] || cell.getElementsByTagName('is')[0];
      if (!inline) return '';
      return xmlElements(inline, 't').map((node) => node.textContent || '').join('');
    }

    const valueNode = cell.getElementsByTagNameNS('*', 'v')[0] || cell.getElementsByTagName('v')[0];
    if (!valueNode) return '';
    const raw = valueNode.textContent || '';

    if (type === 's') {
      const index = Number(raw);
      return Number.isFinite(index) && sharedStrings[index] != null ? sharedStrings[index] : '';
    }
    if (type === 'b') return raw === '1' ? 'TRUE' : 'FALSE';
    if (type === 'str') return raw;
    return raw;
  }

  async function parseXlsx(buffer) {
    const files = await unzipXlsx(buffer);
    const decode = (name) => {
      const content = files.get(name);
      return content ? new TextDecoder('utf-8').decode(content) : '';
    };

    const workbookText = decode('xl/workbook.xml');
    if (!workbookText) throw new Error('Excel 文件缺少工作簿结构。');
    const workbookDoc = parseXml(workbookText);
    const sheets = xmlElements(workbookDoc, 'sheet');
    if (!sheets.length) throw new Error('Excel 文件中没有工作表。');

    const preferredSheet = sheets.find((sheet) => sheet.getAttribute('state') !== 'hidden') || sheets[0];
    const relationId = preferredSheet.getAttributeNS(XML_REL_NS, 'id')
      || preferredSheet.getAttribute('r:id')
      || preferredSheet.getAttribute('id');

    let sheetPath = '';
    const relsText = decode('xl/_rels/workbook.xml.rels');
    if (relsText && relationId) {
      const relsDoc = parseXml(relsText);
      const relationships = xmlElements(relsDoc, 'Relationship');
      const relation = relationships.find((item) => item.getAttribute('Id') === relationId);
      if (relation) sheetPath = resolveZipPath('xl/workbook.xml', relation.getAttribute('Target'));
    }
    if (!sheetPath || !files.has(sheetPath)) {
      sheetPath = Array.from(files.keys()).find((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)) || '';
    }
    if (!sheetPath || !files.has(sheetPath)) throw new Error('找不到可读取的工作表。');

    const sharedStrings = [];
    const sharedText = decode('xl/sharedStrings.xml');
    if (sharedText) {
      const sharedDoc = parseXml(sharedText);
      xmlElements(sharedDoc, 'si').forEach((item) => {
        sharedStrings.push(xmlElements(item, 't').map((node) => node.textContent || '').join(''));
      });
    }

    const sheetDoc = parseXml(decode(sheetPath));
    const rowElements = xmlElements(sheetDoc, 'row');
    const rows = [];

    rowElements.forEach((rowElement, fallbackIndex) => {
      const rowNumber = Number(rowElement.getAttribute('r'));
      const rowIndex = Number.isFinite(rowNumber) && rowNumber > 0 ? rowNumber - 1 : fallbackIndex;
      let columnCursor = 0;
      const row = rows[rowIndex] || [];

      xmlElements(rowElement, 'c').forEach((cell) => {
        const ref = cell.getAttribute('r');
        const parsedColumn = columnIndexFromRef(ref);
        const column = parsedColumn >= 0 ? parsedColumn : columnCursor;
        row[column] = cellText(cell, sharedStrings);
        columnCursor = column + 1;
      });

      while (row.length && String(row[row.length - 1] || '').trim() === '') row.pop();
      rows[rowIndex] = row;
    });

    while (rows.length && !(rows[rows.length - 1] || []).some((cell) => String(cell || '').trim())) {
      rows.pop();
    }
    if (!rows.length) throw new Error('工作表里没有数据。');

    return rows;
  }

  /* ---------------- Confirm / toast ---------------- */

  function confirmAction(options = {}) {
    if (els.confirmDialog.open) {
      const previousResolve = confirmResolve;
      confirmResolve = null;
      if (previousResolve) previousResolve(false);
      try { els.confirmDialog.close(); } catch (error) { /* noop */ }
    }
    els.confirmTitle.textContent = options.title || '确认操作';
    els.confirmText.textContent = options.text || '';
    els.confirmOkBtn.textContent = options.confirmLabel || '确认';
    els.confirmOkBtn.className = options.danger === false ? 'btn btn-primary' : 'btn btn-danger';
    els.confirmDialog.returnValue = '';

    return new Promise((resolve) => {
      confirmResolve = resolve;
      els.confirmDialog.showModal();
    });
  }

  function showToast(message, options = {}) {
    const type = options.type || 'success';
    const duration = options.duration == null ? 2800 : options.duration;
    const toast = document.createElement('div');
    toast.className = `toast${type === 'warning' ? ' is-warning' : ''}${type === 'danger' ? ' is-danger' : ''}`;

    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', type === 'warning' || type === 'danger' ? '#i-alert' : type === 'info' ? '#i-info' : '#i-check');
    icon.appendChild(use);

    const text = document.createElement('span');
    text.textContent = message;

    toast.append(icon, text);
    els.toastRegion.appendChild(toast);

    while (els.toastRegion.children.length > 3) {
      els.toastRegion.firstElementChild.remove();
    }

    const remove = () => {
      if (!toast.isConnected) return;
      toast.classList.add('is-leaving');
      window.setTimeout(() => toast.remove(), 190);
    };

    window.setTimeout(remove, duration);
  }

  /* ---------------- Projection ---------------- */

  function enterProjection() {
    if (isProjecting) return;
    isProjecting = true;
    closeSeatMenu();
    document.body.classList.add('is-projecting');
    els.projectionUi.hidden = false;
    renderChrome();

    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Fullscreen can be denied in embedded previews; projection layout still works.
      });
    }
  }

  function exitProjection(options = {}) {
    if (!isProjecting) return;
    isProjecting = false;
    document.body.classList.remove('is-projecting');
    els.projectionUi.hidden = true;
    if (options.fullscreen !== false && document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ---------------- Export image ---------------- */

  function roundRectPath(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fitFont(ctx, text, maxWidth, startSize, minSize, family) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `700 ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 1;
    }
    return size;
  }

  function fitText(ctx, text, maxWidth, family, weight, size) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return text;
    let result = text;
    while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
      result = result.slice(0, -1);
    }
    return `${result}…`;
  }

  function drawCheck(ctx, cx, cy, radius, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2.2, radius * 0.18);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.42, cy + radius * 0.02);
    ctx.lineTo(cx - radius * 0.1, cy + radius * 0.32);
    ctx.lineTo(cx + radius * 0.46, cy - radius * 0.3);
    ctx.stroke();
    ctx.restore();
  }

  function buildExportCanvas() {
    const W = 1800;
    const H = 1120;
    const SCALE = 2;
    const PAD = 90;
    const SEAT_W = 160;
    const SEAT_H = 108;
    const SEAT_GAP = 16;
    const BLOCK_GAP = 42;
    const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
    const SERIF = '"Songti SC", "STSong", "SimSun", "Noto Serif SC", serif';

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const blockWidth = (cols) => cols * SEAT_W + (cols - 1) * SEAT_GAP;
    const totalWidth = blockWidth(2) + BLOCK_GAP + blockWidth(5) + BLOCK_GAP + blockWidth(2);
    const left = (W - totalWidth) / 2;
    const windowX = left;
    const middleX = windowX + blockWidth(2) + BLOCK_GAP;
    const doorX = middleX + blockWidth(5) + BLOCK_GAP;
    const gridTop = 320;
    const frontTop = 126;
    const frontX = windowX;

    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(0, 0, W, H);

    const className = state.className || DEFAULT_CLASS_NAME;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#20312a';
    ctx.font = `700 40px ${SERIF}`;
    ctx.fillText(fitText(ctx, className, W - PAD * 2, SERIF, 700, 40), PAD, 80);

    // Front extra seat
    ctx.fillStyle = '#b05e39';
    ctx.font = `650 14px ${FONT}`;
    ctx.beginPath();
    ctx.arc(frontX + SEAT_W + 22, frontTop + 48, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('靠窗加座', frontX + SEAT_W + 34, frontTop + 53);
    drawExportSeat(ctx, frontX, frontTop, SEAT_W, SEAT_H, 'front-1', FONT, SERIF);

    // Block labels
    const labelY = 296;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#7b857e';
    ctx.font = `700 14px ${FONT}`;
    ctx.fillText('靠窗区', windowX + 2, labelY);
    ctx.fillText('中间区', middleX + 2, labelY);
    ctx.fillText('靠门区', doorX + 2, labelY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#b4ac9d';
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('2 × 6', windowX + blockWidth(2) - 2, labelY);
    ctx.fillText('5 × 6', middleX + blockWidth(5) - 2, labelY);
    ctx.fillText('2 × 6', doorX + blockWidth(2) - 2, labelY);

    const blockStartX = { window: windowX, middle: middleX, door: doorX };
    ['window', 'middle', 'door'].forEach((blockKey) => {
      SEAT_DEFS.filter((seat) => seat.block === blockKey).forEach((seat) => {
        const x = blockStartX[blockKey] + (seat.col - 1) * (SEAT_W + SEAT_GAP);
        const y = gridTop + (seat.row - 1) * (SEAT_H + SEAT_GAP);
        drawExportSeat(ctx, x, y, SEAT_W, SEAT_H, seat.id, FONT, SERIF);
      });
    });

    return canvas;
  }

  function buildExamExportCanvas() {
    const W = 1800;
    const H = 1040;
    const SCALE = 2;
    const PAD = 90;
    const FONT = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif';
    const SERIF = '"Songti SC", "STSong", "SimSun", "Noto Serif SC", serif';
    const ROW_LABEL_W = 150;
    const SLOT_GAP = 10;
    const SLOT_W = (W - PAD * 2 - ROW_LABEL_W - SLOT_GAP * (EXAM_COLS - 1)) / EXAM_COLS;
    const SLOT_H = 88;
    const ROW_TOP = 154;
    const ROW_STEP = 116;

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    ctx.fillStyle = '#fffdf9';
    ctx.fillRect(0, 0, W, H);

    const className = state.className || DEFAULT_CLASS_NAME;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#20312a';
    ctx.font = `700 40px ${SERIF}`;
    ctx.fillText(fitText(ctx, `${className} · 考试选排`, W - PAD * 2, SERIF, 700, 40), PAD, 80);

    for (let row = 1; row <= EXAM_ROWS; row += 1) {
      const rowY = ROW_TOP + (row - 1) * ROW_STEP;
      const rowStudents = EXAM_SLOT_DEFS
        .filter((slot) => slot.row === row)
        .map((slot) => state.examRows[slot.id] || null)
        .filter(Boolean);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#2b3d35';
      ctx.font = `700 22px ${SERIF}`;
      ctx.fillText(`第${row}排${row === 1 ? '（前）' : ''}`, PAD, rowY + 38);
      ctx.fillStyle = '#9a9387';
      ctx.font = `500 13px ${FONT}`;
      ctx.fillText(`${rowStudents.length} / ${EXAM_COLS} 人`, PAD, rowY + 62);

      for (let col = 1; col <= EXAM_COLS; col += 1) {
        const slotId = `exam-${row}-${col}`;
        const x = PAD + ROW_LABEL_W + (col - 1) * (SLOT_W + SLOT_GAP);
        drawExportExamSlot(ctx, x, rowY, SLOT_W, SLOT_H, slotId, FONT, SERIF);
      }
    }

    const middleTitleY = ROW_TOP + EXAM_ROWS * ROW_STEP + 24;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#b05e39';
    ctx.font = `700 20px ${SERIF}`;
    ctx.beginPath();
    ctx.arc(PAD + 5, middleTitleY - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillText('每排中间位（第 5 位）', PAD + 20, middleTitleY);
    ctx.fillStyle = '#9a9387';
    ctx.font = `500 12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('单独列出，便于按中间位安排', W - PAD, middleTitleY);

    const cardGap = 12;
    const cardW = (W - PAD * 2 - cardGap * (EXAM_ROWS - 1)) / EXAM_ROWS;
    const cardY = middleTitleY + 22;
    const cardH = 82;
    for (let row = 1; row <= EXAM_ROWS; row += 1) {
      const slotId = `exam-${row}-${EXAM_MIDDLE_COL}`;
      const studentId = state.examRows[slotId] || null;
      const student = studentId ? getStudent(studentId) : null;
      const x = PAD + (row - 1) * (cardW + cardGap);
      roundRectPath(ctx, x, cardY, cardW, cardH, 12);
      ctx.fillStyle = student ? '#fbeee6' : '#fffdf9';
      ctx.fill();
      ctx.strokeStyle = student ? '#d2a087' : '#e4d6ca';
      ctx.lineWidth = 1.2;
      if (!student) ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#a97860';
      ctx.font = `600 12px ${FONT}`;
      ctx.fillText(`第${row}排中间`, x + 14, cardY + 24);
      ctx.fillStyle = student ? '#7c4328' : '#aaa295';
      ctx.font = `700 18px ${SERIF}`;
      let text;
      if (student) text = state.mode === 'named' ? student.name : '已选（匿名）';
      else text = '未选';
      ctx.fillText(fitText(ctx, text, cardW - 28, SERIF, 700, 18), x + 14, cardY + 54);
    }

    return canvas;
  }

  function drawExportExamSlot(ctx, x, y, width, height, slotId, font, serif) {
    const def = getExamSlotDef(slotId);
    const studentId = state.examRows[slotId];
    const student = studentId ? getStudent(studentId) : null;
    const isMiddle = Boolean(def && def.isMiddle);
    const occupied = Boolean(student);

    ctx.save();
    roundRectPath(ctx, x, y, width, height, 12);
    if (occupied) {
      ctx.fillStyle = isMiddle ? '#fbeee6' : '#eef7f1';
      ctx.fill();
      ctx.strokeStyle = isMiddle ? '#d2a087' : '#b7d1c3';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fffdf9';
      ctx.fill();
      ctx.strokeStyle = isMiddle ? '#d9b49f' : '#ded7c9';
      ctx.lineWidth = 1.1;
      ctx.setLineDash([6, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = isMiddle ? '#b05e39' : '#b4ac9d';
    ctx.font = `600 10px ${font}`;
    ctx.fillText(isMiddle ? '中间 5' : String(def ? def.col : ''), x + 9, y + 16);
    if (!occupied) {
      ctx.restore();
      return;
    }

    const cx = x + width / 2;
    const cy = y + height / 2 + 9;
    if (state.mode === 'anonymous') {
      drawCheck(ctx, cx, cy, 16, isMiddle ? '#bd6c46' : '#2f6756');
      ctx.restore();
      return;
    }

    const nameSize = fitFont(ctx, student.name, width - 18, 22, 12, serif);
    ctx.textAlign = 'center';
    ctx.fillStyle = isMiddle ? '#7c4328' : '#204438';
    ctx.font = `700 ${nameSize}px ${serif}`;
    ctx.fillText(student.name, cx, cy - 6);
    if (student.number) {
      ctx.fillStyle = isMiddle ? '#a67a63' : '#6f8e7f';
      ctx.font = `400 11px ${font}`;
      ctx.fillText(student.number, cx, cy + 16);
    }
    ctx.restore();
  }

  function drawExportSeat(ctx, x, y, width, height, seatId, font, serif) {
    const studentId = state.seats[seatId];
    const student = studentId ? getStudent(studentId) : null;
    const isFront = seatId === 'front-1';

    ctx.save();
    roundRectPath(ctx, x, y, width, height, 16);
    if (student) {
      if (isFront) {
        const fill = ctx.createLinearGradient(x, y, x, y + height);
        fill.addColorStop(0, '#fdf4ee');
        fill.addColorStop(1, '#f6e4d8');
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#d2a087';
      } else {
        const fill = ctx.createLinearGradient(x, y, x, y + height);
        fill.addColorStop(0, '#eef7f1');
        fill.addColorStop(1, '#dfeee6');
        ctx.fillStyle = fill;
        ctx.strokeStyle = '#b7d1c3';
      }
      ctx.fill();
      ctx.lineWidth = 1.3;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#fffdf9';
      ctx.fill();
      ctx.strokeStyle = isFront ? '#d9b49f' : '#ded7c9';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([7, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (isFront) {
        ctx.strokeStyle = 'rgba(217, 180, 159, 0.36)';
        roundRectPath(ctx, x - 4, y - 4, width + 8, height + 8, 17);
        ctx.stroke();
      }
      ctx.restore();
      return;
    }

    const cx = x + width / 2;
    const cy = y + height / 2;

    if (state.mode === 'anonymous') {
      drawCheck(ctx, cx, cy, 19, isFront ? '#bd6c46' : '#2f6756');
    } else {
      if (student.number) {
        const nameSize = fitFont(ctx, student.name, width - 24, 30, 16, serif);
        ctx.fillStyle = isFront ? '#7c4328' : '#204438';
        ctx.textAlign = 'center';
        ctx.font = `700 ${nameSize}px ${serif}`;
        ctx.fillText(student.name, cx, cy - 6);
        ctx.fillStyle = isFront ? '#a67a63' : '#6f8e7f';
        ctx.font = `400 14px ${font}`;
        ctx.fillText(student.number, cx, cy + 23);
      } else {
        const nameSize = fitFont(ctx, student.name, width - 24, 30, 16, serif);
        ctx.fillStyle = isFront ? '#7c4328' : '#204438';
        ctx.textAlign = 'center';
        ctx.font = `700 ${nameSize}px ${serif}`;
        ctx.fillText(student.name, cx, cy + 10);
      }
    }

    ctx.restore();
  }

  function downloadCanvas(canvas, filename) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('图片生成失败'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 2500);
        resolve(blob);
      }, 'image/png');
    });
  }

  async function exportSeatingChart() {
    if (els.exportBtn.disabled) return;
    const originalHTML = els.exportBtn.innerHTML;
    els.exportBtn.disabled = true;
    els.exportBtn.innerHTML = '<span>生成中…</span>';
    closeSeatMenu();

    try {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const isExam = activeView === 'exam';
      const canvas = isExam ? buildExamExportCanvas() : buildExportCanvas();
      const safeClass = String(state.className || DEFAULT_CLASS_NAME).replace(/[\\/:*?"<>|]/g, '').trim() || '班级';
      const modeSuffix = state.mode === 'named' ? '姓名版' : '匿名版';
      const fileName = isExam ? `考试选排_${modeSuffix}` : `座位表_${modeSuffix}`;
      const filename = `${safeClass}_${fileName}_${fileSafeDate()}.png`;
      await downloadCanvas(canvas, filename);
      showToast(`已导出${modeSuffix}${isExam ? '考试选排图' : '座位图'}`, { type: 'success' });
    } catch (error) {
      console.warn('导出失败：', error);
      showToast('导出失败，请换用 Chrome / Edge 再试', { type: 'danger' });
    } finally {
      els.exportBtn.disabled = false;
      els.exportBtn.innerHTML = originalHTML;
    }
  }

  function printSeatingChart() {
    closeSeatMenu();
    renderChrome();
    window.print();
  }

  /* ---------------- Keyboard shortcuts ---------------- */

  function isEditingElement(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function handleGlobalKeydown(event) {
    const anyDialogOpen = Boolean(document.querySelector('dialog[open]'));

    if ((event.ctrlKey || event.metaKey) && !event.altKey && !anyDialogOpen) {
      const key = event.key.toLocaleLowerCase();
      if (key === 'z' && !isEditingElement(event.target)) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
        return;
      }
      if (key === 'y' && !isEditingElement(event.target)) {
        event.preventDefault();
        redo();
        return;
      }
    }

    if (event.key === '/' && !anyDialogOpen && !isEditingElement(event.target)) {
      event.preventDefault();
      els.searchInput.focus();
      els.searchInput.select();
      return;
    }

    if (event.key === 'Escape') {
      if (!els.seatMenu.hidden) {
        closeSeatMenu();
        return;
      }
      if (isProjecting) {
        exitProjection();
        return;
      }
      if (selectedStudentId) {
        clearSelection();
      }
    }
  }

  /* ---------------- Event binding ---------------- */

  function bindEvents() {
    bindClickEvents();
    bindDragEvents();

    els.importBtn.addEventListener('click', openImportDialog);
    els.clearRosterBtn.addEventListener('click', clearRoster);
    els.loadSampleBtn.addEventListener('click', loadSampleRoster);

    els.backupBtn.addEventListener('click', openBackupDialog);
    els.helpBtn.addEventListener('click', openHelpDialog);

    els.backupCloseBtn.addEventListener('click', closeBackupDialog);
    els.backupCancelBtn.addEventListener('click', closeBackupDialog);
    els.backupDialog.addEventListener('click', (event) => {
      if (event.target === els.backupDialog) closeBackupDialog();
    });
    els.backupDialog.addEventListener('close', resetBackupDialog);
    els.backupExportBtn.addEventListener('click', exportBackup);
    els.backupImportBtn.addEventListener('click', () => els.backupFileInput.click());
    els.backupFileInput.addEventListener('change', () => {
      const file = els.backupFileInput.files && els.backupFileInput.files[0];
      if (file) handleBackupFile(file);
    });
    [els.backupScopeSeats, els.backupScopeExam].forEach((checkbox) => {
      checkbox.addEventListener('change', () => setBackupError(els.backupExportError, ''));
    });

    els.helpCloseBtn.addEventListener('click', closeHelpDialog);
    els.helpDoneBtn.addEventListener('click', closeHelpDialog);
    els.helpDialog.addEventListener('click', (event) => {
      if (event.target === els.helpDialog) closeHelpDialog();
    });

    els.importCloseBtn.addEventListener('click', closeImportDialog);
    els.importCancelBtn.addEventListener('click', closeImportDialog);
    els.importConfirmBtn.addEventListener('click', commitImport);

    els.importDialog.addEventListener('click', (event) => {
      if (event.target === els.importDialog) closeImportDialog();
    });

    els.importDialog.addEventListener('close', resetImportDialog);

    els.dropZone.addEventListener('click', () => els.fileInput.click());
    els.dropZone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        els.fileInput.click();
      }
    });

    els.fileInput.addEventListener('change', () => {
      const file = els.fileInput.files && els.fileInput.files[0];
      if (file) handleImportFile(file);
    });

    ['dragenter', 'dragover'].forEach((type) => {
      els.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        els.dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'drop'].forEach((type) => {
      els.dropZone.addEventListener(type, (event) => {
        event.preventDefault();
        event.stopPropagation();
        els.dropZone.classList.remove('is-dragover');
      });
    });

    els.dropZone.addEventListener('drop', (event) => {
      const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) handleImportFile(file);
    });

    els.importText.addEventListener('input', updateImportPreview);

    els.confirmDialog.addEventListener('close', () => {
      // The dialog may have been reopened before this queued close event ran
      // (e.g. a confirm triggered while another one was still open). In that
      // case the event belongs to the old cycle and must not resolve the new one.
      if (els.confirmDialog.open) return;
      const resolve = confirmResolve;
      confirmResolve = null;
      if (resolve) resolve(els.confirmDialog.returnValue === 'ok');
    });

    els.confirmOkBtn.addEventListener('click', () => {
      els.confirmDialog.returnValue = 'ok';
      els.confirmDialog.close();
    });

    els.confirmCancelBtn.addEventListener('click', () => {
      els.confirmDialog.returnValue = 'cancel';
      els.confirmDialog.close();
    });

    els.projectBtn.addEventListener('click', enterProjection);
    els.exitProjectionBtn.addEventListener('click', () => exitProjection());
    els.printBtn.addEventListener('click', printSeatingChart);
    els.exportBtn.addEventListener('click', exportSeatingChart);

    els.classNameInput.addEventListener('input', () => {
      state.className = els.classNameInput.value;
      els.printClassName.textContent = state.className || DEFAULT_CLASS_NAME;
      scheduleSave();
    });

    els.classNameInput.addEventListener('blur', () => {
      const value = els.classNameInput.value.trim();
      state.className = value || DEFAULT_CLASS_NAME;
      els.classNameInput.value = state.className;
      els.printClassName.textContent = state.className;
      scheduleSave();
      renderChrome();
    });

    els.classNameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        els.classNameInput.blur();
      }
    });

    document.addEventListener('keydown', handleGlobalKeydown);

    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && isProjecting) {
        exitProjection({ fullscreen: false });
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') saveStateNow();
    });

    window.addEventListener('beforeunload', saveStateNow);
    window.addEventListener('afterprint', () => {
      els.printClassName.textContent = state.className || DEFAULT_CLASS_NAME;
    });

    window.addEventListener('beforeprint', () => {
      els.printClassName.textContent = state.className || DEFAULT_CLASS_NAME;
      els.printDate.textContent = displayDate();
      els.printMode.textContent = state.mode === 'named' ? '姓名版' : '匿名版';
      els.examPrintClassName.textContent = state.className || DEFAULT_CLASS_NAME;
      els.examPrintDate.textContent = displayDate();
      els.examPrintMode.textContent = state.mode === 'named' ? '姓名版' : '匿名版';
    });
  }

  /* ---------------- Init ---------------- */

  function init() {
    loadState();

    els.classNameInput.value = state.className || DEFAULT_CLASS_NAME;
    els.seatTotalText.textContent = `共 ${TOTAL_SEATS} 个座位`;
    els.printClassName.textContent = state.className || DEFAULT_CLASS_NAME;
    els.printDate.textContent = displayDate();
    els.printMode.textContent = state.mode === 'named' ? '姓名版' : '匿名版';
    els.importText.placeholder = '每行一名学生，姓名在前、学号在后：\n张三, 20260101\n李四, 20260102\n\n也可以直接粘贴 Excel 中的两列，表头会自动识别。';

    bindEvents();
    renderAll();
    updateHistoryButtons();
    setSaveUI('idle');
  }

  init();

  // Small internal hook for automated checks and debugging. It is intentionally
  // non-enumerable and does not affect normal use.
  Object.defineProperty(window, '__seatingStudio', {
    value: {
      state,
      SEAT_DEFS,
      EXAM_SLOT_DEFS,
      renderAll,
      setMode,
      setView,
      loadSampleRoster,
      assignStudent,
      unassignSeat,
      assignExam,
      unassignExam,
      parseRosterText,
      parseXlsx,
      buildExportCanvas,
      buildExamExportCanvas,
      exportSeatingChart,
      parseBackupData,
      applyBackup,
      openBackupDialog
    },
    configurable: true
  });
})();
