/* ==========================================================================
   VESTORA, main.js
   Aplicação de gestão comercial em JavaScript puro (sem dependências).
   Organização: núcleo → dados e regras de negócio → componentes de UI →
   gráficos SVG → módulos (telas) → roteador e inicialização.
   ========================================================================== */
(() => {
'use strict';


/* ---------------------------------------------------------------- utilitários */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const sum = (arr, fn = (x) => x) => arr.reduce((acc, x) => acc + fn(x), 0);
const round2 = (v) => Math.round(v * 100) / 100;
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const debounce = (fn, ms = 150) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const groupBy = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); (m[k] ||= []).push(x); return m; }, {});
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const icon = (name, cls = '') => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

const prefersReduced = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = () => matchMedia('(max-width: 767.98px)').matches;
const isDesktop = () => matchMedia('(min-width: 1200px)').matches;

/* ---------------------------------------------------------------- formatação (pt-BR) */
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const BRL0 = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('pt-BR');
const money = (v) => BRL.format(v || 0);
const money0 = (v) => BRL0.format(v || 0);
const moneyShort = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (a >= 1e3) return 'R$ ' + (v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: a >= 1e4 ? 0 : 1 }) + ' mil';
  return 'R$ ' + Math.round(v).toLocaleString('pt-BR');
};
const int = (v) => NUM.format(Math.round(v || 0));
const pct = (v, d = 1) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';
const signedPct = (v) => (v > 0 ? '+' : v < 0 ? '−' : '') + pct(Math.abs(v));
const parseMoney = (s) => {
  if (typeof s === 'number') return s;
  const clean = String(s).replace(/[^\d,.-]/g, '');
  if (clean.includes(',')) return parseFloat(clean.replace(/\./g, '').replace(',', '.')) || 0;
  return parseFloat(clean) || 0;
};
const moneyInput = (v) => (v || v === 0) ? Number(v).toFixed(2).replace('.', ',') : '';

/* ---------------------------------------------------------------- datas */
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MON = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DOW_LONG = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoLocal = (d) => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const toDate = (s) => (s instanceof Date ? new Date(s) : new Date(s.length === 10 ? s + 'T00:00' : s));
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const addMonths = (d, n) => { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); return x; };
const monthKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
const fmtDate = (s) => { const d = toDate(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtDateTime = (s) => { const d = toDate(s); return `${fmtDate(d)} às ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtShort = (s) => { const d = toDate(s); return `${d.getDate()} ${MON[d.getMonth()]}`; };
const fmtRel = (s) => {
  const d = toDate(s); const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400 && startOfDay(d).getTime() === startOfDay(new Date()).getTime()) return `há ${Math.floor(diff / 3600)} h`;
  const days = daysBetween(d, new Date());
  if (days === 1) return 'ontem';
  if (days < 7) return `há ${days} dias`;
  return fmtShort(d);
};
const weekStart = (d) => { const x = startOfDay(d); const wd = (x.getDay() + 6) % 7; return addDays(x, -wd); }; // segunda

/* ---------------------------------------------------------------- gerador pseudoaleatório (determinístico) */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function makeRandom(seed) {
  const r = mulberry32(seed);
  const api = {
    next: r,
    int: (a, b) => a + Math.floor(r() * (b - a + 1)),
    float: (a, b) => a + r() * (b - a),
    chance: (p) => r() < p,
    pick: (arr) => arr[Math.floor(r() * arr.length)],
    wpick(arr, weights) {
      const total = weights.reduce((a, b) => a + b, 0); let x = r() * total;
      for (let i = 0; i < arr.length; i++) { x -= weights[i]; if (x <= 0) return arr[i]; }
      return arr[arr.length - 1];
    },
    poisson(mean) { // Knuth (média pequena) ou aproximação normal
      if (mean > 30) return Math.max(0, Math.round(mean + Math.sqrt(mean) * api.gauss()));
      const L = Math.exp(-mean); let k = 0, p = 1;
      do { k++; p *= r(); } while (p > L);
      return k - 1;
    },
    gauss() { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); },
  };
  return api;
}
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

/* ---------------------------------------------------------------- arquivos (CSV, PNG) */
function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
/** CSV no padrão do Excel brasileiro: separador ";" e decimal com vírgula. */
function downloadCSV(filename, headers, rows) {
  const cell = (v) => {
    if (typeof v === 'number') v = Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
    v = String(v ?? '');
    return /[";\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  const csv = [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), filename);
}
function exportSvgPng(svg, filename, bg = '#181818') {
  const clone = svg.cloneNode(true);
  const vb = svg.viewBox.baseVal; const w = vb.width || svg.clientWidth; const h = vb.height || svg.clientHeight;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', w); clone.setAttribute('height', h);
  $$('[style]', clone).forEach((n) => { n.style.removeProperty('stroke-dashoffset'); n.style.removeProperty('stroke-dasharray'); });
  $$('path', clone).forEach((n) => { n.removeAttribute('stroke-dasharray-anim'); });
  const xml = new XMLSerializer().serializeToString(clone).replace(/var\(--[^)]+\)/g, '#F5F5F5');
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
  img.onload = () => {
    const scale = 2, pad = 24;
    const c = document.createElement('canvas'); c.width = (w + pad * 2) * scale; c.height = (h + pad * 2) * scale;
    const ctx = c.getContext('2d'); ctx.scale(scale, scale); ctx.fillStyle = bg; ctx.fillRect(0, 0, w + pad * 2, h + pad * 2);
    ctx.drawImage(img, pad, pad, w, h); URL.revokeObjectURL(url);
    c.toBlob((b) => downloadBlob(b, filename), 'image/png');
  };
  img.src = url;
}

/* ==========================================================================
   DADOS E REGRAS DE NEGÓCIO
   Uma única fonte de dados (DB) persistida no localStorage e compartilhada
   por todos os módulos. A base demonstrativa é gerada de forma determinística
   em relação à data atual, para que o painel sempre pareça "ao vivo".
   ========================================================================== */
const STORE_KEY = 'vestora:db:v1';
const DATA_VERSION = 10;

const CATS = ['Camisetas', 'Calças', 'Moletons', 'Jaquetas', 'Vestidos', 'Acessórios'];
const CAT_CODE = { Camisetas: 'CAM', Calças: 'CAL', Moletons: 'MOL', Jaquetas: 'JAQ', Vestidos: 'VES', Acessórios: 'ACE' };
const SIZES = { Camisetas: ['P', 'M', 'G', 'GG'], Calças: ['36', '38', '40', '42', '44'], Moletons: ['P', 'M', 'G', 'GG'], Jaquetas: ['P', 'M', 'G', 'GG'], Vestidos: ['PP', 'P', 'M', 'G'], Acessórios: ['U'] };
const sizeLabel = (s) => (s === 'U' ? 'Único' : s);
/* Sazonalidade por categoria (jan → dez): no Brasil, inverno puxa moletons e jaquetas. */
const SEASON = {
  Camisetas: [1.25, 1.2, 1.05, .95, .85, .75, .75, .8, .95, 1.1, 1.2, 1.3],
  Calças: [.85, .85, .95, 1.05, 1.1, 1.15, 1.15, 1.1, 1, .95, .95, .95],
  Moletons: [.35, .35, .6, 1, 1.5, 1.9, 2, 1.6, 1, .6, .45, .4],
  Jaquetas: [.4, .4, .65, 1, 1.45, 1.8, 1.85, 1.5, 1, .7, .55, .6],
  Vestidos: [1.3, 1.25, 1, .85, .8, .7, .7, .75, .95, 1.15, 1.3, 1.45],
  Acessórios: [.9, .9, .95, 1, 1.15, 1.1, 1, 1.05, 1, 1, 1.2, 1.5],
};
const MONTH_VOLUME = [.82, .78, .92, .92, 1.12, 1.05, .95, 1, .94, 1, 1.12, 1.38];
const WEEKDAY_VOLUME = [.86, .84, .9, .95, 1.0, 1.16, 1.3]; // dom → sáb

const CHANNELS = {
  loja: { label: 'Loja física', color: '#08E5C1', icon: 'store' },
  ecommerce: { label: 'E-commerce', color: '#FFDC68', icon: 'globe' },
  instagram: { label: 'Instagram', color: '#EA9AF7', icon: 'social' },
  marketplace: { label: 'Marketplaces', color: '#9B70FF', icon: 'marketplace' },
};
const CH_KEYS = Object.keys(CHANNELS);
const PAYMENTS = {
  pix: { label: 'Pix', short: 'Pix', icon: 'qr' }, credito: { label: 'Cartão de crédito', short: 'Crédito', icon: 'card' },
  debito: { label: 'Cartão de débito', short: 'Débito', icon: 'card' }, boleto: { label: 'Boleto', short: 'Boleto', icon: 'receipt' }, dinheiro: { label: 'Dinheiro', short: 'Dinheiro', icon: 'cash' },
};
const STATUS = {
  pendente: { label: 'Pendente', tone: 'warn', color: '#FFB020' },
  pago: { label: 'Pago', tone: 'ok', color: '#3DDC97' },
  separacao: { label: 'Em separação', tone: 'info', color: '#6FA8FF' },
  enviado: { label: 'Enviado', tone: 'purple', color: '#9B70FF' },
  entregue: { label: 'Entregue', tone: 'teal', color: '#08E5C1' },
  cancelado: { label: 'Cancelado', tone: 'danger', color: '#FF6B6B' },
};
const STATUS_FLOW = ['pendente', 'pago', 'separacao', 'enviado', 'entregue'];
/** Pedido "confirmado" = pagamento aprovado. Só ele baixa estoque e gera receita. */
const CONFIRMED = new Set(['pago', 'separacao', 'enviado', 'entregue']);
const SEGMENTS = {
  novo: { label: 'Novo', tone: 'teal' }, recorrente: { label: 'Recorrente', tone: 'info' },
  vip: { label: 'VIP', tone: 'yellow' }, inativo: { label: 'Inativo', tone: 'muted' },
};
const EXPENSE_CATS = ['Fornecedores', 'Folha de pagamento', 'Aluguel', 'Impostos', 'Marketing', 'Taxas e tarifas', 'Frete e embalagens', 'Energia e utilidades', 'Software e serviços', 'Contabilidade', 'Manutenção', 'Outras despesas'];
const INCOME_CATS = ['Vendas', 'Vendas corporativas', 'Reembolsos', 'Outras entradas'];
const REFUND_CAT = 'Estorno de venda';
const EVENT_TYPES = {
  campanha: { label: 'Campanha promocional', color: '#FFDC68' },
  pagamento: { label: 'Pagamento previsto', color: '#EA9AF7' },
  recebimento: { label: 'Recebimento de mercadorias', color: '#08E5C1' },
  evento: { label: 'Evento comercial', color: '#9B70FF' },
};
const SUPPLIERS = ['Malharia Aurora', 'Confecções Ribeira', 'Denim Norte', 'Ateliê Linho & Cia', 'Couro Fino Acessórios'];

/* Catálogo base: 24 peças com imagem própria em assets/images/products */
const CATALOG = [
  ['camiseta-essential-offwhite', 'Camiseta Essential Algodão Pima', 'Camisetas', 'Off-white', '#E9E4D8', 21, 54.9, 16],
  ['camiseta-oversized-preta', 'Camiseta Oversized Boxy', 'Camisetas', 'Preto', '#2E2E30', 27, 74.9, 12],
  ['camiseta-listrada-marinho', 'Camiseta Listrada Navy', 'Camisetas', 'Azul-marinho', '#243B6B', 24, 64.9, 9],
  ['regata-canelada-salvia', 'Regata Canelada Slim', 'Camisetas', 'Verde-sálvia', '#9DB59A', 16, 44.9, 10],
  ['calca-wide-areia', 'Calça Wide Leg Alfaiataria', 'Calças', 'Areia', '#CDB89A', 62, 169.9, 5],
  ['calca-jeans-reta', 'Calça Jeans Reta Lavagem Média', 'Calças', 'Azul médio', '#4D6FA3', 52, 139.9, 7],
  ['calca-cargo-oliva', 'Calça Cargo Sarja', 'Calças', 'Verde-oliva', '#6E7346', 51, 139.9, 4],
  ['calca-alfaiataria-preta', 'Calça Reta Alfaiataria', 'Calças', 'Preto', '#2B2B2E', 58, 159.9, 4],
  ['moletom-canguru-lilas', 'Moletom Canguru Felpado', 'Moletons', 'Lilás', '#B79BE8', 54, 149.9, 5],
  ['moletom-careca-mescla', 'Moletom Gola Careca', 'Moletons', 'Cinza mescla', '#9A9A9E', 43, 119.9, 4],
  ['hoodie-ziper-preto', 'Hoodie com Zíper', 'Moletons', 'Preto', '#303033', 61, 169.9, 3],
  ['moletom-cropped-rosa', 'Moletom Cropped', 'Moletons', 'Rosa-chiclete', '#EE9CC4', 39, 109.9, 3],
  ['jaqueta-jeans-classica', 'Jaqueta Jeans Clássica', 'Jaquetas', 'Azul claro', '#7C9CC8', 82, 219.9, 3],
  ['jaqueta-corta-vento', 'Jaqueta Corta-vento Impermeável', 'Jaquetas', 'Amarelo', '#F2C94C', 70, 189.9, 3],
  ['jaqueta-couro-sintetico', 'Jaqueta Biker Couro Sintético', 'Jaquetas', 'Preto', '#2A2A2D', 94, 249.9, 1.5],
  ['blazer-linho-bege', 'Blazer de Linho Estruturado', 'Jaquetas', 'Bege', '#D8C3A0', 102, 279.9, 1.2],
  ['vestido-slip-preto', 'Vestido Slip Dress Acetinado', 'Vestidos', 'Preto', '#2C2A30', 53, 149.9, 4],
  ['vestido-midi-esmeralda', 'Vestido Midi Cetim', 'Vestidos', 'Verde-esmeralda', '#1E9E78', 71, 199.9, 5],
  ['vestido-chemise-listrado', 'Vestido Chemise Listrado', 'Vestidos', 'Azul e branco', '#5B7FC0', 64, 179.9, 3],
  ['vestido-trico-terracota', 'Vestido Tricô Canelado', 'Vestidos', 'Terracota', '#C46A4A', 68, 189.9, 3],
  ['bolsa-tote-caramelo', 'Bolsa Tote Couro', 'Acessórios', 'Caramelo', '#B87A45', 84, 229.9, 2],
  ['bone-dad-hat-bege', 'Boné Dad Hat Sarja', 'Acessórios', 'Bege', '#D9C7A6', 18, 54.9, 10],
  ['cinto-couro-preto', 'Cinto de Couro Fivela Dourada', 'Acessórios', 'Preto', '#2B2B2E', 27, 79.9, 5],
  ['oculos-retro-tartaruga', 'Óculos de Sol Retrô Redondo', 'Acessórios', 'Tartaruga', '#8A5A33', 41, 119.9, 4],
];
const PRODUCT_IMAGES = CATALOG.map((c) => c[0]);
const productImg = (p) => (p.img && p.img.startsWith('data:') ? p.img : `assets/images/products/${p.img || 'camiseta-essential-offwhite'}.svg`);

const FIRST_F = ['Ana', 'Beatriz', 'Camila', 'Carolina', 'Clara', 'Daniela', 'Eduarda', 'Fernanda', 'Gabriela', 'Helena', 'Isabela', 'Júlia', 'Larissa', 'Laura', 'Letícia', 'Lívia', 'Luana', 'Luiza', 'Manuela', 'Mariana', 'Marina', 'Natália', 'Paula', 'Rafaela', 'Renata', 'Sofia', 'Tainá', 'Valentina', 'Vitória', 'Yasmin', 'Bianca', 'Priscila', 'Aline', 'Bruna', 'Débora', 'Elisa', 'Giovanna', 'Heloísa', 'Jéssica', 'Lorena', 'Maitê', 'Nicole', 'Olívia', 'Pietra', 'Raíssa', 'Sabrina', 'Tatiane', 'Vanessa'];
const FIRST_M = ['André', 'Arthur', 'Bruno', 'Caio', 'Daniel', 'Diego', 'Eduardo', 'Felipe', 'Gabriel', 'Gustavo', 'Henrique', 'Igor', 'João', 'Leonardo', 'Lucas', 'Marcelo', 'Mateus', 'Miguel', 'Murilo', 'Otávio', 'Pedro', 'Rafael', 'Rodrigo', 'Samuel', 'Thiago', 'Vinícius'];
const LAST = ['Almeida', 'Alves', 'Andrade', 'Araújo', 'Barbosa', 'Barros', 'Batista', 'Cardoso', 'Carvalho', 'Castro', 'Costa', 'Cunha', 'Dias', 'Duarte', 'Fernandes', 'Ferreira', 'Freitas', 'Gomes', 'Lima', 'Lopes', 'Machado', 'Martins', 'Melo', 'Mendes', 'Monteiro', 'Moraes', 'Moreira', 'Nascimento', 'Nogueira', 'Oliveira', 'Pereira', 'Pinto', 'Ramos', 'Reis', 'Ribeiro', 'Rocha', 'Rodrigues', 'Santana', 'Santos', 'Silva', 'Soares', 'Souza', 'Teixeira', 'Vieira', 'Xavier', 'Campos', 'Correia', 'Farias', 'Siqueira', 'Tavares'];
const CITIES = [
  ['São Paulo', 'SP', '11', 34], ['Campinas', 'SP', '19', 6], ['Santos', 'SP', '13', 4], ['Guarulhos', 'SP', '11', 4], ['Santo André', 'SP', '11', 3],
  ['Rio de Janeiro', 'RJ', '21', 10], ['Niterói', 'RJ', '21', 2], ['Belo Horizonte', 'MG', '31', 7], ['Curitiba', 'PR', '41', 6], ['Porto Alegre', 'RS', '51', 5],
  ['Florianópolis', 'SC', '48', 4], ['Salvador', 'BA', '71', 4], ['Recife', 'PE', '81', 3], ['Brasília', 'DF', '61', 5], ['Goiânia', 'GO', '62', 3], ['Fortaleza', 'CE', '85', 3],
];
const MAIL = ['gmail.com', 'gmail.com', 'gmail.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'yahoo.com.br', 'uol.com.br'];

/* ------------------------------------------------------------------ estado */
let DB = null;
let REV = 0;                       // versão em memória: invalida os caches de cálculo
const memo = new Map();
function cached(key, fn) {
  const k = REV + '|' + key;
  if (memo.has(k)) return memo.get(k);
  if (memo.size > 400) memo.clear();
  const v = fn(); memo.set(k, v); return v;
}
let saveTimer = null;
function commit() {
  REV++; memo.clear();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 120);
}
function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(DB)); return true; }
  catch (err) {
    console.warn('[Vestora] Não foi possível salvar no localStorage:', err);
    if (typeof toast === 'function') toast({ tone: 'danger', title: 'Dados não salvos', text: 'O armazenamento do navegador está cheio ou bloqueado. As alterações valem até fechar a aba.' });
    return false;
  }
}
function loadDB() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.meta && parsed.meta.version === DATA_VERSION) { DB = parsed; return 'loaded'; }
    }
  } catch (err) { console.warn('[Vestora] Base salva inválida, gerando nova.', err); }
  DB = seedDatabase(); persist(); return 'seeded';
}
function resetDB() { DB = seedDatabase(); REV++; memo.clear(); persist(); }

const byId = (list, id) => DB[list].find((x) => x.id === id);
const product = (id) => cached('p:' + id, () => DB.products.find((p) => p.id === id));
const client = (id) => cached('c:' + id, () => DB.clients.find((c) => c.id === id));
const order = (id) => DB.orders.find((o) => o.id === Number(id));
const nextSeq = (k) => (DB.meta.seq[k] = (DB.meta.seq[k] || 0) + 1);

/* ------------------------------------------------------------------ geração da base demonstrativa */
function seedDatabase() {
  const R = makeRandom(269246);
  const RS = makeRandom(91127);          // sorteio independente para o status dos pedidos
  const now = new Date();
  const today = startOfDay(now);
  const db = {
    meta: { version: DATA_VERSION, seededAt: isoLocal(now), seq: { order: 10000, ledger: 0, move: 0, client: 0, product: 0, notif: 0, event: 0, log: 0 } },
    settings: {
      store: { name: 'Vestora', legal: 'Vestora Moda e Acessórios Ltda.', cnpj: '12.345.678/0001-00', email: 'contato@vestora.com.br', phone: '(11) 3456-7890', address: 'Rua Oscar Freire, 1200, Jardins, São Paulo/SP', site: 'vestora.com.br' },
      admin: { name: 'Administrador', role: 'Gestão comercial', email: 'admin@vestora.com.br' },
      notify: { stock: true, payments: true, goals: true, clients: true, reports: true },
      goals: { revenue: 52000, orders: 400, newClients: 150 },
      minStock: 3,
      ui: { reduceMotion: false, compact: false, sidebarExpanded: false, illustrations: true },
    },
    products: [], clients: [], orders: [], ledger: [], moves: [], events: [], notifications: [], automations: [], autoLog: [], sessions: {},
  };
  const seq = (k) => (db.meta.seq[k] += 1);

  /* produtos */
  CATALOG.forEach(([img, name, cat, color, hex, cost, price, pop], i) => {
    const n = db.products.filter((p) => p.category === cat).length + 1;
    const stock = {};
    SIZES[cat].forEach((s, si) => {
      const mid = 1 - Math.abs(si - (SIZES[cat].length - 1) / 2) / SIZES[cat].length;
      let q = Math.round(R.float(4, 20) * (0.6 + mid));
      if (R.chance(0.12)) q = R.int(1, 3);
      if (R.chance(0.07)) q = 0;
      if (cat === 'Acessórios') q = R.int(6, 34);
      stock[s] = q;
    });
    db.products.push({
      id: 'p' + pad(i + 1), sku: `VST-${CAT_CODE[cat]}-${String(n).padStart(3, '0')}`, name, category: cat, color, hex, img,
      cost, price, sizes: SIZES[cat].slice(), stock, status: 'ativo', pop, createdAt: isoLocal(addDays(today, -R.int(200, 520))),
    });
    seq('product');
  });
  // Ajustes pontuais para gerar alertas realistas
  db.products[14].stock = { P: 0, M: 2, G: 1, GG: 0 };           // biker quase esgotada
  db.products[11].stock = { P: 0, M: 0, G: 0, GG: 0 };           // cropped esgotado (fim de estação)
  db.products[1].stock.M = 2;                                     // oversized M baixo
  db.products[19].status = 'inativo';

  /* clientes base (já existiam antes do período) */
  const cityW = CITIES.map((c) => c[3]);
  const used = new Set();
  function makeClient(createdAt) {
    const female = R.chance(0.7);
    let first, last, name, tries = 0;
    do {
      first = R.pick(female ? FIRST_F : FIRST_M); last = R.pick(LAST);
      name = R.chance(0.35) ? `${first} ${R.pick(LAST)} ${last}` : `${first} ${last}`; tries++;
    } while (used.has(name) && tries < 6);
    used.add(name);
    const [city, uf, ddd] = R.wpick(CITIES, cityW);
    const slug = norm(first) + '.' + norm(last);
    const c = {
      id: 'c' + String(seq('client')).padStart(4, '0'), name, email: `${slug}${R.chance(0.45) ? R.int(2, 98) : ''}@${R.pick(MAIL)}`.replace(/\s/g, ''),
      phone: `(${ddd}) 9${R.int(6000, 9999)}-${R.int(1000, 9999)}`, city, uf, createdAt: isoLocal(createdAt), g: female ? 'f' : 'm',
      w: Math.pow(R.next(), 2.6) * 10 + 0.15,   // propensão a recomprar (cauda longa)
    };
    db.clients.push(c); return c;
  }
  for (let i = 0; i < 240; i++) makeClient(addDays(today, -R.int(380, 980)));

  /* pedidos: 12 meses dia a dia */
  const BF = blackFriday(today.getFullYear());
  const boosts = [
    [addDays(BF, -7), addDays(BF, 3), 1.55], [new Date(today.getFullYear() - 1, 11, 8), new Date(today.getFullYear() - 1, 11, 24), 1.35],
    [addDays(blackFriday(today.getFullYear() - 1), -7), addDays(blackFriday(today.getFullYear() - 1), 3), 1.55],
    [addDays(mothersDay(today.getFullYear()), -8), mothersDay(today.getFullYear()), 1.3], [new Date(today.getFullYear(), 5, 5), new Date(today.getFullYear(), 5, 12), 1.22],
  ];
  const boostOf = (d) => { for (const [a, b, f] of boosts) if (d >= startOfDay(a) && d <= endOfDay(b)) return f; return 1; };
  const BASE = 12.1;
  const pidW = db.products.map((p) => p.pop);
  const pool = db.clients.slice(); let poolW = pool.map((c) => c.w); let poolDirty = false;
  for (let back = 364; back >= 0; back--) {
    const day = addDays(today, -back);
    const m = day.getMonth();
    const growth = 0.8 + 0.2 * (1 - back / 364);
    const boost = boostOf(day);
    const mean = BASE * MONTH_VOLUME[m] * WEEKDAY_VOLUME[day.getDay()] * growth * boost;
    let n = R.poisson(mean);
    if (back === 0) n = Math.max(3, Math.round(n * clamp((now.getHours() - 8) / 13, 0.15, 1)));
    // sessões no e-commerce (para taxa de conversão)
    db.sessions[dayKey(day)] = Math.round((250 + R.int(-30, 40)) * MONTH_VOLUME[m] * WEEKDAY_VOLUME[day.getDay()] * growth * (boost > 1 ? 1.4 : 1));
    for (let k = 0; k < n; k++) {
      const channel = R.wpick(CH_KEYS, [35, 30, 20, 15]);
      const hourMax = back === 0 ? Math.max(9, now.getHours() - 1) : 21;
      const h = channel === 'loja' ? R.int(10, Math.min(21, hourMax)) : R.wpick([8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23], [1, 2, 3, 4, 5, 5, 4, 4, 4, 5, 6, 7, 8, 8, 6, 3].map((w, i) => (8 + i > hourMax ? 0.0001 : w)));
      const date = new Date(day); date.setHours(h, R.int(0, 59));
      // cliente: novo (primeira compra) ou recorrente
      let cl;
      if (R.chance(0.385)) { cl = makeClient(date); pool.push(cl); poolDirty = true; }
      else { if (poolDirty) { poolW = pool.map((c) => c.w); poolDirty = false; } cl = R.wpick(pool, poolW); }
      // itens (com sazonalidade por categoria)
      const nItems = R.wpick([1, 2, 3], channel === 'loja' ? [70, 24, 6] : [82, 15, 3]);
      const items = [];
      for (let it = 0; it < nItems; it++) {
        const p = R.wpick(db.products, pidW.map((w, i) => w * SEASON[db.products[i].category][m] * (db.products[i].status === 'inativo' && back < 40 ? 0 : 1)));
        const size = R.wpick(p.sizes, p.sizes.map((_, si) => 1 + (p.sizes.length > 2 && si > 0 && si < p.sizes.length - 1 ? 1.6 : 0)));
        const ex = items.find((x) => x.p === p.id && x.size === size);
        if (ex) ex.qty++; else items.push({ p: p.id, size, qty: R.chance(0.05) ? 2 : 1, price: p.price });
      }
      const subtotal = sum(items, (x) => x.qty * x.price);
      let discount = 0;
      if (boost > 1.3 && R.chance(0.55)) discount = round2(subtotal * R.pick([0.1, 0.15, 0.2]));
      else if (R.chance(0.12)) discount = round2(subtotal * R.pick([0.05, 0.1]));
      const payment = R.wpick(...{
        loja: [['pix', 'credito', 'debito', 'dinheiro'], [30, 40, 20, 10]], ecommerce: [['pix', 'credito', 'boleto'], [42, 50, 8]],
        instagram: [['pix', 'credito'], [60, 40]], marketplace: [['credito', 'pix', 'boleto'], [62, 30, 8]],
      }[channel]);
      const status = seedStatus(RS, back, channel, payment);
      db.orders.push({ id: seq('order'), client: cl.id, date: isoLocal(date), items, discount, channel, payment, status, applied: CONFIRMED.has(status) });
    }
  }
  db.clients.forEach((c) => { delete c.w; });

  /* livro-caixa: vendas individuais nos últimos 4 meses e consolidadas antes disso */
  const cutoff = startOfDay(addMonths(today, -3)); // dia 1 de três meses atrás
  const ledger = db.ledger;
  const L = (o) => { ledger.push({ id: 'f' + seq('ledger'), ...o }); };
  const consolidated = {};
  db.orders.forEach((o) => {
    if (!o.applied) return;
    const total = orderTotal(o);
    const d = toDate(o.date);
    if (d >= cutoff) L({ date: o.date, type: 'in', cat: 'Vendas', desc: `Venda do pedido #${o.id}`, value: total, status: 'pago', ref: o.id });
    else { const k = monthKey(d); consolidated[k] = (consolidated[k] || 0) + total; }
  });
  Object.entries(consolidated).forEach(([k, v]) => {
    const [y, mm] = k.split('-').map(Number); const last = new Date(y, mm, 0, 23, 0);
    L({ date: isoLocal(last), type: 'in', cat: 'Vendas', desc: `Vendas consolidadas de ${MONTHS[mm - 1]}`, value: round2(v), status: 'pago' });
  });
  // despesas mês a mês (12 meses + mês corrente inteiro + início do próximo)
  const cogsByMonth = {}; const revByMonth = {}; const cardByMonth = {}; const mktByMonth = {}; const onlineByMonth = {};
  db.orders.forEach((o) => {
    if (!o.applied) return; const k = monthKey(toDate(o.date)); const t = orderTotal(o);
    cogsByMonth[k] = (cogsByMonth[k] || 0) + sum(o.items, (it) => it.qty * db.products.find((p) => p.id === it.p).cost);
    revByMonth[k] = (revByMonth[k] || 0) + t;
    if (o.payment === 'credito' || o.payment === 'debito') cardByMonth[k] = (cardByMonth[k] || 0) + t;
    if (o.channel === 'marketplace') mktByMonth[k] = (mktByMonth[k] || 0) + t;
    if (o.channel !== 'loja') onlineByMonth[k] = (onlineByMonth[k] || 0) + t;
  });
  const avgRev = sum(Object.values(revByMonth)) / Math.max(1, Object.keys(revByMonth).length);
  for (let mo = -12; mo <= 1; mo++) {
    const base = addMonths(today, mo); const y = base.getFullYear(); const mm = base.getMonth(); const k = monthKey(base);
    const prevK = monthKey(addMonths(base, -1));
    const dim = new Date(y, mm + 1, 0).getDate();
    const at = (day, h = 9) => new Date(y, mm, Math.min(day, dim), h, 0);
    const refRev = revByMonth[prevK] || revByMonth[k] || avgRev;
    const items = [
      [3, 'Software e serviços', 'Plataforma de e-commerce e ERP', 459.9],
      [5, 'Aluguel', 'Aluguel da loja Jardins', 6200],
      [5, 'Folha de pagamento', 'Salários e encargos da equipe', 7600 + (mm === 11 ? 4100 : 0)],
      [8, 'Marketing', 'Anúncios e influenciadores', round2(1700 + refRev * 0.02 + R.int(-150, 300))],
      [10, 'Fornecedores', `Fornecedor ${SUPPLIERS[(mm + 0) % 5]}`, round2((cogsByMonth[prevK] || cogsByMonth[k] || avgRev * 0.36) * 0.55)],
      [10, 'Contabilidade', 'Honorários contábeis', 890],
      [12, 'Energia e utilidades', 'Internet e telefonia', 319.9],
      [15, 'Energia e utilidades', 'Energia elétrica', round2(R.float(690, 1080))],
      [20, 'Impostos', 'Simples Nacional (DAS)', round2(refRev * 0.06)],
      [22, 'Taxas e tarifas', 'Tarifas de cartão e marketplaces', round2((cardByMonth[prevK] || refRev * 0.55) * 0.028 + (mktByMonth[prevK] || refRev * 0.15) * 0.14)],
      [25, 'Fornecedores', `Fornecedor ${SUPPLIERS[(mm + 2) % 5]}`, round2((cogsByMonth[prevK] || cogsByMonth[k] || avgRev * 0.36) * 0.5)],
      [26, 'Frete e embalagens', 'Fretes e embalagens personalizadas', round2((onlineByMonth[prevK] || refRev * 0.6) * 0.035)],
      [28, 'Manutenção', 'Limpeza e manutenção da loja', 380],
    ];
    items.forEach(([day, cat, desc, value]) => {
      const d = at(day);
      if (mo === 1 && day > 12) return;                  // próximo mês: só a primeira quinzena prevista
      const status = d <= now ? 'pago' : 'pendente';
      L({ date: isoLocal(d), type: 'out', cat, desc, value: round2(value), status });
    });
  }
  // uma conta vencida e entradas a receber
  L({ date: isoLocal(addDays(today, -3)), type: 'out', cat: 'Fornecedores', desc: 'Aviamentos e etiquetas (Etiq Brasil)', value: 1260, status: 'pendente' });
  L({ date: isoLocal(addDays(today, 6)), type: 'in', cat: 'Vendas corporativas', desc: 'Uniformes Café Paulista (40 camisetas)', value: 2396, status: 'pendente' });
  L({ date: isoLocal(addDays(today, -12)), type: 'in', cat: 'Reembolsos', desc: 'Reembolso de frete extraviado', value: 86.4, status: 'pago' });
  L({ date: isoLocal(addDays(today, 11)), type: 'in', cat: 'Outras entradas', desc: 'Aluguel de vitrine para marca parceira', value: 900, status: 'pendente' });

  /* movimentações de estoque (últimos 45 dias) */
  const moveFrom = addDays(today, -45);
  db.orders.forEach((o) => {
    if (!o.applied || toDate(o.date) < moveFrom) return;
    o.items.forEach((it) => db.moves.push({ id: 'm' + seq('move'), date: o.date, p: it.p, size: it.size, qty: -it.qty, type: 'saida', reason: 'Venda', ref: o.id }));
  });
  for (let back = 44; back >= 2; back -= R.int(5, 8)) {
    const d = addDays(today, -back); d.setHours(R.int(8, 11), R.int(0, 59));
    const supplier = R.pick(SUPPLIERS);
    const prods = [...db.products].sort(() => R.next() - 0.5).slice(0, R.int(2, 3));
    prods.forEach((p) => p.sizes.forEach((s) => db.moves.push({ id: 'm' + seq('move'), date: isoLocal(d), p: p.id, size: s, qty: R.int(4, 12), type: 'entrada', reason: `Compra ${supplier}` })));
  }
  for (let i = 0; i < 7; i++) {
    const p = R.pick(db.products); const d = addDays(today, -R.int(1, 40)); d.setHours(R.int(17, 20), R.int(0, 59));
    const [reason, q] = R.pick([['Ajuste de inventário', R.pick([-2, -1, 1, 2])], ['Peça com avaria', -1], ['Troca de tamanho', R.pick([-1, 1])]]);
    db.moves.push({ id: 'm' + seq('move'), date: isoLocal(d), p: p.id, size: R.pick(p.sizes), qty: q, type: 'ajuste', reason });
  }
  db.moves.sort((a, b) => b.date.localeCompare(a.date));

  /* calendário comercial */
  const E = (title, type, start, end, note) => db.events.push({ id: 'e' + seq('event'), title, type, start: dayKey(start), end: end ? dayKey(end) : null, note: note || '' });
  const Y = today.getFullYear();
  E('Esquenta Black Friday', 'campanha', addDays(BF, -7), addDays(BF, -1), 'Cupom ESQUENTA10 em todo o site e na loja.');
  E('Black Friday Vestora', 'campanha', BF, addDays(BF, 3), 'Até 40% off. Vai até a Cyber Monday.');
  E('Natal: coleção festa', 'campanha', new Date(Y, 11, 8), new Date(Y, 11, 24), 'Vitrine de festa e embrulho para presente grátis.');
  E('Liquidação de verão', 'campanha', new Date(Y + 1, 0, 7), new Date(Y + 1, 0, 31), 'Queima da coleção de verão.');
  E('Primavera em cores', 'campanha', new Date(Y, 8, 22), new Date(Y, 9, 5), 'Campanha de lançamento de estação.');
  E('Dia do Cliente', 'campanha', new Date(Y, 8, 15), null, 'Brinde para clientes VIP.');
  E('Lançamento coleção Resort', 'evento', addDays(today, 3), null, 'Evento na loja às 19h com DJ e drinks.');
  E('Reunião com Denim Norte', 'evento', addDays(today, 1), null, 'Negociar prazo da coleção de inverno.');
  E('Sessão de fotos do verão', 'evento', addDays(today, 8), null, 'Estúdio Pinheiros, 9h às 15h.');
  E('Feira de Moda Pinheiros', 'evento', addDays(today, 12), addDays(today, 13), 'Estande 14B.');
  E('Treinamento da equipe de vendas', 'evento', addDays(today, -4), null, 'Atendimento e técnicas de venda consultiva.');
  for (let mo = -2; mo <= 2; mo++) { const b = addMonths(today, mo); E('Inventário mensal', 'evento', new Date(b.getFullYear(), b.getMonth() + 1, 0), null, 'Contagem geral do estoque após o fechamento.'); }
  [[-10, 'Malharia Aurora', 96], [-3, 'Confecções Ribeira', 72], [2, 'Malharia Aurora', 120], [6, 'Denim Norte', 64], [9, 'Confecções Ribeira', 90], [16, 'Ateliê Linho & Cia', 48], [24, 'Couro Fino Acessórios', 60]]
    .forEach(([d, s, q]) => E(`Recebimento ${s}`, 'recebimento', addDays(today, d), null, `${q} peças previstas na nota fiscal.`));

  /* automações e notificações iniciais */
  db.automations = AUTOMATIONS.map((a) => ({ id: a.id, on: a.id !== 'restock', lastRun: null, runs: 0, lastResult: '' }));
  db.notifications = [];
  db.meta.seq.notif = 0;
  return db;
}
function seedStatus(R, back, channel, payment) {
  if (R.chance(0.028)) return 'cancelado';
  if (channel === 'loja') return back <= 0 && R.chance(0.15) ? 'pago' : 'entregue';
  if (back === 0) return (payment !== 'credito' && R.chance(0.55)) || R.chance(0.1) ? 'pendente' : R.chance(0.6) ? 'pago' : 'separacao';
  if (back === 1) return (payment === 'boleto' && R.chance(0.75)) || (payment === 'pix' && R.chance(0.25)) ? 'pendente' : R.wpick(['pago', 'separacao'], [35, 65]);
  if (back <= 3) return (payment === 'boleto' && R.chance(0.6)) || (payment === 'pix' && R.chance(0.08)) ? 'pendente' : R.wpick(['separacao', 'enviado'], [30, 70]);
  if (back <= 6) return payment === 'boleto' && R.chance(0.3) ? 'pendente' : R.wpick(['enviado', 'entregue'], [50, 50]);
  return 'entregue';
}
function blackFriday(y) { const d = new Date(y, 10, 1); const firstThu = (4 - d.getDay() + 7) % 7 + 1; return new Date(y, 10, firstThu + 21 + 1); }
function mothersDay(y) { const d = new Date(y, 4, 1); const firstSun = (7 - d.getDay()) % 7 + 1; return new Date(y, 4, firstSun + 7); }

