let character = null;
let previousLife = null;
let inventoryOpen = false;
let openInventoryItemId = null;
let magicOpen = false;
let openMagicItemId = null;
const openMagicReadSections = new Set();
let ritualOpen = false;
let openRitualItemId = null;
const openRitualReadSections = new Set();
let personModalState = { type: 'ally', id: null, isNew: false, editing: false, original: null };

const $ = (id) => document.getElementById(id);

const tabs = document.querySelectorAll('.tab-button');
const tabPanels = document.querySelectorAll('.tab-panel');

const overviewEls = {
  title: $('titleText'),
  subtitle: $('subtitleText'),
  description: $('descriptionText'),
  profileImage: $('profileImage'),
  lifeValue: $('lifeValue'),
  topLifeValue: $('topLifeValue'),
  floatingLifeValue: $('floatingLifeValue'),
  energyValue: $('energyValue'),
  lifeBar: $('lifeBar'),
  topLifeBar: $('topLifeBar'),
  floatingLifeBar: $('floatingLifeBar'),
  topLifeTrack: document.querySelector('.top-life-track'),
  floatingLifeTrack: document.querySelector('.floating-life-track'),
  energyBar: $('energyBar'),
  armorTotal: $('armorTotal'),
  armorSkin: $('armorSkin'),
  armorGear: $('armorGear'),
  attacksList: $('attacksList'),
  basicList: $('basicList'),
  extraList: $('extraList'),
  passivesList: $('passivesList'),
  traumasList: $('traumasList'),
  logList: $('logList'),
  magicToggle: $('magicToggle'),
  magicBody: $('magicBody'),
  magicList: $('magicList'),
  magicCount: $('magicCount'),
  ritualToggle: $('ritualToggle'),
  ritualBody: $('ritualBody'),
  ritualList: $('ritualList'),
  ritualCount: $('ritualCount'),
  inventoryToggle: $('inventoryToggle'),
  inventoryBody: $('inventoryBody'),
  inventoryList: $('inventoryList'),
  inventoryCount: $('inventoryCount')
};

const editorEls = {
  title: $('editTitle'),
  name: $('editName'),
  subtitle: $('editSubtitle'),
  description: $('editDescription'),
  profileImage: $('editProfileImage'),
  profileImageFile: $('editProfileImageFile'),
  profilePreview: $('editProfilePreview'),
  profileUploadStatus: $('editProfileUploadStatus'),
  profileEditor: $('profileImageEditor'),
  lifeCurrent: $('editLifeCurrent'),
  lifeMax: $('editLifeMax'),
  energyCurrent: $('editEnergyCurrent'),
  energyMax: $('editEnergyMax'),
  armorTotal: $('editArmorTotal'),
  armorSkin: $('editArmorSkin'),
  armorGear: $('editArmorGear'),
  attacksList: $('editAttacksList'),
  basicList: $('editBasicList'),
  extraList: $('editExtraList'),
  passivesList: $('editPassivesList'),
  traumasList: $('editTraumasList'),
  magicList: $('editMagicList'),
  ritualList: $('editRitualList'),
  inventoryList: $('editInventoryList')
};

const rosterEls = {
  alliesGrid: $('alliesGrid'),
  enemiesGrid: $('enemiesGrid'),
  modal: $('personModal'),
  title: $('personDialogTitle'),
  typeLabel: $('personTypeLabel'),
  viewStatus: $('personViewStatus'),
  image: $('personPreviewImage'),
  name: $('personNameInput'),
  statusLabel: $('personStatusLabel'),
  status: $('personStatusInput'),
  imageFile: $('personImageFile'),
  imagePath: $('personImagePath'),
  uploadStatus: $('personUploadStatus'),
  description: $('personDescriptionInput'),
  viewDescription: $('personViewDescription'),
  editButton: $('personEditButton'),
  deleteButton: $('personDeleteButton'),
  cancelButton: $('personCancelButton'),
  saveButton: $('personSaveButton')
};

function activateTab(tabName) {
  tabs.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  tabPanels.forEach(panel => panel.classList.toggle('active', panel.id === tabName));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

tabs.forEach(btn => btn.addEventListener('click', () => activateTab(btn.dataset.tab)));

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Erro na requisição');
  return data;
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

const ENEMY_STATUS_LABELS = {
  'vivo': 'Vivo',
  'provavelmente vivo': 'Provavelmente vivo',
  'morto': 'Morto',
  'provavelmente morto': 'Provavelmente morto',
  'desconhecido': 'Desconhecido'
};

function enemyStatusClass(status) {
  return `status-${String(status || 'desconhecido').toLowerCase().replace(/\s+/g, '-')}`;
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

function hexRgb(hex) {
  const raw = String(hex).replace('#', '');
  return { r: parseInt(raw.slice(0,2), 16), g: parseInt(raw.slice(2,4), 16), b: parseInt(raw.slice(4,6), 16) };
}

function rgbCss(rgb) {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}

function lifeColor(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0));
  const stops = [
    [0, '#000000'],
    [5, '#1c0003'],
    [20, '#4a0008'],
    [35, '#830811'],
    [50, '#bd3212'],
    [65, '#d88200'],
    [80, '#8fc900'],
    [100, '#2cff18']
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p1, c1] = stops[i];
    const [p2, c2] = stops[i + 1];
    if (p >= p1 && p <= p2) {
      const t = (p - p1) / (p2 - p1 || 1);
      return mixRgb(hexRgb(c1), hexRgb(c2), t);
    }
  }
  return hexRgb('#2cff18');
}

function applyLifeBarColors(percent) {
  const color = lifeColor(percent);
  const darker = mixRgb({ r: 0, g: 0, b: 0 }, color, percent === 0 ? 0 : 0.58);
  const gradient = percent <= 0
    ? '#000000'
    : `linear-gradient(90deg, ${rgbCss(darker)}, ${rgbCss(color)})`;
  [overviewEls.lifeBar, overviewEls.topLifeBar, overviewEls.floatingLifeBar].forEach(bar => {
    if (bar) bar.style.background = gradient;
  });
  [overviewEls.topLifeValue, overviewEls.floatingLifeValue].forEach(label => {
    if (label) label.style.color = percent <= 0 ? '#707070' : rgbCss(color);
  });
}

function personCollection(type) {
  return type === 'enemy' ? (character.enemies ||= []) : (character.allies ||= []);
}

function createRosterCard(person, type) {
  const button = make('button', `roster-card ${type === 'enemy' ? 'enemy-card' : 'ally-card'}`);
  button.type = 'button';
  button.appendChild(make('h4', 'roster-card-name', person.name || (type === 'enemy' ? 'INIMIGO SEM NOME' : 'ALIADO SEM NOME')));

  const imageWrap = make('div', 'roster-card-image');
  if (person.image) {
    const img = document.createElement('img');
    img.src = person.image;
    img.alt = person.name || 'Retrato';
    img.loading = 'lazy';
    imageWrap.appendChild(img);
  } else {
    imageWrap.appendChild(make('div', 'roster-image-placeholder', 'SEM IMAGEM'));
  }
  button.appendChild(imageWrap);

  if (type === 'enemy') {
    const status = String(person.status || 'desconhecido').toLowerCase();
    button.appendChild(make('span', `enemy-status ${enemyStatusClass(status)}`, ENEMY_STATUS_LABELS[status] || 'Desconhecido'));
  }

  button.addEventListener('click', () => openPersonModal(type, person.id));
  return button;
}

function renderRosters() {
  if (!character) return;
  rosterEls.alliesGrid.innerHTML = '';
  rosterEls.enemiesGrid.innerHTML = '';
  const allies = Array.isArray(character.allies) ? character.allies : [];
  const enemies = Array.isArray(character.enemies) ? character.enemies : [];

  if (!allies.length) rosterEls.alliesGrid.appendChild(make('div', 'roster-empty', 'Nenhum aliado cadastrado.'));
  else allies.forEach(person => rosterEls.alliesGrid.appendChild(createRosterCard(person, 'ally')));

  if (!enemies.length) rosterEls.enemiesGrid.appendChild(make('div', 'roster-empty', 'Nenhum inimigo cadastrado.'));
  else enemies.forEach(person => rosterEls.enemiesGrid.appendChild(createRosterCard(person, 'enemy')));
}

