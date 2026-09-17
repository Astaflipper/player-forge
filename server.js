const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const SAVE_DIR = path.join(__dirname, 'save');
const DATA_FILE = path.join(SAVE_DIR, 'character.json');
const LEGACY_DATA_FILE = path.join(SAVE_DIR, 'dom.json');
const UPLOAD_DIR = path.join(SAVE_DIR, 'uploads');
const SAVE_README = path.join(SAVE_DIR, 'README_SAVE.txt');

const SAVE_README_TEXT = `PLAYER FORGE — SAVE PORTÁTIL (v7.33+)\n\nEsta pasta representa UM personagem completo.\n\nTudo que pertence ao personagem fica aqui:\n- character.json: todos os dados do personagem, incluindo magias/particularidades, rituais, capacidades, custos, efeitos e demais campos editáveis.\n- uploads/: TODAS as imagens adicionadas pelo usuário (perfil, habilidades, magias/particularidades, rituais, inventário, aliados e inimigos).\n\nCOMO LEVAR SEU PERSONAGEM PARA UMA VERSÃO NOVA\n1. Feche o servidor antigo com Ctrl + C.\n2. Copie a pasta save INTEIRA da versão antiga.\n3. Na versão nova, substitua a pasta save pela sua cópia.\n4. Rode node server.js.\n\nCOMO COMEÇAR UM PERSONAGEM DO ZERO\n1. Feche o servidor.\n2. Faça backup da pasta save atual se quiser preservá-la.\n3. Apague ou mova a pasta save.\n4. Rode node server.js novamente.\n5. O Player Forge criará automaticamente uma nova pasta save com uma ficha totalmente vazia.\n\nCOMO TROCAR DE PERSONAGEM (COMO UM SLOT LOCAL)\n- Pare o servidor.\n- Guarde a pasta save atual com outro nome, por exemplo: save_PERSONAGEM_A, save_PERSONAGEM_B etc.\n- Coloque a pasta do personagem que deseja usar com o nome exato save.\n- Rode o servidor novamente.\n\nCOMPATIBILIDADE\n- Saves da v6.5/v7.0 que possuem save/dom.json são migrados automaticamente para save/character.json na primeira execução.\n- Não é necessário editar o JSON manualmente.\n\nREGRA IMPORTANTE\nNunca copie apenas o JSON ou apenas uploads. Para preservar o personagem completo, copie sempre a pasta save inteira.\n`;

function createBlankCharacter() {
  return {
    schemaVersion: '7.33',
    title: '',
    characterName: '',
    subtitle: '',
    description: '',
    profileImage: '',
    theme: { primary: '#8b1730', secondary: '#ff3b33' },
    life: { current: 0, max: 0 },
    armor: { total: 0, pele: 0, armadura: 0 },
    energy: { current: 0, max: 0 },
    attacks: [],
    basicAttributes: [],
    extraAttributes: [],
    passives: [],
    traumas: [],
    magicParticularities: [],
    rituals: [],
    inventory: [],
    allies: [],
    enemies: [],
    battleLog: []
  };
}

function ensureSaveStructure() {
  fs.mkdirSync(SAVE_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  if (!fs.existsSync(SAVE_README)) fs.writeFileSync(SAVE_README, SAVE_README_TEXT, 'utf8');

  if (!fs.existsSync(DATA_FILE) && fs.existsSync(LEGACY_DATA_FILE)) {
    try {
      fs.renameSync(LEGACY_DATA_FILE, DATA_FILE);
    } catch (error) {
      fs.copyFileSync(LEGACY_DATA_FILE, DATA_FILE);
      fs.unlinkSync(LEGACY_DATA_FILE);
    }
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(createBlankCharacter(), null, 2), 'utf8');
  }
}

ensureSaveStructure();