/* ------------------------------------------------------------------ cálculos */
const orderSubtotal = (o) => round2(sum(o.items, (it) => it.qty * it.price));
const orderTotal = (o) => round2(Math.max(0, orderSubtotal(o) - (o.discount || 0)));
const orderUnits = (o) => sum(o.items, (it) => it.qty);
const stockTotal = (p) => sum(Object.values(p.stock));
const variantLevel = (qty) => (qty <= 0 ? 'out' : qty <= DB.settings.minStock ? 'low' : 'ok');
function productLevel(p) {
  const levels = p.sizes.map((s) => variantLevel(p.stock[s] || 0));
  if (levels.every((l) => l === 'out')) return 'out';
  if (levels.some((l) => l !== 'ok')) return 'low';
  return 'ok';
}
const LEVEL = { ok: { label: 'Em estoque', tone: 'ok' }, low: { label: 'Estoque baixo', tone: 'warn' }, out: { label: 'Esgotado', tone: 'danger' } };
const activeProducts = () => DB.products.filter((p) => !p.deleted);
function lowVariants() {
  return cached('lowv', () => {
    const out = [];
    activeProducts().forEach((p) => p.sizes.forEach((s) => { const q = p.stock[s] || 0; const l = variantLevel(q); if (l !== 'ok') out.push({ p, size: s, qty: q, level: l }); }));
    return out.sort((a, b) => a.qty - b.qty);
  });
}

/* períodos */
const PERIODS = {
  '7d': { label: 'Últimos 7 dias', short: '7 dias' }, '30d': { label: 'Últimos 30 dias', short: '30 dias' },
  mes: { label: 'Este mês', short: 'mês atual' }, '90d': { label: 'Últimos 90 dias', short: '90 dias' }, '12m': { label: 'Últimos 12 meses', short: '12 meses' },
};
function rangeOf(key, ref = new Date()) {
  const end = endOfDay(ref);
  let start;
  if (key === '7d') start = startOfDay(addDays(ref, -6));
  else if (key === '30d') start = startOfDay(addDays(ref, -29));
  else if (key === '90d') start = startOfDay(addDays(ref, -89));
  else if (key === 'mes') start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  else start = startOfDay(addDays(addMonths(ref, -12), 1));
  return { key, start, end, days: daysBetween(start, end) + 1 };
}
function prevRange(r) {
  if (r.key === 'mes') { const s = addMonths(r.start, -1); const e = endOfDay(addDays(s, r.days - 1)); return { key: 'prev', start: s, end: e, days: r.days }; }
  const end = endOfDay(addDays(r.start, -1)); const start = startOfDay(addDays(r.start, -r.days));
  return { key: 'prev', start, end, days: r.days };
}
const inRange = (iso, r) => { const d = toDate(iso); return d >= r.start && d <= r.end; };
const rkey = (r) => `${r.start.getTime()}-${r.end.getTime()}`;
const ordersIn = (r) => cached('oin' + rkey(r), () => DB.orders.filter((o) => inRange(o.date, r)));

function salesKPIs(r) {
  return cached('kpi' + rkey(r), () => {
    const os = ordersIn(r);
    const valid = os.filter((o) => o.status !== 'cancelado');
    const conf = os.filter((o) => CONFIRMED.has(o.status));
    const revenue = sum(conf, orderTotal);
    const byChannel = {}; CH_KEYS.forEach((k) => (byChannel[k] = { revenue: 0, orders: 0 }));
    conf.forEach((o) => { byChannel[o.channel].revenue += orderTotal(o); byChannel[o.channel].orders++; });
    const newClients = DB.clients.filter((c) => inRange(c.createdAt, r)).length;
    const units = sum(conf, orderUnits);
    const cost = sum(conf, (o) => sum(o.items, (it) => it.qty * (product(it.p)?.cost || 0)));
    const sessions = sumSessions(r);
    const onlineOrders = conf.filter((o) => o.channel === 'ecommerce').length;
    const buyers = new Set(conf.map((o) => o.client));
    const firstBuy = firstPurchaseMap();
    let returning = 0; buyers.forEach((id) => { if (firstBuy.get(id) < r.start.getTime()) returning++; });
    return {
      revenue, orders: valid.length, confirmed: conf.length, cancelled: os.length - valid.length, pending: os.filter((o) => o.status === 'pendente').length,
      avgTicket: conf.length ? revenue / conf.length : 0, newClients, units, cost, grossMargin: revenue ? (revenue - cost) / revenue : 0,
      byChannel, sessions, conversion: sessions ? onlineOrders / sessions : 0, buyers: buyers.size, returningShare: buyers.size ? returning / buyers.size : 0,
    };
  });
}
function sumSessions(r) { let s = 0; for (let d = new Date(r.start); d <= r.end; d = addDays(d, 1)) s += DB.sessions[dayKey(d)] || 0; return s; }
function firstPurchaseMap() {
  return cached('first', () => { const m = new Map(); DB.orders.forEach((o) => { if (o.status === 'cancelado') return; const t = toDate(o.date).getTime(); if (!m.has(o.client) || t < m.get(o.client)) m.set(o.client, t); }); return m; });
}
const growth = (cur, prev) => (prev ? (cur - prev) / prev : cur ? 1 : 0);

/* clientes: estatísticas e classificação */
function clientStats() {
  return cached('cstats', () => {
    const m = new Map();
    DB.clients.forEach((c) => m.set(c.id, { orders: 0, value: 0, last: null, first: null, list: [] }));
    DB.orders.forEach((o) => {
      const s = m.get(o.client); if (!s) return;
      s.list.push(o);
      if (o.status === 'cancelado') return;
      s.orders++; if (CONFIRMED.has(o.status)) s.value += orderTotal(o);
      if (!s.last || o.date > s.last) s.last = o.date;
      if (!s.first || o.date < s.first) s.first = o.date;
    });
    m.forEach((s) => s.list.sort((a, b) => b.date.localeCompare(a.date)));
    return m;
  });
}
function segmentOf(c) {
  const s = clientStats().get(c.id) || { orders: 0, value: 0 };
  const lastRef = s.last || c.createdAt;
  if (daysBetween(toDate(lastRef), new Date()) > 90) return 'inativo';
  if (s.value >= 1200 || s.orders >= 6) return 'vip';
  if (s.orders >= 2) return 'recorrente';
  return 'novo';
}

/* produtos: vendas por período */
function productSales(r) {
  return cached('psales' + rkey(r), () => {
    const m = new Map(); DB.products.forEach((p) => m.set(p.id, { units: 0, revenue: 0, cost: 0, orders: 0 }));
    ordersIn(r).forEach((o) => {
      if (!CONFIRMED.has(o.status)) return;
      const sub = orderSubtotal(o); const factor = sub ? orderTotal(o) / sub : 1; // rateia o desconto entre os itens
      o.items.forEach((it) => { const s = m.get(it.p); if (!s) return; const p = product(it.p); s.units += it.qty; s.revenue += it.qty * it.price * factor; s.cost += it.qty * (p?.cost || 0); s.orders++; });
    });
    return m;
  });
}

/* financeiro */
function ledgerIn(r) { return cached('lin' + rkey(r), () => DB.ledger.filter((e) => inRange(e.date, r))); }
function financeKPIs(r) {
  return cached('fin' + rkey(r), () => {
    const es = ledgerIn(r).filter((e) => e.status === 'pago');
    const gross = sum(es.filter((e) => e.type === 'in'), (e) => e.value);
    const refunds = sum(es.filter((e) => e.type === 'out' && e.cat === REFUND_CAT), (e) => e.value);
    const expenses = sum(es.filter((e) => e.type === 'out' && e.cat !== REFUND_CAT), (e) => e.value);
    const revenue = gross - refunds; const profit = revenue - expenses;
    return { gross, refunds, revenue, expenses, profit, margin: revenue ? profit / revenue : 0 };
  });
}
function payables() { return DB.ledger.filter((e) => e.type === 'out' && e.status === 'pendente').sort((a, b) => a.date.localeCompare(b.date)); }
function receivables() {
  const manual = DB.ledger.filter((e) => e.type === 'in' && e.status === 'pendente').map((e) => ({ ...e, kind: 'ledger' }));
  const pendingOrders = DB.orders.filter((o) => o.status === 'pendente').map((o) => ({ id: 'o' + o.id, date: o.date, type: 'in', cat: 'Vendas', desc: `Pedido #${o.id} aguardando pagamento`, value: orderTotal(o), status: 'pendente', ref: o.id, kind: 'order' }));
  return [...manual, ...pendingOrders].sort((a, b) => a.date.localeCompare(b.date));
}

/* séries temporais */
function buckets(r, mode) {
  // mode: 'day' | 'week' | 'month'
  const out = [];
  if (mode === 'month') {
    let d = new Date(r.start.getFullYear(), r.start.getMonth(), 1);
    while (d <= r.end) { const s = d < r.start ? r.start : d; const e = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); out.push({ start: s, end: e > r.end ? r.end : e, label: MON[d.getMonth()], full: `${MONTHS[d.getMonth()]} de ${d.getFullYear()}` }); d = addMonths(d, 1); }
  } else if (mode === 'week') {
    let d = weekStart(r.start);
    while (d <= r.end) { const e = endOfDay(addDays(d, 6)); const s = d < r.start ? r.start : d; out.push({ start: s, end: e > r.end ? r.end : e, label: fmtShort(s), full: `Semana de ${fmtShort(s)} a ${fmtShort(e > r.end ? r.end : e)}` }); d = addDays(d, 7); }
  } else {
    for (let d = new Date(r.start); d <= r.end; d = addDays(d, 1)) out.push({ start: startOfDay(d), end: endOfDay(d), label: `${d.getDate()}/${d.getMonth() + 1}`, full: `${DOW_LONG[d.getDay()]}, ${fmtShort(d)}` });
  }
  return out;
}
const modeFor = (r) => (r.days <= 31 ? 'day' : r.days <= 120 ? 'week' : 'month');
function seriesFinance(r, mode = modeFor(r)) {
  return cached('sf' + rkey(r) + mode, () => {
    const bs = buckets(r, mode);
    const es = ledgerIn(r).filter((e) => e.status === 'pago');
    const rev = bs.map(() => 0), exp = bs.map(() => 0);
    es.forEach((e) => {
      const t = toDate(e.date); const i = bs.findIndex((b) => t >= b.start && t <= b.end); if (i < 0) return;
      if (e.type === 'in') rev[i] += e.value; else if (e.cat === REFUND_CAT) rev[i] -= e.value; else exp[i] += e.value;
    });
    return { buckets: bs, revenue: rev.map(round2), expenses: exp.map(round2) };
  });
}
function seriesSales(r, mode = modeFor(r)) {
  return cached('ss' + rkey(r) + mode, () => {
    const bs = buckets(r, mode); const rev = bs.map(() => 0); const cnt = bs.map(() => 0);
    ordersIn(r).forEach((o) => { if (!CONFIRMED.has(o.status)) return; const t = toDate(o.date); const i = bs.findIndex((b) => t >= b.start && t <= b.end); if (i >= 0) { rev[i] += orderTotal(o); cnt[i]++; } });
    return { buckets: bs, revenue: rev.map(round2), orders: cnt };
  });
}

/* ------------------------------------------------------------------ regras de negócio (mutações) */
function addLedger(entry) { const e = { id: 'f' + nextSeq('ledger'), status: 'pago', ...entry }; DB.ledger.push(e); return e; }
function addMove(m) { const mv = { id: 'm' + nextSeq('move'), date: isoLocal(new Date()), ...m }; DB.moves.unshift(mv); return mv; }

/** Confirma a venda: baixa o estoque por SKU/tamanho e registra a entrada no caixa. Idempotente. */
function applyOrder(o) {
  if (o.applied) return;
  const touched = [];
  o.items.forEach((it) => {
    const p = product(it.p); if (!p) return;
    p.stock[it.size] = Math.max(0, (p.stock[it.size] || 0) - it.qty);
    addMove({ p: p.id, size: it.size, qty: -it.qty, type: 'saida', reason: 'Venda', ref: o.id });
    touched.push([p, it.size]);
  });
  addLedger({ date: isoLocal(new Date()), type: 'in', cat: 'Vendas', desc: `Venda do pedido #${o.id}`, value: orderTotal(o), ref: o.id });
  o.applied = true;
  afterStockChange(touched);
  afterSale();
}
/** Estorna uma venda confirmada: devolve as peças ao estoque e lança o estorno. Nunca duplica. */
function revertOrder(o) {
  if (!o.applied) return false;
  o.items.forEach((it) => {
    const p = product(it.p); if (!p) return;
    p.stock[it.size] = (p.stock[it.size] || 0) + it.qty;
    addMove({ p: p.id, size: it.size, qty: it.qty, type: 'entrada', reason: 'Estorno de venda', ref: o.id });
  });
  addLedger({ date: isoLocal(new Date()), type: 'out', cat: REFUND_CAT, desc: `Estorno do pedido #${o.id}`, value: orderTotal(o), ref: o.id });
  o.applied = false; o.refunded = true;
  return true;
}
function pushHistory(o, status) {
  if (!o.history) o.history = synthHistory(o);
  o.history.push({ s: status, d: isoLocal(new Date()) });
}
function synthHistory(o) {
  const start = toDate(o.date); const out = [{ s: 'pendente', d: isoLocal(start) }];
  if (o.status === 'cancelado') { out.push({ s: 'cancelado', d: isoLocal(new Date(start.getTime() + 36e5 * 5)) }); return out; }
  const idx = STATUS_FLOW.indexOf(o.status);
  const gaps = o.channel === 'loja' ? [0, 2, 3, 4] : [0, 12, 30, 80];
  for (let i = 1; i <= idx; i++) out.push({ s: STATUS_FLOW[i], d: isoLocal(new Date(start.getTime() + 6e4 * (gaps[i - 1] + 5) + (o.channel === 'loja' ? 0 : 36e5 * gaps[i - 1]))) });
  return out;
}
function setOrderStatus(o, status) {
  if (o.status === status) return { changed: false };
  if (o.status === 'cancelado') return { changed: false, error: 'Pedidos cancelados não podem ser reabertos. Crie um novo pedido.' };
  let refunded = false;
  if (status === 'cancelado' || status === 'pendente') refunded = revertOrder(o);
  else if (CONFIRMED.has(status)) applyOrder(o);
  pushHistory(o, status);
  o.status = status;
  commit();
  return { changed: true, refunded };
}
function createOrder({ clientId, items, discount, channel, payment, status }) {
  const o = { id: nextSeq('order'), client: clientId, date: isoLocal(new Date()), items: items.map((x) => ({ ...x })), discount: round2(discount || 0), channel, payment, status: 'pendente', applied: false, history: [{ s: 'pendente', d: isoLocal(new Date()) }] };
  DB.orders.push(o);
  if (status !== 'pendente') { applyOrder(o); o.status = status; o.history.push({ s: status, d: isoLocal(new Date()) }); }
  commit();
  return o;
}
/** Entrada (+), saída (−) ou ajuste (define a quantidade contada). */
function registerMove({ pid, size, type, qty, reason }) {
  const p = product(pid); const cur = p.stock[size] || 0;
  let delta = type === 'entrada' ? qty : type === 'saida' ? -qty : qty - cur;
  if (type === 'saida' && qty > cur) return { error: `Saída maior que o disponível (${cur} un.).` };
  p.stock[size] = cur + delta;
  addMove({ p: pid, size, qty: delta, type, reason: reason || ({ entrada: 'Entrada manual', saida: 'Saída manual', ajuste: 'Ajuste de inventário' }[type]) });
  afterStockChange([[p, size]]);
  commit();
  return { delta };
}

/* ------------------------------------------------------------------ notificações e gatilhos */
function notify({ type, title, body, link, tone = 'teal', icon: ic = 'bell', key }) {
  if (key && DB.notifications.some((n) => n.key === key)) return null;
  const n = { id: 'n' + nextSeq('notif'), date: isoLocal(new Date()), type, title, body, link, tone, icon: ic, read: false, key };
  DB.notifications.unshift(n);
  DB.notifications = DB.notifications.slice(0, 60);
  if (typeof onNotification === 'function') onNotification(n);
  return n;
}
const autoOn = (id) => !!DB.automations.find((a) => a.id === id && a.on);
function afterStockChange(pairs) {
  if (!autoOn('low-stock') || !DB.settings.notify.stock) return;
  pairs.forEach(([p, size]) => {
    const q = p.stock[size] || 0; const lvl = variantLevel(q);
    if (lvl === 'ok') return;
    notify({
      type: 'stock', tone: lvl === 'out' ? 'danger' : 'warn', icon: 'alert', link: '#/estoque', key: `low:${p.id}:${size}:${dayKey(new Date())}:${lvl}`,
      title: lvl === 'out' ? `${p.name} esgotou no tamanho ${sizeLabel(size)}` : `Estoque baixo: ${p.name} (${sizeLabel(size)})`,
      body: lvl === 'out' ? `SKU ${p.sku}-${size} chegou a zero. Considere repor ou pausar o anúncio.` : `Restam ${q} un. do SKU ${p.sku}-${size}, abaixo do limite de ${DB.settings.minStock}.`,
    });
  });
}
function afterSale() {
  if (!autoOn('goals') || !DB.settings.notify.goals) return;
  const r = rangeOf('mes'); const k = salesKPIs(r); const goal = DB.settings.goals.revenue;
  [0.5, 0.75, 1].forEach((t) => {
    if (k.revenue >= goal * t) notify({ type: 'goal', tone: 'ok', icon: 'target', link: '#/relatorios', key: `goal:${monthKey(new Date())}:${t}`, title: t === 1 ? 'Meta do mês atingida!' : `${pct(t, 0)} da meta do mês`, body: `Faturamento de ${money(k.revenue)} em ${MONTHS[new Date().getMonth()]}, meta de ${money(goal)}.` });
  });
}

/* ==========================================================================
   COMPONENTES DE INTERFACE
   Toasts, tooltips, diálogos (modal, drawer e bottom sheet), confirmação,
   dropdowns acessíveis, contadores, formulários e pequenos geradores de HTML.
   ========================================================================== */

/* ---------------------------------------------------------------- toasts */
function toast({ title, text = '', tone = 'ok', timeout = 4200 }) {
  const box = $('#toasts'); if (!box) return;
  const ic = { ok: 'success', danger: 'error', warn: 'alert', info: 'info' }[tone] || 'success';
  const el = document.createElement('div');
  el.className = 'toast'; el.dataset.tone = tone; el.setAttribute('role', tone === 'danger' ? 'alert' : 'status');
  el.innerHTML = `${icon(ic, 'lg')}<div><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}</div><button type="button" aria-label="Fechar aviso">${icon('close', 'sm')}</button>`;
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), prefersReduced() ? 0 : 250); };
  el.querySelector('button').addEventListener('click', kill);
  box.appendChild(el);
  while (box.children.length > 3) box.firstElementChild.remove();
  if (timeout) setTimeout(kill, timeout);
}

/* ---------------------------------------------------------------- tooltip para elementos com data-tip */
const Tip = (() => {
  let el, cur;
  function show(target) {
    el ||= $('#tooltip');
    const txt = target.getAttribute('data-tip'); if (!txt || isMobile()) return;
    if (target.closest('.sidebar') && ($('#sidebar').classList.contains('expanded'))) return;
    cur = target; el.textContent = txt; el.hidden = false;
    const r = target.getBoundingClientRect(); const side = target.closest('.sidebar') ? 'right' : 'top';
    const tw = el.offsetWidth, th = el.offsetHeight;
    let x, y;
    if (side === 'right') { x = $('#sidebar').getBoundingClientRect().right + 8; y = r.top + r.height / 2 - th / 2; }
    else { x = r.left + r.width / 2 - tw / 2; y = r.top - th - 8; if (y < 6) y = r.bottom + 8; }
    el.style.left = clamp(x, 6, innerWidth - tw - 6) + 'px'; el.style.top = y + 'px';
  }
  function hide() { if (el) el.hidden = true; cur = null; }
  document.addEventListener('pointerover', (e) => { const t = e.target.closest('[data-tip]'); if (t && t !== cur) show(t); else if (!t && cur) hide(); });
  document.addEventListener('focusin', (e) => { const t = e.target.closest('[data-tip]'); if (t && t.matches(':focus-visible')) show(t); else hide(); });
  document.addEventListener('focusout', hide);
  addEventListener('scroll', hide, { passive: true, capture: true });
  return { hide };
})();

/* ---------------------------------------------------------------- diálogos */
/**
 * Abre um <dialog> nativo (com foco preso e Esc) que vira bottom sheet no mobile.
 * kind: 'modal' | 'drawer'. onSubmit recebe o <form>; retornar false mantém aberto.
 */
function openDialog({ kind = 'modal', title, sub = '', body = '', foot = '', size = '', onMount, onSubmit, onClose }) {
  const dlg = document.createElement('dialog');
  const tid = uid('dt');
  dlg.className = `modal ${kind === 'drawer' ? 'drawer' : ''} ${size}`;
  dlg.setAttribute('aria-labelledby', tid);
  dlg.innerHTML = `<form class="m-form" novalidate>
    <div class="grabber" aria-hidden="true"></div>
    <div class="m-head"><div><h2 id="${tid}">${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
      <button type="button" class="icon-btn" data-close aria-label="Fechar">${icon('close')}</button></div>
    <div class="m-body">${body}</div>${foot ? `<div class="m-foot">${foot}</div>` : ''}</form>`;
  document.body.appendChild(dlg);
  const opener = document.activeElement;
  const form = dlg.querySelector('form');
  let closing = false;
  const close = (result) => {
    if (closing) return; closing = true;
    const done = () => { dlg.close(); dlg.remove(); if (!$('dialog[open]')) document.body.classList.remove('lock'); onClose && onClose(result); if (opener && opener.isConnected) opener.focus({ preventScroll: true }); };
    if (prefersReduced()) return done();
    dlg.classList.add('closing'); setTimeout(done, 200);
  };
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); if (e.target.closest('[data-close]')) close(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!onSubmit) return close();
    const btn = form.querySelector('[type="submit"]');
    const res = await onSubmit(form, btn);
    if (res !== false) close(res);
  });
  document.body.classList.add('lock');
  dlg.showModal();
  const api = { el: dlg, form, close };
  onMount && onMount(dlg, api);
  const first = dlg.querySelector('[autofocus]') || dlg.querySelector('.m-body input:not([type=hidden]), .m-body select, .m-body textarea, .m-body button');
  if (first && !isMobile()) first.focus({ preventScroll: true }); else dlg.querySelector('[data-close]').focus({ preventScroll: true });
  return api;
}
function confirmDialog({ title, text, confirm = 'Confirmar', tone = 'danger', ic = 'alert' }) {
  return new Promise((resolve) => {
    let ok = false;
    openDialog({
      size: 'narrow', title,
      body: `<div class="confirm-ic ${tone === 'danger' ? '' : 'info'}">${icon(ic, 'lg')}</div><p class="muted">${text}</p>`,
      foot: `<button type="button" class="btn btn-ghost" data-close>Voltar</button><button type="submit" class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}">${confirm}</button>`,
      onSubmit: () => { ok = true; },
      onClose: () => resolve(ok),
    });
  });
}

/* ---------------------------------------------------------------- dropdowns e menus acessíveis */
let openPop = null;
function closePopover() {
  if (!openPop) return;
  const { pop, btn, temp } = openPop; openPop = null;
  btn && btn.setAttribute('aria-expanded', 'false');
  if (prefersReduced()) { temp ? pop.remove() : (pop.hidden = true); return; }
  pop.classList.add('closing');
  setTimeout(() => { pop.classList.remove('closing'); temp ? pop.remove() : (pop.hidden = true); }, 140);
}
function togglePopover(btn, pop, { temp = false, onOpen } = {}) {
  if (openPop && openPop.pop === pop) { closePopover(); return false; }
  closePopover();
  pop.hidden = false; btn.setAttribute('aria-expanded', 'true');
  openPop = { pop, btn, temp }; onOpen && onOpen(pop);
  return true;
}
document.addEventListener('pointerdown', (e) => {
  if (!openPop) return;
  if (openPop.pop.contains(e.target) || openPop.btn.contains(e.target)) return;
  closePopover();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && openPop) { const b = openPop.btn; closePopover(); b && b.focus(); } });

/** Lista de opções (role=listbox) presa a um botão. */
function listbox(btn, { options, value, onSelect, align = 'right', label = 'Opções' }) {
  const host = btn.closest('.dd') || btn.parentElement;
  const pop = document.createElement('div');
  pop.className = `popover dd-list ${align === 'left' ? 'left' : ''}`;
  pop.setAttribute('role', 'listbox'); pop.setAttribute('aria-label', label); pop.tabIndex = -1;
  pop.innerHTML = options.map((o, i) => `<div role="option" id="${uid('op')}" data-i="${i}" aria-selected="${o.value === value}" tabindex="-1">${o.icon ? icon(o.icon) : ''}${esc(o.label)}</div>`).join('');
  host.appendChild(pop);
  if (!togglePopover(btn, pop, { temp: true })) { pop.remove(); return; }
  const opts = $$('[role=option]', pop);
  let idx = Math.max(0, options.findIndex((o) => o.value === value));
  const focus = (i) => { idx = (i + opts.length) % opts.length; opts.forEach((o, k) => o.classList.toggle('active', k === idx)); opts[idx].focus(); };
  focus(idx);
  const choose = (i) => { const o = options[i]; closePopover(); btn.focus(); onSelect(o.value, o); };
  pop.addEventListener('click', (e) => { const o = e.target.closest('[role=option]'); if (o) choose(+o.dataset.i); });
  pop.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); focus(idx + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focus(idx - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focus(0); }
    else if (e.key === 'End') { e.preventDefault(); focus(opts.length - 1); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(idx); }
    else if (e.key === 'Tab') closePopover();
  });
}
/** Menu de ações simples (role=menu). items: [{label, icon, run}] */
function actionMenu(btn, items, align = 'right') {
  const host = btn.closest('.dd') || btn.parentElement;
  const pop = document.createElement('div');
  pop.className = `popover menu ${align === 'left' ? 'left' : ''}`; pop.setAttribute('role', 'menu');
  pop.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}">${icon(it.icon)}${esc(it.label)}</button>`).join('');
  host.appendChild(pop);
  if (!togglePopover(btn, pop, { temp: true })) { pop.remove(); return; }
  const btns = $$('button', pop); btns[0].focus();
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { closePopover(); items[+b.dataset.i].run(); } });
  pop.addEventListener('keydown', (e) => {
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
    if (e.key === 'Tab') closePopover();
  });
}

/* ---------------------------------------------------------------- contadores animados */
function animateCounters(root = document) {
  $$('[data-count]', root).forEach((el) => {
    const to = parseFloat(el.dataset.count); const fmt = el.dataset.fmt || 'int';
    const f = { money: money, money0: money0, int: int, pct: (v) => pct(v), short: moneyShort }[fmt] || int;
    if (prefersReduced() || !isFinite(to)) { el.textContent = f(to); return; }
    const dur = 900; const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - k, 3);
      el.textContent = f(fmt === 'int' ? Math.round(to * e) : to * e);
      if (k < 1 && el.isConnected) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

/* ---------------------------------------------------------------- geradores de HTML */
const badge = (label, tone, plain = false) => `<span class="badge${plain ? ' plain' : ''}" data-tone="${tone}">${esc(label)}</span>`;
const statusBadge = (s) => badge(STATUS[s].label, STATUS[s].tone);
const segBadge = (seg) => badge(SEGMENTS[seg].label, SEGMENTS[seg].tone);
const levelBadge = (l) => badge(LEVEL[l].label, LEVEL[l].tone);
const trendHTML = (g, invert = false) => {
  const good = invert ? g <= 0 : g >= 0;
  return `<span class="trend ${good ? 'up' : 'down'}">${icon(g >= 0 ? 'trend-up' : 'trend-down')}${signedPct(g)}</span>`;
};
const emptyHTML = (title, text, action = '') => `<div class="empty"><img src="assets/illustrations/empty-hanger.svg" alt="" width="160" height="140" loading="lazy"><b>${title}</b><p>${text}</p>${action}</div>`;
function pagerHTML(page, total, per, scope) {
  const pages = Math.max(1, Math.ceil(total / per)); page = clamp(page, 1, pages);
  const from = total ? (page - 1) * per + 1 : 0; const to = Math.min(total, page * per);
  const nums = []; const add = (n) => nums.push(n);
  for (let n = 1; n <= pages; n++) if (n === 1 || n === pages || Math.abs(n - page) <= 1) add(n); else if (nums[nums.length - 1] !== '…') add('…');
  return `<nav class="pager" aria-label="Paginação"><span>${int(from)}–${int(to)} de ${int(total)}</span><div class="pager-btns">
    <button type="button" class="pg" data-action="page" data-scope="${scope}" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Página anterior">${icon('chev-left', 'sm')}</button>
    ${nums.map((n) => n === '…' ? '<span aria-hidden="true">…</span>' : `<button type="button" class="pg" data-action="page" data-scope="${scope}" data-page="${n}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`).join('')}
    <button type="button" class="pg" data-action="page" data-scope="${scope}" data-page="${page + 1}" ${page >= pages ? 'disabled' : ''} aria-label="Próxima página">${icon('chev-right', 'sm')}</button></div></nav>`;
}
function sortTh(label, key, state, scope, cls = '') {
  const s = state.sort === key ? (state.dir === 'asc' ? 'ascending' : 'descending') : 'none';
  return `<th class="${cls}" aria-sort="${s}" scope="col"><button type="button" data-action="sort" data-scope="${scope}" data-key="${key}">${label}${icon('chev-up')}</button></th>`;
}
function sortRows(rows, state, getters) {
  const g = getters[state.sort]; if (!g) return rows;
  const dir = state.dir === 'asc' ? 1 : -1;
  return rows.slice().sort((a, b) => { const x = g(a), y = g(b); return (x > y ? 1 : x < y ? -1 : 0) * dir; });
}

/* avatar ilustrado gerado a partir do id do cliente */
const AV = { bg: ['#3A2F4F', '#23413B', '#4A3B22', '#43283F', '#26364A', '#3B3B3B', '#2F3D2A'], skin: ['#F4D3B5', '#E8B990', '#D29B6E', '#B07A52', '#8A5A3B', '#5E3B26'], hair: ['#1E1410', '#3B2416', '#6B4226', '#A0703F', '#D9B26A', '#2B2B2B', '#7A2E2E', '#4A4A4A'], top: ['#08E5C1', '#FFDC68', '#EA9AF7', '#9B70FF', '#F5F5F5', '#6FA8FF', '#FF8A65', '#3DDC97'] };
const avCache = new Map();
function avatarOf(c) {
  if (!c) return 'assets/images/admin-avatar.svg';
  if (avCache.has(c.id)) return avCache.get(c.id);
  const h = hashStr(c.id + c.name); const pickA = (arr, sh) => arr[(h >>> sh) % arr.length];
  const bg = pickA(AV.bg, 1), skin = pickA(AV.skin, 4), hair = pickA(AV.hair, 8), top = pickA(AV.top, 12);
  const style = (h >>> 16) % 4; const f = c.g !== 'm';
  const back = f && style !== 2 ? `<path d="M15 38c0-15 7-24 17-24s17 9 17 24v20H15Z" fill="${hair}"/>` : '';
  const fronts = [
    `<path d="M20 30c0-10 5-16 12-16s12 6 12 16c-3-6-7-8-12-8s-9 2-12 8Z" fill="${hair}"/>`,
    `<path d="M19 31c0-11 6-17 13-17 8 0 13 6 13 14-6-1-13-4-17-9-2 5-5 9-9 12Z" fill="${hair}"/>`,
    `<circle cx="32" cy="12" r="6" fill="${hair}"/><path d="M20 29c0-9 5-15 12-15s12 6 12 15c-4-5-8-7-12-7s-8 2-12 7Z" fill="${hair}"/>`,
    `<g fill="${hair}"><circle cx="22" cy="24" r="5"/><circle cx="28" cy="18" r="6"/><circle cx="36" cy="18" r="6"/><circle cx="42" cy="24" r="5"/><circle cx="32" cy="16" r="5"/></g>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/>${back}<path d="M8 66c2-13 12-19 24-19s22 6 24 19Z" fill="${top}"/><rect x="27" y="38" width="10" height="11" rx="4" fill="${skin}" opacity=".85"/><ellipse cx="32" cy="31" rx="11" ry="13" fill="${skin}"/>${fronts[style]}<circle cx="28" cy="32" r="1.4" fill="#2B1B14"/><circle cx="36" cy="32" r="1.4" fill="#2B1B14"/><path d="M29 37.5c1.8 1.4 4.2 1.4 6 0" fill="none" stroke="#8A4A3A" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  const uri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  avCache.set(c.id, uri); return uri;
}

/* ---------------------------------------------------------------- formulários */
function field({ name, label, type = 'text', value = '', required = false, placeholder = '', hint = '', attrs = '', options = null, full = false, prefix = '', cls = '' }) {
  const id = uid('f');
  const req = required ? ' required aria-required="true"' : '';
  let control;
  if (options) control = `<select class="select" id="${id}" name="${name}"${req} ${attrs}>${options.map((o) => { const v = typeof o === 'object' ? o.value : o; const l = typeof o === 'object' ? o.label : o; return `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  else if (type === 'textarea') control = `<textarea class="textarea" id="${id}" name="${name}" placeholder="${esc(placeholder)}"${req} ${attrs}>${esc(value)}</textarea>`;
  else control = `<input class="input" id="${id}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}"${req} ${attrs}>`;
  if (prefix) control = `<div class="input-affix"><span>${prefix}</span>${control}</div>`;
  return `<div class="field ${full ? 'full' : ''} ${cls}"><label for="${id}">${label}${required || options || ['date', 'color', 'number'].includes(type) ? '' : ' <span class="muted">(opcional)</span>'}</label>${control}${hint ? `<span class="hint" id="${id}-h">${hint}</span>` : ''}</div>`;
}
const V = {
  required: (msg = 'Preencha este campo.') => (v) => (String(v ?? '').trim() ? null : msg),
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : 'Use um e-mail válido, como nome@dominio.com.'),
  phone: (v) => (!v || v.replace(/\D/g, '').length >= 10 ? null : 'Informe DDD e número, como (11) 98765-4321.'),
  money: (min = 0.01) => (v) => (parseMoney(v) >= min ? null : `Informe um valor a partir de ${money(min)}.`),
  intMin: (min = 0) => (v) => (/^-?\d+$/.test(String(v).trim()) && +v >= min ? null : `Use um número inteiro a partir de ${min}.`),
};
/** Valida um formulário: rules = { campo: [validador, ...] }. Mostra erros acessíveis. */
function validate(form, rules) {
  let first = null; const data = Object.fromEntries(new FormData(form).entries());
  $$('.err', form).forEach((e) => e.remove());
  $$('[aria-invalid]', form).forEach((e) => { e.removeAttribute('aria-invalid'); e.removeAttribute('aria-describedby'); });
  Object.entries(rules).forEach(([name, fns]) => {
    const input = form.elements[name]; if (!input) return;
    const el = input.length && !input.tagName ? input[0] : input;
    for (const fn of fns) {
      const msg = fn(data[name], data);
      if (msg) {
        const eid = uid('e'); el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', eid);
        const f = el.closest('.field') || el.parentElement;
        f.insertAdjacentHTML('beforeend', `<span class="err" id="${eid}">${icon('error', 'sm')}${esc(msg)}</span>`);
        first ||= el; break;
      }
    }
  });
  if (first) { first.focus(); return null; }
  return data;
}
/* máscara de telefone brasileiro */
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.dataset && t.dataset.mask === 'phone') {
    const d = t.value.replace(/\D/g, '').slice(0, 11);
    t.value = d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
  }
  if (t.getAttribute && t.getAttribute('aria-invalid') === 'true') { t.removeAttribute('aria-invalid'); const er = t.closest('.field')?.querySelector('.err'); er && er.remove(); }
});