function setPersonEditing(editing) {
  personModalState.editing = Boolean(editing);
  const canEdit = personModalState.editing;

  rosterEls.modal.classList.toggle('editing', canEdit);
  rosterEls.modal.querySelectorAll('.person-edit-only').forEach(el => { el.hidden = !canEdit; });
  rosterEls.statusLabel.hidden = !canEdit || personModalState.type !== 'enemy';
  rosterEls.viewDescription.hidden = canEdit;
  rosterEls.viewStatus.hidden = true;
  rosterEls.editButton.hidden = canEdit || personModalState.isNew;
  rosterEls.saveButton.hidden = !canEdit;
  rosterEls.cancelButton.hidden = !canEdit;
  rosterEls.deleteButton.hidden = personModalState.isNew;

  // Segurança extra: mesmo que algum campo fique visível por CSS/cache,
  // ele permanece bloqueado até o usuário clicar explicitamente em Editar.
  [rosterEls.name, rosterEls.status, rosterEls.description, rosterEls.imageFile].forEach(control => {
    if (control) control.disabled = !canEdit;
  });

  if (!canEdit) {
    const person = personModalState.original;
    // Descarta qualquer alteração local não salva ao voltar para visualização.
    populatePersonFields(person, personModalState.type);
    rosterEls.title.textContent = person?.name || (personModalState.type === 'enemy' ? 'Inimigo' : 'Aliado');
    rosterEls.viewDescription.textContent = person?.description || 'Sem descrição.';
    if (personModalState.type === 'enemy') {
      const status = String(person?.status || 'desconhecido').toLowerCase();
      rosterEls.viewStatus.textContent = ENEMY_STATUS_LABELS[status] || 'Desconhecido';
      rosterEls.viewStatus.className = `enemy-status person-view-status ${enemyStatusClass(status)}`;
      rosterEls.viewStatus.hidden = false;
    }
  }
}

function populatePersonFields(person, type) {
  rosterEls.typeLabel.textContent = type === 'enemy' ? 'INIMIGO' : 'ALIADO';
  rosterEls.name.value = person?.name || '';
  rosterEls.status.value = person?.status || 'desconhecido';
  rosterEls.statusLabel.hidden = type !== 'enemy';
  rosterEls.description.value = person?.description || '';
  rosterEls.imagePath.value = person?.image || '';
  rosterEls.image.src = person?.image || 'assets/profile-placeholder.svg';
  rosterEls.uploadStatus.textContent = person?.image ? `Imagem atual: ${person.image}` : 'Nenhuma imagem cadastrada.';
}

function openPersonModal(type, id = null) {
  const collection = personCollection(type);
  const existing = id ? collection.find(item => item.id === id) : null;
  const isNew = !existing;
  const draft = existing ? { ...existing } : { id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2,8)}`, name: '', image: '', description: '', ...(type === 'enemy' ? { status: 'desconhecido' } : {}) };
  personModalState = { type, id: draft.id, isNew, editing: isNew, original: { ...draft } };
  populatePersonFields(draft, type);
  rosterEls.title.textContent = isNew ? (type === 'enemy' ? 'Novo inimigo' : 'Novo aliado') : (draft.name || (type === 'enemy' ? 'Inimigo' : 'Aliado'));
  rosterEls.modal.hidden = false;
  document.body.classList.add('modal-open');
  setPersonEditing(isNew);
}

function closePersonModal() {
  rosterEls.modal.hidden = true;
  document.body.classList.remove('modal-open');
  rosterEls.imageFile.value = '';
  delete rosterEls.modal.dataset.uploading;
}

async function persistCharacter() {
  const data = await request('/api/character', { method: 'POST', body: JSON.stringify(character) });
  character = data.character;
  renderRosters();
  return character;
}

async function uploadPersonImage(file) {
  if (!personModalState.editing) return;
  rosterEls.modal.dataset.uploading = 'true';
  rosterEls.uploadStatus.className = 'upload-status person-edit-only';
  rosterEls.uploadStatus.textContent = 'Copiando imagem para o projeto...';
  try {
    const dataUrl = await readFileAsDataURL(file);
    const result = await request('/api/upload-image', { method: 'POST', body: JSON.stringify({ dataUrl, originalName: file.name }) });
    rosterEls.imagePath.value = result.path;
    rosterEls.image.src = result.path;
    rosterEls.uploadStatus.className = 'upload-status success person-edit-only';
    rosterEls.uploadStatus.textContent = `Imagem salva: ${result.path}`;
  } catch (error) {
    rosterEls.uploadStatus.className = 'upload-status error person-edit-only';
    rosterEls.uploadStatus.textContent = `Erro: ${error.message}`;
  } finally {
    delete rosterEls.modal.dataset.uploading;
  }
}

async function savePersonFromModal() {
  if (!personModalState.editing) return alert('Clique em Editar antes de alterar este perfil.');
  if (rosterEls.modal.dataset.uploading === 'true') return alert('Aguarde a imagem terminar de carregar.');
  const name = rosterEls.name.value.trim();
  if (!name) return alert('Digite o nome antes de salvar.');
  const type = personModalState.type;
  const collection = personCollection(type);
  const item = {
    id: personModalState.id,
    name,
    image: rosterEls.imagePath.value.trim(),
    description: rosterEls.description.value.trim(),
    ...(type === 'enemy' ? { status: rosterEls.status.value } : {})
  };
  const index = collection.findIndex(entry => entry.id === item.id);
  if (index >= 0) collection[index] = item;
  else collection.push(item);
  await persistCharacter();
  personModalState.original = { ...item };
  personModalState.isNew = false;
  closePersonModal();
}

async function deletePersonFromModal() {
  const type = personModalState.type;
  const label = type === 'enemy' ? 'inimigo' : 'aliado';
  if (!confirm(`Excluir este ${label}?`)) return;
  const collection = personCollection(type);
  const index = collection.findIndex(entry => entry.id === personModalState.id);
  if (index >= 0) collection.splice(index, 1);
  await persistCharacter();
  closePersonModal();
}

const DEFAULT_THEME = { primary: '#8b1730', secondary: '#ff3b33' };
let savedTheme = { ...DEFAULT_THEME };
let draftTheme = { ...DEFAULT_THEME };

function normalizeHex(value, fallback = '#000000') {
  const raw = String(value || '').trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(raw)) return raw;
  if (/^[0-9a-f]{6}$/.test(raw)) return `#${raw}`;
  return fallback;
}