function readCharacter() {
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const blank = createBlankCharacter();
    const character = {
      ...blank,
      ...raw,
      schemaVersion: '7.33',
      life: { ...blank.life, ...(raw.life || {}) },
      armor: { ...blank.armor, ...(raw.armor || {}) },
      energy: { ...blank.energy, ...(raw.energy || {}) },
      theme: { ...blank.theme, ...(raw.theme || {}) },
      attacks: Array.isArray(raw.attacks) ? raw.attacks : [],
      basicAttributes: Array.isArray(raw.basicAttributes) ? raw.basicAttributes : [],
      extraAttributes: Array.isArray(raw.extraAttributes) ? raw.extraAttributes : [],
      passives: Array.isArray(raw.passives) ? raw.passives : [],
      traumas: Array.isArray(raw.traumas) ? raw.traumas : [],
      magicParticularities: sanitizeMagicParticularities(raw.magicParticularities),
      rituals: sanitizeRituals(raw.rituals),
      inventory: Array.isArray(raw.inventory) ? raw.inventory : [],
      allies: Array.isArray(raw.allies) ? raw.allies : [],
      enemies: Array.isArray(raw.enemies) ? raw.enemies : [],
      battleLog: Array.isArray(raw.battleLog) ? raw.battleLog : []
    };
    // Campo legado das versões anteriores. Na 7.3 a Resistência Celestial
    // é uma opção por golpe do combate em tempo real, não uma propriedade da ficha.
    delete character.resistance;
    return character;
  } catch (error) {
    const blank = createBlankCharacter();
    fs.writeFileSync(DATA_FILE, JSON.stringify(blank, null, 2), 'utf8');
    return blank;
  }
}
function writeCharacter(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}
function sendText(res, status, text, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type });
  res.end(text);
}
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  })[ext] || 'application/octet-stream';
}

function parseBody(req, maxBytes = 1_500_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload muito grande.'));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function sanitizeList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(v => String(v ?? '').trim()).filter(Boolean);
}
function sanitizePairs(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    name: String(item?.name ?? '').trim(),
    value: String(item?.value ?? '').trim()
  })).filter(item => item.name || item.value);
}
function sanitizeAttacks(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    name: String(item?.name ?? '').trim(),
    roll: String(item?.roll ?? '').trim(),
    bonus: Number(item?.bonus ?? 0),
    notes: String(item?.notes ?? '').trim(),
    preview: String(item?.preview ?? '').trim()
  })).filter(item => item.name || item.roll || item.notes || item.bonus || item.preview);
}
function sanitizeMagicAbilities(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    title: String(item?.title ?? '').trim(),
    value: String(item?.value ?? '').trim(),
    description: String(item?.description ?? '').trim()
  })).filter(item => item.title || item.value || item.description);
}
function sanitizeMagicStatuses(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    title: String(item?.title ?? '').trim(),
    stacks: Array.isArray(item?.stacks) ? item.stacks.map(stack => ({
      label: String(stack?.label ?? '').trim(),
      effect: String(stack?.effect ?? '').trim()
    })).filter(stack => stack.label || stack.effect) : []
  })).filter(item => item.title || item.stacks.length);
}
function sanitizeMagicParticularities(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    id: String(item?.id ?? '').trim() || `magic-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title: String(item?.title ?? '').trim(),
    image: String(item?.image ?? '').trim(),
    description: String(item?.description ?? '').trim(),
    abilities: sanitizeMagicAbilities(item?.abilities),
    statusEffects: sanitizeMagicStatuses(item?.statusEffects)
  })).filter(item => item.title || item.image || item.description || item.abilities.length || item.statusEffects.length);
}

function sanitizeRitualCapacities(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    title: String(item?.title ?? '').trim(),
    cost: String(item?.cost ?? '').trim(),
    effect: String(item?.effect ?? '').trim()
  })).filter(item => item.title || item.cost || item.effect);
}
function sanitizeRituals(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    id: String(item?.id ?? '').trim() || `ritual-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title: String(item?.title ?? '').trim(),
    image: String(item?.image ?? '').trim(),
    description: String(item?.description ?? '').trim(),
    capacities: sanitizeRitualCapacities(item?.capacities)
  })).filter(item => item.title || item.image || item.description || item.capacities.length);
}