/* ---------------------------------------------------------------- skeletons */
function skeletonPage(kind) {
  const b = (h, extra = '') => `<div class="skeleton" style="height:${h}px;${extra}"></div>`;
  if (kind === 'visao-geral') return `<div class="sk-page">${b(54, 'max-width:420px;background:transparent')}<div class="sk-row">${b(150)}${b(150)}${b(150)}</div><div class="sk-row">${b(320)}${b(320)}</div><div class="sk-row">${b(280)}${b(280)}</div></div>`;
  return `<div class="sk-page">${b(64, 'max-width:520px;background:transparent')}<div class="sk-row">${b(108)}${b(108)}${b(108)}${b(108)}</div>${b(56)}${b(420)}</div>`;
}

/* ==========================================================================
   GRÁFICOS EM SVG (sem bibliotecas)
   Linhas com crosshair, barras em cápsula, rosca, barras horizontais e
   barras agrupadas. Todos responsivos (ResizeObserver), navegáveis por
   teclado e com tooltip. Cores fixas para permitir exportar em PNG.
   ========================================================================== */
const C = { teal: '#08E5C1', yellow: '#FFDC68', pink: '#EA9AF7', purple: '#9B70FF', grid: 'rgba(255,255,255,.07)', axis: '#8E8E8E', track: '#262626', text: '#F5F5F5' };
const SVGNS = 'http://www.w3.org/2000/svg';

let tipEl;
function showTip(x, y, html, below = false) {
  tipEl ||= Object.assign(document.createElement('div'), { className: 'ch-tip' });
  if (!tipEl.isConnected) document.body.appendChild(tipEl);
  tipEl.innerHTML = html; tipEl.style.opacity = '1';
  tipEl.classList.toggle('below', below);
  const w = tipEl.offsetWidth;
  tipEl.style.left = clamp(x, w / 2 + 8, innerWidth - w / 2 - 8) + 'px';
  tipEl.style.top = y + 'px';
}
function hideTip() { if (tipEl) tipEl.style.opacity = '0'; }
addEventListener('scroll', hideTip, { passive: true });
const tipRow = (label, value, color) => `<div class="row" style="--c:${color}"><span>${esc(label)}</span><strong>${value}</strong></div>`;

function niceScale(max, ticks = 4) {
  if (max <= 0) return { max: 1, step: 0.25 };
  const raw = max / ticks; const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
  return { max: step * Math.ceil(max / step), step };
}
/* curva monotônica (Fritsch–Carlson): suave e sem "overshoot" */
function monotonePath(pts) {
  const n = pts.length; if (n < 2) return n ? `M${pts[0][0]},${pts[0][1]}` : '';
  const dx = [], dy = [], m = [], t = [];
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1][0] - pts[i][0]; dy[i] = pts[i + 1][1] - pts[i][1]; m[i] = dy[i] / dx[i]; }
  t[0] = m[0]; t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${(pts[i][0] + h).toFixed(1)},${(pts[i][1] + h * t[i]).toFixed(1)} ${(pts[i + 1][0] - h).toFixed(1)},${(pts[i + 1][1] - h * t[i + 1]).toFixed(1)} ${pts[i + 1][0].toFixed(1)},${pts[i + 1][1].toFixed(1)}`;
  }
  return d;
}
const reveal = (w, h, id, anim) => `<clipPath id="${id}"><rect x="-4" y="-10" width="${anim ? 0 : w + 8}" height="${h + 20}">${anim ? `<animate attributeName="width" from="0" to="${w + 8}" dur="1.15s" begin="0s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/>` : ''}</rect></clipPath>`;
const canAnim = (animate) => animate && !prefersReduced();

/** Observa a largura e redesenha. */
function responsive(el, draw) {
  let last = 0;
  draw(true);
  last = el.clientWidth;
  if (el._ro) el._ro.disconnect();
  el._ro = new ResizeObserver(debounce(() => { if (!el.isConnected) return el._ro.disconnect(); if (Math.abs(el.clientWidth - last) > 8) { last = el.clientWidth; draw(false); } }, 120));
  el._ro.observe(el);
}

/* ---------------------------------------------------------------- linhas */
function lineChart(el, cfg) {
  el._hidden ||= new Set();
  const plotWrap = document.createElement('div'); plotWrap.className = 'chart'; plotWrap.tabIndex = 0;
  plotWrap.setAttribute('role', 'img'); plotWrap.setAttribute('aria-label', cfg.aria || 'Gráfico de linhas. Use as setas para navegar.');
  const legend = document.createElement('div'); legend.className = 'legend'; legend.setAttribute('role', 'group'); legend.setAttribute('aria-label', 'Séries do gráfico');
  el.replaceChildren(plotWrap, legend);
  let active = -1, geom = null;
  const fmtAxis = cfg.axisFmt || moneyShort; const fmtTip = cfg.tipFmt || money;
  function draw(animate) {
    const W = Math.max(280, plotWrap.clientWidth); const H = cfg.height || (W < 480 ? 210 : 250);
    const P = { l: 54, r: 12, t: 14, b: 28 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b;
    const vis = cfg.series.filter((s) => !el._hidden.has(s.key));
    const max = Math.max(1, ...vis.flatMap((s) => s.values));
    const { max: ymax, step } = niceScale(max * 1.05, 4);
    const n = cfg.labels.length; const x = (i) => P.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1)); const y = (v) => P.t + ih - (Math.max(0, v) / ymax) * ih;
    const cid = uid('cl'); const gid = uid('g');
    let grid = '', ylab = '', xlab = '';
    for (let v = 0; v <= ymax + 1e-6; v += step) { grid += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}"/>`; ylab += `<text x="${P.l - 10}" y="${y(v) + 4}" text-anchor="end">${fmtAxis(v)}</text>`; }
    const every = Math.ceil(n / Math.max(2, Math.floor(iw / 46)));
    cfg.labels.forEach((l, i) => { if (i % every === 0 || (i === n - 1 && (n - 1) % every >= every * 0.6)) xlab += `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === n - 1 && n > 1 ? 'end' : 'middle'}">${esc(l)}</text>`; });
    let series = '';
    vis.forEach((s, si) => {
      const pts = s.values.map((v, i) => [x(i), y(v)]);
      const d = monotonePath(pts);
      if (s.area) series += `<path d="${d}L${x(n - 1)},${P.t + ih}L${x(0)},${P.t + ih}Z" fill="url(#${gid}${si})"/>`;
      series += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.4}" stroke-linecap="round" stroke-linejoin="round" ${s.dash ? 'stroke-dasharray="5 6"' : ''}/>`;
    });
    const grads = vis.map((s, si) => s.area ? `<linearGradient id="${gid}${si}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient>` : '').join('');
    plotWrap.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="${SVGNS}" font-family="Inter, sans-serif">
      <defs>${grads}${reveal(W, H, cid, canAnim(animate))}</defs>
      <g class="grid">${grid}</g><g class="axis">${ylab}${xlab}</g>
      <g class="series" clip-path="url(#${cid})">${series}</g>
      <line class="xhair" x1="0" x2="0" y1="${P.t}" y2="${P.t + ih}" opacity="0"/>
      <g class="dots"></g>
      <rect class="hit" x="${P.l - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/></svg>`;
    geom = { x, y, n, P, ih, vis, W };
    if (active >= 0) focusIdx(active, false);
  }
  function focusIdx(i, tip = true) {
    if (!geom) return; active = clamp(i, 0, geom.n - 1);
    const svg = plotWrap.querySelector('svg'); const xh = svg.querySelector('.xhair'); const X = geom.x(active);
    xh.setAttribute('x1', X); xh.setAttribute('x2', X); xh.setAttribute('opacity', '1');
    svg.querySelector('.dots').innerHTML = geom.vis.map((s) => `<circle cx="${X}" cy="${geom.y(s.values[active])}" r="5" fill="${s.color}" stroke="#181818" stroke-width="2.5"/>`).join('');
    if (!tip) return;
    const r = svg.getBoundingClientRect(); const scale = r.width / geom.W;
    const topY = Math.min(...geom.vis.map((s) => geom.y(s.values[active])));
    const extra = cfg.tipExtra ? cfg.tipExtra(active, geom.vis) : '';
    showTip(r.left + X * scale, r.top + topY * scale, `<b>${esc(cfg.fulls ? cfg.fulls[active] : cfg.labels[active])}</b>${geom.vis.map((s) => tipRow(s.name, fmtTip(s.values[active]), s.color)).join('')}${extra}`);
  }
  function clear() { active = -1; hideTip(); const svg = plotWrap.querySelector('svg'); if (!svg) return; svg.querySelector('.xhair').setAttribute('opacity', '0'); svg.querySelector('.dots').innerHTML = ''; }
  plotWrap.addEventListener('pointermove', (e) => {
    if (!geom) return; const r = plotWrap.querySelector('svg').getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * geom.W;
    const i = Math.round(((px - geom.P.l) / (geom.W - geom.P.l - geom.P.r)) * (geom.n - 1)); focusIdx(i);
  });
  plotWrap.addEventListener('pointerleave', clear);
  plotWrap.addEventListener('blur', clear);
  plotWrap.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); focusIdx(active < 0 ? 0 : active + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); focusIdx(active < 0 ? geom.n - 1 : active - 1); }
    if (e.key === 'Escape') clear();
  });
  legend.innerHTML = cfg.series.map((s) => `<button type="button" class="lg-item" style="--c:${s.color}" aria-pressed="${!el._hidden.has(s.key)}" data-key="${s.key}"><i class="${s.dash ? 'dash' : ''}"></i>${esc(s.name)}</button>`).join('');
  legend.addEventListener('click', (e) => {
    const b = e.target.closest('.lg-item'); if (!b) return; const k = b.dataset.key;
    if (el._hidden.has(k)) el._hidden.delete(k); else { if (cfg.series.length - el._hidden.size <= 1) { toast({ tone: 'info', title: 'Mantenha ao menos uma série visível' }); return; } el._hidden.add(k); }
    b.setAttribute('aria-pressed', String(!el._hidden.has(k))); draw(true);
  });
  responsive(plotWrap, draw);
  return { svg: () => plotWrap.querySelector('svg') };
}

/* ---------------------------------------------------------------- barras em cápsula (vendas semanais) */
function capsuleBars(el, { labels, fulls, values, colors, fmt = moneyShort, tipFmt = money, sub }) {
  function draw(animate) {
    const W = Math.max(240, el.clientWidth); const H = W < 360 ? 200 : 214;
    const n = values.length; const gap = W / n; const bw = Math.min(30, gap * 0.52);
    const top = 30, bottom = 26, ih = H - top - bottom; const max = Math.max(...values, 1) * 1.06;
    const gid = uid('cb');
    const defs = colors.map((c, i) => `<linearGradient id="${gid}${i}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".35" stop-color="${c}" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>`).join('');
    const bars = values.map((v, i) => {
      const cx = gap * i + gap / 2; const x = cx - bw / 2; const h = Math.max(bw, (v / max) * ih); const y = top + ih - h; const c = colors[i % colors.length];
      const chip = fmt(v); const cw = Math.max(44, chip.length * 6.4 + 14);
      return `<g class="bar-hit" tabindex="0" role="listitem" aria-label="${esc(fulls ? fulls[i] : labels[i])}: ${esc(tipFmt(v))}" data-i="${i}">
        <rect class="bar-track" x="${x}" y="${top}" width="${bw}" height="${ih}" rx="${bw / 2}" fill="${C.track}"/>
        <g class="bar-fill"><rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="${bw / 2}" fill="${c}"/><rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="${bw / 2}" fill="url(#${gid}${i % colors.length})"/>
        <ellipse cx="${cx}" cy="${y + bw * 0.32}" rx="${bw * 0.36}" ry="${bw * 0.13}" fill="#fff" opacity=".35"/></g>
        <g class="bar-val"><rect x="${cx - cw / 2}" y="${Math.max(0, y - 30)}" width="${cw}" height="22" rx="7" fill="#F5F5F5"/><text x="${cx}" y="${Math.max(0, y - 30) + 15}" text-anchor="middle" font-size="11" font-weight="600" fill="#141414">${esc(chip)}</text></g>
        <text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="12" fill="${C.axis}">${esc(labels[i])}</text>
        <rect x="${gap * i}" y="0" width="${gap}" height="${H}" fill="transparent"/></g>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="list" aria-label="${esc(sub || 'Vendas por dia')}" xmlns="${SVGNS}" font-family="Inter, sans-serif"><defs>${defs}</defs>${bars}</svg>`;
    const svg = el.querySelector('svg');
    if (animate && !prefersReduced()) { el.classList.add('pre'); requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('pre'))); }
    svg.addEventListener('pointerdown', (e) => { const g = e.target.closest('.bar-hit'); $$('.bar-hit.on', svg).forEach((b) => b !== g && b.classList.remove('on')); if (g && e.pointerType !== 'mouse') g.classList.toggle('on'); });
  }
  responsive(el, draw);
}

/* ---------------------------------------------------------------- rosca */
function donutChart(el, { items, fmt = money, center, onHover }) {
  const total = sum(items, (i) => i.value) || 1;
  const R = 74, SW = 24, Cc = 2 * Math.PI * R, GAP = 4;
  let acc = 0;
  const arcs = items.map((it, i) => {
    const len = (it.value / total) * Cc; const dash = Math.max(0, len - GAP);
    const a = `<circle class="seg-arc" data-i="${i}" tabindex="0" role="listitem" aria-label="${esc(it.label)}: ${pct(it.value / total)} (${esc(fmt(it.value))})" cx="100" cy="100" r="${R}" fill="none" stroke="${it.color}" stroke-width="${SW}" stroke-dasharray="${dash} ${Cc - dash}" stroke-dashoffset="${-acc}" stroke-linecap="butt"/>`;
    acc += len; return a;
  }).join('');
  el.innerHTML = `<svg viewBox="0 0 200 200" role="list" aria-label="Distribuição por canal" xmlns="${SVGNS}"><g transform="rotate(-90 100 100)">
    <circle cx="100" cy="100" r="${R}" fill="none" stroke="${C.track}" stroke-width="${SW}"/>${arcs}
    ${prefersReduced() ? '' : `<animateTransform attributeName="transform" type="rotate" from="-50 100 100" to="0 100 100" dur=".9s" begin="0s" fill="freeze" additive="sum" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/>`}</g></svg>
    <div class="donut-center"><b>${center.value}</b><small>${center.label}</small></div>`;
  const cb = el.querySelector('.donut-center');
  const set = (i) => {
    $$('.seg-arc', el).forEach((a) => a.classList.toggle('on', +a.dataset.i === i));
    el.classList.toggle('dim', i >= 0);
    if (i >= 0) { const it = items[i]; cb.innerHTML = `<b>${pct(it.value / total)}</b><small>${esc(it.label)}<br>${esc(fmt(it.value))}</small>`; }
    else cb.innerHTML = `<b>${center.value}</b><small>${center.label}</small>`;
    onHover && onHover(i);
  };
  el.addEventListener('pointerover', (e) => { const a = e.target.closest('.seg-arc'); set(a ? +a.dataset.i : -1); });
  el.addEventListener('pointerleave', () => set(-1));
  el.addEventListener('focusin', (e) => { const a = e.target.closest('.seg-arc'); if (a) set(+a.dataset.i); });
  el.addEventListener('focusout', () => set(-1));
  return { highlight: set };
}