function applyTheme(theme) {
  const primary = normalizeHex(theme?.primary, DEFAULT_THEME.primary);
  const secondary = normalizeHex(theme?.secondary, DEFAULT_THEME.secondary);
  document.documentElement.style.setProperty('--theme-primary', primary);
  document.documentElement.style.setProperty('--theme-secondary', secondary);
  const preview = $('themeGradientPreview');
  if (preview) preview.style.background = `linear-gradient(90deg, ${primary}, ${secondary})`;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex, '#000000').slice(1);
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgbToHex(r, g, b) {
  const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * (((b - r) / delta) + 2);
    else h = 60 * (((r - g) / delta) + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  return { h, s: s * 100, v: max * 100 };
}

function hsvToRgb(h, s, v) {
  s /= 100; v /= 100;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0, gp = 0, bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return { r: (rp + m) * 255, g: (gp + m) * 255, b: (bp + m) * 255 };
}

function createThemeColorPicker(prefix, onChange) {
  const svCanvas = $(`${prefix}SvCanvas`);
  const hueCanvas = $(`${prefix}HueCanvas`);
  const svHandle = $(`${prefix}SvHandle`);
  const hueHandle = $(`${prefix}HueHandle`);
  const hexInput = $(`${prefix}Hex`);
  const swatch = $(`${prefix}Swatch`);
  const state = { h: 0, s: 100, v: 100 };

  function drawHue() {
    const ctx = hueCanvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, hueCanvas.width, 0);
    [
      [0, '#ff0000'], [1/6, '#ffff00'], [2/6, '#00ff00'],
      [3/6, '#00ffff'], [4/6, '#0000ff'], [5/6, '#ff00ff'], [1, '#ff0000']
    ].forEach(([stop, color]) => gradient.addColorStop(stop, color));
    ctx.clearRect(0, 0, hueCanvas.width, hueCanvas.height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, hueCanvas.width, hueCanvas.height);
  }

  function drawSv() {
    const ctx = svCanvas.getContext('2d');
    const hueRgb = hsvToRgb(state.h, 100, 100);
    ctx.clearRect(0, 0, svCanvas.width, svCanvas.height);
    ctx.fillStyle = rgbToHex(hueRgb.r, hueRgb.g, hueRgb.b);
    ctx.fillRect(0, 0, svCanvas.width, svCanvas.height);

    const white = ctx.createLinearGradient(0, 0, svCanvas.width, 0);
    white.addColorStop(0, '#ffffff');
    white.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = white;
    ctx.fillRect(0, 0, svCanvas.width, svCanvas.height);

    const black = ctx.createLinearGradient(0, 0, 0, svCanvas.height);
    black.addColorStop(0, 'rgba(0,0,0,0)');
    black.addColorStop(1, '#000000');
    ctx.fillStyle = black;
    ctx.fillRect(0, 0, svCanvas.width, svCanvas.height);
  }

  function currentHex() {
    const rgb = hsvToRgb(state.h, state.s, state.v);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }

  function updateUi(emit = true) {
    drawSv();
    const hex = currentHex();
    svHandle.style.left = `${state.s}%`;
    svHandle.style.top = `${100 - state.v}%`;
    hueHandle.style.left = `${(state.h / 360) * 100}%`;
    hexInput.value = hex.toUpperCase();
    swatch.style.background = hex;
    if (emit) onChange(hex);
  }

  function setHex(hex, emit = false) {
    const normalized = normalizeHex(hex, '#000000');
    const rgb = hexToRgb(normalized);
    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    state.h = hsv.h;
    state.s = hsv.s;
    state.v = hsv.v;
    updateUi(emit);
  }

  function eventPosition(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(rect.width, event.clientX - rect.left)),
      y: Math.max(0, Math.min(rect.height, event.clientY - rect.top)),
      width: rect.width,
      height: rect.height
    };
  }

  function bindDrag(canvas, updater) {
    let dragging = false;
    const move = event => {
      if (!dragging) return;
      event.preventDefault();
      updater(eventPosition(event, canvas));
    };
    canvas.addEventListener('pointerdown', event => {
      dragging = true;
      canvas.setPointerCapture?.(event.pointerId);
      updater(eventPosition(event, canvas));
    });
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', event => {
      dragging = false;
      canvas.releasePointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointercancel', () => { dragging = false; });
  }

  bindDrag(svCanvas, pos => {
    if (!pos.width || !pos.height) return;
    state.s = (pos.x / pos.width) * 100;
    state.v = 100 - (pos.y / pos.height) * 100;
    updateUi(true);
  });

  bindDrag(hueCanvas, pos => {
    if (!pos.width) return;
    state.h = Math.max(0, Math.min(359.999, (pos.x / pos.width) * 360));
    updateUi(true);
  });

  hexInput.addEventListener('input', () => {
    const value = normalizeHex(hexInput.value, '');
    if (!value) return;
    setHex(value, true);
  });

  drawHue();
  setHex('#ff0000', false);
  return { setHex, getHex: currentHex };
}

const themeModal = $('themeModal');
const primaryThemePicker = createThemeColorPicker('primary', hex => {
  draftTheme.primary = hex;
  applyTheme(draftTheme);
});
const secondaryThemePicker = createThemeColorPicker('secondary', hex => {
  draftTheme.secondary = hex;
  applyTheme(draftTheme);
});

function openThemeModal() {
  const current = character?.theme || savedTheme || DEFAULT_THEME;
  savedTheme = {
    primary: normalizeHex(current.primary, DEFAULT_THEME.primary),
    secondary: normalizeHex(current.secondary, DEFAULT_THEME.secondary)
  };
  draftTheme = { ...savedTheme };
  primaryThemePicker.setHex(draftTheme.primary, false);
  secondaryThemePicker.setHex(draftTheme.secondary, false);
  applyTheme(draftTheme);
  themeModal.hidden = false;
  document.body.classList.add('theme-modal-open');
}

function closeThemeModal({ revert = true } = {}) {
  if (revert) applyTheme(savedTheme);
  themeModal.hidden = true;
  document.body.classList.remove('theme-modal-open');
}

$('themeButton').addEventListener('click', openThemeModal);
$('themeCloseButton').addEventListener('click', () => closeThemeModal({ revert: true }));
$('themeCancelButton').addEventListener('click', () => closeThemeModal({ revert: true }));
themeModal.querySelector('[data-theme-close]').addEventListener('click', () => closeThemeModal({ revert: true }));
$('themeResetButton').addEventListener('click', () => {
  draftTheme = { ...DEFAULT_THEME };
  primaryThemePicker.setHex(draftTheme.primary, false);
  secondaryThemePicker.setHex(draftTheme.secondary, false);
  applyTheme(draftTheme);
});
$('themeSaveButton').addEventListener('click', async () => {
  try {
    const data = await request('/api/theme', {
      method: 'POST',
      body: JSON.stringify(draftTheme)
    });
    character = data.character;
    savedTheme = { ...data.theme };
    draftTheme = { ...data.theme };
    applyTheme(savedTheme);
    closeThemeModal({ revert: false });
  } catch (error) {
    alert('Não foi possível salvar o tema: ' + error.message);
  }
});

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (!rosterEls.modal.hidden) closePersonModal();
  else if (!themeModal.hidden) closeThemeModal({ revert: true });
});

function renderPillList(container, items) {
  container.innerHTML = '';
  if (!items?.length) {
    container.appendChild(make('li', '', 'Nenhum item cadastrado.'));
    return;
  }
  items.forEach(item => container.appendChild(make('li', '', item)));
}

function renderAttributeList(container, items) {
  container.innerHTML = '';
  (items || []).forEach(item => {
    const row = make('div', 'attribute-row');
    row.append(make('span', '', item.name), make('strong', '', item.value));
    container.appendChild(row);
  });
}

function renderAttackList(container, items) {
  container.innerHTML = '';
  (items || []).forEach(item => {
    const card = make('article', 'attack-card');

    const content = make('div', 'attack-card-content');
    content.appendChild(make('h4', '', item.name));

    const roll = make('p');
    const rollLabel = make('strong', '', 'Rolagem: ');
    roll.append(rollLabel, document.createTextNode(`${item.roll || '-'}${item.bonus ? ` + ${item.bonus}` : ''}`));
    content.appendChild(roll);

    if (item.notes) content.appendChild(make('p', 'attack-notes', item.notes));

    const previewWrap = make('div', 'attack-preview-wrap');
    if (item.preview) {
      const preview = document.createElement('img');
      preview.className = 'attack-preview';
      preview.src = item.preview;
      preview.alt = `Prévia da habilidade ${item.name}`;
      preview.loading = 'lazy';
      previewWrap.appendChild(preview);
    } else {
      previewWrap.appendChild(make('div', 'attack-preview-placeholder', 'SEM PRÉVIA'));
    }

    card.append(content, previewWrap);
    container.appendChild(card);
  });
}

function renderLog(container, entries) {
  container.innerHTML = '';
  if (!entries?.length) {
    container.appendChild(make('div', 'log-entry', 'Nenhum registro ainda.'));
    return;
  }
  entries.forEach(entry => {
    const div = make('div', 'log-entry');
    div.append(make('small', '', entry.timestamp), make('div', '', entry.message));
    container.appendChild(div);
  });
}