function sanitizeInventory(list) {
  if (!Array.isArray(list)) return [];
  return list.map(item => ({
    id: String(item?.id ?? '').trim() || `item-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    title: String(item?.title ?? '').trim(),
    image: String(item?.image ?? '').trim(),
    attributes: sanitizePairs(item?.attributes),
    advantages: String(item?.advantages ?? '').trim(),
    disadvantages: String(item?.disadvantages ?? '').trim(),
    info: String(item?.info ?? '').trim()
  })).filter(item => item.title || item.image || item.attributes.length || item.advantages || item.disadvantages || item.info);
}

const ENEMY_STATUSES = new Set(['vivo', 'provavelmente vivo', 'morto', 'provavelmente morto', 'desconhecido']);

function sanitizePeople(list, type = 'ally') {
  if (!Array.isArray(list)) return [];
  return list.map(item => {
    const statusRaw = String(item?.status ?? 'desconhecido').trim().toLowerCase();
    return {
      id: String(item?.id ?? '').trim() || `${type}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name: String(item?.name ?? '').trim(),
      image: String(item?.image ?? '').trim(),
      description: String(item?.description ?? '').trim(),
      ...(type === 'enemy' ? { status: ENEMY_STATUSES.has(statusRaw) ? statusRaw : 'desconhecido' } : {})
    };
  }).filter(item => item.name || item.image || item.description);
}

function sanitizeTheme(theme, fallback = {}) {
  const isHex = value => /^#[0-9a-fA-F]{6}$/.test(String(value || ''));
  const primary = isHex(theme?.primary) ? String(theme.primary).toLowerCase() : (isHex(fallback?.primary) ? String(fallback.primary).toLowerCase() : '#8b1730');
  const secondary = isHex(theme?.secondary) ? String(theme.secondary).toLowerCase() : (isHex(fallback?.secondary) ? String(fallback.secondary).toLowerCase() : '#ff3b33');
  return { primary, secondary };
}

function buildCharacterFromPayload(payload, currentData) {
  const next = {
    schemaVersion: '7.33',
    title: String(payload.title ?? currentData.title ?? '').trim(),
    characterName: String(payload.characterName ?? currentData.characterName ?? '').trim(),
    subtitle: String(payload.subtitle ?? currentData.subtitle ?? '').trim(),
    description: String(payload.description ?? currentData.description ?? '').trim(),
    profileImage: String(payload.profileImage ?? currentData.profileImage ?? '').trim(),
    theme: sanitizeTheme(payload.theme ?? currentData.theme, currentData.theme),
    life: {
      current: Math.max(0, Number(payload.life?.current ?? currentData.life?.current ?? 0)),
      max: Math.max(0, Number(payload.life?.max ?? currentData.life?.max ?? 0))
    },
    armor: {
      total: Math.max(0, Number(payload.armor?.total ?? currentData.armor?.total ?? 0)),
      pele: Math.max(0, Number(payload.armor?.pele ?? currentData.armor?.pele ?? 0)),
      armadura: Math.max(0, Number(payload.armor?.armadura ?? currentData.armor?.armadura ?? 0))
    },
    energy: {
      current: Math.max(0, Number(payload.energy?.current ?? currentData.energy?.current ?? 0)),
      max: Math.max(0, Number(payload.energy?.max ?? currentData.energy?.max ?? 0))
    },
    attacks: sanitizeAttacks(payload.attacks ?? currentData.attacks),
    basicAttributes: sanitizePairs(payload.basicAttributes ?? currentData.basicAttributes),
    extraAttributes: sanitizePairs(payload.extraAttributes ?? currentData.extraAttributes),
    passives: sanitizeList(payload.passives ?? currentData.passives),
    traumas: sanitizeList(payload.traumas ?? currentData.traumas),
    magicParticularities: sanitizeMagicParticularities(payload.magicParticularities ?? currentData.magicParticularities),
    rituals: sanitizeRituals(payload.rituals ?? currentData.rituals),
    inventory: sanitizeInventory(payload.inventory ?? currentData.inventory),
    allies: sanitizePeople(payload.allies ?? currentData.allies, 'ally'),
    enemies: sanitizePeople(payload.enemies ?? currentData.enemies, 'enemy'),
    battleLog: Array.isArray(currentData.battleLog) ? currentData.battleLog : []
  };
  next.life.current = Math.min(next.life.current, next.life.max);
  next.energy.current = Math.min(next.energy.current, next.energy.max);
  return next;
}