/* ---------------------------------------------------------------- barras horizontais */
function hbarChart(el, { items, fmt = money, color = C.teal, sub = (it) => '' }) {
  function draw(animate) {
    const W = Math.max(260, el.clientWidth); const row = 40; const H = items.length * row;
    const labW = Math.min(170, W * 0.36); const valW = 86; const iw = W - labW - valW - 8;
    const max = Math.max(...items.map((i) => i.value), 1);
    const rows = items.map((it, i) => {
      const y = i * row; const w = Math.max(4, (it.value / max) * iw);
      const lbl = it.label.length > 26 && W < 520 ? it.label.slice(0, 24) + '…' : it.label;
      return `<g class="hb" tabindex="0" role="listitem" aria-label="${esc(it.label)}: ${esc(fmt(it.value))}" data-i="${i}">
        <text x="0" y="${y + 17}" font-size="12.5" fill="${C.text}">${esc(lbl)}</text>
        ${sub(it) ? `<text x="0" y="${y + 32}" font-size="11" fill="${C.axis}">${esc(sub(it))}</text>` : ''}
        <rect x="${labW}" y="${y + 12}" width="${iw}" height="12" rx="6" fill="${C.track}"/>
        <rect x="${labW}" y="${y + 12}" width="${w}" height="12" rx="6" fill="${it.color || color}">${!canAnim(animate) ? '' : `<animate attributeName="width" from="0" to="${w}" dur=".9s" begin="0s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/>`}</rect>
        <text x="${W}" y="${y + 22}" font-size="12.5" text-anchor="end" fill="${C.text}" font-weight="600">${esc(fmt(it.value))}</text>
        <rect x="0" y="${y}" width="${W}" height="${row}" fill="transparent"/></g>`;
    }).join('');
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="list" xmlns="${SVGNS}" font-family="Inter, sans-serif" style="overflow:visible">${rows}</svg>`;
  }
  responsive(el, draw);
}

/* ---------------------------------------------------------------- barras agrupadas + linha (mesma escala, mesmo eixo) */
function groupedBars(el, { labels, fulls, series, line, height, axisFmt = moneyShort, tipFmt = money }) {
  el._hidden ||= new Set();
  const plot = document.createElement('div'); plot.className = 'chart'; plot.tabIndex = 0; plot.setAttribute('role', 'img'); plot.setAttribute('aria-label', 'Gráfico de barras agrupadas. Use as setas para navegar.');
  const legend = document.createElement('div'); legend.className = 'legend';
  el.replaceChildren(plot, legend);
  let geom, active = -1;
  function draw(animate) {
    const W = Math.max(280, plot.clientWidth); const H = height || (W < 480 ? 220 : 260); const P = { l: 54, r: 10, t: 14, b: 28 };
    const iw = W - P.l - P.r, ih = H - P.t - P.b; const n = labels.length;
    const vis = series.filter((s) => !el._hidden.has(s.key)); const showLine = line && !el._hidden.has(line.key);
    const vals = [...vis.flatMap((s) => s.values), ...(showLine ? line.values : [])];
    const maxV = Math.max(1, ...vals); const minV = Math.min(0, ...vals);
    const { max: ymax, step } = niceScale(maxV * 1.05, 4); const ymin = minV < 0 ? -niceScale(-minV * 1.05, 2).max : 0;
    const y = (v) => P.t + ih - ((v - ymin) / (ymax - ymin)) * ih;
    const gw = iw / n; const bw = Math.max(3, Math.min(18, (gw * 0.7) / Math.max(1, vis.length))); const cx = (i) => P.l + gw * i + gw / 2;
    let grid = '', ylab = '', xlab = '', bars = '';
    for (let v = ymin; v <= ymax + 1e-6; v += step) { grid += `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" ${Math.abs(v) < 1e-6 ? 'stroke="rgba(255,255,255,.18)"' : ''}/>`; ylab += `<text x="${P.l - 10}" y="${y(v) + 4}" text-anchor="end">${axisFmt(v)}</text>`; }
    const every = Math.ceil(n / Math.max(2, Math.floor(iw / 44)));
    labels.forEach((l, i) => { if (i % every === 0) xlab += `<text x="${cx(i)}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`; });
    labels.forEach((_, i) => vis.forEach((s, si) => {
      const v = s.values[i]; const x = cx(i) - (vis.length * bw + (vis.length - 1) * 2) / 2 + si * (bw + 2); const y0 = y(0), y1 = y(Math.max(0, v));
      const h = Math.max(1, y0 - y1);
      bars += `<rect x="${x}" y="${y1}" width="${bw}" height="${h}" rx="${Math.min(4, bw / 2)}" fill="${s.color}" class="gb" data-i="${i}">${animate && !prefersReduced() ? `<animate attributeName="height" from="0" to="${h}" dur=".8s" begin="0s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/><animate attributeName="y" from="${y0}" to="${y1}" dur=".8s" begin="0s" fill="freeze" calcMode="spline" keySplines=".2 .7 .2 1" keyTimes="0;1"/>` : ''}</rect>`;
    }));
    const lpath = showLine ? monotonePath(line.values.map((v, i) => [cx(i), y(v)])) : '';
    plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" xmlns="${SVGNS}" font-family="Inter, sans-serif">
      <g class="grid">${grid}</g><g class="axis">${ylab}${xlab}</g><g class="hl"></g><g>${bars}</g>
      ${showLine ? `<path d="${lpath}" fill="none" stroke="${line.color}" stroke-width="2.2" stroke-dasharray="${line.dash ? '5 5' : ''}" stroke-linecap="round"/>` : ''}
      <g class="dots"></g><rect class="hit" x="${P.l}" y="0" width="${iw}" height="${H}" fill="transparent"/></svg>`;
    geom = { cx, y, n, gw, P, W, H, ih, vis, showLine };
  }
  function focusIdx(i) {
    if (!geom) return; active = clamp(i, 0, geom.n - 1);
    const svg = plot.querySelector('svg');
    svg.querySelector('.hl').innerHTML = `<rect x="${geom.cx(active) - geom.gw / 2}" y="${geom.P.t}" width="${geom.gw}" height="${geom.ih}" rx="8" fill="rgba(255,255,255,.04)"/>`;
    svg.querySelector('.dots').innerHTML = geom.showLine ? `<circle cx="${geom.cx(active)}" cy="${geom.y(line.values[active])}" r="4.5" fill="${line.color}" stroke="#181818" stroke-width="2"/>` : '';
    const r = svg.getBoundingClientRect(); const s = r.width / geom.W;
    const rows = geom.vis.map((se) => tipRow(se.name, tipFmt(se.values[active]), se.color)).join('') + (geom.showLine ? tipRow(line.name, tipFmt(line.values[active]), line.color) : '');
    showTip(r.left + geom.cx(active) * s, r.top + geom.P.t * s + 10, `<b>${esc(fulls ? fulls[active] : labels[active])}</b>${rows}`);
  }
  const clear = () => { active = -1; hideTip(); const svg = plot.querySelector('svg'); if (svg) { svg.querySelector('.hl').innerHTML = ''; svg.querySelector('.dots').innerHTML = ''; } };
  plot.addEventListener('pointermove', (e) => { if (!geom) return; const r = plot.querySelector('svg').getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * geom.W; focusIdx(Math.floor((px - geom.P.l) / geom.gw)); });
  plot.addEventListener('pointerleave', clear); plot.addEventListener('blur', clear);
  plot.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') { e.preventDefault(); focusIdx(active + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); focusIdx(active < 0 ? geom.n - 1 : active - 1); } });
  const all = [...series, ...(line ? [line] : [])];
  legend.innerHTML = all.map((s) => `<button type="button" class="lg-item" style="--c:${s.color}" aria-pressed="${!el._hidden.has(s.key)}" data-key="${s.key}"><i class="${s === line ? (line.dash ? 'dash' : '') : 'dot'}"></i>${esc(s.name)}</button>`).join('');
  legend.addEventListener('click', (e) => { const b = e.target.closest('.lg-item'); if (!b) return; const k = b.dataset.key; el._hidden.has(k) ? el._hidden.delete(k) : el._hidden.add(k); b.setAttribute('aria-pressed', String(!el._hidden.has(k))); draw(true); });
  responsive(plot, draw);
  return { svg: () => plot.querySelector('svg') };
}

/* ==========================================================================
   ESTADO DA INTERFACE, AÇÕES DELEGADAS E VISÃO GERAL (DASHBOARD)
   ========================================================================== */
const UI = {
  period: '30d', visited: new Set(), timers: [],
  dashOrders: { q: '', status: 'all', sort: 'date', dir: 'desc' },
  chartRange: '12m', weekMode: 'last', calMonth: null, calSel: dayKey(new Date()),
  orders: { q: '', status: 'all', channel: 'all', from: '', to: '', sort: 'date', dir: 'desc', page: 1 },
  products: { q: '', cat: 'all', status: 'all', view: 'grid', sort: 'name', dir: 'asc', page: 1 },
  stock: { q: '', level: 'all', cat: 'all', page: 1, mvType: 'all', mvPage: 1 },
  clients: { q: '', seg: 'all', city: 'all', sort: 'value', dir: 'desc', page: 1 },
  finance: { q: '', type: 'all', cat: 'all', status: 'all', sort: 'date', dir: 'desc', page: 1 },
  reports: { cat: 'all', channel: 'all' },
  settingsTab: 'loja',
};
/** Ações disparadas por [data-action] (clique) e [data-change] (input/change). */
const ACTIONS = {};
const CHANGES = {};
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]'); if (!t || t.disabled) return;
  const fn = ACTIONS[t.dataset.action]; if (!fn) return;
  if (t.tagName === 'A' && !t.getAttribute('href')?.startsWith('#/')) e.preventDefault();
  if (t.tagName === 'BUTTON' || t.dataset.action) { if (t.tagName !== 'A') e.preventDefault(); }
  fn(t, e);
});
const onChange = (e) => { const t = e.target.closest('[data-change]'); if (!t) return; const fn = CHANGES[t.dataset.change]; fn && fn(t, e); };
document.addEventListener('change', onChange);
document.addEventListener('input', debounce(onChange, 180));

const RANGE_CHART = { '12m': 'Últimos 12 meses', '6m': 'Últimos 6 meses', ano: 'Este ano', periodo: 'Período do filtro' };
const WEEK_COLORS = ['#FFB547', '#EA9AF7', '#FFDC68', '#08E5C1', '#FF8A65', '#9B70FF', '#C9C9C9'];
const DOW_SHORT_MON = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const periodText = () => PERIODS[UI.period].label.toLowerCase();

function chartRangeObj() {
  const now = new Date();
  if (UI.chartRange === '12m') return { start: new Date(now.getFullYear(), now.getMonth() - 11, 1), end: endOfDay(now), mode: 'month' };
  if (UI.chartRange === '6m') return { start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: endOfDay(now), mode: 'month' };
  if (UI.chartRange === 'ano') return { start: new Date(now.getFullYear(), 0, 1), end: endOfDay(now), mode: 'month' };
  const r = rangeOf(UI.period); return { ...r, mode: modeFor(r) };
}

function ticketHTML({ tone, label, value, fmt, g, href, link, art, artW, artH }) {
  return `<article class="ticket" data-tone="${tone}" role="listitem">
    <div class="ticket-bg" aria-hidden="true"></div>
    <div class="ticket-body">
      <h3 class="ticket-label">${label}</h3>
      <span class="ticket-period">${PERIODS[UI.period].label}</span>
      <p class="ticket-value num" data-count="${value}" data-fmt="${fmt}">${fmt === 'money0' ? money0(value) : int(value)}</p>
      <div class="ticket-row"><span class="ticket-trend ${g < 0 ? 'neg' : ''}">${icon(g >= 0 ? 'trend-up' : 'trend-down', 'sm')}${signedPct(g)}<span class="sr-only"> em relação ao período anterior</span></span>
      <a class="ticket-link" href="${href}">${link}</a></div>
    </div>
    ${DB.settings.ui.illustrations ? `<img class="ticket-art" src="assets/illustrations/${art}" alt="" width="${artW}" height="${artH}" decoding="async">` : ''}
  </article>`;
}

function viewDashboard() {
  const r = rangeOf(UI.period); const pr = prevRange(r);
  const k = salesKPIs(r), kp = salesKPIs(pr);
  const first = DB.settings.admin.name.split(' ')[0] || 'administrador';
  const ch = CH_KEYS.map((key) => ({ key, label: CHANNELS[key].label, value: k.byChannel[key].revenue, color: CHANNELS[key].color }));
  const tot = sum(ch, (c) => c.value) || 1;
  return `<div class="page dash">
    <div class="dash-main">
      <div class="hello"><h2>Olá, ${esc(first.toLowerCase() === 'administrador' ? 'administrador' : first)}!</h2><p>Acompanhe o desempenho da sua loja em tempo real.</p></div>
      <div class="tickets" role="list" aria-label="Indicadores principais">
        ${ticketHTML({ tone: 'teal', label: 'Faturamento', value: Math.round(k.revenue), fmt: 'money0', g: growth(k.revenue, kp.revenue), href: '#/financeiro', link: 'Ver financeiro', art: 'wallet-coins.svg', artW: 240, artH: 204 })}
        ${ticketHTML({ tone: 'yellow', label: 'Pedidos realizados', value: k.orders, fmt: 'int', g: growth(k.orders, kp.orders), href: '#/pedidos', link: 'Ver pedidos', art: 'boxes-bag.svg', artW: 240, artH: 204 })}
        ${ticketHTML({ tone: 'pink', label: 'Novos clientes', value: k.newClients, fmt: 'int', g: growth(k.newClients, kp.newClients), href: '#/clientes?novos=1', link: 'Ver clientes', art: 'dress-form.svg', artW: 200, artH: 262 })}
      </div>

      <section class="card chart-card" aria-labelledby="revTitle">
        <div class="card-head">
          <div><h2 class="card-title" id="revTitle">Faturamento</h2><p class="card-sub">Receita e despesas pagas, comparação ${UI.chartRange === 'periodo' ? 'no período' : 'mês a mês'}</p></div>
          <div class="card-tools">
            <div class="dd"><button type="button" class="chip-btn sm" data-action="chart-range" aria-haspopup="listbox" aria-expanded="false">${icon('calendar', 'sm')}<span>${RANGE_CHART[UI.chartRange]}</span>${icon('chev-down', 'sm chev')}</button></div>
            <div class="dd"><button type="button" class="chip-btn sm accent" data-action="chart-export" aria-haspopup="menu" aria-expanded="false">${icon('download', 'sm')}Exportar</button></div>
          </div>
        </div>
        <div class="chart-wrap"><div id="revChart"></div>${DB.settings.ui.illustrations ? '<img class="chart-art" src="assets/illustrations/clothes-rack.svg" alt="" width="220" height="240" loading="lazy">' : ''}</div>
        <div id="revSummary"></div>
      </section>

      <section class="card cal-card" id="calCard" aria-labelledby="calTitle">${calendarHTML()}</section>

      <section class="card week-card" aria-labelledby="weekTitle">
        <div class="card-head"><h2 class="card-title" id="weekTitle">Vendas semanais</h2>
          <div class="seg" role="group" aria-label="Base do gráfico"><button type="button" data-action="week-mode" data-mode="last" aria-pressed="${UI.weekMode === 'last'}">Semana passada</button><button type="button" data-action="week-mode" data-mode="avg" aria-pressed="${UI.weekMode === 'avg'}">Média</button></div>
        </div>
        <div class="bars" id="weekBars"></div>
        <div class="week-foot" id="weekFoot"></div>
      </section>

      <section class="card orders-card" aria-labelledby="ordTitle">
        <div class="card-head"><div><h2 class="card-title" id="ordTitle">Pedidos recentes</h2><p class="card-sub">Os últimos pedidos de todos os canais</p></div>
          <div class="card-tools">
            <div class="input-icon">${icon('search', 'sm')}<input class="input sm" type="search" placeholder="Pedido ou cliente" aria-label="Pesquisar pedidos recentes" value="${esc(UI.dashOrders.q)}" data-change="dash-q" style="width:190px"></div>
            <div class="dd"><button type="button" class="chip-btn sm" data-action="dash-filter" aria-haspopup="listbox" aria-expanded="false">${icon('filter', 'sm')}<span>${UI.dashOrders.status === 'all' ? 'Filtrar' : STATUS[UI.dashOrders.status].label}</span></button></div>
            <a class="chip-btn sm accent" href="#/pedidos">Ver todos</a>
          </div></div>
        <div id="dashOrders">${dashOrdersHTML()}</div>
      </section>
    </div>

    <aside class="aside-panel" aria-label="Canais de venda e visitantes">
      <div class="store-id"><img class="logo-tile" src="assets/logo/vestora-mark.svg" alt="" width="44" height="44"><div><b>${esc(DB.settings.store.site)}</b><small>Loja Jardins e canais digitais</small></div></div>
      <div>
        <div class="donut" id="chDonut"></div>
        <p class="donut-cap">Distribuição das vendas por canal</p>
      </div>
      <div class="ch-legend" id="chLegend">${ch.map((c, i) => `<button type="button" data-i="${i}" style="--c:${c.color}"><i></i>${c.label}<span>${pct(c.value / tot, 0)}</span></button>`).join('')}</div>
      <div class="dd" style="justify-self:center"><button type="button" class="chip-btn" data-action="period" aria-haspopup="listbox" aria-expanded="false">${icon('calendar', 'sm')}${PERIODS[UI.period].label}${icon('chev-down', 'sm chev')}</button></div>
      <ul class="mlist">
        <li><span>Ticket médio</span><b class="num">${money(k.avgTicket)} <small class="${k.avgTicket >= kp.avgTicket ? 'up' : 'down'}">${signedPct(growth(k.avgTicket, kp.avgTicket))}</small></b></li>
        <li><span>Taxa de conversão</span><b class="num">${pct(k.conversion, 2)} <small class="${k.conversion >= kp.conversion ? 'up' : 'down'}">${signedPct(growth(k.conversion, kp.conversion))}</small></b></li>
        <li><span>Clientes recorrentes</span><b class="num">${pct(k.returningShare, 0)}</b></li>
        <li><span>Peças vendidas</span><b class="num">${int(k.units)}</b></li>
      </ul>
      <div class="panel-sep"></div>
      <div><h3 class="card-sub" style="margin:0 0 10px">Receita por canal</h3><ul class="mlist">${ch.map((c) => `<li><span style="display:inline-flex;align-items:center;gap:8px"><i class="swatch" style="background:${c.color}"></i>${c.label}</span><b class="num">${money0(c.value)}</b></li>`).join('')}</ul></div>
      <div class="panel-sep"></div>
      <div class="meter" style="--c:${C.purple}"><div class="mt-head"><span>Visitantes no site agora</span><span class="live">ao vivo</span></div><div class="mt-val num" id="visOnline">0</div><div class="mt-bar"><span id="visOnlineBar" style="transform:scaleX(0)"></span></div><p class="mt-foot" id="visOnlineFoot"></p></div>
      <div class="meter" style="--c:${C.teal}"><div class="mt-head"><span>Visitas na loja física hoje</span></div><div class="mt-val num" id="visStore">0</div><div class="mt-bar"><span id="visStoreBar" style="transform:scaleX(0)"></span></div><p class="mt-foot">Contador de fluxo na entrada da loja</p></div>
    </aside>
  </div>`;
}

function mountDashboard(root) {
  // gráfico de faturamento
  const cr = chartRangeObj(); const s = seriesFinance(cr, cr.mode);
  const rev = s.revenue, exp = s.expenses;
  UI._revChart = lineChart($('#revChart', root), {
    labels: s.buckets.map((b) => b.label), fulls: s.buckets.map((b) => b.full), aria: 'Receita e despesas por período. Use as setas para navegar.',
    series: [{ key: 'rev', name: 'Receita', color: C.teal, values: rev, area: true }, { key: 'exp', name: 'Despesas', color: C.pink, values: exp, dash: true }],
    tipExtra: (i) => tipRow('Resultado', money(rev[i] - exp[i]), rev[i] - exp[i] >= 0 ? '#3DDC97' : '#FF6B6B'),
  });
  const tr = sum(rev), te = sum(exp);
  $('#revSummary', root).innerHTML = `<div class="week-foot"><div>Receita<b>${money0(tr)}</b></div><div>Despesas<b>${money0(te)}</b></div><div>Resultado<b class="${tr - te >= 0 ? 'up' : 'down'}">${money0(tr - te)}</b></div><div>Margem<b>${pct(tr ? (tr - te) / tr : 0)}</b></div></div>`;
  UI._revData = { s, rev, exp };

  mountWeek(root);
  // canais
  const k = salesKPIs(rangeOf(UI.period));
  const items = CH_KEYS.map((key) => ({ key, label: CHANNELS[key].label, value: k.byChannel[key].revenue, color: CHANNELS[key].color }));
  const legend = $('#chLegend', root);
  const d = donutChart($('#chDonut', root), { items, fmt: money0, center: { value: moneyShort(k.revenue), label: 'em vendas' }, onHover: (i) => $$('button', legend).forEach((b) => b.classList.toggle('on', +b.dataset.i === i)) });
  legend.addEventListener('pointerover', (e) => { const b = e.target.closest('button'); if (b) d.highlight(+b.dataset.i); });
  legend.addEventListener('pointerleave', () => d.highlight(-1));
  legend.addEventListener('focusin', (e) => { const b = e.target.closest('button'); if (b) d.highlight(+b.dataset.i); });
  legend.addEventListener('focusout', () => d.highlight(-1));
  startVisitors();
}

function mountWeek(root = document) {
  let values, fulls, title;
  if (UI.weekMode === 'last') {
    const ws = addDays(weekStart(new Date()), -7);
    const r = { start: ws, end: endOfDay(addDays(ws, 6)), days: 7, key: 'w' };
    const ss = seriesSales(r, 'day'); values = ss.revenue; fulls = ss.buckets.map((b) => b.full);
    const prev = seriesSales({ start: addDays(ws, -7), end: endOfDay(addDays(ws, -1)), days: 7, key: 'pw' }, 'day');
    const total = sum(values), ptotal = sum(prev.revenue); const best = values.indexOf(Math.max(...values));
    title = `Semana de ${fmtShort(ws)} a ${fmtShort(addDays(ws, 6))}`;
    $('#weekFoot', root).innerHTML = `<div>Total da semana<b>${money0(total)}</b></div><div>Melhor dia<b>${DOW_SHORT_MON[best]}</b></div><div>vs. semana anterior<b class="${total >= ptotal ? 'up' : 'down'}">${signedPct(growth(total, ptotal))}</b></div>`;
  } else {
    const r = rangeOf(UI.period); const acc = [0, 0, 0, 0, 0, 0, 0], cnt = [0, 0, 0, 0, 0, 0, 0];
    for (let d = new Date(r.start); d <= r.end; d = addDays(d, 1)) cnt[(d.getDay() + 6) % 7]++;
    ordersIn(r).forEach((o) => { if (CONFIRMED.has(o.status)) acc[(toDate(o.date).getDay() + 6) % 7] += orderTotal(o); });
    values = acc.map((v, i) => (cnt[i] ? v / cnt[i] : 0)); fulls = DOW_LONG.slice(1).concat(DOW_LONG[0]).map((d) => `Média de ${d}`);
    const best = values.indexOf(Math.max(...values)); const worst = values.indexOf(Math.min(...values));
    title = `Média por dia da semana, ${periodText()}`;
    $('#weekFoot', root).innerHTML = `<div>Média diária<b>${money0(sum(values) / 7)}</b></div><div>Dia mais forte<b>${DOW_SHORT_MON[best]}</b></div><div>Dia mais fraco<b>${DOW_SHORT_MON[worst]}</b></div>`;
  }
  capsuleBars($('#weekBars', root), { labels: DOW_SHORT_MON, fulls, values, colors: WEEK_COLORS, sub: title });
}

/* visitantes "ao vivo" (simulação local) */
function startVisitors() {
  const hour = new Date().getHours();
  const curve = [12, 8, 5, 4, 4, 6, 12, 22, 38, 52, 64, 72, 80, 78, 74, 76, 82, 90, 104, 118, 126, 112, 84, 42];
  const peak = 140; let online = Math.round(curve[hour] * (0.9 + Math.random() * 0.2));
  const openH = clamp(hour - 10, 0, 12); const store = Math.round(openH * 7.5 + (hour >= 10 ? 6 : 0));
  const paint = () => {
    const a = $('#visOnline'); if (!a) return stop();
    a.textContent = int(online); $('#visOnlineBar').style.transform = `scaleX(${clamp(online / peak, 0.04, 1)})`;
    $('#visOnlineFoot').textContent = `Pico de hoje: ${int(Math.max(online, Math.round(curve[Math.min(23, hour)] * 1.12)))} visitantes simultâneos`;
    $('#visStore').textContent = int(store); $('#visStoreBar').style.transform = `scaleX(${clamp(store / 110, 0.03, 1)})`;
  };
  const stop = () => { clearInterval(t); };
  requestAnimationFrame(paint);
  const t = setInterval(() => { online = clamp(Math.round(online + (Math.random() - 0.48) * 9), 3, 200); paint(); }, 3500);
  UI.timers.push(t);
}

/* tabela de pedidos recentes */
function dashOrdersHTML() {
  const st = UI.dashOrders; const q = norm(st.q);
  let rows = DB.orders.slice(-400).reverse();
  if (st.status !== 'all') rows = rows.filter((o) => o.status === st.status);
  if (q) rows = rows.filter((o) => String(o.id).includes(q) || norm(client(o.client)?.name).includes(q));
  rows = sortRows(rows, st, { id: (o) => o.id, client: (o) => norm(client(o.client)?.name), date: (o) => o.date, value: (o) => orderTotal(o) }).slice(0, 6);
  if (!rows.length) return emptyHTML('Nenhum pedido encontrado', 'Ajuste o filtro de status ou a pesquisa para ver outros pedidos.');
  return `<div class="table-wrap"><table class="table stack"><caption class="sr-only">Pedidos recentes</caption><thead><tr>
    ${sortTh('Pedido', 'id', st, 'dash')}${sortTh('Cliente', 'client', st, 'dash')}<th scope="col">Produto</th>${sortTh('Data', 'date', st, 'dash')}${sortTh('Valor', 'value', st, 'dash', 'r')}<th scope="col">Pagamento</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Ações</span></th>
  </tr></thead><tbody>${rows.map(orderRowHTML).join('')}</tbody></table></div>`;
}
function orderRowHTML(o) {
  const c = client(o.client); const p = product(o.items[0].p); const more = o.items.length - 1;
  return `<tr class="clickable" data-action="open-order" data-id="${o.id}">
    <td data-label="Pedido" class="nowrap"><span class="id">#${o.id}</span></td>
    <td class="lead" data-label="Cliente"><div class="cell-main"><img class="round" src="${avatarOf(c)}" alt="" width="34" height="34" loading="lazy"><b class="ellipsis" style="max-width:150px">${esc(c?.name || 'Cliente removido')}</b></div></td>
    <td data-label="Produto"><span class="ellipsis" style="max-width:170px;display:inline-block;vertical-align:middle">${esc(p?.name || 'Produto removido')}</span>${more ? ` <span class="muted">+${more}</span>` : ''}</td>
    <td data-label="Data" class="nowrap">${fmtDate(o.date)}</td>
    <td data-label="Valor" class="r nowrap"><b>${money(orderTotal(o))}</b></td>
    <td data-label="Pagamento" class="nowrap">${PAYMENTS[o.payment].short}</td>
    <td data-label="Status">${statusBadge(o.status)}</td>
    <td class="acts r"><button type="button" class="icon-btn sm" data-action="open-order" data-id="${o.id}" aria-label="Ver detalhes do pedido ${o.id}" data-tip="Ver detalhes">${icon('eye')}</button></td></tr>`;
}
/* calendário comercial */
function eventsOn(key) {
  const evs = DB.events.filter((e) => key >= e.start && key <= (e.end || e.start)).map((e) => ({ ...e, color: EVENT_TYPES[e.type].color }));
  const pays = DB.ledger.filter((e) => e.type === 'out' && e.status === 'pendente' && e.date.slice(0, 10) === key).map((e) => ({ id: e.id, title: e.desc, type: 'pagamento', note: e.cat, value: e.value, color: EVENT_TYPES.pagamento.color }));
  return [...evs, ...pays];
}
function calendarHTML() {
  const today = new Date(); const tk = dayKey(today);
  const base = UI.calMonth ? toDate(UI.calMonth + '-01') : new Date(today.getFullYear(), today.getMonth(), 1);
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = addDays(first, -first.getDay());
  const camps = DB.events.filter((e) => e.type === 'campanha');
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = addDays(start, i); const k = dayKey(d); const out = d.getMonth() !== base.getMonth();
    const camp = camps.find((c) => k >= c.start && k <= (c.end || c.start));
    const evs = eventsOn(k).filter((e) => e.type !== 'campanha');
    const types = [...new Set(evs.map((e) => e.type))].slice(0, 3);
    let cls = 'cal-day'; if (out) cls += ' out'; if (k === tk) cls += ' today'; if (k === UI.calSel) cls += ' selected';
    if (camp && !out) {
      cls += ' range'; const prevK = dayKey(addDays(d, -1)), nextK = dayKey(addDays(d, 1));
      if (k === camp.start || d.getDay() === 0 || prevK < camp.start || d.getDate() === 1) cls += ' rs';
      if (k === (camp.end || camp.start) || d.getDay() === 6 || nextK > (camp.end || camp.start) || addDays(d, 1).getMonth() !== d.getMonth()) cls += ' re';
    }
    const label = `${d.getDate()} de ${MONTHS[d.getMonth()]}${camp ? ', ' + camp.title : ''}${evs.length ? `, ${evs.length} evento${evs.length > 1 ? 's' : ''}` : ''}`;
    cells += `<button type="button" class="${cls}" data-action="cal-day" data-day="${k}" aria-label="${esc(label)}" aria-pressed="${k === UI.calSel}" tabindex="${k === UI.calSel ? 0 : -1}">${d.getDate()}${types.length ? `<span class="cal-dots">${types.map((t) => `<i style="--c:${EVENT_TYPES[t].color}"></i>`).join('')}</span>` : ''}</button>`;
  }
  const sel = toDate(UI.calSel); const list = eventsOn(UI.calSel);
  return `<div class="card-head"><h2 class="card-title" id="calTitle">Calendário</h2>
      <div class="cal-month"><button type="button" class="icon-btn sm" data-action="cal-nav" data-dir="-1" aria-label="Mês anterior">${icon('chev-left', 'sm')}</button><span class="label" aria-live="polite">${MONTHS[base.getMonth()]} ${base.getFullYear()}</span><button type="button" class="icon-btn sm" data-action="cal-nav" data-dir="1" aria-label="Próximo mês">${icon('chev-right', 'sm')}</button></div></div>
    <div class="cal-grid" role="group" aria-label="Dias de ${MONTHS[base.getMonth()]}">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => `<span class="cal-dow" aria-hidden="true" title="${DOW_LONG[i]}">${d}</span>`).join('')}${cells}</div>
    <div class="cal-legend">${Object.entries(EVENT_TYPES).map(([, v]) => `<span><i style="--c:${v.color}"></i>${v.label.split(' ')[0]}</span>`).join('')}</div>
    <div class="cal-events"><h3><span>${sel.getDate()} de ${MONTHS[sel.getMonth()]}, ${DOW_LONG[sel.getDay()]}</span><button type="button" class="icon-btn sm" data-action="add-event" aria-label="Adicionar evento neste dia" data-tip="Adicionar evento">${icon('plus', 'sm')}</button></h3>
      ${list.length ? list.map((e) => `<div class="cal-ev" style="--c:${e.color}"><i></i><div><b>${esc(e.title)}</b><small>${EVENT_TYPES[e.type].label}${e.note ? ', ' + esc(e.note) : ''}</small></div>${e.value ? `<span class="val">${money(e.value)}</span>` : e.end && e.end !== e.start ? `<span class="val">até ${fmtShort(e.end)}</span>` : '<span></span>'}</div>`).join('') : '<p class="cal-none">Nenhum evento neste dia.</p>'}
    </div>`;
}
function refreshCalendar(focusKey) {
  const card = $('#calCard'); if (!card) return; card.innerHTML = calendarHTML();
  if (focusKey) { const b = card.querySelector(`[data-day="${focusKey}"]`); b && b.focus(); }
}
Object.assign(ACTIONS, {
  'cal-day': (b) => { UI.calSel = b.dataset.day; const m = b.dataset.day.slice(0, 7); if (b.classList.contains('out')) UI.calMonth = m; refreshCalendar(b.dataset.day); },
  'cal-nav': (b) => { const base = UI.calMonth ? toDate(UI.calMonth + '-01') : new Date(); UI.calMonth = monthKey(addMonths(base, +b.dataset.dir)); refreshCalendar(); $(`#calCard [data-dir="${b.dataset.dir}"]`).focus(); },
  'add-event': () => openEventForm(UI.calSel),
  'week-mode': (b) => { UI.weekMode = b.dataset.mode; $$('[data-action="week-mode"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); mountWeek(); },
  'chart-range': (b) => listbox(b, { label: 'Intervalo do gráfico', options: Object.entries(RANGE_CHART).map(([value, label]) => ({ value, label })), value: UI.chartRange, onSelect: (v) => { UI.chartRange = v; rerender(); } }),
  'chart-export': (b) => actionMenu(b, [
    { label: 'Baixar CSV', icon: 'download', run: () => { const { s, rev, exp } = UI._revData; downloadCSV(`vestora-faturamento-${dayKey(new Date())}.csv`, ['Período', 'Receita (R$)', 'Despesas (R$)', 'Resultado (R$)'], s.buckets.map((b, i) => [b.full, rev[i], exp[i], round2(rev[i] - exp[i])])); toast({ title: 'CSV exportado', text: 'Faturamento por período baixado.' }); } },
    { label: 'Baixar imagem (PNG)', icon: 'image', run: () => { exportSvgPng(UI._revChart.svg(), `vestora-faturamento-${dayKey(new Date())}.png`); toast({ title: 'Imagem exportada', text: 'O gráfico foi salvo em PNG.' }); } },
  ]),
  'dash-filter': (b) => listbox(b, { label: 'Filtrar por status', options: [{ value: 'all', label: 'Todos os status' }, ...Object.entries(STATUS).map(([value, v]) => ({ value, label: v.label }))], value: UI.dashOrders.status, onSelect: (v) => { UI.dashOrders.status = v; b.querySelector('span').textContent = v === 'all' ? 'Filtrar' : STATUS[v].label; $('#dashOrders').innerHTML = dashOrdersHTML(); } }),
  'open-order': (b) => openOrder(+b.dataset.id),
});
CHANGES['dash-q'] = (el) => { UI.dashOrders.q = el.value; $('#dashOrders').innerHTML = dashOrdersHTML(); };

/* navegação do calendário pelo teclado (setas) */
document.addEventListener('keydown', (e) => {
  const b = e.target.closest && e.target.closest('.cal-day'); if (!b) return;
  const map = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }; const delta = map[e.key]; if (!delta) return;
  e.preventDefault(); const nk = dayKey(addDays(toDate(b.dataset.day), delta));
  UI.calSel = nk; if (nk.slice(0, 7) !== (UI.calMonth || monthKey(new Date()))) UI.calMonth = nk.slice(0, 7);
  refreshCalendar(nk);
});

function openEventForm(day) {
  openDialog({
    title: 'Novo evento no calendário', sub: 'Campanhas, recebimentos e compromissos aparecem para toda a equipe.', size: 'narrow',
    body: `<div class="form-grid">${field({ name: 'title', label: 'Título', required: true, placeholder: 'Ex.: Vitrine de Natal', full: true })}
      ${field({ name: 'type', label: 'Tipo', options: [{ value: 'campanha', label: 'Campanha promocional' }, { value: 'recebimento', label: 'Recebimento de mercadorias' }, { value: 'evento', label: 'Evento comercial' }], value: 'evento', full: true })}
      ${field({ name: 'start', label: 'Início', type: 'date', value: day, required: true })}${field({ name: 'end', label: 'Fim', type: 'date', value: '' })}
      ${field({ name: 'note', label: 'Observação', type: 'textarea', full: true, placeholder: 'Detalhes para a equipe' })}</div>`,
    foot: '<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar evento</button>',
    onSubmit: (form) => {
      const d = validate(form, { title: [V.required('Dê um título ao evento.')], start: [V.required('Escolha a data de início.')], end: [(v, all) => (v && v < all.start ? 'O fim precisa ser depois do início.' : null)] });
      if (!d) return false;
      DB.events.push({ id: 'e' + nextSeq('event'), title: d.title.trim(), type: d.type, start: d.start, end: d.end || null, note: d.note.trim() });
      commit(); UI.calSel = d.start; UI.calMonth = d.start.slice(0, 7); refreshCalendar();
      toast({ title: 'Evento salvo', text: `${d.title.trim()} em ${fmtDate(d.start)}.` });
    },
  });
}

/* ==========================================================================
   VENDAS E PEDIDOS
   Lista com filtros, detalhes (drawer), criação de pedido e mudança de status.
   ========================================================================== */
function ordersFiltered() {
  const st = UI.orders; const q = norm(st.q);
  const r = st.from || st.to ? { start: st.from ? startOfDay(toDate(st.from)) : new Date(2000, 0, 1), end: st.to ? endOfDay(toDate(st.to)) : endOfDay(new Date()) } : rangeOf(UI.period);
  let rows = DB.orders.filter((o) => inRange(o.date, r));
  const counts = { all: rows.length }; Object.keys(STATUS).forEach((s) => (counts[s] = 0)); rows.forEach((o) => counts[o.status]++);
  if (st.status !== 'all') rows = rows.filter((o) => o.status === st.status);
  if (st.channel !== 'all') rows = rows.filter((o) => o.channel === st.channel);
  if (q) rows = rows.filter((o) => String(o.id).includes(q) || norm(client(o.client)?.name).includes(q) || o.items.some((it) => norm(product(it.p)?.name).includes(q)));
  rows = sortRows(rows, st, { id: (o) => o.id, client: (o) => norm(client(o.client)?.name), date: (o) => o.date, value: (o) => orderTotal(o), status: (o) => STATUS_FLOW.indexOf(o.status) });
  return { rows, counts, range: r };
}
function viewOrders() {
  const r = rangeOf(UI.period); const k = salesKPIs(r); const kp = salesKPIs(prevRange(r));
  const pendingValue = sum(DB.orders.filter((o) => o.status === 'pendente'), orderTotal);
  return `<div class="page">
    <div class="page-head"><div><h2>Vendas e pedidos</h2><p>Pedidos confirmados baixam o estoque e entram no caixa na hora. Cancelamentos geram o estorno automaticamente.</p></div>
      <div class="page-actions"><button type="button" class="btn btn-ghost" data-action="orders-csv">${icon('download')}Exportar CSV</button><button type="button" class="btn btn-primary" data-action="new-order">${icon('plus')}Novo pedido</button></div></div>
    <div class="kpis five">
      ${kpiHTML('orders', 'Pedidos', k.orders, 'int', `${trendHTML(growth(k.orders, kp.orders))} ${periodText()}`)}
      ${kpiHTML('finance', 'Faturamento confirmado', k.revenue, 'money0', trendHTML(growth(k.revenue, kp.revenue)), 'teal')}
      ${kpiHTML('tag', 'Ticket médio', k.avgTicket, 'money', trendHTML(growth(k.avgTicket, kp.avgTicket)), 'yellow')}
      ${kpiHTML('clock', 'Aguardando pagamento', DB.orders.filter((o) => o.status === 'pendente').length, 'int', `${money(pendingValue)} a receber`, 'warn')}
      ${kpiHTML('undo', 'Cancelamentos', k.cancelled, 'int', `${pct(k.orders + k.cancelled ? k.cancelled / (k.orders + k.cancelled) : 0)} dos pedidos`, 'danger')}
    </div>
    <section class="card" aria-label="Lista de pedidos">
      <div id="ordersBody">${ordersBodyHTML()}</div>
    </section></div>`;
}
function kpiHTML(ic, label, value, fmt, foot, tone = 'teal', alert = false) {
  const f = { int, money, money0, pct: (v) => pct(v) }[fmt];
  return `<div class="kpi ${alert ? 'alert' : ''}" data-tone="${tone}"><span class="kpi-label">${icon(ic)}${label}</span><b class="kpi-value" data-count="${value}" data-fmt="${fmt}">${f(value)}</b><span class="kpi-foot">${foot}</span></div>`;
}
function ordersBodyHTML() {
  const st = UI.orders; const { rows, counts, range } = ordersFiltered(); const per = 12;
  const pages = Math.max(1, Math.ceil(rows.length / per)); st.page = clamp(st.page, 1, pages);
  const slice = rows.slice((st.page - 1) * per, st.page * per);
  const chips = [['all', 'Todos'], ...Object.entries(STATUS).map(([k, v]) => [k, v.label])];
  return `<div class="toolbar" style="margin-bottom:14px">
      <div class="input-icon grow">${icon('search', 'sm')}<input class="input" type="search" placeholder="Buscar por número, cliente ou produto" aria-label="Buscar pedidos" value="${esc(st.q)}" data-change="orders-q"></div>
      <select class="select" style="width:auto" aria-label="Canal de venda" data-change="orders-channel"><option value="all">Todos os canais</option>${CH_KEYS.map((c) => `<option value="${c}" ${st.channel === c ? 'selected' : ''}>${CHANNELS[c].label}</option>`).join('')}</select>
      <label class="sr-only" for="oFrom">Data inicial</label><input id="oFrom" class="input" style="width:auto" type="date" value="${st.from || dayKey(range.start)}" data-change="orders-from">
      <label class="sr-only" for="oTo">Data final</label><input id="oTo" class="input" style="width:auto" type="date" value="${st.to || dayKey(range.end)}" data-change="orders-to">
      ${st.from || st.to || st.q || st.channel !== 'all' || st.status !== 'all' ? `<button type="button" class="btn btn-ghost btn-sm" data-action="orders-clear">${icon('close', 'sm')}Limpar filtros</button>` : ''}
    </div>
    <div class="filters-chips" role="group" aria-label="Filtrar por status" style="margin-bottom:12px">${chips.map(([k, l]) => `<button type="button" class="fchip" data-action="orders-status" data-s="${k}" aria-pressed="${st.status === k}">${l}<span class="count">${int(counts[k] || 0)}</span></button>`).join('')}</div>
    ${slice.length ? `<div class="table-wrap"><table class="table stack"><caption class="sr-only">Pedidos, ${rows.length} resultados</caption><thead><tr>
      ${sortTh('Pedido', 'id', st, 'orders')}${sortTh('Cliente', 'client', st, 'orders')}<th scope="col">Itens</th><th scope="col">Canal</th><th scope="col">Pagamento</th>${sortTh('Data', 'date', st, 'orders')}${sortTh('Total', 'value', st, 'orders', 'r')}${sortTh('Status', 'status', st, 'orders')}<th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${slice.map((o) => {
        const c = client(o.client); const p = product(o.items[0].p);
        return `<tr class="clickable" data-action="open-order" data-id="${o.id}">
          <td data-label="Pedido" class="nowrap"><b class="id">#${o.id}</b></td>
          <td class="lead" data-label="Cliente"><div class="cell-main"><img class="round" src="${avatarOf(c)}" alt="" width="36" height="36" loading="lazy"><div><b class="ellipsis" style="max-width:170px">${esc(c?.name || 'Cliente removido')}</b><small>${esc(c?.city || '')}</small></div></div></td>
          <td data-label="Itens"><span class="ellipsis" style="max-width:200px;display:inline-block;vertical-align:middle">${esc(p?.name || 'Produto removido')}</span>${o.items.length > 1 ? ` <span class="muted">+${o.items.length - 1}</span>` : ''}</td>
          <td data-label="Canal" class="nowrap">${CHANNELS[o.channel].label}</td>
          <td data-label="Pagamento" class="nowrap">${PAYMENTS[o.payment].short}</td>
          <td data-label="Data" class="nowrap"><span>${fmtDate(o.date)} <span class="muted">${o.date.slice(11)}</span></span></td>
          <td data-label="Total" class="r nowrap"><b>${money(orderTotal(o))}</b></td>
          <td data-label="Status">${statusBadge(o.status)}</td>
          <td class="acts r"><div class="row-actions"><div class="dd"><button type="button" class="icon-btn sm" data-action="order-menu" data-id="${o.id}" aria-label="Ações do pedido ${o.id}" aria-haspopup="menu" aria-expanded="false">${icon('more')}</button></div></div></td></tr>`;
      }).join('')}</tbody></table></div>${pagerHTML(st.page, rows.length, per, 'orders')}`
      : emptyHTML('Nenhum pedido com esses filtros', 'Tente outro período, status ou termo de busca.', '<button type="button" class="btn btn-ghost" data-action="orders-clear">Limpar filtros</button>')}`;
}
const refreshOrders = () => { const b = $('#ordersBody'); if (b) b.innerHTML = ordersBodyHTML(); };
Object.assign(CHANGES, {
  'orders-q': (el) => { UI.orders.q = el.value; UI.orders.page = 1; refreshOrders(); const i = $('#ordersBody input[type=search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); },
  'orders-channel': (el) => { UI.orders.channel = el.value; UI.orders.page = 1; refreshOrders(); },
  'orders-from': (el) => { UI.orders.from = el.value; UI.orders.page = 1; refreshOrders(); },
  'orders-to': (el) => { UI.orders.to = el.value; UI.orders.page = 1; refreshOrders(); },
});
Object.assign(ACTIONS, {
  'orders-status': (b) => { UI.orders.status = b.dataset.s; UI.orders.page = 1; refreshOrders(); $(`#ordersBody [data-s="${b.dataset.s}"]`).focus(); },
  'orders-clear': () => { Object.assign(UI.orders, { q: '', status: 'all', channel: 'all', from: '', to: '', page: 1 }); refreshOrders(); },
  'orders-csv': () => {
    const { rows } = ordersFiltered();
    downloadCSV(`vestora-pedidos-${dayKey(new Date())}.csv`, ['Pedido', 'Data', 'Cliente', 'E-mail', 'Canal', 'Pagamento', 'Itens', 'Peças', 'Subtotal (R$)', 'Desconto (R$)', 'Total (R$)', 'Status'],
      rows.map((o) => { const c = client(o.client); return [o.id, fmtDateTime(o.date), c?.name || '', c?.email || '', CHANNELS[o.channel].label, PAYMENTS[o.payment].label, o.items.map((it) => `${product(it.p)?.name} (${sizeLabel(it.size)}) x${it.qty}`).join(' | '), orderUnits(o), orderSubtotal(o), o.discount || 0, orderTotal(o), STATUS[o.status].label]; }));
    toast({ title: 'CSV exportado', text: `${int(rows.length)} pedidos no arquivo.` });
  },
  'new-order': () => openOrderForm(),
  'order-menu': (b, e) => {
    e.stopPropagation(); const o = order(b.dataset.id);
    const items = [{ label: 'Ver detalhes', icon: 'eye', run: () => openOrder(o.id) }];
    if (o.status !== 'cancelado') {
      const next = STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1];
      if (next) items.push({ label: `Marcar como ${STATUS[next].label.toLowerCase()}`, icon: 'check', run: () => changeStatus(o, next) });
      items.push({ label: 'Cancelar pedido', icon: 'undo', run: () => cancelOrderFlow(o) });
    }
    actionMenu(b, items);
  },
});

/* ---------------------------------------------------------------- detalhes do pedido */
function orderDrawerBody(o) {
  const c = client(o.client); const hist = o.history || synthHistory(o);
  const opts = o.status === 'cancelado' ? [] : [...STATUS_FLOW, 'cancelado'];
  const fin = o.applied ? 'Receita registrada' : o.refunded ? 'Estornado' : 'Aguardando confirmação';
  return `<div class="m-section"><div class="toolbar" style="justify-content:space-between">${statusBadge(o.status)}
      ${opts.length ? `<div class="toolbar"><label class="sr-only" for="stSel">Novo status</label><select id="stSel" class="select sm" style="width:auto">${opts.map((s) => `<option value="${s}" ${s === o.status ? 'selected' : ''}>${STATUS[s].label}</option>`).join('')}</select><button type="button" class="btn btn-sm btn-primary" data-action="apply-status" data-id="${o.id}">Atualizar status</button></div>` : '<span class="muted" style="font-size:13px">Pedido encerrado</span>'}</div></div>
    <div class="m-section"><h3>Cliente</h3>
      <button type="button" class="hist" data-action="open-client" data-id="${c?.id || ''}" style="display:block"><span class="cell-main" style="padding:10px 12px;border-radius:14px;background:var(--surface-2)"><img class="round" src="${avatarOf(c)}" alt="" width="38" height="38"><span style="flex:1;text-align:left"><b>${esc(c?.name || 'Cliente removido')}</b><small>${esc(c?.email || '')}, ${esc(c?.phone || '')}</small></span>${c ? segBadge(segmentOf(c)) : ''}</span></button></div>
    <div class="m-section"><h3>Itens</h3><div class="items">${o.items.map((it) => { const p = product(it.p); return `<div class="item-row"><img src="${p ? productImg(p) : 'assets/illustrations/empty-hanger.svg'}" alt="" width="48" height="48" loading="lazy"><div><b>${esc(p?.name || 'Produto removido')}</b><small>${esc(p?.sku || '')}-${it.size}, ${esc(p?.color || '')}, Tam. ${sizeLabel(it.size)}</small></div><div class="r"><b class="num">${money(it.qty * it.price)}</b><small class="muted" style="display:block;font-size:12px">${it.qty} × ${money(it.price)}</small></div></div>`; }).join('')}</div></div>
    <div class="totals"><div><span>Subtotal</span>${money(orderSubtotal(o))}</div><div><span>Desconto</span>${o.discount ? '− ' + money(o.discount) : money(0)}</div><div class="grand"><span>Total</span>${money(orderTotal(o))}</div></div>
    <dl class="dl"><dt>Canal</dt><dd>${CHANNELS[o.channel].label}</dd><dt>Pagamento</dt><dd>${PAYMENTS[o.payment].label}</dd><dt>Estoque</dt><dd>${o.applied ? 'Baixado' : o.refunded ? 'Devolvido ao estoque' : 'Não baixado'}</dd><dt>Financeiro</dt><dd>${fin}</dd></dl>
    <div class="m-section"><h3>Linha do tempo</h3><ol class="timeline">${hist.slice().reverse().map((h) => `<li style="--c:${STATUS[h.s].color}"><i></i><div><b>${STATUS[h.s].label}</b><small>${fmtDateTime(h.d)}</small></div></li>`).join('')}</ol></div>`;
}
let orderDrawer = null;
function openOrder(id) {
  const o = order(id); if (!o) return toast({ tone: 'danger', title: 'Pedido não encontrado' });
  if (orderDrawer) orderDrawer.close();
  orderDrawer = openDialog({
    kind: 'drawer', title: `Pedido #${o.id}`, sub: `${fmtDateTime(o.date)}, ${CHANNELS[o.channel].label}`, body: orderDrawerBody(o),
    foot: `${o.status !== 'cancelado' ? `<button type="button" class="btn btn-danger left" data-action="cancel-order" data-id="${o.id}">${icon('undo')}Cancelar pedido</button>` : ''}<button type="button" class="btn btn-ghost" data-close>Fechar</button>`,
    onClose: () => { orderDrawer = null; },
  });
}
function refreshOrderDrawer(o) {
  if (!orderDrawer) return;
  $('.m-body', orderDrawer.el).innerHTML = orderDrawerBody(o);
  const foot = $('.m-foot', orderDrawer.el); if (o.status === 'cancelado') foot.querySelector('[data-action="cancel-order"]')?.remove();
}
function changeStatus(o, status) {
  if (status === 'cancelado') return cancelOrderFlow(o);
  const wasApplied = o.applied;
  const res = setOrderStatus(o, status);
  if (res.error) return toast({ tone: 'danger', title: 'Não foi possível alterar', text: res.error });
  if (!res.changed) return;
  const msg = !wasApplied && o.applied ? 'Venda confirmada: estoque baixado e receita lançada no financeiro.' : res.refunded ? 'O valor foi estornado e as peças voltaram ao estoque.' : `Status atualizado para ${STATUS[status].label.toLowerCase()}.`;
  toast({ title: `Pedido #${o.id}: ${STATUS[status].label}`, text: msg });
  refreshOrderDrawer(o); softRerender();
}
async function cancelOrderFlow(o) {
  const units = orderUnits(o);
  const ok = await confirmDialog({
    title: `Cancelar o pedido #${o.id}?`, confirm: 'Cancelar pedido',
    text: o.applied ? `As ${units} peça${units > 1 ? 's' : ''} volta${units > 1 ? 'm' : ''} ao estoque e ${money(orderTotal(o))} será estornado no financeiro. Essa ação não pode ser desfeita.` : 'O pedido ainda não foi pago, então nada é estornado. Essa ação não pode ser desfeita.',
  });
  if (!ok) return;
  const res = setOrderStatus(o, 'cancelado');
  if (res.error) return toast({ tone: 'danger', title: 'Não foi possível cancelar', text: res.error });
  toast({ tone: 'ok', title: `Pedido #${o.id} cancelado`, text: res.refunded ? `Estorno de ${money(orderTotal(o))} lançado e estoque reposto.` : 'Nenhum valor a estornar.' });
  refreshOrderDrawer(o); softRerender();
}
Object.assign(ACTIONS, {
  'apply-status': (b) => { const o = order(b.dataset.id); changeStatus(o, $('#stSel', orderDrawer.el).value); },
  'cancel-order': (b) => cancelOrderFlow(order(b.dataset.id)),
});

/* ---------------------------------------------------------------- novo pedido */
function openOrderForm(preClient) {
  const st = { client: preClient || null, lines: [{ p: '', size: '', qty: 1 }], discType: 'pct' };
  const prodOpts = () => CATS.map((cat) => `<optgroup label="${cat}">${activeProducts().filter((p) => p.category === cat && p.status === 'ativo').map((p) => `<option value="${p.id}">${esc(p.name)}, ${esc(p.color)}, ${money(p.price)}</option>`).join('')}</optgroup>`).join('');
  const lineHTML = (l, i) => {
    const p = l.p ? product(l.p) : null; const avail = p && l.size ? p.stock[l.size] || 0 : null;
    return `<div class="order-line" data-i="${i}">
      <div class="field"><label for="ol-p${i}">Produto</label><select class="select" id="ol-p${i}" data-line="p"><option value="">Selecione</option>${prodOpts()}</select></div>
      <div class="field"><label for="ol-s${i}">Tamanho</label><select class="select" id="ol-s${i}" data-line="size" ${p ? '' : 'disabled'}>${p ? p.sizes.map((s) => `<option value="${s}" ${s === l.size ? 'selected' : ''} ${(p.stock[s] || 0) <= 0 ? 'disabled' : ''}>${sizeLabel(s)} (${p.stock[s] || 0})</option>`).join('') : '<option>—</option>'}</select></div>
      <div class="field"><label for="ol-q${i}">Qtd.</label><input class="input" id="ol-q${i}" data-line="qty" type="number" inputmode="numeric" min="1" step="1" value="${l.qty}"></div>
      <button type="button" class="icon-btn danger" data-line-remove="${i}" aria-label="Remover item" style="align-self:end;margin-bottom:2px" ${st.lines.length === 1 ? 'disabled' : ''}>${icon('trash')}</button>
      <span class="stock-hint ${avail !== null && l.qty > avail ? 'bad' : ''}">${p ? `${esc(p.sku)}-${l.size || ''}, ${avail !== null ? `${avail} em estoque` : 'escolha o tamanho'}, ${money(p.price)} cada` : 'Escolha a peça para ver estoque e preço.'}</span></div>`;
  };
  const totals = (form) => {
    const sub = sum(st.lines, (l) => (l.p ? product(l.p).price * (+l.qty || 0) : 0));
    const dv = parseMoney(form.elements.discount.value || '0'); const disc = round2(st.discType === 'pct' ? (sub * clamp(dv, 0, 100)) / 100 : Math.min(dv, sub));
    return { sub, disc, total: round2(sub - disc) };
  };
  openDialog({
    title: 'Novo pedido', sub: 'Pedidos pagos baixam o estoque e entram no caixa assim que são salvos.', size: 'wide',
    body: `<div class="m-section"><h3>Cliente</h3>
        <div class="field" style="position:relative"><label for="ocq">Buscar cliente</label><div class="input-icon">${icon('search', 'sm')}<input class="input" id="ocq" name="clientq" autocomplete="off" placeholder="Nome, e-mail ou telefone" role="combobox" aria-expanded="false" aria-controls="ocList" aria-autocomplete="list"></div>
        <div class="popover left" id="ocList" role="listbox" hidden style="right:0;max-height:260px;overflow:auto"></div></div>
        <div id="ocChosen"></div>
        <button type="button" class="link" data-action="quick-client" style="justify-self:start">${icon('plus', 'sm')}Cadastrar cliente novo</button></div>
      <div class="m-section"><h3>Itens</h3><div class="order-lines" id="olWrap"></div><button type="button" class="btn btn-ghost btn-sm" id="olAdd" style="justify-self:start">${icon('plus', 'sm')}Adicionar item</button></div>
      <div class="form-grid three">
        ${field({ name: 'channel', label: 'Canal', options: CH_KEYS.map((k) => ({ value: k, label: CHANNELS[k].label })), value: 'loja' })}
        ${field({ name: 'payment', label: 'Forma de pagamento', options: Object.entries(PAYMENTS).map(([value, v]) => ({ value, label: v.label })), value: 'pix' })}
        ${field({ name: 'status', label: 'Situação', options: [{ value: 'pago', label: 'Pago (confirmar venda)' }, { value: 'pendente', label: 'Pendente (aguardando)' }, { value: 'entregue', label: 'Entregue no balcão' }], value: 'pago' })}
      </div>
      <div class="form-grid"><div class="field"><span id="discLbl">Desconto</span><div class="toolbar"><div class="seg" role="group" aria-labelledby="discLbl"><button type="button" data-disc="pct" aria-pressed="true">%</button><button type="button" data-disc="val" aria-pressed="false">R$</button></div><input class="input" name="discount" inputmode="decimal" placeholder="0" aria-label="Valor do desconto" style="flex:1;min-width:100px"></div></div>
      <div class="totals" id="olTotals"></div></div>`,
    foot: '<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Salvar pedido</button>',
    onMount: (dlg) => {
      const form = $('form', dlg); const wrap = $('#olWrap', dlg);
      const paint = () => {
        wrap.innerHTML = st.lines.map(lineHTML).join('');
        st.lines.forEach((l, i) => { const s = $(`#ol-p${i}`, dlg); s.value = l.p; });
        paintTotals();
      };
      const paintTotals = () => { const t = totals(form); $('#olTotals', dlg).innerHTML = `<div><span>Subtotal</span>${money(t.sub)}</div><div><span>Desconto</span>− ${money(t.disc)}</div><div class="grand"><span>Total</span>${money(t.total)}</div>`; };
      const chosen = () => {
        const c = st.client ? client(st.client) : null;
        $('#ocChosen', dlg).innerHTML = c ? `<div class="chosen-row"><img src="${avatarOf(c)}" alt="" width="40" height="40"><div class="grow"><b>${esc(c.name)}</b><small>${esc(c.email)}, ${esc(c.city)}/${c.uf}</small></div>${segBadge(segmentOf(c))}<button type="button" class="icon-btn sm" id="ocClear" aria-label="Trocar cliente">${icon('close', 'sm')}</button></div>` : '';
        $('#ocq', dlg).closest('.field').hidden = !!c;
        const x = $('#ocClear', dlg); x && x.addEventListener('click', () => { st.client = null; chosen(); $('#ocq', dlg).focus(); });
      };
      dlg._setClient = (id) => { st.client = id; chosen(); };
      // combobox de clientes
      const q = $('#ocq', dlg), list = $('#ocList', dlg); let opts = [], act = 0;
      const renderList = () => {
        const t = norm(q.value.trim()); if (!t) { list.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
        opts = DB.clients.filter((c) => norm(c.name).includes(t) || norm(c.email).includes(t) || c.phone.replace(/\D/g, '').includes(t.replace(/\D/g, '') || '§')).slice(0, 8);
        act = 0;
        list.innerHTML = opts.length ? opts.map((c, i) => `<div class="sr-item" role="option" id="oc${i}" aria-selected="${i === act}" data-id="${c.id}"><img src="${avatarOf(c)}" alt="" style="border-radius:50%"><div><b>${esc(c.name)}</b><small>${esc(c.email)}</small></div></div>`).join('') : '<p class="sr-empty">Nenhum cliente encontrado. Cadastre um cliente novo.</p>';
        list.hidden = false; q.setAttribute('aria-expanded', 'true'); q.setAttribute('aria-activedescendant', opts.length ? 'oc0' : '');
      };
      const pickC = (id) => { st.client = id; list.hidden = true; q.value = ''; q.setAttribute('aria-expanded', 'false'); chosen(); };
      q.addEventListener('input', renderList);
      q.addEventListener('keydown', (e) => {
        if (list.hidden || !opts.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length; $$('.sr-item', list).forEach((x, i) => x.setAttribute('aria-selected', String(i === act))); q.setAttribute('aria-activedescendant', 'oc' + act); $('#oc' + act, list).scrollIntoView({ block: 'nearest' }); }
        if (e.key === 'Enter') { e.preventDefault(); pickC(opts[act].id); }
        if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); list.hidden = true; }
      });
      list.addEventListener('pointerdown', (e) => { const it = e.target.closest('[data-id]'); if (it) { e.preventDefault(); pickC(it.dataset.id); } });
      q.addEventListener('blur', () => setTimeout(() => (list.hidden = true), 150));
      // linhas
      wrap.addEventListener('change', (e) => {
        const row = e.target.closest('.order-line'); if (!row) return; const i = +row.dataset.i; const l = st.lines[i]; const k = e.target.dataset.line;
        if (k === 'p') { l.p = e.target.value; const p = l.p ? product(l.p) : null; l.size = p ? (p.sizes.find((s) => (p.stock[s] || 0) > 0) || p.sizes[0]) : ''; paint(); $(`#ol-s${i}`, dlg)?.focus(); }
        else if (k === 'size') { l.size = e.target.value; paint(); $(`#ol-s${i}`, dlg).focus(); }
      });
      wrap.addEventListener('input', (e) => { if (e.target.dataset.line === 'qty') { const row = e.target.closest('.order-line'); const l = st.lines[+row.dataset.i]; l.qty = Math.max(0, parseInt(e.target.value, 10) || 0); const p = l.p && product(l.p); const hint = row.querySelector('.stock-hint'); if (p && l.size) hint.classList.toggle('bad', l.qty > (p.stock[l.size] || 0)); paintTotals(); } });
      wrap.addEventListener('click', (e) => { const b = e.target.closest('[data-line-remove]'); if (b) { st.lines.splice(+b.dataset.lineRemove, 1); paint(); } });
      $('#olAdd', dlg).addEventListener('click', () => { st.lines.push({ p: '', size: '', qty: 1 }); paint(); $(`#ol-p${st.lines.length - 1}`, dlg).focus(); });
      $$('[data-disc]', dlg).forEach((b) => b.addEventListener('click', () => { st.discType = b.dataset.disc; $$('[data-disc]', dlg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); paintTotals(); }));
      form.elements.discount.addEventListener('input', paintTotals);
      paint(); chosen();
    },
    onSubmit: (form, btn) => {
      const dlg = form.closest('dialog');
      $$('.err', form).forEach((e) => e.remove());
      const fail = (el, msg) => { const f = el.closest('.field') || el.parentElement; f.insertAdjacentHTML('beforeend', `<span class="err">${icon('error', 'sm')}${esc(msg)}</span>`); el.setAttribute('aria-invalid', 'true'); el.focus(); return false; };
      if (!st.client) return fail($('#ocq', dlg), 'Escolha ou cadastre o cliente do pedido.');
      const status = form.elements.status.value;
      for (let i = 0; i < st.lines.length; i++) {
        const l = st.lines[i]; if (!l.p) return fail($(`#ol-p${i}`, dlg), 'Escolha a peça.');
        if (!(l.qty >= 1)) return fail($(`#ol-q${i}`, dlg), 'A quantidade mínima é 1.');
        const p = product(l.p); const need = sum(st.lines.filter((x) => x.p === l.p && x.size === l.size), (x) => x.qty);
        if (status !== 'pendente' && need > (p.stock[l.size] || 0)) return fail($(`#ol-q${i}`, dlg), `Só há ${p.stock[l.size] || 0} un. no tamanho ${sizeLabel(l.size)}.`);
      }
      const t = totals(form);
      if (t.disc > t.sub) return fail(form.elements.discount, 'O desconto não pode ser maior que o subtotal.');
      const items = []; st.lines.forEach((l) => { const ex = items.find((x) => x.p === l.p && x.size === l.size); if (ex) ex.qty += l.qty; else items.push({ p: l.p, size: l.size, qty: l.qty, price: product(l.p).price }); });
      const o = createOrder({ clientId: st.client, items, discount: t.disc, channel: form.elements.channel.value, payment: form.elements.payment.value, status });
      toast({ title: `Pedido #${o.id} criado`, text: o.applied ? `${money(orderTotal(o))} lançado no caixa e estoque atualizado.` : 'Aguardando pagamento. O estoque só baixa na confirmação.' });
      softRerender();
    },
  });
}
ACTIONS['quick-client'] = (b) => { const dlg = b.closest('dialog'); openClientForm(null, (c) => dlg._setClient && dlg._setClient(c.id)); };

/* ==========================================================================
   PRODUTOS E ESTOQUE
   ========================================================================== */
const PROD_SORT = { name: 'Nome (A–Z)', priceAsc: 'Menor preço', priceDesc: 'Maior preço', stock: 'Menor estoque', sales: 'Mais vendidos (30 dias)' };
function productsFiltered() {
  const st = UI.products; const q = norm(st.q);
  let rows = activeProducts();
  if (st.cat !== 'all') rows = rows.filter((p) => p.category === st.cat);
  if (st.status !== 'all') rows = rows.filter((p) => (st.status === 'low' ? productLevel(p) !== 'ok' : p.status === st.status));
  if (q) rows = rows.filter((p) => norm(`${p.name} ${p.sku} ${p.color} ${p.category}`).includes(q));
  const sales = productSales(rangeOf('30d'));
  const by = { name: (a, b) => a.name.localeCompare(b.name), priceAsc: (a, b) => a.price - b.price, priceDesc: (a, b) => b.price - a.price, stock: (a, b) => stockTotal(a) - stockTotal(b), sales: (a, b) => sales.get(b.id).units - sales.get(a.id).units };
  return rows.slice().sort(by[st.sort] || by.name);
}
function viewProducts() {
  const st = UI.products; const all = activeProducts();
  return `<div class="page">
    <div class="page-head"><div><h2>Produtos</h2><p>${all.length} peças no catálogo, com SKU, cor, grade de tamanhos, custo e preço de venda.</p></div>
      <div class="page-actions"><button type="button" class="btn btn-ghost" data-action="products-csv">${icon('download')}Exportar CSV</button><button type="button" class="btn btn-primary" data-action="new-product">${icon('plus')}Novo produto</button></div></div>
    <div class="toolbar">
      <div class="input-icon grow">${icon('search', 'sm')}<input class="input" type="search" placeholder="Buscar por nome, SKU ou cor" aria-label="Buscar produtos" value="${esc(st.q)}" data-change="products-q"></div>
      <select class="select" style="width:auto" aria-label="Situação" data-change="products-status"><option value="all">Todas as situações</option><option value="ativo" ${st.status === 'ativo' ? 'selected' : ''}>Ativos</option><option value="inativo" ${st.status === 'inativo' ? 'selected' : ''}>Inativos</option><option value="low" ${st.status === 'low' ? 'selected' : ''}>Com estoque baixo</option></select>
      <select class="select" style="width:auto" aria-label="Ordenar por" data-change="products-sort">${Object.entries(PROD_SORT).map(([k, l]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <div class="seg" role="group" aria-label="Visualização"><button type="button" data-action="products-view" data-v="grid" aria-pressed="${st.view === 'grid'}" aria-label="Grade">${icon('grid', 'sm')}<span class="sr-only">Grade</span></button><button type="button" data-action="products-view" data-v="table" aria-pressed="${st.view === 'table'}" aria-label="Tabela">${icon('list', 'sm')}<span class="sr-only">Tabela</span></button></div>
    </div>
    <div class="filters-chips" role="group" aria-label="Categorias">${['all', ...CATS].map((c) => `<button type="button" class="fchip" data-action="products-cat" data-c="${c}" aria-pressed="${st.cat === c}">${c === 'all' ? 'Todas' : c}<span class="count">${c === 'all' ? all.length : all.filter((p) => p.category === c).length}</span></button>`).join('')}</div>
    <div id="productsBody">${productsBodyHTML()}</div></div>`;
}
function productsBodyHTML() {
  const st = UI.products; const rows = productsFiltered(); const sales = productSales(rangeOf('30d'));
  if (!rows.length) return `<div class="card">${emptyHTML('Nenhuma peça encontrada', 'Revise a busca ou cadastre um produto novo no catálogo.', '<button type="button" class="btn btn-primary" data-action="new-product">Cadastrar produto</button>')}</div>`;
  if (st.view === 'grid') return `<ul class="pgrid" role="list">${rows.map((p) => {
    const lvl = productLevel(p); const q = stockTotal(p);
    return `<li class="pcard">
      <div class="p-media"><img src="${productImg(p)}" alt="${esc(p.name)} na cor ${esc(p.color)}" width="400" height="400" loading="lazy" decoding="async"></div>
      <div class="p-badges">${lvl !== 'ok' ? levelBadge(lvl) : ''}${p.status === 'inativo' ? badge('Inativo', 'muted') : ''}</div>
      <div class="p-actions"><button type="button" class="icon-btn sm" data-action="edit-product" data-id="${p.id}" aria-label="Editar ${esc(p.name)}" data-tip="Editar">${icon('edit', 'sm')}</button><button type="button" class="icon-btn sm danger" data-action="delete-product" data-id="${p.id}" aria-label="Excluir ${esc(p.name)}" data-tip="Excluir">${icon('trash', 'sm')}</button></div>
      <div class="p-body"><h3 class="p-name"><a href="#/produtos" data-action="open-product" data-id="${p.id}">${esc(p.name)}</a></h3>
        <div class="p-meta"><i class="swatch" style="background:${p.hex}"></i>${esc(p.color)}<span aria-hidden="true">|</span>${esc(p.sku)}</div>
        <div class="p-foot"><span class="p-price">${money(p.price)}</span><span class="p-stock">${q} un., ${sales.get(p.id).units} vendidas</span></div></div></li>`;
  }).join('')}</ul>`;
  return `<div class="card"><div class="table-wrap"><table class="table stack"><caption class="sr-only">Produtos</caption><thead><tr><th scope="col">Produto</th><th scope="col">Categoria</th><th scope="col">Tamanhos</th><th scope="col" class="r">Custo</th><th scope="col" class="r">Venda</th><th scope="col" class="r">Margem</th><th scope="col" class="r">Estoque</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>
    ${rows.map((p) => `<tr class="clickable" data-action="open-product" data-id="${p.id}"><td class="lead" data-label="Produto"><div class="cell-main"><img src="${productImg(p)}" alt="" width="38" height="38" loading="lazy"><div><b>${esc(p.name)}</b><small><i class="swatch" style="background:${p.hex};width:9px;height:9px"></i> ${esc(p.color)}, ${esc(p.sku)}</small></div></div></td>
      <td data-label="Categoria">${p.category}</td><td data-label="Tamanhos">${p.sizes.map(sizeLabel).join(', ')}</td><td data-label="Custo" class="r">${money(p.cost)}</td><td data-label="Venda" class="r"><b>${money(p.price)}</b></td>
      <td data-label="Margem" class="r">${pct((p.price - p.cost) / p.price, 0)}</td><td data-label="Estoque" class="r">${stockTotal(p)} un.</td><td data-label="Situação">${p.status === 'inativo' ? badge('Inativo', 'muted') : levelBadge(productLevel(p))}</td>
      <td class="acts r"><div class="row-actions"><button type="button" class="icon-btn sm" data-action="edit-product" data-id="${p.id}" aria-label="Editar ${esc(p.name)}" data-tip="Editar">${icon('edit', 'sm')}</button><button type="button" class="icon-btn sm danger" data-action="delete-product" data-id="${p.id}" aria-label="Excluir ${esc(p.name)}" data-tip="Excluir">${icon('trash', 'sm')}</button></div></td></tr>`).join('')}
  </tbody></table></div></div>`;
}
const refreshProducts = () => { const b = $('#productsBody'); if (b) b.innerHTML = productsBodyHTML(); };
Object.assign(CHANGES, {
  'products-q': (el) => { UI.products.q = el.value; refreshProducts(); },
  'products-status': (el) => { UI.products.status = el.value; refreshProducts(); },
  'products-sort': (el) => { UI.products.sort = el.value; refreshProducts(); },
});
Object.assign(ACTIONS, {
  'products-cat': (b) => { UI.products.cat = b.dataset.c; $$('[data-action="products-cat"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); refreshProducts(); },
  'products-view': (b) => { UI.products.view = b.dataset.v; $$('[data-action="products-view"]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); refreshProducts(); },
  'new-product': () => openProductForm(),
  'edit-product': (b, e) => { e.stopPropagation(); openProductForm(product(b.dataset.id)); },
  'delete-product': (b, e) => { e.stopPropagation(); deleteProductFlow(product(b.dataset.id)); },
  'open-product': (b, e) => { e.preventDefault(); openProduct(b.dataset.id); },
  'products-csv': () => {
    const rows = productsFiltered();
    downloadCSV(`vestora-produtos-${dayKey(new Date())}.csv`, ['SKU', 'Produto', 'Categoria', 'Cor', 'Tamanhos', 'Custo (R$)', 'Venda (R$)', 'Margem (%)', 'Estoque (un.)', 'Situação'],
      rows.map((p) => [p.sku, p.name, p.category, p.color, p.sizes.map((s) => `${sizeLabel(s)}:${p.stock[s] || 0}`).join(' '), p.cost, p.price, round2(((p.price - p.cost) / p.price) * 100), stockTotal(p), p.status === 'inativo' ? 'Inativo' : LEVEL[productLevel(p)].label]));
    toast({ title: 'CSV exportado', text: `${rows.length} produtos no arquivo.` });
  },
});

let productDrawer = null;
function openProduct(id) {
  const p = product(id); if (!p) return;
  const s30 = productSales(rangeOf('30d')).get(p.id); const s12 = productSales(rangeOf('12m')).get(p.id);
  if (productDrawer) productDrawer.close();
  productDrawer = openDialog({
    kind: 'drawer', title: esc(p.name), sub: `${esc(p.sku)}, ${p.category}`,
    body: `<img src="${productImg(p)}" alt="${esc(p.name)}" width="400" height="400" style="width:100%;border-radius:20px;aspect-ratio:1;object-fit:cover">
      <div class="toolbar">${p.status === 'inativo' ? badge('Inativo', 'muted') : badge('Ativo', 'ok')}${levelBadge(productLevel(p))}<span class="muted" style="font-size:13px;display:inline-flex;gap:6px;align-items:center"><i class="swatch" style="background:${p.hex}"></i>${esc(p.color)}</span></div>
      <div class="mini-kpis"><div><small>Preço de venda</small><b>${money(p.price)}</b></div><div><small>Custo</small><b>${money(p.cost)}</b></div><div><small>Margem bruta</small><b>${pct((p.price - p.cost) / p.price, 0)}</b></div><div><small>Vendidas em 30 dias</small><b>${s30.units} un.</b></div></div>
      <div class="m-section"><h3>Estoque por tamanho (limite mínimo: ${DB.settings.minStock} un.)</h3><div class="size-grid">${p.sizes.map((s) => `<span class="sz" data-level="${variantLevel(p.stock[s] || 0)}"><small>${sizeLabel(s)}</small><b>${p.stock[s] || 0}</b></span>`).join('')}</div></div>
      <dl class="dl"><dt>Receita em 12 meses</dt><dd>${money(s12.revenue)}</dd><dt>Peças vendidas em 12 meses</dt><dd>${int(s12.units)}</dd><dt>Valor em estoque (custo)</dt><dd>${money(stockTotal(p) * p.cost)}</dd><dt>Cadastrado em</dt><dd>${fmtDate(p.createdAt)}</dd></dl>`,
    foot: `<button type="button" class="btn btn-danger left" data-action="delete-product" data-id="${p.id}">${icon('trash')}Excluir</button><button type="button" class="btn btn-ghost" data-action="move-for" data-id="${p.id}">${icon('swap')}Movimentar estoque</button><button type="button" class="btn btn-primary" data-action="edit-product" data-id="${p.id}">${icon('edit')}Editar</button>`,
    onClose: () => { productDrawer = null; },
  });
}
ACTIONS['move-for'] = (b) => openMoveForm({ pid: b.dataset.id });

async function deleteProductFlow(p) {
  const ok = await confirmDialog({ title: `Excluir ${p.name}?`, text: 'A peça sai do catálogo, do estoque e da busca. Pedidos antigos continuam com o histórico de venda.', confirm: 'Excluir produto' });
  if (!ok) return;
  p.deleted = true; p.status = 'inativo'; commit();
  if (productDrawer) productDrawer.close();
  toast({ title: 'Produto excluído', text: `${p.name} saiu do catálogo.` });
  softRerender();
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Envie um arquivo de imagem (PNG, JPG ou WebP).'));
    const r = new FileReader();
    r.onload = () => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); const s = 360; c.width = c.height = s; const ctx = c.getContext('2d'); const m = Math.min(img.width, img.height); ctx.fillStyle = '#232323'; ctx.fillRect(0, 0, s, s); ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s); resolve(c.toDataURL('image/jpeg', 0.82)); }; img.onerror = () => reject(new Error('Não foi possível ler a imagem.')); img.src = r.result; };
    r.onerror = () => reject(new Error('Não foi possível ler o arquivo.')); r.readAsDataURL(file);
  });
}