function inventorySection(title, text) {
  if (!text) return null;
  const section = make('section', 'inventory-copy-section');
  section.append(make('h4', '', title), make('p', '', text));
  return section;
}

// Seções de leitura compactas. A expansão é estado da interface, não do personagem.
function createReadSection(group, itemId, field, label, count = null) {
  const section = document.createElement('details');
  section.className = 'forge-read-section';
  const key = `${itemId}::${field}`;
  const opened = group === 'magic' ? openMagicReadSections : openRitualReadSections;
  section.open = opened.has(key);
  const summary = document.createElement('summary');
  summary.appendChild(make('span', '', label));
  if (count !== null) summary.appendChild(make('span', 'forge-section-count', String(count)));
  const body = make('div', 'forge-read-content');
  section.append(summary, body);
  section.addEventListener('toggle', () => {
    if (section.open) opened.add(key);
    else opened.delete(key);
  });
  return { section, body };
}

function getReaderScroll(body, openId) {
  const expanded = [...body.querySelectorAll('.inventory-item.open .inventory-item-details')];
  const active = expanded.find(node => node.parentElement.dataset.entryId === openId);
  return { body: body.scrollTop, detail: active?.scrollTop || 0 };
}
function restoreReaderScroll(body, openId, position) {
  body.scrollTop = position.body;
  if (!openId) return;
  const expanded = [...body.querySelectorAll('.inventory-item.open .inventory-item-details')];
  const active = expanded.find(node => node.parentElement.dataset.entryId === openId);
  if (active) active.scrollTop = position.detail;
}

