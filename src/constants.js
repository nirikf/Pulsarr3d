// ============================================
// CONSTANTS — все константы и настройки
// ============================================

export const TAU = Math.PI * 2;
export const STEP = 1 / 60;

// Палитра для спрайтов
export const PAL = {
  o: '#0a0518', d: '#150a2e', c: '#22e6ff', C: '#b8fbff',
  g: '#9dff3c', G: '#4d8f1e', w: '#d8d0f0', W: '#ffffff',
  m: '#ff2fb0', M: '#8f1a63', a: '#ffb020', A: '#8f5a10',
  r: '#ff4d4d', R: '#8f2020', v: '#a86bff', V: '#4f2a94',
  b: '#4d8cff', s: '#6b6a8a'
};

// Сложности
export const DIFF = {
  easy:   { n: 'СПОКОЙНО',  d: 'урон x0.65',     hp: 0.8,  sp: 0.9,  dmg: 0.65,  budget: 0.85, base: 130, mult: 0.8 },
  normal: { n: 'НОРМА',     d: 'честный баланс', hp: 1,    sp: 1,    dmg: 1,     budget: 1,    base: 100, mult: 1 },
  hard:   { n: 'ХАРДКОР',   d: 'счёт x1.5',      hp: 1.3,  sp: 1.12, dmg: 1.35,  budget: 1.25, base: 80,  mult: 1.5 }
};

// Модули прокачки
export const UPS = [
  { k: 'rate',   n: 'УСКОРИТЕЛЬ', d: '+18% темп огня',           cap: 5, col: '#22e6ff' },
  { k: 'cal',    n: 'КАЛИБР',     d: '+25% урон пули',           cap: 5, col: '#ffb020' },
  { k: 'fan',    n: 'ВЕЕР',       d: '+1 пуля в залпе',          cap: 3, col: '#9dff3c' },
  { k: 'pierce', n: 'ПРОБОЙ',     d: 'пуля шьёт +1 врага',       cap: 2, col: '#ff2fb0' },
  { k: 'speed',  n: 'ПРИВОД',     d: '+13% скорость хода',       cap: 4, col: '#4d8cff' },
  { k: 'armor',  n: 'БРОНЯ',      d: '+25 корпуса и лечение',    cap: 4, col: '#35f0a0' },
  { k: 'dash',   n: 'РЫВОК',      d: '-22% откат, таран сильнее', cap: 3, col: '#22e6ff' },
  { k: 'magnet', n: 'МАГНИТ',     d: '+70% радиус сбора ◆',      cap: 3, col: '#ff2fb0' },
  { k: 'vamp',   n: 'ВАМПИР',     d: '4% урона лечит корпус',    cap: 3, col: '#ff4d4d' },
  { k: 'drone',  n: 'СПУТНИК',    d: '+1 дрон стреляет сам',     cap: 2, col: '#9dff3c' },
  { k: 'regen',  n: 'РЕГЕН',      d: 'чинит корпус вне боя',     cap: 3, col: '#a86bff' }
];

// Иконки модулей (9x9 битмап)
export const ICON = {
  rate:   ['...ooo...', '..occo...', '.occo....', 'occccoo..', '.ooccco..', '...occo..', '..occo...', '..oco....', '..oo.....'],
  cal:    ['....x....', '....x....', '..xxxxx..', '.xx.w.xx.', 'xxxwwwxxx', '.xx.w.xx.', '..xxxxx..', '....x....', '....x....'],
  fan:    ['x...x...x', '.x..x..x.', '..x.x.x..', '...xxx...', '....x....', '....x....', '....x....', '....x....', '....x....'],
  pierce: ['.........', '..x...x..', '..x...x..', 'xxxxxxxxx', '..x...xxx', '..x...x..', '.........', '.........', '.........'],
  speed:  ['..x..x...', '.xx..xx..', 'xxx..xxx.', '.xx..xx..', '..x..x...', '.........', '..x..x...', '.xx..xx..', '.........'],
  armor:  ['.xxxxxxx.', 'xwwwwwwwx', 'xwxxxxxwx', 'xwxxxxxwx', 'xwxxxxxwx', '.xwxxxwx.', '..xwxwx..', '...xxx...', '....x....'],
  dash:   ['.........', '.x...x...', '.xx..xx..', '.xxx.xxx.', '.xx..xx..', '.x...x...', '.........', '........x', '.........'],
  magnet: ['.xx...xx.', 'xxx...xxx', 'x.x...x.x', 'x.x...x.x', 'x.xxxxx.x', '.xxxxxxx.', '..xxxxx..', '.........', '.........'],
  vamp:   ['....x....', '...xxx...', '..xxxxx..', '.xxxxxxx.', 'xxxwwwxxx', 'xxxwwwxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...'],
  drone:  ['..xxxxx..', '.x.....x.', 'x..www..x', 'x..www..x', 'x..www..x', '.x.....x.', '..xxxxx..', '.........', '.........'],
  regen:  ['.xx...xx.', 'xxxx.xxxx', 'xxxxxxxxx', 'xxxxxxxxx', '.xxxxxxx.', '..xxxxx..', '...xxx...', '....x....', '.........']
};

// Битмап шрифт 3x5
export const FONT = {
  '0': ['111', '101', '101', '101', '111'],
  '1': ['010', '110', '010', '010', '111'],
  '2': ['111', '001', '111', '100', '111'],
  '3': ['111', '001', '111', '001', '111'],
  '4': ['101', '101', '111', '001', '001'],
  '5': ['111', '100', '111', '001', '111'],
  '6': ['111', '100', '111', '101', '111'],
  '7': ['111', '001', '010', '010', '010'],
  '8': ['111', '101', '111', '101', '111'],
  '9': ['111', '101', '111', '001', '111'],
  '+': ['000', '010', '111', '010', '000'],
  '-': ['000', '000', '111', '000', '000'],
  'x': ['000', '101', '010', '101', '000'],
  '!': ['010', '010', '010', '000', '010']
};

// Хелперы (утилиты)
export function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randi(a, b) { return Math.floor(rand(a, b + 1)); }
export function pick(a) { return a[(Math.random() * a.length) | 0]; }
export function hyp(x, y) { return Math.sqrt(x * x + y * y); }
export function fmt(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