function openProductForm(p) {
  const editing = !!p;
  const st = { img: p ? p.img : PRODUCT_IMAGES[0], cat: p ? p.category : 'Camisetas' };
  const suggestSku = (cat) => `VST-${CAT_CODE[cat]}-${String(DB.products.filter((x) => x.category === cat).length + 1).padStart(3, '0')}`;
  const sizesHTML = (cat, sizes, stock) => SIZES[cat].map((s) => `<label><span>${sizeLabel(s)}</span><input class="input" type="number" min="0" step="1" inputmode="numeric" name="q_${s}" value="${stock ? stock[s] ?? 0 : 0}" ${sizes && !sizes.includes(s) ? '' : ''} aria-label="Quantidade no tamanho ${sizeLabel(s)}"></label>`).join('');
  openDialog({
    title: editing ? 'Editar produto' : 'Novo produto', sub: editing ? `${esc(p.sku)}. Mudanças de quantidade viram ajustes no histórico do estoque.` : 'A peça entra no catálogo, no estoque e nos indicadores assim que for salva.', size: 'wide',
    body: `<div class="form-grid">
      ${field({ name: 'name', label: 'Nome da peça', required: true, value: p?.name || '', placeholder: 'Ex.: Camisa de linho manga curta', full: true })}
      ${field({ name: 'category', label: 'Categoria', options: CATS, value: st.cat, required: true })}
      ${field({ name: 'sku', label: 'SKU', required: true, value: p?.sku || suggestSku(st.cat), hint: 'Código único. A variação por tamanho é gerada automaticamente (SKU-M, SKU-G).' })}
      ${field({ name: 'color', label: 'Cor', required: true, value: p?.color || '', placeholder: 'Ex.: Azul-marinho' })}
      <div class="field"><label for="pfHex">Tom da cor</label><input id="pfHex" class="input" type="color" name="hex" value="${p?.hex || '#08E5C1'}" style="padding:4px;height:44px"></div>
      ${field({ name: 'cost', label: 'Preço de custo', required: true, value: moneyInput(p?.cost), prefix: 'R$', attrs: 'inputmode="decimal" placeholder="0,00"' })}
      ${field({ name: 'price', label: 'Preço de venda', required: true, value: moneyInput(p?.price), prefix: 'R$', attrs: 'inputmode="decimal" placeholder="0,00"', hint: '<span id="pfMargin"></span>' })}
      ${field({ name: 'status', label: 'Situação', options: [{ value: 'ativo', label: 'Ativo (à venda)' }, { value: 'inativo', label: 'Inativo (fora de venda)' }], value: p?.status || 'ativo' })}
    </div>
    <div class="m-section"><h3>Quantidade disponível por tamanho</h3><div class="size-inputs" id="pfSizes">${sizesHTML(st.cat, p?.sizes, p?.stock)}</div></div>
    <div class="m-section"><h3>Foto</h3><div class="img-picker" id="pfImgs" role="group" aria-label="Escolha a foto">
      <label class="upload" tabindex="0" style="cursor:pointer;border-radius:12px;aspect-ratio:1;display:grid;place-items:center;background:var(--surface-2);box-shadow:inset 0 0 0 1px var(--line)">${icon('upload')}<span style="font-size:11px;color:var(--muted)">Enviar</span><input type="file" accept="image/*" class="sr-only" id="pfFile"></label>
      ${p && p.img && p.img.startsWith('data:') ? `<button type="button" data-img="__custom" aria-pressed="true" aria-label="Foto enviada"><img src="${p.img}" alt=""></button>` : ''}
      ${PRODUCT_IMAGES.map((im) => `<button type="button" data-img="${im}" aria-pressed="${im === st.img}" aria-label="Foto ${im.replace(/-/g, ' ')}"><img src="assets/images/products/${im}.svg" alt="" loading="lazy" width="64" height="64"></button>`).join('')}</div></div>`,
    foot: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${editing ? 'Salvar alterações' : 'Cadastrar produto'}</button>`,
    onMount: (dlg) => {
      const form = $('form', dlg);
      const margin = () => { const c = parseMoney(form.elements.cost.value), v = parseMoney(form.elements.price.value); $('#pfMargin', dlg).textContent = v > 0 ? `Margem bruta de ${pct((v - c) / v, 0)} por peça.` : 'Informe o preço para ver a margem.'; };
      form.elements.cost.addEventListener('input', margin); form.elements.price.addEventListener('input', margin); margin();
      form.elements.category.addEventListener('change', (e) => { st.cat = e.target.value; $('#pfSizes', dlg).innerHTML = sizesHTML(st.cat); if (!editing) form.elements.sku.value = suggestSku(st.cat); });
      $('#pfImgs', dlg).addEventListener('click', (e) => { const b = e.target.closest('[data-img]'); if (!b) return; st.img = b.dataset.img === '__custom' ? p.img : b.dataset.img; $$('[data-img]', dlg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); });
      $('.upload', dlg).addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#pfFile', dlg).click(); } });
      $('#pfFile', dlg).addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { const data = await readImage(f); st.img = data; $$('[data-img]', dlg).forEach((x) => x.setAttribute('aria-pressed', 'false')); $('[data-img="__custom"]', dlg)?.remove(); $('.upload', dlg).insertAdjacentHTML('afterend', `<button type="button" data-img="__custom" aria-pressed="true" aria-label="Foto enviada"><img src="${data}" alt=""></button>`); p && (p._tmp = data); toast({ tone: 'info', title: 'Foto carregada', text: 'Ela será salva junto com o produto.' }); }
        catch (err) { toast({ tone: 'danger', title: 'Foto não carregada', text: err.message }); }
      });
    },
    onSubmit: (form) => {
      const d = validate(form, {
        name: [V.required('Dê um nome à peça.')], color: [V.required('Informe a cor.')],
        sku: [V.required('Informe o SKU.'), (v) => (DB.products.some((x) => x.sku.toLowerCase() === v.trim().toLowerCase() && x !== p && !x.deleted) ? 'Esse SKU já existe em outro produto.' : null)],
        cost: [V.money(0.01)], price: [V.money(0.01), (v, all) => (parseMoney(v) < parseMoney(all.cost) ? 'O preço de venda está abaixo do custo.' : null)],
        ...Object.fromEntries(SIZES[st.cat].map((s) => [`q_${s}`, [V.intMin(0)]])),
      });
      if (!d) return false;
      const stock = Object.fromEntries(SIZES[st.cat].map((s) => [s, parseInt(d[`q_${s}`], 10) || 0]));
      const img = st.img === '__custom' ? p?.img : st.img;
      if (editing) {
        const changed = [];
        if (p.category !== d.category) { p.sizes = SIZES[d.category].slice(); }
        p.sizes.forEach((s) => { const before = p.stock[s] || 0; const after = stock[s] ?? before; if (before !== after) { addMove({ p: p.id, size: s, qty: after - before, type: 'ajuste', reason: 'Ajuste no cadastro' }); changed.push([p, s]); } });
        Object.assign(p, { name: d.name.trim(), category: d.category, sku: d.sku.trim().toUpperCase(), color: d.color.trim(), hex: d.hex, cost: parseMoney(d.cost), price: parseMoney(d.price), status: d.status, img: img || p.img, stock });
        afterStockChange(changed); commit();
        toast({ title: 'Produto atualizado', text: `${p.name} foi salvo.` });
      } else {
        const np = { id: 'p' + pad(nextSeq('product') + 0) + Math.random().toString(36).slice(2, 4), sku: d.sku.trim().toUpperCase(), name: d.name.trim(), category: d.category, color: d.color.trim(), hex: d.hex, img, cost: parseMoney(d.cost), price: parseMoney(d.price), sizes: SIZES[d.category].slice(), stock, status: d.status, pop: 3, createdAt: isoLocal(new Date()) };
        DB.products.push(np);
        np.sizes.forEach((s) => { if (stock[s]) addMove({ p: np.id, size: s, qty: stock[s], type: 'entrada', reason: 'Estoque inicial' }); });
        commit();
        toast({ title: 'Produto cadastrado', text: `${np.name} já aparece no catálogo e no estoque.` });
      }
      if (productDrawer) productDrawer.close();
      softRerender();
    },
  });
}

/* ---------------------------------------------------------------- estoque */
function viewStock() {
  const all = activeProducts(); const units = sum(all, stockTotal);
  const low = all.filter((p) => productLevel(p) === 'low').length; const out = all.filter((p) => productLevel(p) === 'out').length;
  const value = sum(all, (p) => stockTotal(p) * p.cost); const valueSale = sum(all, (p) => stockTotal(p) * p.price);
  const lv = lowVariants();
  return `<div class="page">
    <div class="page-head"><div><h2>Estoque</h2><p>Controle por SKU, cor e tamanho. Variações com ${DB.settings.minStock} un. ou menos entram nos alertas automaticamente.</p></div>
      <div class="page-actions"><button type="button" class="btn btn-ghost" data-action="moves-csv">${icon('download')}Exportar movimentações</button><button type="button" class="btn btn-primary" data-action="new-move">${icon('swap')}Registrar movimentação</button></div></div>
    <div class="kpis five">
      ${kpiHTML('products', 'Produtos', all.length, 'int', `${all.filter((p) => p.status === 'ativo').length} ativos à venda`)}
      ${kpiHTML('box', 'Unidades em estoque', units, 'int', `${sum(all, (p) => p.sizes.length)} variações de tamanho`, 'purple')}
      ${kpiHTML('alert', 'Estoque baixo', low, 'int', `${lv.filter((v) => v.level === 'low').length} variações no limite`, 'warn', low > 0)}
      ${kpiHTML('error', 'Esgotados', out, 'int', `${lv.filter((v) => v.level === 'out').length} variações zeradas`, 'danger', out > 0)}
      ${kpiHTML('finance', 'Valor do estoque', value, 'money0', `${money0(valueSale)} a preço de venda`, 'yellow')}
    </div>
    <div class="stock-layout">
      <section class="card" aria-labelledby="stTitle"><div class="card-head"><h2 class="card-title" id="stTitle">Posição por produto</h2></div><div id="stockBody">${stockBodyHTML()}</div></section>
      <section class="card" aria-labelledby="alTitle"><div class="card-head"><div><h2 class="card-title" id="alTitle">Alertas</h2><p class="card-sub">${lv.length} variações pedem atenção</p></div>${autoOn('low-stock') ? badge('Automação ativa', 'ok') : `<a class="link" href="#/automacoes">Ativar alerta</a>`}</div>
        <div class="alerts">${lv.length ? lv.slice(0, 9).map((v) => `<div class="alert-row"><img src="${productImg(v.p)}" alt="" width="40" height="40" loading="lazy"><div class="grow"><b class="ellipsis">${esc(v.p.name)}</b><small>${esc(v.p.sku)}-${v.size}, tam. ${sizeLabel(v.size)}</small>${badge(v.qty === 0 ? 'Zerado' : `${v.qty} un.`, v.level === 'out' ? 'danger' : 'warn')}</div><button type="button" class="icon-btn sm" data-action="restock" data-id="${v.p.id}" data-size="${v.size}" aria-label="Repor ${esc(v.p.name)} tamanho ${sizeLabel(v.size)}" data-tip="Registrar entrada">${icon('plus', 'sm')}</button></div>`).join('') : emptyHTML('Tudo em ordem', 'Nenhuma variação abaixo do limite mínimo.')}</div></section>
    </div>
    <section class="card" aria-labelledby="mvTitle"><div class="card-head"><div><h2 class="card-title" id="mvTitle">Histórico de movimentações</h2><p class="card-sub">Entradas, saídas por venda, estornos e ajustes de inventário</p></div></div><div id="movesBody">${movesBodyHTML()}</div></section>
  </div>`;
}
function stockBodyHTML() {
  const st = UI.stock; const q = norm(st.q); const per = 8;
  let rows = activeProducts();
  if (st.cat !== 'all') rows = rows.filter((p) => p.category === st.cat);
  if (st.level !== 'all') rows = rows.filter((p) => productLevel(p) === st.level);
  if (q) rows = rows.filter((p) => norm(`${p.name} ${p.sku} ${p.color}`).includes(q));
  rows = rows.slice().sort((a, b) => ({ out: 0, low: 1, ok: 2 }[productLevel(a)] - { out: 0, low: 1, ok: 2 }[productLevel(b)]) || stockTotal(a) - stockTotal(b));
  const pages = Math.max(1, Math.ceil(rows.length / per)); st.page = clamp(st.page, 1, pages);
  const counts = { all: activeProducts().length, low: activeProducts().filter((p) => productLevel(p) === 'low').length, out: activeProducts().filter((p) => productLevel(p) === 'out').length };
  return `<div class="toolbar" style="margin-bottom:12px"><div class="input-icon grow">${icon('search', 'sm')}<input class="input sm" type="search" placeholder="Buscar SKU, peça ou cor" aria-label="Buscar no estoque" value="${esc(st.q)}" data-change="stock-q"></div>
      <select class="select sm" style="width:auto" aria-label="Categoria" data-change="stock-cat"><option value="all">Todas as categorias</option>${CATS.map((c) => `<option ${st.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="filters-chips" role="group" aria-label="Nível de estoque" style="margin-bottom:12px">${[['all', 'Todos'], ['low', 'Estoque baixo'], ['out', 'Esgotados']].map(([k, l]) => `<button type="button" class="fchip" data-action="stock-level" data-l="${k}" aria-pressed="${st.level === k}">${l}<span class="count">${counts[k]}</span></button>`).join('')}</div>
    ${rows.length ? `<div class="table-wrap"><table class="table stack"><caption class="sr-only">Estoque por produto e tamanho</caption><thead><tr><th scope="col">Produto</th><th scope="col">Grade (tamanho e quantidade)</th><th scope="col" class="r">Total</th><th scope="col" class="r">Valor (custo)</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>
      ${rows.slice((st.page - 1) * per, st.page * per).map((p) => `<tr><td class="lead" data-label="Produto"><div class="cell-main"><img src="${productImg(p)}" alt="" width="38" height="38" loading="lazy"><div><b>${esc(p.name)}</b><small>${esc(p.sku)}, ${esc(p.color)}</small></div></div></td>
        <td data-label="Grade"><div class="size-grid">${p.sizes.map((s) => `<span class="sz" data-level="${variantLevel(p.stock[s] || 0)}" title="${esc(p.sku)}-${s}"><small>${sizeLabel(s)}</small><b>${p.stock[s] || 0}</b></span>`).join('')}</div></td>
        <td data-label="Total" class="r"><b>${stockTotal(p)}</b> un.</td><td data-label="Valor" class="r">${money(stockTotal(p) * p.cost)}</td>
        <td class="acts r"><button type="button" class="icon-btn sm" data-action="move-for" data-id="${p.id}" aria-label="Movimentar ${esc(p.name)}" data-tip="Movimentar">${icon('swap', 'sm')}</button></td></tr>`).join('')}
    </tbody></table></div>${pagerHTML(st.page, rows.length, per, 'stock')}` : emptyHTML('Nada por aqui', 'Nenhum produto corresponde a esse filtro.')}`;
}
function movesBodyHTML() {
  const st = UI.stock; const per = 10;
  let rows = DB.moves; if (st.mvType !== 'all') rows = rows.filter((m) => m.type === st.mvType);
  const pages = Math.max(1, Math.ceil(rows.length / per)); st.mvPage = clamp(st.mvPage, 1, pages);
  const T = { entrada: ['Entrada', 'ok'], saida: ['Saída', 'danger'], ajuste: ['Ajuste', 'info'] };
  return `<div class="filters-chips" role="group" aria-label="Tipo de movimentação" style="margin-bottom:12px">${[['all', 'Todas'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['ajuste', 'Ajustes']].map(([k, l]) => `<button type="button" class="fchip" data-action="moves-type" data-t="${k}" aria-pressed="${st.mvType === k}">${l}</button>`).join('')}</div>
  <div class="table-wrap"><table class="table stack"><caption class="sr-only">Movimentações de estoque</caption><thead><tr><th scope="col">Data</th><th scope="col">Produto</th><th scope="col">Variação</th><th scope="col">Tipo</th><th scope="col" class="r">Quantidade</th><th scope="col">Motivo</th></tr></thead><tbody>
  ${rows.slice((st.mvPage - 1) * per, st.mvPage * per).map((m) => { const p = product(m.p); return `<tr><td class="nowrap" data-label="Data"><span>${fmtDate(m.date)} <span class="muted">${m.date.slice(11)}</span></span></td>
    <td class="lead" data-label="Produto"><div class="cell-main"><img src="${p ? productImg(p) : ''}" alt="" width="38" height="38" loading="lazy"><div><b>${esc(p?.name || 'Produto removido')}</b><small>${esc(p?.color || '')}</small></div></div></td>
    <td data-label="Variação" class="nowrap">${esc(p?.sku || '')}-${m.size}</td><td data-label="Tipo">${badge(T[m.type][0], T[m.type][1])}</td>
    <td data-label="Quantidade" class="r"><span class="qty ${m.type === 'ajuste' ? 'adj' : m.qty > 0 ? 'pos' : 'neg'}">${m.qty > 0 ? '+' : '−'}${Math.abs(m.qty)}</span></td>
    <td data-label="Motivo"><span>${esc(m.reason)}${m.ref ? ` <button type="button" class="link" data-action="open-order" data-id="${m.ref}">#${m.ref}</button>` : ''}</span></td></tr>`; }).join('')}
  </tbody></table></div>${pagerHTML(st.mvPage, rows.length, per, 'moves')}`;
}
Object.assign(CHANGES, {
  'stock-q': (el) => { UI.stock.q = el.value; UI.stock.page = 1; $('#stockBody').innerHTML = stockBodyHTML(); const i = $('#stockBody input[type=search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); },
  'stock-cat': (el) => { UI.stock.cat = el.value; UI.stock.page = 1; $('#stockBody').innerHTML = stockBodyHTML(); },
});
Object.assign(ACTIONS, {
  'stock-level': (b) => { UI.stock.level = b.dataset.l; UI.stock.page = 1; $('#stockBody').innerHTML = stockBodyHTML(); $(`#stockBody [data-l="${b.dataset.l}"]`).focus(); },
  'moves-type': (b) => { UI.stock.mvType = b.dataset.t; UI.stock.mvPage = 1; $('#movesBody').innerHTML = movesBodyHTML(); $(`#movesBody [data-t="${b.dataset.t}"]`).focus(); },
  'new-move': () => openMoveForm({}),
  restock: (b) => openMoveForm({ pid: b.dataset.id, size: b.dataset.size, type: 'entrada' }),
  'moves-csv': () => {
    downloadCSV(`vestora-movimentacoes-${dayKey(new Date())}.csv`, ['Data', 'SKU', 'Produto', 'Tamanho', 'Tipo', 'Quantidade', 'Motivo', 'Pedido'],
      DB.moves.map((m) => { const p = product(m.p); return [fmtDateTime(m.date), p?.sku || '', p?.name || '', sizeLabel(m.size), { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }[m.type], m.qty, m.reason, m.ref || '']; }));
    toast({ title: 'CSV exportado', text: `${int(DB.moves.length)} movimentações no arquivo.` });
  },
});

function openMoveForm({ pid = '', size = '', type = 'entrada' }) {
  const st = { pid, size, type };
  const prodOpts = CATS.map((cat) => `<optgroup label="${cat}">${activeProducts().filter((p) => p.category === cat).map((p) => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)} (${esc(p.sku)})</option>`).join('')}</optgroup>`).join('');
  const REASONS = { entrada: ['Compra de fornecedor', 'Devolução de cliente', 'Transferência recebida'], saida: ['Peça com avaria', 'Brinde ou ação de marketing', 'Uso interno', 'Transferência enviada'], ajuste: ['Ajuste de inventário', 'Correção de cadastro'] };
  openDialog({
    title: 'Registrar movimentação', sub: 'Toda movimentação fica no histórico com data, motivo e variação.', size: 'narrow',
    body: `<div class="field"><span id="mvTypeL">Tipo</span><div class="seg" role="group" aria-labelledby="mvTypeL" id="mvType">${[['entrada', 'Entrada'], ['saida', 'Saída'], ['ajuste', 'Ajuste']].map(([k, l]) => `<button type="button" data-t="${k}" aria-pressed="${k === st.type}">${l}</button>`).join('')}</div></div>
      <div class="field"><label for="mvP">Produto</label><select class="select" id="mvP" name="pid" required><option value="">Selecione</option>${prodOpts}</select></div>
      <div class="form-grid"><div class="field"><label for="mvS">Tamanho</label><select class="select" id="mvS" name="size"></select></div>
      <div class="field"><label for="mvQ" id="mvQL">Quantidade</label><input class="input" id="mvQ" name="qty" type="number" min="0" step="1" inputmode="numeric" value="1"></div></div>
      <p class="muted" id="mvNow" style="font-size:13px"></p>
      <div class="field"><label for="mvR">Motivo</label><select class="select" id="mvR" name="reason"></select></div>`,
    foot: '<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">Registrar</button>',
    onMount: (dlg) => {
      const sel = $('#mvP', dlg), sz = $('#mvS', dlg);
      const paint = () => {
        const p = sel.value ? product(sel.value) : null;
        sz.innerHTML = p ? p.sizes.map((s) => `<option value="${s}" ${s === st.size ? 'selected' : ''}>${sizeLabel(s)} (${p.stock[s] || 0} un.)</option>`).join('') : '<option value="">—</option>';
        sz.disabled = !p; st.size = sz.value;
        $('#mvQL', dlg).textContent = st.type === 'ajuste' ? 'Quantidade contada' : 'Quantidade';
        $('#mvNow', dlg).textContent = p && st.size ? `${p.sku}-${st.size}: ${p.stock[st.size] || 0} un. hoje.${st.type === 'ajuste' ? ' Informe o total contado na prateleira.' : ''}` : 'Escolha o produto e o tamanho.';
        $('#mvR', dlg).innerHTML = REASONS[st.type].map((r) => `<option>${r}</option>`).join('');
      };
      sel.addEventListener('change', () => { st.size = ''; paint(); });
      sz.addEventListener('change', () => { st.size = sz.value; paint(); });
      $$('#mvType button', dlg).forEach((b) => b.addEventListener('click', () => { st.type = b.dataset.t; $$('#mvType button', dlg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); paint(); }));
      paint();
    },
    onSubmit: (form) => {
      const d = validate(form, { pid: [V.required('Escolha o produto.')], qty: [st.type === 'ajuste' ? V.intMin(0) : V.intMin(1)] });
      if (!d) return false;
      const res = registerMove({ pid: d.pid, size: d.size, type: st.type, qty: parseInt(d.qty, 10), reason: d.reason });
      if (res.error) { const q = form.elements.qty; q.setAttribute('aria-invalid', 'true'); q.closest('.field').insertAdjacentHTML('beforeend', `<span class="err">${icon('error', 'sm')}${esc(res.error)}</span>`); q.focus(); return false; }
      const p = product(d.pid);
      toast({ title: 'Movimentação registrada', text: `${p.sku}-${d.size}: ${res.delta >= 0 ? '+' : '−'}${Math.abs(res.delta)} un. Agora com ${p.stock[d.size]} un.` });
      if (productDrawer) productDrawer.close();
      softRerender();
    },
  });
}

/* ==========================================================================
   CLIENTES (CRM) E FINANCEIRO
   ========================================================================== */
function clientsFiltered() {
  const st = UI.clients; const q = norm(st.q); const stats = clientStats();
  let rows = DB.clients.filter((c) => !c.deleted);
  if (st.newOnly) { const r = rangeOf(UI.period); rows = rows.filter((c) => inRange(c.createdAt, r)); }
  const counts = { all: rows.length, novo: 0, recorrente: 0, vip: 0, inativo: 0 };
  const segs = new Map(rows.map((c) => { const s = segmentOf(c); counts[s]++; return [c.id, s]; }));
  if (st.seg !== 'all') rows = rows.filter((c) => segs.get(c.id) === st.seg);
  if (st.city !== 'all') rows = rows.filter((c) => c.city === st.city);
  if (q) rows = rows.filter((c) => norm(`${c.name} ${c.email} ${c.city}`).includes(q) || c.phone.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '§'));
  rows = sortRows(rows, st, { name: (c) => norm(c.name), orders: (c) => stats.get(c.id).orders, value: (c) => stats.get(c.id).value, last: (c) => stats.get(c.id).last || '', created: (c) => c.createdAt });
  return { rows, counts, segs, stats };
}
function viewClients() {
  const r = rangeOf(UI.period); const all = DB.clients.filter((c) => !c.deleted);
  const segs = all.map(segmentOf); const n = (s) => segs.filter((x) => x === s).length;
  const novos = all.filter((c) => inRange(c.createdAt, r)).length; const prevNovos = all.filter((c) => inRange(c.createdAt, prevRange(r))).length;
  return `<div class="page">
    <div class="page-head"><div><h2>Clientes</h2><p>CRM simplificado: histórico de compras e classificação automática em novo, recorrente, VIP e inativo.</p></div>
      <div class="page-actions"><button type="button" class="btn btn-ghost" data-action="clients-csv">${icon('download')}Exportar CSV</button><button type="button" class="btn btn-primary" data-action="new-client">${icon('plus')}Novo cliente</button></div></div>
    <div class="kpis four">
      ${kpiHTML('clients', 'Clientes na base', all.length, 'int', `${int(n('vip') + n('recorrente'))} compram com frequência`)}
      ${kpiHTML('sparkle', 'Novos no período', novos, 'int', `${trendHTML(growth(novos, prevNovos))} ${periodText()}`, 'pink')}
      ${kpiHTML('crown', 'Clientes VIP', n('vip'), 'int', 'Acima de R$ 1.200 ou 6 pedidos', 'yellow')}
      ${kpiHTML('clock', 'Inativos', n('inativo'), 'int', 'Sem comprar há mais de 90 dias', 'purple')}
    </div>
    <section class="card" aria-label="Lista de clientes"><div id="clientsBody">${clientsBodyHTML()}</div></section></div>`;
}
const CLIENT_SORT = { value: ['value', 'desc', 'Maior valor acumulado'], orders: ['orders', 'desc', 'Mais pedidos'], last: ['last', 'desc', 'Compra mais recente'], created: ['created', 'desc', 'Cadastro mais recente'], name: ['name', 'asc', 'Nome (A–Z)'] };
function clientsBodyHTML() {
  const st = UI.clients; const { rows, counts, segs, stats } = clientsFiltered(); const per = 12;
  const pages = Math.max(1, Math.ceil(rows.length / per)); st.page = clamp(st.page, 1, pages);
  const cities = Object.entries(groupBy(DB.clients, (c) => c.city)).sort((a, b) => b[1].length - a[1].length).map(([c]) => c);
  return `<div class="toolbar" style="margin-bottom:12px">
      <div class="input-icon grow">${icon('search', 'sm')}<input class="input" type="search" placeholder="Nome, e-mail, telefone ou cidade" aria-label="Buscar clientes" value="${esc(st.q)}" data-change="clients-q"></div>
      <select class="select" style="width:auto" aria-label="Cidade" data-change="clients-city"><option value="all">Todas as cidades</option>${cities.map((c) => `<option ${st.city === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="select" style="width:auto" aria-label="Ordenar" data-change="clients-sort">${Object.entries(CLIENT_SORT).map(([k, v]) => `<option value="${k}" ${st.sort === v[0] ? 'selected' : ''}>${v[2]}</option>`).join('')}</select>
    </div>
    <div class="filters-chips" role="group" aria-label="Classificação" style="margin-bottom:12px">
      ${st.newOnly ? `<button type="button" class="fchip" aria-pressed="true" data-action="clients-newonly">Cadastrados: ${periodText()} ${icon('close', 'sm')}</button>` : ''}
      ${[['all', 'Todos'], ...Object.entries(SEGMENTS).map(([k, v]) => [k, v.label])].map(([k, l]) => `<button type="button" class="fchip" data-action="clients-seg" data-s="${k}" aria-pressed="${st.seg === k}">${l}<span class="count">${int(counts[k])}</span></button>`).join('')}</div>
    ${rows.length ? `<div class="table-wrap"><table class="table stack"><caption class="sr-only">Clientes</caption><thead><tr>${sortTh('Cliente', 'name', st, 'clients')}<th scope="col">Telefone</th><th scope="col">Cidade</th>${sortTh('Pedidos', 'orders', st, 'clients', 'r')}${sortTh('Valor acumulado', 'value', st, 'clients', 'r')}${sortTh('Última compra', 'last', st, 'clients')}<th scope="col">Classificação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>
    ${rows.slice((st.page - 1) * per, st.page * per).map((c) => { const s = stats.get(c.id); return `<tr class="clickable" data-action="open-client" data-id="${c.id}">
      <td class="lead" data-label="Cliente"><div class="cell-main"><img class="round" src="${avatarOf(c)}" alt="" width="38" height="38" loading="lazy"><div><b>${esc(c.name)}</b><small>${esc(c.email)}</small></div></div></td>
      <td data-label="Telefone" class="nowrap">${esc(c.phone)}</td><td data-label="Cidade">${esc(c.city)}/${c.uf}</td>
      <td data-label="Pedidos" class="r">${s.orders}</td><td data-label="Valor acumulado" class="r"><b>${money(s.value)}</b></td>
      <td data-label="Última compra" class="nowrap">${s.last ? fmtDate(s.last) : '<span class="muted">Sem compras</span>'}</td>
      <td data-label="Classificação">${segBadge(segs.get(c.id))}</td>
      <td class="acts r"><button type="button" class="icon-btn sm" data-action="edit-client" data-id="${c.id}" aria-label="Editar ${esc(c.name)}" data-tip="Editar">${icon('edit', 'sm')}</button></td></tr>`; }).join('')}
    </tbody></table></div>${pagerHTML(st.page, rows.length, per, 'clients')}` : emptyHTML('Nenhum cliente encontrado', 'Ajuste a busca ou os filtros de classificação e cidade.')}`;
}
const refreshClients = () => { const b = $('#clientsBody'); if (b) b.innerHTML = clientsBodyHTML(); };
Object.assign(CHANGES, {
  'clients-q': (el) => { UI.clients.q = el.value; UI.clients.page = 1; refreshClients(); const i = $('#clientsBody input[type=search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); },
  'clients-city': (el) => { UI.clients.city = el.value; UI.clients.page = 1; refreshClients(); },
  'clients-sort': (el) => { const [k, dir] = CLIENT_SORT[el.value]; UI.clients.sort = k; UI.clients.dir = dir; refreshClients(); },
});
Object.assign(ACTIONS, {
  'clients-seg': (b) => { UI.clients.seg = b.dataset.s; UI.clients.page = 1; refreshClients(); $(`#clientsBody [data-s="${b.dataset.s}"]`).focus(); },
  'clients-newonly': () => { UI.clients.newOnly = false; refreshClients(); },
  'new-client': () => openClientForm(),
  'edit-client': (b, e) => { e.stopPropagation(); openClientForm(client(b.dataset.id)); },
  'open-client': (b) => { if (b.dataset.id) openClient(b.dataset.id); },
  'new-order-for': (b) => openOrderForm(b.dataset.id),
  'clients-csv': () => {
    const { rows, segs, stats } = clientsFiltered();
    downloadCSV(`vestora-clientes-${dayKey(new Date())}.csv`, ['Nome', 'E-mail', 'Telefone', 'Cidade', 'UF', 'Cliente desde', 'Pedidos', 'Valor acumulado (R$)', 'Última compra', 'Classificação'],
      rows.map((c) => { const s = stats.get(c.id); return [c.name, c.email, c.phone, c.city, c.uf, fmtDate(c.createdAt), s.orders, round2(s.value), s.last ? fmtDate(s.last) : '', SEGMENTS[segs.get(c.id)].label]; }));
    toast({ title: 'CSV exportado', text: `${int(rows.length)} clientes no arquivo.` });
  },
});

let clientDrawer = null;
function openClient(id) {
  const c = client(id); if (!c) return;
  const s = clientStats().get(c.id); const seg = segmentOf(c);
  if (clientDrawer) clientDrawer.close();
  clientDrawer = openDialog({
    kind: 'drawer', title: 'Cliente', body: `<div class="profile-head"><img src="${avatarOf(c)}" alt="" width="64" height="64"><div><h3>${esc(c.name)}</h3><p class="muted" style="font-size:13px">Cliente desde ${fmtDate(c.createdAt)}</p><div style="margin-top:6px">${segBadge(seg)}</div></div></div>
      <ul class="contact-list"><li>${icon('mail', 'sm')}<span>${esc(c.email)}</span></li><li>${icon('phone', 'sm')}<span>${esc(c.phone)}</span></li><li>${icon('pin', 'sm')}<span>${esc(c.city)}/${c.uf}</span></li></ul>
      <div class="mini-kpis"><div><small>Pedidos</small><b>${s.orders}</b></div><div><small>Valor acumulado</small><b>${money0(s.value)}</b></div><div><small>Ticket médio</small><b>${money0(s.orders ? s.value / s.orders : 0)}</b></div><div><small>Última compra</small><b>${s.last ? fmtShort(s.last) : '—'}</b></div></div>
      ${c.notes ? `<div class="auto-result">${esc(c.notes)}</div>` : ''}
      <div class="m-section"><h3>Histórico de pedidos</h3><div class="hist">${s.list.length ? s.list.slice(0, 12).map((o) => `<button type="button" data-action="open-order" data-id="${o.id}"><span class="id">#${o.id}</span><span><b style="font-weight:500">${esc(product(o.items[0].p)?.name || 'Produto')}</b>${o.items.length > 1 ? ` +${o.items.length - 1}` : ''}<small>${fmtDate(o.date)}, ${CHANNELS[o.channel].label}</small></span><span class="r"><b class="num">${money(orderTotal(o))}</b><br>${statusBadge(o.status)}</span></button>`).join('') : '<p class="cal-none">Este cliente ainda não comprou.</p>'}</div></div>`,
    foot: `<button type="button" class="btn btn-ghost" data-action="edit-client" data-id="${c.id}">${icon('edit')}Editar</button><button type="button" class="btn btn-primary" data-action="new-order-for" data-id="${c.id}">${icon('plus')}Novo pedido</button>`,
    onClose: () => { clientDrawer = null; },
  });
}
const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
function openClientForm(c, onSaved) {
  const editing = !!c;
  openDialog({
    title: editing ? 'Editar cliente' : 'Novo cliente', sub: editing ? 'As alterações valem para todos os pedidos deste cliente.' : 'O cliente entra como novo e passa a contar nos indicadores do período.',
    body: `<div class="form-grid">${field({ name: 'name', label: 'Nome completo', required: true, value: c?.name || '', full: true, attrs: 'autocomplete="name"' })}
      ${field({ name: 'email', label: 'E-mail', type: 'email', required: true, value: c?.email || '', attrs: 'autocomplete="email" inputmode="email"' })}
      ${field({ name: 'phone', label: 'Telefone', type: 'tel', required: true, value: c?.phone || '', placeholder: '(11) 98765-4321', attrs: 'data-mask="phone" inputmode="tel" autocomplete="tel"' })}
      ${field({ name: 'city', label: 'Cidade', required: true, value: c?.city || '' })}
      ${field({ name: 'uf', label: 'UF', options: UFS, value: c?.uf || 'SP' })}
      ${field({ name: 'notes', label: 'Observações', type: 'textarea', value: c?.notes || '', full: true, placeholder: 'Preferências de tamanho, estilo, datas importantes' })}</div>`,
    foot: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${editing ? 'Salvar alterações' : 'Cadastrar cliente'}</button>`,
    onSubmit: (form) => {
      const d = validate(form, {
        name: [V.required('Informe o nome.'), (v) => (v.trim().split(/\s+/).length < 2 ? 'Informe nome e sobrenome.' : null)],
        email: [V.required('Informe o e-mail.'), V.email, (v) => (DB.clients.some((x) => x.email.toLowerCase() === v.trim().toLowerCase() && x !== c) ? 'Já existe um cliente com esse e-mail.' : null)],
        phone: [V.required('Informe o telefone.'), V.phone], city: [V.required('Informe a cidade.')],
      });
      if (!d) return false;
      let saved;
      if (editing) { Object.assign(c, { name: d.name.trim(), email: d.email.trim(), phone: d.phone, city: d.city.trim(), uf: d.uf, notes: d.notes.trim() }); avCache.delete(c.id); saved = c; }
      else { saved = { id: 'c' + String(nextSeq('client')).padStart(4, '0'), name: d.name.trim(), email: d.email.trim(), phone: d.phone, city: d.city.trim(), uf: d.uf, notes: d.notes.trim(), createdAt: isoLocal(new Date()), g: 'f' }; DB.clients.push(saved); }
      commit();
      toast({ title: editing ? 'Cliente atualizado' : 'Cliente cadastrado', text: saved.name });
      if (clientDrawer && editing) { clientDrawer.close(); }
      onSaved ? onSaved(saved) : softRerender();
    },
  });
}

/* ---------------------------------------------------------------- financeiro */
function viewFinance() {
  const r = rangeOf(UI.period); const f = financeKPIs(r); const fp = financeKPIs(prevRange(r));
  const pay = payables(); const rec = receivables(); const today = dayKey(new Date());
  const overdue = pay.filter((e) => e.date.slice(0, 10) < today);
  return `<div class="page">
    <div class="page-head"><div><h2>Financeiro</h2><p>Indicadores calculados pelos lançamentos pagos no período. Vendas confirmadas entram aqui automaticamente.</p></div>
      <div class="page-actions"><button type="button" class="btn btn-ghost" data-action="finance-csv">${icon('download')}Exportar relatório</button><button type="button" class="btn btn-primary" data-action="new-entry">${icon('plus')}Novo lançamento</button></div></div>
    <div class="kpis four">
      ${kpiHTML('in', 'Receita bruta', f.revenue, 'money0', `${trendHTML(growth(f.revenue, fp.revenue))} ${f.refunds ? `${money0(f.refunds)} em estornos` : periodText()}`)}
      ${kpiHTML('out', 'Despesas', f.expenses, 'money0', trendHTML(growth(f.expenses, fp.expenses), true), 'pink')}
      ${kpiHTML('finance', 'Lucro estimado', f.profit, 'money0', `<span class="trend ${f.profit >= fp.profit ? 'up' : 'down'}">${icon(f.profit >= fp.profit ? 'trend-up' : 'trend-down')}${f.profit >= fp.profit ? '+' : '−'} ${money0(Math.abs(f.profit - fp.profit))}</span> vs. período anterior`, f.profit >= 0 ? 'ok' : 'danger')}
      ${kpiHTML('target', 'Margem de lucro', f.margin, 'pct', `${f.margin >= fp.margin ? 'acima' : 'abaixo'} do período anterior (${pct(fp.margin)})`, 'yellow')}
    </div>
    <div class="fin-layout">
      <div style="display:grid;gap:var(--gap);min-width:0">
        <section class="card" aria-labelledby="cfTitle"><div class="card-head"><div><h2 class="card-title" id="cfTitle">Fluxo de caixa</h2><p class="card-sub">Entradas e saídas pagas e saldo acumulado, ${periodText()}</p></div><button type="button" class="icon-btn" data-action="cf-png" aria-label="Baixar gráfico em PNG" data-tip="Baixar PNG">${icon('image')}</button></div><div id="cfChart"></div></section>
        <section class="card" aria-labelledby="ecTitle"><div class="card-head"><div><h2 class="card-title" id="ecTitle">Despesas por categoria</h2><p class="card-sub">Para onde foi o dinheiro, ${periodText()}</p></div></div><div id="expCats"></div></section>
      </div>
      <div style="display:grid;gap:var(--gap);align-content:start">
        <section class="card" aria-labelledby="apTitle"><div class="card-head"><div><h2 class="card-title" id="apTitle">Contas a pagar</h2><p class="card-sub">${money(sum(pay, (e) => e.value))} em aberto${overdue.length ? `, <span class="down">${overdue.length} vencida${overdue.length > 1 ? 's' : ''}</span>` : ''}</p></div></div>
          <div class="duelist">${pay.slice(0, 6).map((e) => dueHTML(e, 'pay')).join('') || '<p class="cal-none">Nenhuma conta em aberto.</p>'}</div></section>
        <section class="card" aria-labelledby="arTitle"><div class="card-head"><div><h2 class="card-title" id="arTitle">Contas a receber</h2><p class="card-sub">${money(sum(rec, (e) => e.value))} previstos</p></div></div>
          <div class="duelist">${rec.slice(0, 6).map((e) => dueHTML(e, 'rec')).join('') || '<p class="cal-none">Nada a receber.</p>'}</div></section>
      </div>
      <section class="card full" aria-labelledby="lgTitle"><div class="card-head"><div><h2 class="card-title" id="lgTitle">Movimentações financeiras</h2><p class="card-sub">Lançamentos do período, incluindo os previstos</p></div></div><div id="ledgerBody">${ledgerBodyHTML()}</div></section>
    </div></div>`;
}
function dueHTML(e, kind) {
  const d = toDate(e.date); const late = dayKey(d) < dayKey(new Date());
  const btn = e.kind === 'order' ? `<button type="button" class="btn btn-sm btn-ghost" data-action="open-order" data-id="${e.ref}">Ver pedido</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-action="settle" data-id="${e.id}">${kind === 'pay' ? 'Pagar' : 'Receber'}</button>`;
  return `<div class="due"><span class="d-date ${late ? 'late' : ''}"><b>${pad(d.getDate())}</b><small>${MON[d.getMonth()]}</small></span><div style="min-width:0"><b class="ellipsis" style="display:block;font-weight:500">${esc(e.desc)}</b><small>${esc(e.cat)}${late ? ', vencida' : ''}</small></div><div class="r"><div class="v">${money(e.value)}</div>${btn}</div></div>`;
}
function ledgerBodyHTML() {
  const st = UI.finance; const r = rangeOf(UI.period); const q = norm(st.q); const per = 12;
  let rows = DB.ledger.filter((e) => inRange(e.date, r) || (e.status === 'pendente' && toDate(e.date) > r.end && toDate(e.date) < addDays(r.end, 45)));
  if (st.type !== 'all') rows = rows.filter((e) => e.type === st.type);
  if (st.cat !== 'all') rows = rows.filter((e) => e.cat === st.cat);
  if (st.status !== 'all') rows = rows.filter((e) => e.status === st.status);
  if (q) rows = rows.filter((e) => norm(`${e.desc} ${e.cat}`).includes(q));
  rows = sortRows(rows, st, { date: (e) => e.date, value: (e) => (e.type === 'in' ? e.value : -e.value), desc: (e) => norm(e.desc) });
  st._rows = rows;
  const pages = Math.max(1, Math.ceil(rows.length / per)); st.page = clamp(st.page, 1, pages);
  const cats = [...new Set(DB.ledger.map((e) => e.cat))].sort();
  return `<div class="toolbar" style="margin-bottom:12px"><div class="input-icon grow">${icon('search', 'sm')}<input class="input" type="search" placeholder="Buscar descrição ou categoria" aria-label="Buscar lançamentos" value="${esc(st.q)}" data-change="fin-q"></div>
      <select class="select" style="width:auto" aria-label="Tipo" data-change="fin-type"><option value="all">Entradas e saídas</option><option value="in" ${st.type === 'in' ? 'selected' : ''}>Só entradas</option><option value="out" ${st.type === 'out' ? 'selected' : ''}>Só saídas</option></select>
      <select class="select" style="width:auto" aria-label="Categoria" data-change="fin-cat"><option value="all">Todas as categorias</option>${cats.map((c) => `<option ${st.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="select" style="width:auto" aria-label="Situação" data-change="fin-status"><option value="all">Pagos e pendentes</option><option value="pago" ${st.status === 'pago' ? 'selected' : ''}>Pagos</option><option value="pendente" ${st.status === 'pendente' ? 'selected' : ''}>Pendentes</option></select></div>
    ${rows.length ? `<div class="table-wrap"><table class="table stack"><caption class="sr-only">Lançamentos financeiros</caption><thead><tr>${sortTh('Data', 'date', st, 'finance')}${sortTh('Descrição', 'desc', st, 'finance')}<th scope="col">Categoria</th><th scope="col">Situação</th>${sortTh('Valor', 'value', st, 'finance', 'r')}<th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>
    ${rows.slice((st.page - 1) * per, st.page * per).map((e) => `<tr><td data-label="Data" class="nowrap">${fmtDate(e.date)}</td>
      <td class="lead" data-label="Descrição"><div class="cell-main"><span class="sr-ic" style="width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:${e.type === 'in' ? 'rgba(61,220,151,.12)' : 'rgba(234,154,247,.12)'};color:${e.type === 'in' ? 'var(--ok)' : 'var(--pink)'}">${icon(e.type === 'in' ? 'in' : 'out', 'sm')}</span><div><b>${esc(e.desc)}</b><small>${e.type === 'in' ? 'Entrada' : 'Saída'}</small></div></div></td>
      <td data-label="Categoria">${esc(e.cat)}</td><td data-label="Situação">${e.status === 'pago' ? badge(e.type === 'in' ? 'Recebido' : 'Pago', 'ok') : badge(dayKey(toDate(e.date)) < dayKey(new Date()) ? 'Vencido' : 'Pendente', dayKey(toDate(e.date)) < dayKey(new Date()) ? 'danger' : 'warn')}</td>
      <td data-label="Valor" class="r nowrap"><b class="${e.type === 'in' ? 'up' : ''}">${e.type === 'in' ? '+' : '−'} ${money(e.value)}</b></td>
      <td class="acts r"><div class="row-actions">${e.ref ? `<button type="button" class="icon-btn sm" data-action="open-order" data-id="${e.ref}" aria-label="Ver pedido ${e.ref}" data-tip="Ver pedido">${icon('eye', 'sm')}</button>` : `<button type="button" class="icon-btn sm" data-action="edit-entry" data-id="${e.id}" aria-label="Editar lançamento" data-tip="Editar">${icon('edit', 'sm')}</button><button type="button" class="icon-btn sm danger" data-action="delete-entry" data-id="${e.id}" aria-label="Excluir lançamento" data-tip="Excluir">${icon('trash', 'sm')}</button>`}</div></td></tr>`).join('')}
    </tbody></table></div>${pagerHTML(st.page, rows.length, per, 'finance')}` : emptyHTML('Nenhum lançamento', 'Não há movimentações com esses filtros no período.')}`;
}
function mountFinance(root) {
  const r = rangeOf(UI.period); const mode = r.days > 120 ? 'month' : r.days > 31 ? 'week' : 'day';
  const s = seriesFinance(r, mode); let acc = 0; const bal = s.revenue.map((v, i) => round2((acc += v - s.expenses[i])));
  UI._cf = groupedBars($('#cfChart', root), { labels: s.buckets.map((b) => b.label), fulls: s.buckets.map((b) => b.full), series: [{ key: 'in', name: 'Entradas', color: C.teal, values: s.revenue }, { key: 'out', name: 'Saídas', color: C.pink, values: s.expenses }], line: { key: 'bal', name: 'Saldo acumulado', color: C.yellow, values: bal, dash: true } });
  const es = ledgerIn(r).filter((e) => e.status === 'pago' && e.type === 'out' && e.cat !== REFUND_CAT);
  const by = Object.entries(groupBy(es, (e) => e.cat)).map(([label, list]) => ({ label, value: sum(list, (e) => e.value) })).sort((a, b) => b.value - a.value);
  const tot = sum(by, (x) => x.value) || 1; const pal = [C.pink, C.purple, C.yellow, C.teal];
  if (by.length) hbarChart($('#expCats', root), { items: by.map((x, i) => ({ ...x, color: pal[Math.min(i, 3)] })), fmt: money0, sub: (it) => pct(it.value / tot, 0) + ' das despesas' });
  else $('#expCats', root).innerHTML = emptyHTML('Sem despesas', 'Nenhuma despesa paga no período.');
}
const refreshLedger = () => { const b = $('#ledgerBody'); if (b) b.innerHTML = ledgerBodyHTML(); };
Object.assign(CHANGES, {
  'fin-q': (el) => { UI.finance.q = el.value; UI.finance.page = 1; refreshLedger(); const i = $('#ledgerBody input[type=search]'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); },
  'fin-type': (el) => { UI.finance.type = el.value; UI.finance.page = 1; refreshLedger(); },
  'fin-cat': (el) => { UI.finance.cat = el.value; UI.finance.page = 1; refreshLedger(); },
  'fin-status': (el) => { UI.finance.status = el.value; UI.finance.page = 1; refreshLedger(); },
});
Object.assign(ACTIONS, {
  'new-entry': () => openEntryForm(),
  'edit-entry': (b) => openEntryForm(DB.ledger.find((e) => e.id === b.dataset.id)),
  'delete-entry': async (b) => {
    const e = DB.ledger.find((x) => x.id === b.dataset.id); if (!e) return;
    if (!(await confirmDialog({ title: 'Excluir lançamento?', text: `${esc(e.desc)} (${money(e.value)}) sai do financeiro e dos relatórios.`, confirm: 'Excluir' }))) return;
    DB.ledger.splice(DB.ledger.indexOf(e), 1); commit(); toast({ title: 'Lançamento excluído' }); softRerender();
  },
  settle: (b) => { const e = DB.ledger.find((x) => x.id === b.dataset.id); if (!e) return; e.status = 'pago'; e.date = isoLocal(new Date()); commit(); toast({ title: e.type === 'in' ? 'Recebimento registrado' : 'Pagamento registrado', text: `${e.desc}: ${money(e.value)}` }); softRerender(); },
  'cf-png': () => { exportSvgPng(UI._cf.svg(), `vestora-fluxo-de-caixa-${dayKey(new Date())}.png`); toast({ title: 'Imagem exportada' }); },
  'finance-csv': () => {
    const r = rangeOf(UI.period); const f = financeKPIs(r); const rows = UI.finance._rows || [];
    const head = [['Relatório financeiro Vestora', PERIODS[UI.period].label, `${fmtDate(r.start)} a ${fmtDate(r.end)}`, '', '', ''], ['Receita bruta', f.revenue, '', '', '', ''], ['Despesas', f.expenses, '', '', '', ''], ['Lucro estimado', f.profit, '', '', '', ''], ['Margem', pct(f.margin), '', '', '', ''], ['', '', '', '', '', '']];
    downloadCSV(`vestora-financeiro-${dayKey(new Date())}.csv`, ['Data', 'Descrição', 'Categoria', 'Tipo', 'Situação', 'Valor (R$)'], [...head, ['Data', 'Descrição', 'Categoria', 'Tipo', 'Situação', 'Valor (R$)'], ...rows.map((e) => [fmtDate(e.date), e.desc, e.cat, e.type === 'in' ? 'Entrada' : 'Saída', e.status === 'pago' ? 'Pago' : 'Pendente', e.type === 'in' ? e.value : -e.value])]);
    toast({ title: 'Relatório exportado', text: `${rows.length} lançamentos e o resumo do período.` });
  },
});
function openEntryForm(e) {
  const editing = !!e; const st = { type: e?.type || 'out' };
  const catOpts = (t) => (t === 'in' ? INCOME_CATS.filter((c) => c !== 'Vendas') : EXPENSE_CATS);
  openDialog({
    title: editing ? 'Editar lançamento' : 'Novo lançamento', sub: 'Lançamentos pagos entram no fluxo de caixa. Pendentes aparecem em contas a pagar ou a receber.', size: 'narrow',
    body: `<div class="field"><span id="enT">Tipo</span><div class="seg" role="group" aria-labelledby="enT" id="enType"><button type="button" data-t="in" aria-pressed="${st.type === 'in'}">${icon('in', 'sm')}Entrada</button><button type="button" data-t="out" aria-pressed="${st.type === 'out'}">${icon('out', 'sm')}Despesa</button></div></div>
      ${field({ name: 'desc', label: 'Descrição', required: true, value: e?.desc || '', placeholder: 'Ex.: Conta de energia de novembro' })}
      <div class="form-grid">${field({ name: 'cat', label: 'Categoria', options: catOpts(st.type), value: e?.cat || '' })}
      ${field({ name: 'value', label: 'Valor', required: true, prefix: 'R$', value: moneyInput(e?.value), attrs: 'inputmode="decimal" placeholder="0,00"' })}
      ${field({ name: 'date', label: 'Data', type: 'date', required: true, value: e ? e.date.slice(0, 10) : dayKey(new Date()) })}
      ${field({ name: 'status', label: 'Situação', options: [{ value: 'pago', label: 'Pago ou recebido' }, { value: 'pendente', label: 'Pendente' }], value: e?.status || 'pago' })}</div>`,
    foot: `<button type="button" class="btn btn-ghost" data-close>Cancelar</button><button type="submit" class="btn btn-primary">${editing ? 'Salvar' : 'Lançar'}</button>`,
    onMount: (dlg) => $$('#enType button', dlg).forEach((b) => b.addEventListener('click', () => { st.type = b.dataset.t; $$('#enType button', dlg).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); $('select[name=cat]', dlg).innerHTML = catOpts(st.type).map((c) => `<option>${c}</option>`).join(''); })),
    onSubmit: (form) => {
      const d = validate(form, { desc: [V.required('Descreva o lançamento.')], value: [V.money(0.01)], date: [V.required('Informe a data.')] });
      if (!d) return false;
      const data = { type: st.type, desc: d.desc.trim(), cat: d.cat, value: round2(parseMoney(d.value)), date: `${d.date}T${e ? e.date.slice(11) : pad(new Date().getHours()) + ':' + pad(new Date().getMinutes())}`, status: d.status };
      if (editing) Object.assign(e, data); else addLedger(data);
      commit(); toast({ title: editing ? 'Lançamento atualizado' : 'Lançamento registrado', text: `${data.desc}: ${money(data.value)}` }); softRerender();
    },
  });
}

/* ==========================================================================
   RELATÓRIOS, AUTOMAÇÕES E CONFIGURAÇÕES
   ========================================================================== */
function reportData() {
  const r = rangeOf(UI.period); const pr = prevRange(r); const f = UI.reports;
  const okP = (p) => f.cat === 'all' || p.category === f.cat;
  const orders = ordersIn(r).filter((o) => CONFIRMED.has(o.status) && (f.channel === 'all' || o.channel === f.channel));
  const pmap = new Map(); DB.products.forEach((p) => pmap.set(p.id, { p, units: 0, revenue: 0, cost: 0 }));
  orders.forEach((o) => { const sub = orderSubtotal(o); const k = sub ? orderTotal(o) / sub : 1; o.items.forEach((it) => { const s = pmap.get(it.p); if (!s || !okP(s.p)) return; s.units += it.qty; s.revenue += it.qty * it.price * k; s.cost += it.qty * s.p.cost; }); });
  const prods = [...pmap.values()].filter((s) => okP(s.p) && !s.p.deleted);
  const cats = CATS.map((c) => ({ label: c, value: sum(prods.filter((s) => s.p.category === c), (s) => s.revenue), units: sum(prods.filter((s) => s.p.category === c), (s) => s.units) })).sort((a, b) => b.value - a.value);
  return { r, pr, orders, prods, cats };
}
function viewReports() {
  const f = UI.reports; const { r, prods, cats, orders } = reportData();
  const top = prods.slice().sort((a, b) => b.units - a.units).slice(0, 8); const maxU = Math.max(1, ...top.map((s) => s.units));
  const k = salesKPIs(r);
  const chRows = CH_KEYS.map((key) => ({ key, ...k.byChannel[key] })); const chTot = sum(chRows, (x) => x.revenue) || 1;
  const margin = prods.filter((s) => s.units).map((s) => ({ ...s, profit: s.revenue - s.cost, m: s.revenue ? (s.revenue - s.cost) / s.revenue : 0 })).sort((a, b) => b.profit - a.profit);
  const turn = prods.map((s) => { const st = stockTotal(s.p); const daily = s.units / r.days; return { ...s, stock: st, giro: st + s.units ? s.units / ((st + (st + s.units)) / 2) : 0, cover: daily ? st / daily : Infinity }; }).sort((a, b) => b.giro - a.giro);
  return `<div class="page">
    <div class="page-head"><div><h2>Relatórios</h2><p>Central de inteligência comercial com os mesmos dados da operação. Período: ${periodText()} (${fmtDate(r.start)} a ${fmtDate(r.end)}).</p></div>
      <div class="page-actions"><select class="select" style="width:auto" aria-label="Categoria" data-change="rep-cat"><option value="all">Todas as categorias</option>${CATS.map((c) => `<option ${f.cat === c ? 'selected' : ''}>${c}</option>`).join('')}</select>
      <select class="select" style="width:auto" aria-label="Canal" data-change="rep-ch"><option value="all">Todos os canais</option>${CH_KEYS.map((c) => `<option value="${c}" ${f.channel === c ? 'selected' : ''}>${CHANNELS[c].label}</option>`).join('')}</select></div></div>
    <div class="rep-grid">
      <section class="card wide" aria-labelledby="rpRev"><div class="card-head"><div><h2 class="card-title" id="rpRev">Receita por período</h2><p class="card-sub">Período atual comparado ao anterior, ${orders.length} pedidos confirmados</p></div>${csvBtn('rev')}</div><div id="repRev"></div></section>
      <section class="card side" aria-labelledby="rpCh"><div class="card-head"><h2 class="card-title" id="rpCh">Desempenho por canal</h2>${csvBtn('ch')}</div>
        <ul class="rank">${chRows.sort((a, b) => b.revenue - a.revenue).map((c) => `<li style="grid-template-columns:40px 1fr auto"><span class="auto-ic" style="--c:${CHANNELS[c.key].color};width:40px;height:40px;border-radius:12px">${icon(CHANNELS[c.key].icon)}</span><div><b>${CHANNELS[c.key].label}</b><small>${int(c.orders)} pedidos, ticket ${money0(c.orders ? c.revenue / c.orders : 0)}</small><div class="meterline" style="--c:${CHANNELS[c.key].color}"><span style="width:${(c.revenue / chTot) * 100}%"></span></div></div><div class="r"><b class="num">${money0(c.revenue)}</b><small style="display:block">${pct(c.revenue / chTot, 0)}</small></div></li>`).join('')}</ul></section>
      <section class="card" aria-labelledby="rpTop"><div class="card-head"><div><h2 class="card-title" id="rpTop">Produtos mais vendidos</h2><p class="card-sub">Por peças vendidas</p></div>${csvBtn('top')}</div>
        ${top.some((s) => s.units) ? `<ol class="rank">${top.map((s, i) => `<li><span class="pos">${i + 1}</span><img src="${productImg(s.p)}" alt="" width="40" height="40" loading="lazy"><div style="min-width:0"><b class="ellipsis" style="display:block">${esc(s.p.name)}</b><small>${int(s.units)} peças, ${esc(s.p.color)}</small><div class="meterline"><span style="width:${(s.units / maxU) * 100}%"></span></div></div><b class="num">${money0(s.revenue)}</b></li>`).join('')}</ol>` : emptyHTML('Sem vendas', 'Nenhuma venda com esses filtros.')}</section>
      <section class="card" aria-labelledby="rpCat"><div class="card-head"><div><h2 class="card-title" id="rpCat">Categorias com maior faturamento</h2><p class="card-sub">Receita líquida de descontos</p></div>${csvBtn('cat')}</div><div id="repCats"></div></section>
      <section class="card wide" aria-labelledby="rpCli"><div class="card-head"><div><h2 class="card-title" id="rpCli">Evolução de clientes</h2><p class="card-sub">Compradores novos e recorrentes ao longo do período</p></div>${csvBtn('cli')}</div><div id="repCli"></div></section>
      <section class="card side" aria-labelledby="rpGoal"><div class="card-head"><h2 class="card-title" id="rpGoal">Metas do mês</h2><a class="link" href="#/configuracoes?aba=metas">Ajustar</a></div>${goalsHTML()}</section>
      <section class="card full" aria-labelledby="rpMg"><div class="card-head"><div><h2 class="card-title" id="rpMg">Margem por produto</h2><p class="card-sub">Lucro bruto = receita − custo das peças vendidas</p></div>${csvBtn('mg')}</div>
        ${margin.length ? `<div class="table-wrap"><table class="table stack"><caption class="sr-only">Margem por produto</caption><thead><tr><th scope="col">Produto</th><th scope="col" class="r">Peças</th><th scope="col" class="r">Receita</th><th scope="col" class="r">Custo</th><th scope="col" class="r">Lucro bruto</th><th scope="col">Margem</th></tr></thead><tbody>
        ${margin.slice(0, 10).map((s) => `<tr><td class="lead" data-label="Produto"><div class="cell-main"><img src="${productImg(s.p)}" alt="" width="38" height="38" loading="lazy"><div><b>${esc(s.p.name)}</b><small>${esc(s.p.sku)}</small></div></div></td><td data-label="Peças" class="r">${int(s.units)}</td><td data-label="Receita" class="r">${money0(s.revenue)}</td><td data-label="Custo" class="r">${money0(s.cost)}</td><td data-label="Lucro bruto" class="r"><b>${money0(s.profit)}</b></td><td data-label="Margem" style="min-width:140px"><div style="display:flex;align-items:center;gap:10px"><div class="meterline" style="flex:1;margin:0;--c:${s.m >= 0.6 ? C.teal : s.m >= 0.5 ? C.yellow : C.pink}"><span style="width:${clamp(s.m, 0, 1) * 100}%"></span></div><span class="num">${pct(s.m, 0)}</span></div></td></tr>`).join('')}</tbody></table></div>` : emptyHTML('Sem vendas', 'Nenhuma venda para calcular margem.')}</section>
      <section class="card full" aria-labelledby="rpGiro"><div class="card-head"><div><h2 class="card-title" id="rpGiro">Giro de estoque</h2><p class="card-sub">Vendas do período sobre o estoque médio estimado. Cobertura = dias de venda que o estoque atual aguenta.</p></div>${csvBtn('giro')}</div>
        <div class="table-wrap"><table class="table stack"><caption class="sr-only">Giro de estoque</caption><thead><tr><th scope="col">Produto</th><th scope="col" class="r">Vendidas</th><th scope="col" class="r">Estoque atual</th><th scope="col" class="r">Giro</th><th scope="col">Cobertura</th></tr></thead><tbody>
        ${turn.slice(0, 10).map((s) => `<tr><td class="lead" data-label="Produto"><div class="cell-main"><img src="${productImg(s.p)}" alt="" width="38" height="38" loading="lazy"><div><b>${esc(s.p.name)}</b><small>${s.p.category}</small></div></div></td><td data-label="Vendidas" class="r">${int(s.units)}</td><td data-label="Estoque" class="r">${int(s.stock)}</td><td data-label="Giro" class="r"><b>${s.giro.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×</b></td><td data-label="Cobertura">${s.cover === Infinity ? badge('Sem vendas', 'muted') : s.cover < 15 ? badge(`${Math.round(s.cover)} dias`, 'danger') : s.cover < 45 ? badge(`${Math.round(s.cover)} dias`, 'warn') : badge(`${Math.round(s.cover)} dias`, 'ok')}</td></tr>`).join('')}</tbody></table></div></section>
    </div></div>`;
}
const csvBtn = (k) => `<button type="button" class="icon-btn" data-action="rep-csv" data-k="${k}" aria-label="Exportar CSV" data-tip="Exportar CSV">${icon('download')}</button>`;
function goalsHTML() {
  const r = rangeOf('mes'); const k = salesKPIs(r); const g = DB.settings.goals;
  const dim = new Date(r.start.getFullYear(), r.start.getMonth() + 1, 0).getDate(); const elapsed = new Date().getDate() / dim;
  const row = (label, cur, goal, fmt, c) => { const p = goal ? cur / goal : 0; return `<div class="goal-bar"><div style="display:flex;justify-content:space-between;color:var(--text);font-size:13px"><span>${label}</span><b class="num">${fmt(cur)} <span class="muted" style="font-weight:400">de ${fmt(goal)}</span></b></div><div class="meterline" style="--c:${c};height:10px"><span style="width:${clamp(p, 0, 1) * 100}%"></span></div><span>${pct(p, 0)} da meta, ${p >= elapsed ? 'no ritmo' : 'abaixo do ritmo'} (${pct(elapsed, 0)} do mês)</span></div>`; };
  return `<div style="display:grid;gap:18px">${row('Faturamento', k.revenue, g.revenue, money0, C.teal)}${row('Pedidos', k.orders, g.orders, int, C.yellow)}${row('Novos clientes', k.newClients, g.newClients, int, C.pink)}</div>`;
}
function mountReports(root) {
  const { r, pr, cats } = reportData(); const f = UI.reports;
  const mode = modeFor(r);
  const filt = (rr) => { const bs = buckets(rr, mode); const v = bs.map(() => 0); ordersIn(rr).forEach((o) => { if (!CONFIRMED.has(o.status) || (f.channel !== 'all' && o.channel !== f.channel)) return; const t = toDate(o.date); const i = bs.findIndex((b) => t >= b.start && t <= b.end); if (i < 0) return; const sub = orderSubtotal(o); const k = sub ? orderTotal(o) / sub : 1; v[i] += sum(o.items.filter((it) => f.cat === 'all' || product(it.p)?.category === f.cat), (it) => it.qty * it.price * k); }); return { bs, v: v.map(round2) }; };
  const cur = filt(r), prev = filt(pr);
  const n = cur.bs.length; const pv = prev.v.slice(-n); while (pv.length < n) pv.unshift(0);
  UI._rep = { cur, pv, cats };
  lineChart($('#repRev', root), { labels: cur.bs.map((b) => b.label), fulls: cur.bs.map((b) => b.full), series: [{ key: 'cur', name: 'Período atual', color: C.teal, values: cur.v, area: true }, { key: 'prev', name: 'Período anterior', color: C.purple, values: pv, dash: true }] });
  const pal = [C.teal, C.yellow, C.pink, C.purple, C.teal, C.yellow];
  const tot = sum(cats, (c) => c.value) || 1;
  hbarChart($('#repCats', root), { items: cats.map((c, i) => ({ ...c, color: pal[i] })), fmt: money0, sub: (it) => `${int(it.units)} peças, ${pct(it.value / tot, 0)}` });
  // evolução de clientes
  const bs = buckets(r, mode); const first = firstPurchaseMap(); const nw = bs.map(() => new Set()), rc = bs.map(() => new Set());
  ordersIn(r).forEach((o) => { if (o.status === 'cancelado') return; const t = toDate(o.date); const i = bs.findIndex((b) => t >= b.start && t <= b.end); if (i < 0) return; (first.get(o.client) >= bs[i].start.getTime() ? nw : rc)[i].add(o.client); });
  UI._repCli = { bs, nw: nw.map((s) => s.size), rc: rc.map((s) => s.size) };
  groupedBarsCount($('#repCli', root), bs, UI._repCli.nw, UI._repCli.rc);
}
function groupedBarsCount(el, bs, nw, rc) {
  return groupedBars(el, { labels: bs.map((b) => b.label), fulls: bs.map((b) => b.full), axisFmt: int, tipFmt: (v) => `${int(v)} clientes`, series: [{ key: 'n', name: 'Novos compradores', color: C.pink, values: nw }, { key: 'r', name: 'Recorrentes', color: C.purple, values: rc }] });
}
Object.assign(CHANGES, { 'rep-cat': (el) => { UI.reports.cat = el.value; rerender(); }, 'rep-ch': (el) => { UI.reports.channel = el.value; rerender(); } });
ACTIONS['rep-csv'] = (b) => {
  const { r, prods, cats } = reportData(); const d = dayKey(new Date()); const k = b.dataset.k;
  const s = salesKPIs(r);
  const map = {
    rev: () => [['Período', 'Receita atual (R$)', 'Período anterior (R$)'], UI._rep.cur.bs.map((x, i) => [x.full, UI._rep.cur.v[i], UI._rep.pv[i]])],
    ch: () => [['Canal', 'Pedidos', 'Receita (R$)', 'Ticket médio (R$)'], CH_KEYS.map((c) => [CHANNELS[c].label, s.byChannel[c].orders, round2(s.byChannel[c].revenue), round2(s.byChannel[c].orders ? s.byChannel[c].revenue / s.byChannel[c].orders : 0)])],
    top: () => [['SKU', 'Produto', 'Peças', 'Receita (R$)'], prods.slice().sort((a, b) => b.units - a.units).map((x) => [x.p.sku, x.p.name, x.units, round2(x.revenue)])],
    cat: () => [['Categoria', 'Peças', 'Receita (R$)'], cats.map((c) => [c.label, c.units, round2(c.value)])],
    cli: () => [['Período', 'Novos compradores', 'Recorrentes'], UI._repCli.bs.map((x, i) => [x.full, UI._repCli.nw[i], UI._repCli.rc[i]])],
    mg: () => [['SKU', 'Produto', 'Peças', 'Receita (R$)', 'Custo (R$)', 'Lucro bruto (R$)', 'Margem (%)'], prods.filter((x) => x.units).map((x) => [x.p.sku, x.p.name, x.units, round2(x.revenue), round2(x.cost), round2(x.revenue - x.cost), round2(x.revenue ? ((x.revenue - x.cost) / x.revenue) * 100 : 0)])],
    giro: () => [['SKU', 'Produto', 'Vendidas', 'Estoque atual'], prods.map((x) => [x.p.sku, x.p.name, x.units, stockTotal(x.p)])],
  };
  const [h, rows] = map[k](); downloadCSV(`vestora-relatorio-${k}-${d}.csv`, h, rows);
  toast({ title: 'Relatório exportado', text: `${rows.length} linhas no CSV.` });
};

/* ---------------------------------------------------------------- automações */
const AUTOMATIONS = [
  { id: 'low-stock', name: 'Alerta de estoque baixo', icon: 'stock', color: '#FFDC68', trigger: 'Em tempo real e diariamente às 8h', desc: 'Avisa quando uma variação de cor e tamanho fica no limite mínimo ou zera.' },
  { id: 'pending-pay', name: 'Aviso de pagamentos pendentes', icon: 'finance', color: '#EA9AF7', trigger: 'Diariamente às 9h', desc: 'Lista pedidos aguardando pagamento há mais de 2 dias e contas a pagar dos próximos 3 dias.' },
  { id: 'inactive', name: 'Identificação de clientes inativos', icon: 'clients', color: '#9B70FF', trigger: 'Toda segunda-feira às 10h', desc: 'Encontra clientes sem compras há mais de 90 dias para uma campanha de reativação.' },
  { id: 'restock', name: 'Sugestões de reposição', icon: 'truck', color: '#08E5C1', trigger: 'Diariamente às 7h30', desc: 'Calcula a cobertura pelo ritmo de vendas dos últimos 30 dias e sugere quanto comprar.' },
  { id: 'daily-report', name: 'Relatório diário de vendas', icon: 'reports', color: '#FFDC68', trigger: 'Diariamente às 7h', desc: 'Resume pedidos, faturamento, ticket médio e a peça mais vendida do dia anterior.' },
  { id: 'goals', name: 'Notificação de metas atingidas', icon: 'target', color: '#08E5C1', trigger: 'A cada venda confirmada', desc: 'Acompanha o faturamento do mês e avisa ao chegar em 50%, 75% e 100% da meta.' },
];
const RUNNERS = {
  'low-stock': () => { const lv = lowVariants(); const out = lv.filter((v) => v.level === 'out').length; if (lv.length && DB.settings.notify.stock) notify({ type: 'stock', tone: out ? 'danger' : 'warn', icon: 'alert', link: '#/estoque', key: `lowrun:${dayKey(new Date())}:${lv.length}`, title: `${lv.length} variações pedem reposição`, body: `${out} esgotadas e ${lv.length - out} no limite mínimo de ${DB.settings.minStock} un.` }); return { ok: true, summary: lv.length ? `${lv.length} variações abaixo do limite (${out} zeradas).` : 'Nenhuma variação abaixo do limite.', count: lv.length }; },
  'pending-pay': () => {
    const old = DB.orders.filter((o) => o.status === 'pendente' && daysBetween(toDate(o.date), new Date()) >= 2);
    const soon = payables().filter((e) => daysBetween(new Date(), toDate(e.date)) <= 3);
    if ((old.length || soon.length) && DB.settings.notify.payments) notify({ type: 'payment', tone: 'warn', icon: 'finance', link: '#/financeiro', key: `payrun:${dayKey(new Date())}`, title: 'Pagamentos que pedem atenção', body: `${old.length} pedidos aguardando há 2+ dias e ${soon.length} contas vencendo em até 3 dias (${money(sum(soon, (e) => e.value))}).` });
    return { ok: true, summary: `${old.length} pedidos aguardando pagamento e ${soon.length} contas a pagar nos próximos 3 dias.`, count: old.length + soon.length };
  },
  inactive: () => { const list = DB.clients.filter((c) => segmentOf(c) === 'inativo' && clientStats().get(c.id).orders > 0); const value = sum(list, (c) => clientStats().get(c.id).value); if (list.length && DB.settings.notify.clients) notify({ type: 'client', tone: 'purple', icon: 'clients', link: '#/clientes', key: `inact:${dayKey(new Date())}`, title: `${int(list.length)} clientes inativos para reativar`, body: `Eles já gastaram ${money0(value)} na loja. Que tal um cupom de retorno?` }); return { ok: true, summary: `${int(list.length)} clientes sem comprar há 90+ dias, com ${money0(value)} em histórico.`, count: list.length }; },
  restock: () => {
    const s = productSales(rangeOf('30d')); const sug = [];
    activeProducts().filter((p) => p.status === 'ativo').forEach((p) => { const daily = s.get(p.id).units / 30; const st = stockTotal(p); const cover = daily ? st / daily : Infinity; if (cover < 21) sug.push({ p, buy: Math.max(p.sizes.length * 2, Math.ceil(daily * 45 - st)), cover }); });
    sug.sort((a, b) => a.cover - b.cover); UI._restock = sug;
    return { ok: true, summary: sug.length ? `${sug.length} peças com menos de 3 semanas de cobertura. Sugestão total: ${int(sum(sug, (x) => x.buy))} un.` : 'Cobertura de estoque saudável para todas as peças.', count: sug.length };
  },
  'daily-report': () => {
    const y = addDays(new Date(), -1); const r = { start: startOfDay(y), end: endOfDay(y), days: 1, key: 'd' }; const k = salesKPIs(r);
    const ps = productSales(r); let best = null; ps.forEach((v, id) => { if (!best || v.units > best.units) best = { ...v, id }; });
    const bp = best && best.units ? product(best.id) : null;
    if (DB.settings.notify.reports) notify({ type: 'report', tone: 'info', icon: 'reports', link: '#/relatorios', key: `daily:${dayKey(y)}`, title: `Resumo de ${DOW_LONG[y.getDay()]}, ${fmtShort(y)}`, body: `${k.orders} pedidos, ${money(k.revenue)} faturados, ticket médio de ${money(k.avgTicket)}.${bp ? ` Destaque: ${bp.name}.` : ''}` });
    return { ok: true, summary: `${fmtShort(y)}: ${k.orders} pedidos, ${money(k.revenue)}, ticket de ${money(k.avgTicket)}${bp ? `. Mais vendida: ${bp.name}` : ''}.`, count: k.orders };
  },
  goals: () => { const k = salesKPIs(rangeOf('mes')); const g = DB.settings.goals.revenue; afterSale(); return { ok: true, summary: `${pct(k.revenue / g, 0)} da meta de ${money0(g)} (${money0(k.revenue)} faturados no mês).`, count: Math.floor((k.revenue / g) * 100) }; },
};
function runAutomation(id, manual = false) {
  const a = DB.automations.find((x) => x.id === id); const def = AUTOMATIONS.find((x) => x.id === id);
  const res = RUNNERS[id]();
  a.lastRun = isoLocal(new Date()); a.runs++; a.lastResult = res.summary;
  DB.autoLog.unshift({ id: 'l' + nextSeq('log'), auto: id, date: a.lastRun, summary: res.summary, manual, ok: res.ok });
  DB.autoLog = DB.autoLog.slice(0, 40);
  commit(); return { res, def };
}
/** Execuções agendadas simuladas: roda uma vez por dia o que estiver ligado. */
function runScheduled() {
  const today = dayKey(new Date());
  DB.automations.forEach((a) => {
    if (!a.on || (a.lastRun && a.lastRun.slice(0, 10) === today)) return;
    if (a.id === 'inactive' && new Date().getDay() !== 1 && a.lastRun) return;
    runAutomation(a.id, false);
  });
}
function viewAutomations() {
  return `<div class="page">
    <div class="page-head"><div><h2>Automações</h2><p>Regras que observam vendas, estoque, clientes e caixa e avisam a equipe na hora certa.</p></div>${DB.settings.ui.illustrations ? '<img class="auto-hero" src="assets/illustrations/automation-tag.svg" alt="" width="180" height="162" loading="lazy">' : ''}</div>
    <div class="notice" role="note">${icon('info')}<p><b>Automações demonstrativas.</b> As regras rodam localmente no seu navegador, com os dados deste painel. Nenhum e-mail, mensagem ou integração externa é disparado.</p></div>
    <div class="auto-grid">${AUTOMATIONS.map((def) => { const a = DB.automations.find((x) => x.id === def.id); return `<article class="card auto-card ${a.on ? '' : 'off'}" style="--c:${def.color}" aria-labelledby="au-${def.id}">
      <div class="auto-top"><span class="auto-ic">${icon(def.icon)}</span><div><h3 id="au-${def.id}">${def.name}</h3><p>${def.desc}</p></div>
        <label class="switch"><input type="checkbox" role="switch" ${a.on ? 'checked' : ''} data-change="auto-toggle" data-id="${def.id}" aria-label="${a.on ? 'Desativar' : 'Ativar'} ${def.name}"><span></span></label></div>
      <div class="auto-meta"><span>${icon('clock')}${def.trigger}</span><span>${icon('refresh')}${a.runs} ${a.runs === 1 ? 'execução' : 'execuções'}</span>${a.lastRun ? `<span>${icon('check')}Última: ${fmtRel(a.lastRun)}</span>` : ''}</div>
      <div class="auto-result" aria-live="polite">${a.lastResult ? `<b>Último resultado:</b> ${esc(a.lastResult)}` : 'Ainda não executada. Use o botão abaixo para testar a regra agora.'}</div>
      <div class="btns"><button type="button" class="btn btn-sm ${a.on ? 'btn-primary' : 'btn-ghost'}" data-action="auto-run" data-id="${def.id}">${icon('play', 'sm')}Executar agora</button>${def.id === 'restock' && UI._restock ? '<button type="button" class="btn btn-sm btn-ghost" data-action="restock-view">Ver sugestões</button>' : ''}</div></article>`; }).join('')}</div>
    <section class="card" aria-labelledby="logTitle"><div class="card-head"><div><h2 class="card-title" id="logTitle">Histórico de execuções</h2><p class="card-sub">Execuções agendadas e manuais, das mais recentes para as mais antigas</p></div></div>
      ${DB.autoLog.length ? `<ol class="log">${DB.autoLog.slice(0, 14).map((l) => { const def = AUTOMATIONS.find((x) => x.id === l.auto); return `<li style="--c:${def.color}"><span class="l-ic">${icon(def.icon, 'sm')}</span><div><b style="font-weight:500">${def.name}</b><small>${esc(l.summary)}</small></div><time datetime="${l.date}">${l.manual ? 'Manual, ' : 'Agendada, '}${fmtRel(l.date)}</time></li>`; }).join('')}</ol>` : emptyHTML('Nenhuma execução ainda', 'Ative uma automação ou execute uma regra manualmente.')}</section></div>`;
}
CHANGES['auto-toggle'] = (el) => { const a = DB.automations.find((x) => x.id === el.dataset.id); a.on = el.checked; commit(); const def = AUTOMATIONS.find((x) => x.id === a.id); toast({ tone: a.on ? 'ok' : 'info', title: a.on ? 'Automação ativada' : 'Automação desativada', text: def.name }); el.setAttribute('aria-label', `${a.on ? 'Desativar' : 'Ativar'} ${def.name}`); el.closest('.auto-card').classList.toggle('off', !a.on); };
ACTIONS['auto-run'] = (b) => {
  b.classList.add('loading'); b.setAttribute('aria-busy', 'true');
  setTimeout(() => { const { res, def } = runAutomation(b.dataset.id, true); toast({ tone: 'ok', title: `${def.name} executada`, text: res.summary }); rerender(); if (b.dataset.id === 'restock') ACTIONS['restock-view'](); }, prefersReduced() ? 50 : 900);
};
ACTIONS['restock-view'] = () => {
  const sug = UI._restock || [];
  openDialog({ title: 'Sugestões de reposição', sub: 'Baseadas no ritmo de vendas dos últimos 30 dias e em 45 dias de cobertura desejada.', size: 'wide',
    body: sug.length ? `<div class="table-wrap"><table class="table stack"><thead><tr><th>Produto</th><th class="r">Estoque</th><th>Cobertura</th><th class="r">Comprar</th></tr></thead><tbody>${sug.map((x) => `<tr><td class="lead" data-label="Produto"><div class="cell-main"><img src="${productImg(x.p)}" alt="" width="38" height="38"><div><b>${esc(x.p.name)}</b><small>${esc(x.p.sku)}</small></div></div></td><td data-label="Estoque" class="r">${stockTotal(x.p)} un.</td><td data-label="Cobertura">${badge(x.cover === Infinity ? '—' : `${Math.round(x.cover)} dias`, x.cover < 10 ? 'danger' : 'warn')}</td><td data-label="Comprar" class="r"><b>${x.buy} un.</b></td></tr>`).join('')}</tbody></table></div>` : emptyHTML('Nada a repor', 'Todas as peças têm mais de 3 semanas de cobertura.'),
    foot: `<button type="button" class="btn btn-ghost" data-close>Fechar</button>${sug.length ? '<button type="button" class="btn btn-primary" data-action="restock-csv">Baixar lista de compras</button>' : ''}` });
};
ACTIONS['restock-csv'] = () => { downloadCSV(`vestora-reposicao-${dayKey(new Date())}.csv`, ['SKU', 'Produto', 'Cor', 'Estoque atual', 'Cobertura (dias)', 'Sugestão de compra'], (UI._restock || []).map((x) => [x.p.sku, x.p.name, x.p.color, stockTotal(x.p), x.cover === Infinity ? '' : Math.round(x.cover), x.buy])); toast({ title: 'Lista de compras exportada' }); };

/* ---------------------------------------------------------------- configurações */
const SET_TABS = [['loja', 'Dados da loja', 'store'], ['perfil', 'Perfil', 'user'], ['notificacoes', 'Notificações', 'bell'], ['metas', 'Metas comerciais', 'target'], ['estoque', 'Estoque', 'stock'], ['interface', 'Interface', 'palette'], ['dados', 'Dados', 'database']];
function viewSettings(params) {
  if (params.get('aba')) UI.settingsTab = params.get('aba');
  const t = UI.settingsTab;
  return `<div class="page"><div class="page-head"><div><h2>Configurações</h2><p>Preferências da loja e do painel. Tudo fica salvo neste navegador.</p></div></div>
    <div class="set-layout"><div class="set-tabs" role="tablist" aria-label="Seções" aria-orientation="vertical">${SET_TABS.map(([k, l, ic]) => `<button type="button" role="tab" id="tab-${k}" aria-controls="panel-set" aria-selected="${t === k}" tabindex="${t === k ? 0 : -1}" data-action="set-tab" data-t="${k}">${icon(ic)}${l}</button>`).join('')}</div>
    <section class="card" role="tabpanel" id="panel-set" aria-labelledby="tab-${t}">${settingsPanel(t)}</section></div></div>`;
}
function settingsPanel(t) {
  const s = DB.settings;
  const save = (label = 'Salvar alterações') => `<div class="toolbar" style="justify-content:flex-end;margin-top:20px"><button type="submit" class="btn btn-primary">${label}</button></div>`;
  const sw = (key, label, sub, checked, group) => `<div class="set-row"><div><b>${label}</b><small>${sub}</small></div><label class="switch"><input type="checkbox" role="switch" data-change="set-switch" data-group="${group}" data-key="${key}" ${checked ? 'checked' : ''} aria-label="${label}"><span></span></label></div>`;
  if (t === 'loja') return `<form data-form="store" novalidate><div class="card-head"><div><h2 class="card-title">Dados da loja</h2><p class="card-sub">Usados em relatórios e documentos exportados.</p></div></div><div class="form-grid">
    ${field({ name: 'name', label: 'Nome fantasia', value: s.store.name, required: true })}${field({ name: 'legal', label: 'Razão social', value: s.store.legal, required: true })}
    ${field({ name: 'cnpj', label: 'CNPJ (fictício)', value: s.store.cnpj, required: true })}${field({ name: 'site', label: 'Site', value: s.store.site, required: true })}
    ${field({ name: 'email', label: 'E-mail de contato', type: 'email', value: s.store.email, required: true })}${field({ name: 'phone', label: 'Telefone', value: s.store.phone, required: true, attrs: 'data-mask="phone"' })}
    ${field({ name: 'address', label: 'Endereço', value: s.store.address, full: true, required: true })}</div>${save()}</form>`;
  if (t === 'perfil') return `<form data-form="admin" novalidate><div class="card-head"><div class="profile-head"><img src="assets/images/admin-avatar.svg" alt="" width="64" height="64"><div><h2 class="card-title">${esc(s.admin.name)}</h2><p class="card-sub">${esc(s.admin.role)}</p></div></div></div><div class="form-grid">
    ${field({ name: 'name', label: 'Nome de exibição', value: s.admin.name, required: true, hint: 'Aparece na saudação da visão geral.' })}${field({ name: 'role', label: 'Cargo', value: s.admin.role, required: true })}
    ${field({ name: 'email', label: 'E-mail', type: 'email', value: s.admin.email, required: true, full: true })}</div>${save()}</form>`;
  if (t === 'notificacoes') return `<div class="card-head"><div><h2 class="card-title">Preferências de notificações</h2><p class="card-sub">Escolha o que aparece no sino do topo. Cada aviso depende também da automação correspondente.</p></div></div>
    ${sw('stock', 'Estoque baixo e esgotado', 'Variações que chegam ao limite mínimo ou zeram.', s.notify.stock, 'notify')}${sw('payments', 'Pagamentos pendentes', 'Pedidos aguardando pagamento e contas a vencer.', s.notify.payments, 'notify')}
    ${sw('goals', 'Metas atingidas', 'Marcos de 50%, 75% e 100% da meta do mês.', s.notify.goals, 'notify')}${sw('clients', 'Clientes inativos', 'Lista semanal para campanhas de reativação.', s.notify.clients, 'notify')}${sw('reports', 'Relatório diário', 'Resumo das vendas do dia anterior.', s.notify.reports, 'notify')}`;
  if (t === 'metas') return `<form data-form="goals" novalidate><div class="card-head"><div><h2 class="card-title">Metas comerciais do mês</h2><p class="card-sub">Usadas nos relatórios e na automação de metas.</p></div></div><div class="form-grid three">
    ${field({ name: 'revenue', label: 'Faturamento', prefix: 'R$', value: moneyInput(s.goals.revenue), required: true, attrs: 'inputmode="decimal"' })}${field({ name: 'orders', label: 'Pedidos', type: 'number', value: s.goals.orders, required: true, attrs: 'min="1"' })}${field({ name: 'newClients', label: 'Novos clientes', type: 'number', value: s.goals.newClients, required: true, attrs: 'min="1"' })}</div>
    <div style="margin-top:20px">${goalsHTML()}</div>${save('Salvar metas')}</form>`;
  if (t === 'estoque') return `<form data-form="stock" novalidate><div class="card-head"><div><h2 class="card-title">Limite mínimo de estoque</h2><p class="card-sub">Quantidade por variação (SKU, cor e tamanho) que dispara o alerta.</p></div></div><div class="form-grid">
    ${field({ name: 'minStock', label: 'Alerta quando restar até', type: 'number', value: s.minStock, required: true, attrs: 'min="0" max="50"', hint: `Hoje ${lowVariants().length} variações estão no limite ou zeradas.` })}</div>${save('Salvar limite')}</form>`;
  if (t === 'interface') return `<div class="card-head"><div><h2 class="card-title">Preferências de interface</h2><p class="card-sub">Ajustes visuais deste navegador.</p></div></div>
    ${sw('reduceMotion', 'Reduzir animações', 'Desliga transições e contadores animados. O sistema também respeita a preferência do aparelho.', s.ui.reduceMotion, 'ui')}
    ${sw('compact', 'Densidade compacta', 'Menos espaço entre cartões e linhas de tabela.', s.ui.compact, 'ui')}
    ${sw('sidebarExpanded', 'Menu lateral expandido', 'Mostra os nomes dos módulos no desktop.', s.ui.sidebarExpanded, 'ui')}
    ${sw('illustrations', 'Ilustrações 3D', 'Exibe as ilustrações nos cartões e gráficos.', s.ui.illustrations, 'ui')}`;
  return `<div class="card-head"><div><h2 class="card-title">Dados demonstrativos</h2><p class="card-sub">A base fica no localStorage deste navegador e é compartilhada por todos os módulos.</p></div></div>
    <ul class="mlist" style="margin-bottom:20px">${[['Produtos', activeProducts().length], ['Clientes', DB.clients.length], ['Pedidos', DB.orders.length], ['Lançamentos financeiros', DB.ledger.length], ['Movimentações de estoque', DB.moves.length], ['Eventos no calendário', DB.events.length]].map(([l, v]) => `<li><span>${l}</span><b class="num">${int(v)}</b></li>`).join('')}</ul>
    <div class="toolbar" style="margin-bottom:22px"><button type="button" class="btn btn-ghost" data-action="backup">${icon('download')}Baixar cópia dos dados (JSON)</button></div>
    <div class="danger-zone"><b>Restaurar dados demonstrativos</b><p class="muted" style="margin:6px 0 14px;font-size:14px">Apaga pedidos, produtos, clientes e lançamentos criados por você e gera a base de exemplo de novo, a partir da data de hoje.</p><button type="button" class="btn btn-danger" data-action="restore">${icon('refresh')}Restaurar base de exemplo</button></div>
    <p class="credit" style="margin-top:22px">${icon('info')}Vestora é uma loja fictícia. Todos os nomes, valores e documentos são demonstrativos.</p>`;
}
ACTIONS['set-tab'] = (b) => { UI.settingsTab = b.dataset.t; history.replaceState(null, '', '#/configuracoes'); rerender(); $(`#tab-${b.dataset.t}`).focus(); };
document.addEventListener('keydown', (e) => {
  const tab = e.target.closest && e.target.closest('[role=tab]'); if (!tab) return;
  const tabs = $$('[role=tab]', tab.parentElement); const i = tabs.indexOf(tab);
  const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!d) return;
  e.preventDefault(); tabs[(i + d + tabs.length) % tabs.length].click();
});
CHANGES['set-switch'] = (el) => {
  const g = el.dataset.group, k = el.dataset.key; DB.settings[g][k] = el.checked; commit();
  if (g === 'ui') applyUIPrefs();
  toast({ tone: 'ok', title: 'Preferência salva' });
};
document.addEventListener('submit', (e) => {
  const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault();
  const s = DB.settings; const kind = f.dataset.form;
  if (kind === 'store') { const d = validate(f, { name: [V.required()], legal: [V.required()], cnpj: [V.required()], site: [V.required()], email: [V.required(), V.email], phone: [V.required(), V.phone], address: [V.required()] }); if (!d) return; Object.assign(s.store, d); }
  if (kind === 'admin') { const d = validate(f, { name: [V.required()], role: [V.required()], email: [V.required(), V.email] }); if (!d) return; Object.assign(s.admin, d); paintProfile(); }
  if (kind === 'goals') { const d = validate(f, { revenue: [V.money(1)], orders: [V.intMin(1)], newClients: [V.intMin(1)] }); if (!d) return; s.goals = { revenue: parseMoney(d.revenue), orders: +d.orders, newClients: +d.newClients }; }
  if (kind === 'stock') { const d = validate(f, { minStock: [V.intMin(0), (v) => (+v > 50 ? 'Use no máximo 50 unidades.' : null)] }); if (!d) return; s.minStock = +d.minStock; }
  commit(); toast({ title: 'Configurações salvas' }); rerender();
});
ACTIONS.restore = async () => {
  if (!(await confirmDialog({ title: 'Restaurar a base de exemplo?', text: 'Tudo que você criou ou alterou neste navegador será substituído pelos dados demonstrativos. Essa ação não pode ser desfeita.', confirm: 'Restaurar dados' }))) return;
  resetDB(); runScheduled(); applyUIPrefs(); paintProfile(); paintBadges(); paintNotifications();
  toast({ title: 'Base restaurada', text: 'Os dados demonstrativos foram gerados de novo.' }); go('#/visao-geral');
};
ACTIONS.backup = () => { downloadBlob(new Blob([JSON.stringify(DB, null, 1)], { type: 'application/json' }), `vestora-backup-${dayKey(new Date())}.json`); toast({ title: 'Cópia baixada', text: 'Arquivo JSON com toda a base.' }); };

/* ==========================================================================
   ROTEADOR, CABEÇALHO, MENU LATERAL, PRELOADER E INICIALIZAÇÃO
   ========================================================================== */
const ROUTES = {
  'visao-geral': { title: 'Visão geral', render: viewDashboard, mount: mountDashboard },
  pedidos: { title: 'Vendas e pedidos', render: viewOrders },
  produtos: { title: 'Produtos', render: viewProducts },
  estoque: { title: 'Estoque', render: viewStock },
  clientes: { title: 'Clientes', render: viewClients },
  financeiro: { title: 'Financeiro', render: viewFinance, mount: mountFinance },
  relatorios: { title: 'Relatórios', render: viewReports, mount: mountReports },
  automacoes: { title: 'Automações', render: viewAutomations },
  configuracoes: { title: 'Configurações', render: viewSettings },
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let currentRoute = null; let currentParams = new URLSearchParams(); let navToken = 0; let READY = false;
const go = (hash) => { if (location.hash === hash) navigate(); else location.hash = hash; };
function parseHash() {
  const h = location.hash.replace(/^#\/?/, ''); const [path, qs] = h.split('?');
  return { name: ROUTES[path] ? path : 'visao-geral', params: new URLSearchParams(qs || '') };
}
function clearTimers() { UI.timers.forEach(clearInterval); UI.timers = []; }
async function navigate(first = false) {
  const token = ++navToken; const { name, params } = parseHash();
  if (name === 'clientes') { if (params.get('novos')) { UI.clients.newOnly = true; UI.clients.seg = 'all'; } if (params.get('seg')) UI.clients.seg = params.get('seg'); }
  if (name === 'pedidos' && params.get('status')) UI.orders.status = params.get('status');
  if (name === 'estoque' && params.get('nivel')) UI.stock.level = params.get('nivel');
  const view = $('#view'); const changed = currentRoute !== name;
  clearTimers(); closePopover(); hideTip(); Tip.hide(); closeNav(); closeSearch();
  currentRoute = name; currentParams = params;
  document.title = `${ROUTES[name].title} | Vestora`;
  $('#pageTitle').textContent = ROUTES[name].title;
  paintNav(name);
  if (changed && !first && !prefersReduced() && view.firstElementChild) { view.classList.add('leaving'); await wait(170); view.classList.remove('leaving'); }
  if (token !== navToken) return;
  if (!UI.visited.has(name)) {
    UI.visited.add(name); view.setAttribute('aria-busy', 'true'); view.classList.remove('no-anim');
    view.innerHTML = skeletonPage(name); await wait(first ? 120 : 360);
    if (token !== navToken) return;
  }
  renderRoute(name, params, false);
  if (changed) { scrollTo({ top: 0, behavior: 'instant' }); if (!first) view.focus({ preventScroll: true }); }
}
function renderRoute(name, params, quiet) {
  const view = $('#view'); const r = ROUTES[name];
  view.classList.toggle('no-anim', !!quiet);
  view.innerHTML = r.render(params);
  view.setAttribute('aria-busy', 'false');
  r.mount && r.mount(view);
  animateCounters(view);
}
/** Redesenha a tela atual mantendo a rolagem (após filtros globais ou mudanças nos dados). */
function rerender() { if (!currentRoute) return; clearTimers(); const y = scrollY; renderRoute(currentRoute, currentParams, true); scrollTo({ top: y, behavior: 'instant' }); }
function softRerender() { rerender(); paintBadges(); paintNotifications(); }
addEventListener('hashchange', () => navigate());

/* paginação e ordenação genéricas */
ACTIONS.page = (b) => {
  const p = +b.dataset.page; const sc = b.dataset.scope;
  const map = { orders: [UI.orders, 'page', '#ordersBody', ordersBodyHTML], stock: [UI.stock, 'page', '#stockBody', stockBodyHTML], moves: [UI.stock, 'mvPage', '#movesBody', movesBodyHTML], clients: [UI.clients, 'page', '#clientsBody', clientsBodyHTML], finance: [UI.finance, 'page', '#ledgerBody', ledgerBodyHTML] };
  const [st, key, sel, fn] = map[sc]; st[key] = p; const box = $(sel); box.innerHTML = fn();
  const top = box.getBoundingClientRect().top; if (top < 80) scrollBy({ top: top - 90, behavior: prefersReduced() ? 'auto' : 'smooth' });
  const cur = box.querySelector('.pager [aria-current="page"]'); cur && cur.focus({ preventScroll: true });
};
ACTIONS.sort = (b) => {
  const sc = b.dataset.scope; const k = b.dataset.key;
  const map = { dash: [UI.dashOrders, '#dashOrders', dashOrdersHTML], orders: [UI.orders, '#ordersBody', ordersBodyHTML], clients: [UI.clients, '#clientsBody', clientsBodyHTML], finance: [UI.finance, '#ledgerBody', ledgerBodyHTML] };
  const [st, sel, fn] = map[sc];
  if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = ['name', 'client', 'desc'].includes(k) ? 'asc' : 'desc'; }
  $(sel).innerHTML = fn(); const nb = $(`${sel} [data-action="sort"][data-key="${k}"]`); nb && nb.focus();
};
/* linhas clicáveis acessíveis pelo teclado */
document.addEventListener('keydown', (e) => {
  const tr = e.target.closest && e.target.closest('tr.clickable');
  if (tr && e.target === tr && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); tr.click(); }
});
new MutationObserver(() => $$('tr.clickable:not([tabindex])').forEach((tr) => tr.setAttribute('tabindex', '0'))).observe(document.body, { childList: true, subtree: true });

/* ---------------------------------------------------------------- menu lateral */
function paintNav(name) {
  $$('[data-route]').forEach((a) => { if (a.dataset.route === name) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  moveIndicator();
}
function moveIndicator() {
  const a = $(`.sb-nav a[aria-current="page"]`); const ind = $('.sb-indicator'); if (!a || !ind) return;
  const nav = $('.sb-nav'); const y = a.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
  ind.style.setProperty('--ind-y', y + 'px'); ind.style.setProperty('--ind-o', 1);
  ind.style.left = (a.offsetLeft) + 'px';
}
addEventListener('resize', debounce(moveIndicator, 100));
function setSidebar(expanded, save = true) {
  const sb = $('#sidebar'); const t = $('.sb-toggle');
  sb.classList.toggle('expanded', expanded); $('#app').classList.toggle('sb-expanded', expanded && isDesktop());
  t.setAttribute('aria-expanded', String(expanded)); t.setAttribute('aria-label', expanded ? 'Recolher menu' : 'Expandir menu'); t.dataset.tip = expanded ? 'Recolher menu' : 'Expandir menu';
  t.querySelector('span').textContent = expanded ? 'Recolher menu' : 'Expandir menu';
  if (save) { DB.settings.ui.sidebarExpanded = expanded; commit(); }
  setTimeout(moveIndicator, 300);
}
ACTIONS['toggle-sidebar'] = () => setSidebar(!$('#sidebar').classList.contains('expanded'));
$$('.sb-nav a').forEach((a) => a.addEventListener('click', () => { if (!isDesktop() && !isMobile() && $('#sidebar').classList.contains('expanded')) setSidebar(false, false); }));
function openNav() {
  const sb = $('#sidebar'); sb.classList.add('open'); $('.nav-scrim').hidden = false; document.body.classList.add('lock');
  $('.shell').inert = true; $('.tabbar').inert = true; $$('[data-action="open-nav"]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  setTimeout(() => (sb.querySelector('[aria-current="page"]') || sb.querySelector('a')).focus(), 60); moveIndicator();
}
function closeNav() {
  const sb = $('#sidebar'); if (!sb || !sb.classList.contains('open')) return;
  sb.classList.remove('open'); $('.nav-scrim').hidden = true; if (!$('dialog[open]')) document.body.classList.remove('lock');
  $('.shell').inert = false; $('.tabbar').inert = false; $$('[data-action="open-nav"]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
}
ACTIONS['open-nav'] = openNav; ACTIONS['close-nav'] = closeNav;
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('#sidebar').classList.contains('open')) { closeNav(); $('[data-action="open-nav"]').focus(); } });
/* gesto: arrastar para fechar o drawer no mobile */
(() => { let x0 = null; const sb = $('#sidebar'); sb.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true }); sb.addEventListener('touchend', (e) => { if (x0 !== null && x0 - e.changedTouches[0].clientX > 60) closeNav(); x0 = null; }); })();

/* ---------------------------------------------------------------- busca global */
const searchState = { items: [], idx: -1 };
function highlight(text, q) { const t = norm(text); const i = t.indexOf(q); if (i < 0 || !q) return esc(text); return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length)); }
function runSearch(raw) {
  const box = $('#searchResults'); const input = $('#searchInput'); const q = norm(raw.trim());
  if (q.length < 2) { box.hidden = true; input.setAttribute('aria-expanded', 'false'); return; }
  const digits = q.replace(/\D/g, '');
  const ps = activeProducts().filter((p) => norm(`${p.name} ${p.sku} ${p.color} ${p.category}`).includes(q)).slice(0, 4);
  const cs = DB.clients.filter((c) => norm(`${c.name} ${c.email}`).includes(q) || (digits.length > 3 && c.phone.replace(/\D/g, '').includes(digits))).slice(0, 4);
  const os = DB.orders.filter((o) => (digits.length >= 3 && String(o.id).includes(digits)) || norm(client(o.client)?.name).includes(q)).slice(-5).reverse();
  searchState.items = [...ps.map((p) => ({ t: 'p', id: p.id })), ...cs.map((c) => ({ t: 'c', id: c.id })), ...os.map((o) => ({ t: 'o', id: o.id }))]; searchState.idx = searchState.items.length ? 0 : -1;
  let i = 0; const opt = () => `id="sr-${i}" role="option" aria-selected="${i === 0}" data-sr="${i++}"`;
  box.innerHTML = searchState.items.length ? `
    ${ps.length ? `<div class="sr-group" role="group" aria-label="Produtos"><h3>Produtos</h3>${ps.map((p) => `<div class="sr-item" ${opt()}><img src="${productImg(p)}" alt=""><div><b>${highlight(p.name, q)}</b><small>${esc(p.sku)}, ${esc(p.color)}, ${money(p.price)}, ${stockTotal(p)} un.</small></div></div>`).join('')}</div>` : ''}
    ${cs.length ? `<div class="sr-group" role="group" aria-label="Clientes"><h3>Clientes</h3>${cs.map((c) => `<div class="sr-item" ${opt()}><img src="${avatarOf(c)}" alt="" style="border-radius:50%"><div><b>${highlight(c.name, q)}</b><small>${esc(c.email)}, ${esc(c.city)}</small></div></div>`).join('')}</div>` : ''}
    ${os.length ? `<div class="sr-group" role="group" aria-label="Pedidos"><h3>Pedidos</h3>${os.map((o) => `<div class="sr-item" ${opt()}><span class="sr-ic">${icon('orders')}</span><div><b>Pedido #${o.id}</b><small>${esc(client(o.client)?.name || '')}, ${fmtDate(o.date)}, ${money(orderTotal(o))}, ${STATUS[o.status].label}</small></div></div>`).join('')}</div>` : ''}`
    : `<p class="sr-empty">Nada encontrado para “${esc(raw.trim())}”. Tente o nome da peça, o SKU, o cliente ou o número do pedido.</p>`;
  box.hidden = false; input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-activedescendant', searchState.items.length ? 'sr-0' : '');
}
function pickSearch(i) {
  const it = searchState.items[i]; if (!it) return;
  const input = $('#searchInput'); input.value = ''; $('#searchResults').hidden = true; input.setAttribute('aria-expanded', 'false'); input.blur(); closeSearch();
  const after = { p: ['#/produtos', () => openProduct(it.id)], c: ['#/clientes', () => openClient(it.id)], o: ['#/pedidos', () => openOrder(it.id)] }[it.t];
  if (location.hash.startsWith(after[0])) after[1](); else { location.hash = after[0]; setTimeout(after[1], 650); }
}
function closeSearch() { $('#search')?.classList.remove('open'); }
(() => {
  const input = $('#searchInput'); const box = $('#searchResults');
  input.addEventListener('input', debounce(() => runSearch(input.value), 110));
  input.addEventListener('focus', () => { if (input.value.trim().length >= 2) runSearch(input.value); });
  input.addEventListener('keydown', (e) => {
    const n = searchState.items.length;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!n) return; e.preventDefault(); searchState.idx = (searchState.idx + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      $$('.sr-item', box).forEach((el, i) => el.setAttribute('aria-selected', String(i === searchState.idx)));
      input.setAttribute('aria-activedescendant', 'sr-' + searchState.idx); $('#sr-' + searchState.idx)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { e.preventDefault(); pickSearch(searchState.idx); }
    else if (e.key === 'Escape') { input.value = ''; box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.blur(); closeSearch(); }
  });
  box.addEventListener('pointerdown', (e) => { const it = e.target.closest('[data-sr]'); if (it) { e.preventDefault(); pickSearch(+it.dataset.sr); } });
  input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; input.setAttribute('aria-expanded', 'false'); if (isMobile()) closeSearch(); }, 160));
})();
ACTIONS['open-search'] = () => { $('#search').classList.add('open'); setTimeout(() => $('#searchInput').focus(), 30); };
document.addEventListener('keydown', (e) => {
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
  if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) { e.preventDefault(); if (isMobile()) ACTIONS['open-search'](); else $('#searchInput').focus(); }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || $('dialog[open]')) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); openOrderForm(); }
  if (e.key === '[' && !isMobile()) ACTIONS['toggle-sidebar']();
  if (e.key === '?') ACTIONS.shortcuts();
});

/* ---------------------------------------------------------------- período, perfil, notificações */
ACTIONS.period = (b) => listbox(b, {
  label: 'Período', options: Object.entries(PERIODS).map(([value, v]) => ({ value, label: v.label })), value: UI.period,
  onSelect: (v) => { UI.period = v; try { localStorage.setItem('vestora:period', v); } catch (_) { /* ok */ } paintPeriod(); rerender(); toast({ tone: 'info', title: 'Período atualizado', text: `Indicadores recalculados: ${PERIODS[v].label.toLowerCase()}.`, timeout: 2400 }); },
});
$('#periodBtn').addEventListener('click', (e) => ACTIONS.period(e.currentTarget));
function paintPeriod() { $('#periodLabel').textContent = PERIODS[UI.period].label; }
function paintProfile() { $('#adminName').textContent = DB.settings.admin.name; $('#adminMail').textContent = DB.settings.admin.email; }
$('#profileBtn').addEventListener('click', (e) => togglePopover(e.currentTarget, $('#profileMenu'), { onOpen: (pop) => pop.querySelector('[role=menuitem]').focus() }));
$('#profileMenu').addEventListener('click', (e) => { if (e.target.closest('[role=menuitem]')) closePopover(); });
$('#profileMenu').addEventListener('keydown', (e) => { const items = $$('[role=menuitem]', e.currentTarget); const i = items.indexOf(document.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); } if (e.key === 'Tab') closePopover(); });
ACTIONS.logout = () => toast({ tone: 'info', title: 'Ambiente demonstrativo', text: 'Não há login neste painel. Seus dados continuam salvos neste navegador.' });
ACTIONS.shortcuts = () => openDialog({
  title: 'Atalhos do teclado', size: 'narrow',
  body: `<ul class="mlist">${[['/ ou Ctrl + K', 'Buscar produtos, clientes e pedidos'], ['N', 'Criar novo pedido'], ['[', 'Expandir ou recolher o menu'], ['Setas', 'Navegar em gráficos, calendário e listas'], ['Esc', 'Fechar janelas e menus'], ['?', 'Mostrar esta lista']].map(([k, d]) => `<li><span>${d}</span><b><kbd class="search-kbd" style="position:static;display:inline-grid;width:auto;padding:0 8px">${k}</kbd></b></li>`).join('')}</ul>`,
  foot: '<button type="button" class="btn btn-primary" data-close>Entendi</button>',
});
const NOTIF_ICON = { stock: 'alert', payment: 'finance', goal: 'target', client: 'clients', report: 'reports', order: 'orders' };
const TONE_COLOR = { teal: 'var(--teal)', warn: 'var(--warn)', danger: 'var(--danger)', ok: 'var(--ok)', info: 'var(--info)', purple: '#B59AFF' };
function paintNotifications() {
  const unread = DB.notifications.filter((n) => !n.read).length;
  $('#bellDot').hidden = !unread;
  $('#bellBtn').setAttribute('aria-label', unread ? `Notificações, ${unread} não lidas` : 'Notificações');
  const p = $('#notifPanel'); if (p.hidden) return;
  p.innerHTML = `<div class="np-head"><h2>Notificações</h2>${unread ? '<button type="button" class="link" data-action="notif-read-all">Marcar todas como lidas</button>' : ''}</div>
    <div class="np-list">${DB.notifications.length ? DB.notifications.slice(0, 14).map((n) => `<div class="np-item ${n.read ? '' : 'unread'}" role="button" tabindex="0" data-action="notif-open" data-id="${n.id}" style="--tone:${TONE_COLOR[n.tone] || 'var(--teal)'}"><span class="np-ic">${icon(n.icon || NOTIF_ICON[n.type] || 'bell')}</span><div><b>${esc(n.title)}</b><p>${esc(n.body)}</p><time datetime="${n.date}">${fmtRel(n.date)}</time></div></div>`).join('') : `<div class="sr-empty">Nenhuma notificação por enquanto.</div>`}</div>
    <div class="np-foot"><a class="link" href="#/configuracoes?aba=notificacoes">Gerenciar notificações</a></div>`;
}
$('#bellBtn').addEventListener('click', (e) => { const opened = togglePopover(e.currentTarget, $('#notifPanel')); if (opened) { paintNotifications(); $('#notifPanel .np-item, #notifPanel button')?.focus(); } });
$('#notifPanel').addEventListener('keydown', (e) => { const it = e.target.closest('.np-item'); if (it && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); it.click(); } });
ACTIONS['notif-read-all'] = () => { DB.notifications.forEach((n) => (n.read = true)); commit(); paintNotifications(); };
ACTIONS['notif-open'] = (b) => { const n = DB.notifications.find((x) => x.id === b.dataset.id); if (!n) return; n.read = true; commit(); closePopover(); paintNotifications(); if (n.link) go(n.link); };
function onNotification(n) {
  if (!READY) return;
  paintNotifications(); const b = $('#bellBtn'); b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring');
  if (n.type === 'stock' || n.type === 'goal') toast({ tone: n.type === 'goal' ? 'ok' : 'warn', title: n.title, text: n.body, timeout: 5200 });
}
function paintBadges() {
  const pend = DB.orders.filter((o) => o.status === 'pendente').length; const low = activeProducts().filter((p) => productLevel(p) !== 'ok').length;
  const bo = $('#badgeOrders'), bs = $('#badgeStock');
  bo.hidden = !pend; bo.textContent = pend; bo.setAttribute('aria-label', `${pend} pedidos pendentes`);
  bs.hidden = !low; bs.textContent = low; bs.setAttribute('aria-label', `${low} produtos com estoque baixo`);
}
function applyUIPrefs() {
  const u = DB.settings.ui;
  document.documentElement.classList.toggle('reduce-motion', !!u.reduceMotion);
  document.body.classList.toggle('compact', !!u.compact);
  setSidebar(!!u.sidebarExpanded && !isMobile(), false);
}
function paintToday() { const d = new Date(); const t = $('#today'); t.dateTime = dayKey(d); t.textContent = `${DOW[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`; }
matchMedia('(min-width: 1200px)').addEventListener('change', () => setSidebar($('#sidebar').classList.contains('expanded'), false));