function renderMagicParticularities() {
  const items = Array.isArray(character.magicParticularities) ? character.magicParticularities : [];
  overviewEls.magicCount.textContent = String(items.length);
  overviewEls.magicToggle.setAttribute('aria-expanded', String(magicOpen));
  overviewEls.magicBody.hidden = !magicOpen;
  const previousScroll = getReaderScroll(overviewEls.magicBody, openMagicItemId);
  overviewEls.magicList.innerHTML = '';

  if (!items.length) {
    overviewEls.magicList.appendChild(make('div', 'inventory-empty', 'Nenhum registro.'));
    return;
  }

  items.forEach((item, index) => {
    const itemId = item.id || `magic-${index}`;
    const article = make('article', 'inventory-item magic-item');
    article.dataset.entryId = itemId;
    if (openMagicItemId === itemId) article.classList.add('open');

    const head = make('button', 'inventory-item-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(openMagicItemId === itemId));
    const thumb = make('div', 'inventory-thumb');
    const thumbImg = document.createElement('img');
    thumbImg.src = item.image || 'assets/profile-placeholder.svg';
    thumbImg.alt = '';
    thumb.appendChild(thumbImg);
    head.append(thumb, make('span', 'inventory-item-title', item.title || 'SEM TÍTULO'), make('span', 'inventory-item-arrow', '⌄'));

    const details = make('div', 'inventory-item-details magic-item-details');
    details.appendChild(make('div', 'inventory-detail-title', item.title || 'SEM TÍTULO'));
    const fullImg = document.createElement('img');
    fullImg.className = 'inventory-full-image magic-full-image';
    fullImg.src = item.image || 'assets/profile-placeholder.svg';
    fullImg.alt = item.title || 'Magia ou particularidade';
    details.appendChild(fullImg);
    if (item.description) {
      const description = createReadSection('magic', itemId, 'description', 'DESCRIÇÃO');
      description.body.appendChild(make('p', 'magic-description', item.description));
      details.appendChild(description.section);
    }

    const abilities = Array.isArray(item.abilities) ? item.abilities : [];
    if (abilities.length) {
      const abilitiesSection = createReadSection('magic', itemId, 'abilities', 'CAPACIDADES', abilities.length);
      abilities.forEach(ability => {
        const abilityCard = make('article', 'magic-ability-card');
        const abilityHead = make('div', 'magic-ability-heading');
        abilityHead.appendChild(make('h5', '', ability.title || 'HABILIDADE'));
        if (ability.value?.trim()) abilityHead.appendChild(make('span', 'magic-ability-value', ability.value));
        abilityCard.appendChild(abilityHead);
        if (ability.description) abilityCard.appendChild(make('p', 'magic-entry-description', ability.description));
        abilitiesSection.body.appendChild(abilityCard);
      });
      details.appendChild(abilitiesSection.section);
    }

    const statusEffects = Array.isArray(item.statusEffects) ? item.statusEffects : [];
    if (statusEffects.length) {
      const statusSection = createReadSection('magic', itemId, 'statuses', 'EFEITOS DE STATUS', statusEffects.length);
      statusEffects.forEach(status => {
        const statusCard = make('article', 'magic-status-card');
        statusCard.appendChild(make('h5', '', status.title || 'EFEITO'));
        const stacks = Array.isArray(status.stacks) ? status.stacks : [];
        stacks.forEach(stack => {
          const row = make('div', 'magic-stack-row');
          row.append(make('strong', '', stack.label || 'Stack'), make('span', '', stack.effect || '—'));
          statusCard.appendChild(row);
        });
        statusSection.body.appendChild(statusCard);
      });
      details.appendChild(statusSection.section);
    }

    head.addEventListener('click', () => {
      openMagicItemId = openMagicItemId === itemId ? null : itemId;
      renderMagicParticularities();
    });

    article.append(head, details);
    overviewEls.magicList.appendChild(article);
  });
  restoreReaderScroll(overviewEls.magicBody, openMagicItemId, previousScroll);
}

function renderRituals() {
  const rituals = Array.isArray(character.rituals) ? character.rituals : [];
  overviewEls.ritualCount.textContent = String(rituals.length);
  overviewEls.ritualToggle.setAttribute('aria-expanded', String(ritualOpen));
  overviewEls.ritualBody.hidden = !ritualOpen;
  const previousScroll = getReaderScroll(overviewEls.ritualBody, openRitualItemId);
  overviewEls.ritualList.innerHTML = '';

  if (!rituals.length) {
    overviewEls.ritualList.appendChild(make('div', 'inventory-empty', 'Nenhum ritual.'));
    return;
  }
  rituals.forEach((ritual, index) => {
    const id = ritual.id || `ritual-${index}`;
    const card = make('article', 'inventory-item ritual-item');
    card.dataset.entryId = id;
    if (openRitualItemId === id) card.classList.add('open');
    const head = make('button', 'inventory-item-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(openRitualItemId === id));
    const thumb = make('div', 'inventory-thumb');
    const image = document.createElement('img');
    image.src = ritual.image || 'assets/profile-placeholder.svg';
    image.alt = '';
    thumb.appendChild(image);
    head.append(thumb, make('span', 'inventory-item-title', ritual.title || 'SEM TÍTULO'), make('span', 'inventory-item-arrow', '⌄'));
    const details = make('div', 'inventory-item-details ritual-item-details');
    details.appendChild(make('div', 'inventory-detail-title', ritual.title || 'SEM TÍTULO'));
    if (ritual.image) {
      const fullImg = document.createElement('img');
      fullImg.className = 'inventory-full-image magic-full-image';
      fullImg.src = ritual.image;
      fullImg.alt = ritual.title || 'Ritual';
      details.appendChild(fullImg);
    }
    if (ritual.description) {
      const description = createReadSection('ritual', id, 'description', 'DESCRIÇÃO');
      description.body.appendChild(make('p', 'magic-description', ritual.description));
      details.appendChild(description.section);
    }
    const capacities = Array.isArray(ritual.capacities) ? ritual.capacities : [];
    if (capacities.length) {
      const section = createReadSection('ritual', id, 'capacities', 'CAPACIDADES', capacities.length);
      capacities.forEach(capacity => {
        const entry = make('article', 'magic-ability-card ritual-capacity-card');
        const header = make('div', 'magic-ability-heading');
        if (capacity.title) header.appendChild(make('h5', '', capacity.title));
        if (capacity.cost) header.appendChild(make('span', 'magic-ability-value ritual-cost', `Custo: ${capacity.cost}`));
        entry.appendChild(header);
        if (capacity.effect) entry.appendChild(make('p', 'magic-entry-description', capacity.effect));
        section.body.appendChild(entry);
      });
      details.appendChild(section.section);
    }
    head.addEventListener('click', () => {
      openRitualItemId = openRitualItemId === id ? null : id;
      renderRituals();
    });
    card.append(head, details);
    overviewEls.ritualList.appendChild(card);
  });
  restoreReaderScroll(overviewEls.ritualBody, openRitualItemId, previousScroll);
}

function renderInventory() {
  const items = Array.isArray(character.inventory) ? character.inventory : [];
  overviewEls.inventoryCount.textContent = `${items.length} ${items.length === 1 ? 'ITEM' : 'ITENS'}`;
  overviewEls.inventoryToggle.setAttribute('aria-expanded', String(inventoryOpen));
  overviewEls.inventoryBody.hidden = !inventoryOpen;
  overviewEls.inventoryList.innerHTML = '';

  if (!items.length) {
    overviewEls.inventoryList.appendChild(make('div', 'inventory-empty', 'Inventário vazio.'));
    return;
  }

  items.forEach((item, index) => {
    const itemId = item.id || `item-${index}`;
    const article = make('article', 'inventory-item');
    if (openInventoryItemId === itemId) article.classList.add('open');

    const head = make('button', 'inventory-item-head');
    head.type = 'button';
    const thumb = make('div', 'inventory-thumb');
    const thumbImg = document.createElement('img');
    thumbImg.src = item.image || 'assets/profile-placeholder.svg';
    thumbImg.alt = '';
    thumb.appendChild(thumbImg);
    head.append(thumb, make('span', 'inventory-item-title', item.title || 'ITEM SEM NOME'), make('span', 'inventory-item-arrow', '⌄'));

    const details = make('div', 'inventory-item-details');
    const fullImg = document.createElement('img');
    fullImg.className = 'inventory-full-image';
    fullImg.src = item.image || 'assets/profile-placeholder.svg';
    fullImg.alt = item.title || 'Item do inventário';
    details.appendChild(fullImg);
    details.appendChild(make('div', 'inventory-detail-title', item.title || 'ITEM SEM NOME'));

    const attrs = Array.isArray(item.attributes) ? item.attributes : [];
    if (attrs.length) {
      const attrBox = make('div', 'inventory-attributes');
      attrs.forEach(attr => {
        const row = make('div', 'inventory-attr-row');
        row.append(make('strong', '', attr.name || 'Atributo'), make('span', '', attr.value || '-'));
        attrBox.appendChild(row);
      });
      details.appendChild(attrBox);
    }

    [
      inventorySection('VANTAGENS', item.advantages),
      inventorySection('DESVANTAGENS', item.disadvantages),
      inventorySection('INFO / LORE', item.info)
    ].filter(Boolean).forEach(section => details.appendChild(section));

    head.addEventListener('click', () => {
      openInventoryItemId = openInventoryItemId === itemId ? null : itemId;
      renderInventory();
    });

    article.append(head, details);
    overviewEls.inventoryList.appendChild(article);
  });
}

function animateLifeChange(currentLife) {
  if (previousLife === null || previousLife === currentLife) {
    previousLife = currentLife;
    return;
  }
  const effectClass = currentLife < previousLife ? 'life-hit' : 'life-heal';
  [overviewEls.topLifeTrack, overviewEls.floatingLifeTrack].forEach(track => {
    track.classList.remove('life-hit', 'life-heal');
    void track.offsetWidth;
    track.classList.add(effectClass);
    setTimeout(() => track.classList.remove(effectClass), 520);
  });
  previousLife = currentLife;
}

function renderOverview() {
  overviewEls.title.textContent = character.title || '';
  const namePart = String(character.characterName || '').trim().toUpperCase();
  const subtitlePart = String(character.subtitle || '').trim().toUpperCase();
  overviewEls.subtitle.textContent = [namePart, subtitlePart].filter(Boolean).join(' | ');
  overviewEls.description.textContent = character.description || '';
  overviewEls.profileImage.src = character.profileImage || 'assets/profile-placeholder.svg';

  const lifeText = `${character.life.current}/${character.life.max}`;
  const lifeTextSpaced = `${character.life.current} / ${character.life.max}`;
  const energyText = `${character.energy.current} / ${character.energy.max}`;

  overviewEls.lifeValue.textContent = lifeTextSpaced;
  overviewEls.topLifeValue.textContent = lifeText;
  overviewEls.floatingLifeValue.textContent = lifeText;
  overviewEls.energyValue.textContent = energyText;
  overviewEls.armorTotal.textContent = character.armor.total;
  overviewEls.armorSkin.textContent = character.armor.pele;
  overviewEls.armorGear.textContent = character.armor.armadura;

  const lifePercent = character.life.max > 0 ? Math.max(0, Math.min(100, (character.life.current / character.life.max) * 100)) : 0;
  const energyPercent = character.energy.max > 0 ? Math.max(0, Math.min(100, (character.energy.current / character.energy.max) * 100)) : 0;
  overviewEls.lifeBar.style.width = `${lifePercent}%`;
  overviewEls.topLifeBar.style.width = `${lifePercent}%`;
  overviewEls.floatingLifeBar.style.width = `${lifePercent}%`;
  overviewEls.energyBar.style.width = `${energyPercent}%`;
  applyLifeBarColors(lifePercent);

  animateLifeChange(character.life.current);
  renderRosters();
  renderMagicParticularities();
  renderRituals();
  renderInventory();
  renderAttackList(overviewEls.attacksList, character.attacks);
  renderAttributeList(overviewEls.basicList, character.basicAttributes);
  renderAttributeList(overviewEls.extraList, character.extraAttributes);
  renderPillList(overviewEls.passivesList, character.passives);
  renderPillList(overviewEls.traumasList, character.traumas);
  renderLog(overviewEls.logList, character.battleLog);
}

overviewEls.magicToggle.addEventListener('click', () => {
  magicOpen = !magicOpen;
  renderMagicParticularities();
});

overviewEls.ritualToggle.addEventListener('click', () => {
  ritualOpen = !ritualOpen;
  renderRituals();
});

overviewEls.inventoryToggle.addEventListener('click', () => {
  inventoryOpen = !inventoryOpen;
  renderInventory();
});

function createAttackEditor(item = { name: '', roll: '', bonus: 0, notes: '', preview: '' }) {
  const template = $('attackEditorTemplate');
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="name"]').value = item.name || '';
  node.querySelector('[data-field="roll"]').value = item.roll || '';
  node.querySelector('[data-field="bonus"]').value = item.bonus ?? 0;
  node.querySelector('[data-field="preview"]').value = item.preview || '';
  node.querySelector('[data-field="notes"]').value = item.notes || '';

  const previewImg = node.querySelector('[data-field="previewImage"]');
  previewImg.src = item.preview || 'assets/profile-placeholder.svg';
  const status = node.querySelector('[data-field="uploadStatus"]');
  status.textContent = item.preview ? `Imagem atual: ${item.preview}` : 'Nenhuma imagem cadastrada.';

  node.querySelector('[data-field="previewFile"]').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadAttackImage(file, node);
  });

  node.querySelector('.remove-item').addEventListener('click', () => node.remove());
  return node;
}

function createPairEditor(item = { name: '', value: '' }) {
  const template = $('pairEditorTemplate');
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="name"]').value = item.name || '';
  node.querySelector('[data-field="value"]').value = item.value || '';
  node.querySelector('.remove-item').addEventListener('click', () => node.remove());
  return node;
}

function createTextEditor(text = '') {
  const template = $('textEditorTemplate');
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="value"]').value = text;
  node.querySelector('.remove-item').addEventListener('click', () => node.remove());
  return node;
}