function nowString() { return new Date().toLocaleString('pt-BR'); }
function addBattleLog(character, message) {
  character.battleLog = Array.isArray(character.battleLog) ? character.battleLog : [];
  character.battleLog.unshift({
    id: `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: nowString(),
    message
  });
  character.battleLog = character.battleLog.slice(0, 100);
}
function applyDamage(character, rawDamage, options = {}) {
  const considerArmor = options.considerArmor !== false;
  const considerResistance = options.considerResistance !== false;
  const armor = considerArmor ? Number(character.armor?.total || 0) : 0;
  const damageAfterArmor = Math.max(Number(rawDamage) - armor, 0);
  const finalDamage = considerResistance ? Math.ceil(damageAfterArmor / 2) : damageAfterArmor;
  character.life.current = Math.max(0, Number(character.life.current) - finalDamage);
  addBattleLog(character, `Dano recebido: ${finalDamage} | Vida: ${character.life.current}/${character.life.max}`);
  return { rawDamage: Number(rawDamage), considerArmor, considerResistance, armor, damageAfterArmor, finalDamage, currentLife: character.life.current };
}

function applyHealing(character, amount) {
  const requested = Math.max(0, Number(amount) || 0);
  const before = Number(character.life.current);
  character.life.current = Math.min(Number(character.life.max), before + requested);
  const actualHealed = character.life.current - before;
  addBattleLog(character, `Cura recebida: ${actualHealed} | Vida: ${character.life.current}/${character.life.max}`);
  return { requestedHealing: requested, actualHealed, currentLife: character.life.current };
}
function resetFullLife(character) {
  const before = Number(character.life.current);
  character.life.current = Number(character.life.max);
  const restored = character.life.current - before;
  return { restored, currentLife: character.life.current };
}
function adjustEnergy(character, amount) {
  const delta = Number(amount) || 0;
  const before = Number(character.energy.current);
  character.energy.current = Math.min(Number(character.energy.max), Math.max(0, before + delta));
  const realDelta = character.energy.current - before;
  return { delta: realDelta, currentEnergy: character.energy.current };
}

function saveUploadedImage(dataUrl, originalName = 'item') {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Formato de imagem inválido. Use PNG, JPG/JPEG ou WEBP.');
  const mime = match[1];
  const ext = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 8 * 1024 * 1024) throw new Error('A imagem deve ter no máximo 8 MB.');
  const safeBase = path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 40) || 'item';
  const fileName = `${safeBase}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
  return `save/uploads/${fileName}`;
}

function serveSaveUpload(res, relativePath) {
  const safeRelative = String(relativePath || '').replace(/^\/+/, '');
  const normalizedPath = path.normalize(path.join(UPLOAD_DIR, safeRelative));
  const uploadRoot = path.resolve(UPLOAD_DIR) + path.sep;
  const resolvedPath = path.resolve(normalizedPath);
  if (!(resolvedPath + path.sep).startsWith(uploadRoot) && resolvedPath !== path.resolve(UPLOAD_DIR)) {
    return sendText(res, 403, 'Acesso negado.');
  }
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    return sendText(res, 404, 'Imagem não encontrada.');
  }
  res.writeHead(200, {
    'Content-Type': getContentType(resolvedPath),
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  });
  return fs.createReadStream(resolvedPath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  try {
    // Imagens do save atual. Também aceita /uploads/... para compatibilidade
    // com saves criados nas versões 6.4 ou anteriores.
    if (req.method === 'GET' && pathname.startsWith('/save/uploads/')) {
      return serveSaveUpload(res, pathname.slice('/save/uploads/'.length));
    }
    if (req.method === 'GET' && pathname.startsWith('/uploads/')) {
      return serveSaveUpload(res, pathname.slice('/uploads/'.length));
    }

    if (pathname === '/api/character' && req.method === 'GET') {
      return sendJson(res, 200, readCharacter());
    }
    if (pathname === '/api/character' && req.method === 'POST') {
      const payload = await parseBody(req, 3_000_000);
      const next = buildCharacterFromPayload(payload, readCharacter());
      writeCharacter(next);
      return sendJson(res, 200, { ok: true, character: next, message: 'Ficha salva com sucesso.' });
    }
    if (pathname === '/api/upload-image' && req.method === 'POST') {
      const payload = await parseBody(req, 12_000_000);
      const imagePath = saveUploadedImage(payload.dataUrl, payload.originalName);
      return sendJson(res, 200, { ok: true, path: imagePath });
    }
    if (pathname === '/api/theme' && req.method === 'POST') {
      const payload = await parseBody(req);
      const character = readCharacter();
      character.theme = sanitizeTheme(payload, character.theme);
      writeCharacter(character);
      return sendJson(res, 200, { ok: true, theme: character.theme, character });
    }
    if (pathname === '/api/damage' && req.method === 'POST') {
      const payload = await parseBody(req);
      const rawDamage = Number(payload.rawDamage);
      if (!Number.isFinite(rawDamage) || rawDamage < 0) return sendJson(res, 400, { ok: false, message: 'Informe um dano bruto válido.' });
      const character = readCharacter();
      const result = applyDamage(character, rawDamage, {
        considerArmor: payload.considerArmor !== false,
        considerResistance: payload.considerResistance !== false
      });
      writeCharacter(character);
      return sendJson(res, 200, { ok: true, result, character });
    }
    if (pathname === '/api/full-life' && req.method === 'POST') {
      const character = readCharacter();
      const result = resetFullLife(character);
      writeCharacter(character);
      return sendJson(res, 200, { ok: true, result, character });
    }
    if (pathname === '/api/heal' && req.method === 'POST') {
      const payload = await parseBody(req);
      const amount = Number(payload.amount);
      if (!Number.isFinite(amount) || amount < 0) return sendJson(res, 400, { ok: false, message: 'Informe um valor de cura válido.' });
      const character = readCharacter();
      const result = applyHealing(character, amount);
      writeCharacter(character);
      return sendJson(res, 200, { ok: true, result, character });
    }
    if (pathname === '/api/energy' && req.method === 'POST') {
      const payload = await parseBody(req);
      const amount = Number(payload.amount);
      if (!Number.isFinite(amount)) return sendJson(res, 400, { ok: false, message: 'Informe um ajuste de energia válido.' });
      const character = readCharacter();
      const result = adjustEnergy(character, amount);
      writeCharacter(character);
      return sendJson(res, 200, { ok: true, result, character });
    }
    if (pathname === '/api/log/clear' && req.method === 'POST') {
      const character = readCharacter();
      character.battleLog = [];
      writeCharacter(character);
      return sendJson(res, 200, { ok: true, character });
    }

    if (pathname === '/' || pathname === '/index.html') {
      const content = fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
      return res.end(content);
    }

    const relative = pathname.replace(/^\/+/, '');
    const normalizedPath = path.normalize(path.join(PUBLIC_DIR, relative));
    if (!normalizedPath.startsWith(PUBLIC_DIR)) return sendText(res, 403, 'Acesso negado.');
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
      res.writeHead(200, { 'Content-Type': getContentType(normalizedPath), 'Cache-Control': 'no-store, no-cache, must-revalidate' });
      return fs.createReadStream(normalizedPath).pipe(res);
    }
    return sendText(res, 404, 'Página não encontrada.');
  } catch (error) {
    console.error(error);
    return sendJson(res, 500, { ok: false, message: error.message || 'Erro interno no servidor.' });
  }
});

server.listen(PORT, () => {
  console.log(`⚒️ Player Forge rodando em http://localhost:${PORT}`);
  console.log('💾 Personagem ativo: save/');
  console.log('📝 Dados: save/character.json');
  console.log('🖼️ Imagens adicionadas: save/uploads');
});