/* ---------------------------------------------------------------- preloader e inicialização */
function boot() {
  const pre = $('#preloader'); const app = $('#app');
  let seen = false; try { seen = sessionStorage.getItem('vestora:boot') === '1'; } catch (_) { /* ok */ }
  try { const p = localStorage.getItem('vestora:period'); if (p && PERIODS[p]) UI.period = p; } catch (_) { /* ok */ }
  const finish = () => {
    app.classList.add('ready'); READY = true;
    if (pre) { pre.classList.add('done'); setTimeout(() => pre.remove(), 600); }
    try { sessionStorage.setItem('vestora:boot', '1'); } catch (_) { /* ok */ }
  };
  if (seen && pre) pre.remove();
  const t0 = performance.now(); const minDur = seen ? 0 : prefersReduced() ? 300 : 1500;
  const pctEl = $('#plPct'), bar = $('#plBar');
  let ready = false;
  const tick = (t) => {
    const k = Math.min(1, (t - t0) / Math.max(1, minDur)); const e = 1 - Math.pow(1 - k, 2.2);
    const shown = Math.round((ready ? e : Math.min(e, 0.9)) * 100);
    if (pctEl) { pctEl.textContent = shown + '%'; bar.style.transform = `scaleX(${shown / 100})`; }
    if (k >= 1 && ready) return finish();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  // dá um quadro para o preloader aparecer antes de gerar a base
  setTimeout(() => {
    const status = loadDB();
    applyUIPrefs(); paintProfile(); paintPeriod(); paintToday(); paintBadges();
    runScheduled(); paintNotifications();
    if (!location.hash) history.replaceState(null, '', '#/visao-geral');
    navigate(true).then(() => { ready = true; if (seen) finish(); });
    if (status === 'seeded') console.info('[Vestora] Base demonstrativa gerada:', { produtos: DB.products.length, clientes: DB.clients.length, pedidos: DB.orders.length, lancamentos: DB.ledger.length, movimentacoes: DB.moves.length });
  }, seen ? 0 : 40);
}
window.addEventListener('error', (e) => console.error('[Vestora]', e.message));
boot();

/* Acesso para inspeção no console do navegador (útil em apresentações técnicas) */
window.vestora = Object.freeze({
  get db() { return DB; }, kpis: (p = UI.period) => salesKPIs(rangeOf(p)), finance: (p = UI.period) => financeKPIs(rangeOf(p)),
  reset: () => ACTIONS.restore(), version: DATA_VERSION,
});

})();