function createInventoryAttributeEditor(item = { name: '', value: '' }) {
  const template = $('inventoryAttributeTemplate');
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector('[data-field="name"]').value = item.name || '';
  node.querySelector('[data-field="value"]').value = item.value || '';
  node.querySelector('.remove-inventory-attribute').addEventListener('click', () => node.remove());
  return node;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function uploadImageToProject(file, card, fieldName, previewFieldName) {
  const status = card.querySelector('[data-field="uploadStatus"]');
  const hiddenImage = card.querySelector(`[data-field="${fieldName}"]`);
  const preview = card.querySelector(`[data-field="${previewFieldName}"]`);
  card.dataset.uploading = 'true';
  status.className = 'upload-status';
  status.textContent = 'Copiando imagem para o projeto...';

  try {
    const dataUrl = await readFileAsDataURL(file);
    const result = await request('/api/upload-image', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, originalName: file.name })
    });
    hiddenImage.value = result.path;
    if (preview) preview.src = result.path;
    status.className = 'upload-status success';
    status.textContent = `Imagem salva: ${result.path}`;
  } catch (error) {
    status.className = 'upload-status error';
    status.textContent = `Erro: ${error.message}`;
  } finally {
    delete card.dataset.uploading;
  }
}

async function uploadMagicImage(file, card) {
  return uploadImageToProject(file, card, 'image', 'preview');
}

async function uploadInventoryImage(file, card) {
  return uploadImageToProject(file, card, 'image', 'preview');
}

async function uploadAttackImage(file, card) {
  return uploadImageToProject(file, card, 'preview', 'previewImage');
}

async function uploadProfileImage(file) {
  const card = editorEls.profileEditor;
  const status = editorEls.profileUploadStatus;
  card.dataset.uploading = 'true';
  status.className = 'upload-status';
  status.textContent = 'Copiando imagem para o projeto...';

  try {
    const dataUrl = await readFileAsDataURL(file);
    const result = await request('/api/upload-image', {
      method: 'POST',
      body: JSON.stringify({ dataUrl, originalName: file.name })
    });
    editorEls.profileImage.value = result.path;
    editorEls.profilePreview.src = result.path;
    status.className = 'upload-status success';
    status.textContent = `Imagem salva: ${result.path}`;
  } catch (error) {
    status.className = 'upload-status error';
    status.textContent = `Erro: ${error.message}`;
  } finally {
    delete card.dataset.uploading;
  }
}

function updateMagicEditorCounts(card) {
  card.querySelector('[data-count="abilities"]').textContent = String(card.querySelector('[data-magic-abilities]').children.length);
  card.querySelector('[data-count="statuses"]').textContent = String(card.querySelector('[data-magic-statuses]').children.length);
}

function createMagicAbilityEditor(item = {}) {
  const card = $('magicAbilityTemplate').content.firstElementChild.cloneNode(true);
  card.querySelector('.magic-ability-title').value = item.title || '';
  card.querySelector('.magic-ability-value').value = item.value || '';
  card.querySelector('.magic-ability-description').value = item.description || '';
  card.querySelector('.remove-magic-ability').addEventListener('click', () => {
    const parent = card.closest('.magic-edit-card');
    card.remove();
    updateMagicEditorCounts(parent);
  });
  return card;
}

function createMagicStackEditor(item = {}) {
  const row = $('magicStackTemplate').content.firstElementChild.cloneNode(true);
  row.querySelector('.magic-stack-label').value = item.label || '';
  row.querySelector('.magic-stack-effect').value = item.effect || '';
  row.querySelector('.remove-magic-stack').addEventListener('click', () => row.remove());
  return row;
}

function createMagicStatusEditor(item = {}) {
  const card = $('magicStatusTemplate').content.firstElementChild.cloneNode(true);
  card.querySelector('.magic-status-title').value = item.title || '';
  const stacks = card.querySelector('.magic-stacks-editor');
  (item.stacks || []).forEach(stack => stacks.appendChild(createMagicStackEditor(stack)));
  card.querySelector('.add-magic-stack').addEventListener('click', () => stacks.appendChild(createMagicStackEditor()));
  card.querySelector('.remove-magic-status').addEventListener('click', () => {
    const parent = card.closest('.magic-edit-card');
    card.remove();
    updateMagicEditorCounts(parent);
  });
  return card;
}

function createMagicEditor(item = {}) {
  const template = $('magicEditorTemplate');
  const card = template.content.firstElementChild.cloneNode(true);
  const id = item.id || `magic-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  card.dataset.magicId = id;
  card.querySelector('[data-field="title"]').value = item.title || '';
  card.querySelector('[data-field="image"]').value = item.image || '';
  card.querySelector('.magic-main-description').value = item.description || '';
  card.querySelector('[data-field="preview"]').src = item.image || 'assets/profile-placeholder.svg';
  const status = card.querySelector('[data-field="uploadStatus"]');
  status.textContent = item.image ? `Imagem atual: ${item.image}` : 'Nenhuma imagem cadastrada.';

  const abilities = card.querySelector('[data-magic-abilities]');
  (item.abilities || []).forEach(ability => abilities.appendChild(createMagicAbilityEditor(ability)));
  const statuses = card.querySelector('[data-magic-statuses]');
  (item.statusEffects || []).forEach(effect => statuses.appendChild(createMagicStatusEditor(effect)));
  updateMagicEditorCounts(card);
  card.querySelector('.add-magic-ability').addEventListener('click', () => {
    abilities.appendChild(createMagicAbilityEditor());
    updateMagicEditorCounts(card);
  });
  card.querySelector('.add-magic-status').addEventListener('click', () => {
    statuses.appendChild(createMagicStatusEditor());
    updateMagicEditorCounts(card);
  });

  card.querySelector('.remove-magic').addEventListener('click', () => {
    if (confirm('Remover este registro?')) card.remove();
  });
  card.querySelector('[data-field="imageFile"]').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) uploadMagicImage(file, card);
  });
  return card;
}

function updateRitualEditorCount(card) {
  card.querySelector('[data-count="capacities"]').textContent =
    String(card.querySelector('[data-ritual-capacities]').children.length);
}

function createRitualCapacityEditor(item = {}) {
  const node = $('ritualCapacityTemplate').content.firstElementChild.cloneNode(true);
  node.querySelector('.ritual-capacity-title').value = item.title || '';
  node.querySelector('.ritual-capacity-cost').value = item.cost || '';
  node.querySelector('.ritual-capacity-effect').value = item.effect || '';
  node.querySelector('.remove-ritual-capacity').addEventListener('click', () => {
    const parent = node.closest('.ritual-edit-card');
    node.remove();
    updateRitualEditorCount(parent);
  });
  return node;
}

function createRitualEditor(item = {}) {
  const card = $('ritualEditorTemplate').content.firstElementChild.cloneNode(true);
  card.dataset.ritualId = item.id || `ritual-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  card.querySelector('[data-field="title"]').value = item.title || '';
  card.querySelector('[data-field="image"]').value = item.image || '';
  card.querySelector('[data-field="preview"]').src = item.image || 'assets/profile-placeholder.svg';
  card.querySelector('[data-field="uploadStatus"]').textContent = item.image ? `Imagem atual: ${item.image}` : 'Nenhuma imagem cadastrada.';
  card.querySelector('.ritual-main-description').value = item.description || '';
  const capacities = card.querySelector('[data-ritual-capacities]');
  (item.capacities || []).forEach(capacity => capacities.appendChild(createRitualCapacityEditor(capacity)));
  updateRitualEditorCount(card);
  card.querySelector('.add-ritual-capacity').addEventListener('click', () => {
    capacities.appendChild(createRitualCapacityEditor());
    updateRitualEditorCount(card);
  });
  card.querySelector('.remove-ritual').addEventListener('click', () => {
    if (confirm('Remover este ritual?')) card.remove();
  });
  card.querySelector('[data-field="imageFile"]').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) uploadImageToProject(file, card, 'image', 'preview');
  });
  return card;
}

function createInventoryEditor(item = {}) {
  const template = $('inventoryEditorTemplate');
  const card = template.content.firstElementChild.cloneNode(true);
  const id = item.id || `item-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
  card.dataset.inventoryId = id;

  card.querySelector('[data-field="title"]').value = item.title || '';
  card.querySelector('[data-field="image"]').value = item.image || '';
  card.querySelector('[data-field="advantages"]').value = item.advantages || '';
  card.querySelector('[data-field="disadvantages"]').value = item.disadvantages || '';
  card.querySelector('[data-field="info"]').value = item.info || '';

  const preview = card.querySelector('[data-field="preview"]');
  preview.src = item.image || 'assets/profile-placeholder.svg';
  const status = card.querySelector('[data-field="uploadStatus"]');
  status.textContent = item.image ? `Imagem atual: ${item.image}` : 'Nenhuma imagem cadastrada.';

  const attrsContainer = card.querySelector('[data-field="attributes"]');
  (item.attributes || []).forEach(attr => attrsContainer.appendChild(createInventoryAttributeEditor(attr)));

  card.querySelector('.add-inventory-attribute').addEventListener('click', () => {
    attrsContainer.appendChild(createInventoryAttributeEditor());
  });
  card.querySelector('.remove-inventory').addEventListener('click', () => {
    if (confirm('Remover este item do inventário?')) card.remove();
  });
  card.querySelector('[data-field="imageFile"]').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (!file) return;
    uploadInventoryImage(file, card);
  });

  return card;
}

function fillEditor() {
  editorEls.title.value = character.title;
  editorEls.name.value = character.characterName;
  editorEls.subtitle.value = character.subtitle;
  editorEls.description.value = character.description;
  editorEls.profileImage.value = character.profileImage || '';
  editorEls.profilePreview.src = character.profileImage || 'assets/profile-placeholder.svg';
  editorEls.profileUploadStatus.textContent = character.profileImage ? `Imagem atual: ${character.profileImage}` : 'Nenhuma imagem cadastrada.';
  editorEls.lifeCurrent.value = character.life.current;
  editorEls.lifeMax.value = character.life.max;
  editorEls.energyCurrent.value = character.energy.current;
  editorEls.energyMax.value = character.energy.max;
  editorEls.armorTotal.value = character.armor.total;
  editorEls.armorSkin.value = character.armor.pele;
  editorEls.armorGear.value = character.armor.armadura;

  editorEls.attacksList.innerHTML = '';
  character.attacks.forEach(item => editorEls.attacksList.appendChild(createAttackEditor(item)));
  editorEls.basicList.innerHTML = '';
  character.basicAttributes.forEach(item => editorEls.basicList.appendChild(createPairEditor(item)));
  editorEls.extraList.innerHTML = '';
  character.extraAttributes.forEach(item => editorEls.extraList.appendChild(createPairEditor(item)));
  editorEls.passivesList.innerHTML = '';
  character.passives.forEach(item => editorEls.passivesList.appendChild(createTextEditor(item)));
  editorEls.traumasList.innerHTML = '';
  character.traumas.forEach(item => editorEls.traumasList.appendChild(createTextEditor(item)));
  editorEls.magicList.innerHTML = '';
  (character.magicParticularities || []).forEach(item => editorEls.magicList.appendChild(createMagicEditor(item)));
  editorEls.ritualList.innerHTML = '';
  (character.rituals || []).forEach(item => editorEls.ritualList.appendChild(createRitualEditor(item)));
  editorEls.inventoryList.innerHTML = '';
  (character.inventory || []).forEach(item => editorEls.inventoryList.appendChild(createInventoryEditor(item)));
}

function collectPairEditors(container) {
  return [...container.children].map(card => ({
    name: card.querySelector('[data-field="name"]').value.trim(),
    value: card.querySelector('[data-field="value"]').value.trim()
  })).filter(item => item.name || item.value);
}

function collectTextEditors(container) {
  return [...container.children].map(card => card.querySelector('[data-field="value"]').value.trim()).filter(Boolean);
}

function collectAttackEditors(container) {
  return [...container.children].map(card => ({
    name: card.querySelector('[data-field="name"]').value.trim(),
    roll: card.querySelector('[data-field="roll"]').value.trim(),
    bonus: Number(card.querySelector('[data-field="bonus"]').value || 0),
    preview: card.querySelector('[data-field="preview"]').value.trim(),
    notes: card.querySelector('[data-field="notes"]').value.trim()
  })).filter(item => item.name || item.roll || item.notes || item.bonus || item.preview);
}

function collectMagicEditors(container) {
  return [...container.children].map(card => {
    const abilities = [...card.querySelector('[data-magic-abilities]').children].map(row => ({
      title: row.querySelector('.magic-ability-title').value.trim(),
      value: row.querySelector('.magic-ability-value').value.trim(),
      description: row.querySelector('.magic-ability-description').value.trim()
    })).filter(ability => ability.title || ability.value || ability.description);
    const statusEffects = [...card.querySelector('[data-magic-statuses]').children].map(effect => ({
      title: effect.querySelector('.magic-status-title').value.trim(),
      stacks: [...effect.querySelector('.magic-stacks-editor').children].map(row => ({
        label: row.querySelector('.magic-stack-label').value.trim(),
        effect: row.querySelector('.magic-stack-effect').value.trim()
      })).filter(stack => stack.label || stack.effect)
    })).filter(effect => effect.title || effect.stacks.length);
    return {
      id: card.dataset.magicId,
      title: card.querySelector('[data-field="title"]').value.trim(),
      image: card.querySelector('[data-field="image"]').value.trim(),
      description: card.querySelector('.magic-main-description').value.trim(),
      abilities,
      statusEffects
    };
  }).filter(item => item.title || item.image || item.description || item.abilities.length || item.statusEffects.length);
}

function collectRitualEditors(container) {
  return [...container.children].map(card => {
    const capacities = [...card.querySelector('[data-ritual-capacities]').children].map(row => ({
      title: row.querySelector('.ritual-capacity-title').value.trim(),
      cost: row.querySelector('.ritual-capacity-cost').value.trim(),
      effect: row.querySelector('.ritual-capacity-effect').value.trim()
    })).filter(item => item.title || item.cost || item.effect);
    return {
      id: card.dataset.ritualId,
      title: card.querySelector('[data-field="title"]').value.trim(),
      image: card.querySelector('[data-field="image"]').value.trim(),
      description: card.querySelector('.ritual-main-description').value.trim(),
      capacities
    };
  }).filter(item => item.title || item.image || item.description || item.capacities.length);
}

function collectInventoryEditors(container) {
  return [...container.children].map(card => {
    const attrsContainer = card.querySelector('[data-field="attributes"]');
    const attributes = [...attrsContainer.children].map(row => ({
      name: row.querySelector('[data-field="name"]').value.trim(),
      value: row.querySelector('[data-field="value"]').value.trim()
    })).filter(attr => attr.name || attr.value);

    return {
      id: card.dataset.inventoryId,
      title: card.querySelector('[data-field="title"]').value.trim(),
      image: card.querySelector('[data-field="image"]').value.trim(),
      attributes,
      advantages: card.querySelector('[data-field="advantages"]').value.trim(),
      disadvantages: card.querySelector('[data-field="disadvantages"]').value.trim(),
      info: card.querySelector('[data-field="info"]').value.trim()
    };
  }).filter(item => item.title || item.image || item.attributes.length || item.advantages || item.disadvantages || item.info);
}

async function saveAll() {
  if (document.querySelector('#editor [data-uploading="true"]')) {
    alert('Aguarde o upload da imagem terminar antes de salvar a ficha.');
    return;
  }

  const payload = {
    title: editorEls.title.value.trim(),
    characterName: editorEls.name.value.trim(),
    subtitle: editorEls.subtitle.value.trim(),
    description: editorEls.description.value.trim(),
    profileImage: editorEls.profileImage.value.trim(),
    life: { current: Number(editorEls.lifeCurrent.value || 0), max: Number(editorEls.lifeMax.value || 0) },
    armor: {
      total: Number(editorEls.armorTotal.value || 0),
      pele: Number(editorEls.armorSkin.value || 0),
      armadura: Number(editorEls.armorGear.value || 0)
    },
    energy: { current: Number(editorEls.energyCurrent.value || 0), max: Number(editorEls.energyMax.value || 0) },
    attacks: collectAttackEditors(editorEls.attacksList),
    basicAttributes: collectPairEditors(editorEls.basicList),
    extraAttributes: collectPairEditors(editorEls.extraList),
    passives: collectTextEditors(editorEls.passivesList),
    traumas: collectTextEditors(editorEls.traumasList),
    magicParticularities: collectMagicEditors(editorEls.magicList),
    rituals: collectRitualEditors(editorEls.ritualList),
    inventory: collectInventoryEditors(editorEls.inventoryList)
  };

  const data = await request('/api/character', { method: 'POST', body: JSON.stringify(payload) });
  character = data.character;
  renderOverview();
  fillEditor();
  alert('Ficha salva com sucesso.');
}

function getCombatDamageOptions() {
  return {
    considerArmor: Boolean($('considerArmor')?.checked),
    considerResistance: Boolean($('considerResistance')?.checked)
  };
}

function updateDamagePreview() {
  const preview = $('damagePreview');
  const input = $('damageInput');
  if (!preview || !input || !character) return;

  const rawText = String(input.value ?? '').trim();
  if (!rawText) {
    preview.hidden = true;
    preview.innerHTML = '';
    return;
  }

  const rawDamage = Number(rawText);
  if (!Number.isFinite(rawDamage) || rawDamage < 0) {
    preview.hidden = true;
    preview.innerHTML = '';
    return;
  }

  const { considerArmor, considerResistance } = getCombatDamageOptions();
  const armor = considerArmor ? Number(character.armor?.total || 0) : 0;
  const damageAfterArmor = Math.max(rawDamage - armor, 0);
  const finalDamage = considerResistance ? Math.ceil(damageAfterArmor / 2) : damageAfterArmor;
  const futureLife = Math.max(0, Number(character.life.current || 0) - finalDamage);

  preview.innerHTML = '';
  [
    ['Dano bruto', rawDamage],
    ['Armadura', considerArmor ? `-${armor}` : 'Ignorada'],
    ['Pós-armadura', damageAfterArmor],
    ['Resistência', considerResistance ? '÷ 2' : 'Ignorada'],
    ['Dano final', finalDamage],
    ['Vida após dano', `${futureLife}/${character.life.max}`]
  ].forEach(([label, value]) => {
    const p = make('p');
    p.append(make('strong', '', `${label}: `), document.createTextNode(String(value)));
    preview.appendChild(p);
  });
  preview.hidden = false;
}

async function loadCharacter() {
  character = await request('/api/character');
  savedTheme = {
    primary: normalizeHex(character.theme?.primary, DEFAULT_THEME.primary),
    secondary: normalizeHex(character.theme?.secondary, DEFAULT_THEME.secondary)
  };
  draftTheme = { ...savedTheme };
  applyTheme(savedTheme);
  renderOverview();
  fillEditor();
}

$('damageInput').addEventListener('input', updateDamagePreview);
$('considerArmor').addEventListener('change', updateDamagePreview);
$('considerResistance').addEventListener('change', updateDamagePreview);

$('applyDamageBtn').addEventListener('click', async () => {
  const rawDamage = Number($('damageInput').value);
  if (!Number.isFinite(rawDamage) || rawDamage < 0) return alert('Informe um dano válido.');

  const options = getCombatDamageOptions();
  const data = await request('/api/damage', {
    method: 'POST',
    body: JSON.stringify({ rawDamage, ...options })
  });

  character = data.character;
  renderOverview();
  fillEditor();
  $('damageInput').value = '';
  updateDamagePreview();
});

$('fullLifeBtn').addEventListener('click', async () => {
  const data = await request('/api/full-life', { method: 'POST' });
  character = data.character;
  renderOverview();
  fillEditor();
});

$('applyHealBtn').addEventListener('click', async () => {
  const amount = Number($('healInput').value);
  if (!Number.isFinite(amount) || amount < 0) return alert('Informe uma cura válida.');
  const data = await request('/api/heal', { method: 'POST', body: JSON.stringify({ amount }) });
  character = data.character;
  renderOverview();
  fillEditor();
  $('healInput').value = '';
});

$('applyEnergyBtn').addEventListener('click', async () => {
  const amount = Number($('energyInput').value);
  if (!Number.isFinite(amount)) return alert('Informe um valor de energia válido.');
  const data = await request('/api/energy', { method: 'POST', body: JSON.stringify({ amount }) });
  character = data.character;
  renderOverview();
  fillEditor();
  $('energyInput').value = '';
});

$('clearLogBtn').addEventListener('click', async () => {
  if (!confirm('Deseja mesmo limpar o histórico do combate?')) return;
  const data = await request('/api/log/clear', { method: 'POST' });
  character = data.character;
  renderOverview();
});

$('addAllyBtn').addEventListener('click', () => openPersonModal('ally'));
$('addEnemyBtn').addEventListener('click', () => openPersonModal('enemy'));
rosterEls.modal.querySelector('[data-person-close]').addEventListener('click', closePersonModal);
$('personCloseButton').addEventListener('click', closePersonModal);
rosterEls.editButton.addEventListener('click', () => {
  populatePersonFields(personModalState.original, personModalState.type);
  setPersonEditing(true);
});
rosterEls.cancelButton.addEventListener('click', () => {
  if (personModalState.isNew) closePersonModal();
  else {
    populatePersonFields(personModalState.original, personModalState.type);
    setPersonEditing(false);
  }
});
rosterEls.saveButton.addEventListener('click', () => savePersonFromModal().catch(error => alert(error.message)));
rosterEls.deleteButton.addEventListener('click', () => deletePersonFromModal().catch(error => alert(error.message)));
rosterEls.imageFile.addEventListener('change', event => {
  if (!personModalState.editing) {
    event.target.value = '';
    return;
  }
  const file = event.target.files?.[0];
  if (file) uploadPersonImage(file);
});

$('saveAllBtn').addEventListener('click', saveAll);
editorEls.profileImageFile.addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  uploadProfileImage(file);
});
$('addAttackBtn').addEventListener('click', () => editorEls.attacksList.appendChild(createAttackEditor()));
$('addBasicBtn').addEventListener('click', () => editorEls.basicList.appendChild(createPairEditor()));
$('addExtraBtn').addEventListener('click', () => editorEls.extraList.appendChild(createPairEditor()));
$('addPassiveBtn').addEventListener('click', () => editorEls.passivesList.appendChild(createTextEditor()));
$('addTraumaBtn').addEventListener('click', () => editorEls.traumasList.appendChild(createTextEditor()));
$('addMagicBtn').addEventListener('click', () => editorEls.magicList.appendChild(createMagicEditor()));
$('addRitualBtn').addEventListener('click', () => editorEls.ritualList.appendChild(createRitualEditor()));
$('addInventoryBtn').addEventListener('click', () => editorEls.inventoryList.appendChild(createInventoryEditor()));

const floatingVitals = $('floatingVitals');
const heroHeader = $('heroHeader');
function updateFloatingVitalsVisibility() {
  const rect = heroHeader.getBoundingClientRect();
  floatingVitals.classList.toggle('visible', rect.bottom < 80);
}
window.addEventListener('scroll', updateFloatingVitalsVisibility, { passive: true });
window.addEventListener('resize', updateFloatingVitalsVisibility);

loadCharacter().then(updateFloatingVitalsVisibility).catch(error => {
  console.error(error);
  alert('Erro ao carregar a ficha: ' + error.message);
});
