// Panda stamp names — each of the 210 regular stamps and 35 special stamps
// gets a thematic Japanese name ending in "パンダ" so users can identify them
// in the gallery instead of just seeing a number.
//
// Regular stamps cover everyday emotions, hobbies, food, seasons and roles.
// Special stamps follow the costume themes documented in pandaStamps.ts.
//
// Lookup helpers below convert a sprint cell index to the correct name using
// the same mapping logic as getPandaImage / getSpecialPandaImage.

import { PANDA_SPECIALS, PANDA_STAMP_ORDER } from "./pandaStamps";

// Indexed 0..34, matches PANDA_SPECIALS order in pandaStamps.ts.
// Names verified against the actual sticker artwork in assets/images.
export const PANDA_SPECIAL_NAMES: string[] = [
  "王様パンダ",         // 0: panda-stamp-special.png — gold crown, face only
  "車掌さんパンダ",     // 1: special-2 — train conductor with lantern
  "騎士パンダ",         // 2: special-3 — knight with sword and shield
  "戴冠王パンダ",       // 3: special-4 — full king with robe, scepter, orb
  "お姫様パンダ",       // 4: special-5 — pink dress, tiara, bouquet
  "魔法使いパンダ",     // 5: special-6 — starry wizard hat, wand, spellbook
  "バイオリン奏者パンダ", // 6: special-7 — Mozart wig with violin
  "バレリーナパンダ",   // 7: special-8 — pink tutu, ballet shoes
  "オペラ歌手パンダ",   // 8: special-9 — Valkyrie horned-winged helmet, opera pose
  "サーカス団長パンダ", // 9: special-10 — red top hat, megaphone, baton
  "京劇パンダ",         // 10: special-11 — Peking opera headdress
  "アラビア商人パンダ", // 11: special-12 — turban, Aladdin lamp, money pouch
  "ファラオパンダ",     // 12: special-13 — Egyptian nemes headdress
  "マトリョーシカパンダ", // 13: special-14 — Russian doll dress
  "お医者さんパンダ",   // 14: special-15 — white coat, stethoscope, clipboard
  "仮面舞踏会パンダ",   // 15: special-16 — Venetian mask, fan, gown
  "画家パンダ",         // 16: special-17 — beret, palette, easel
  "時計職人パンダ",     // 17: special-18 — magnifying glass, pocket watch, gears
  "ローマ兵士パンダ",   // 18: special-19 — red plume helmet, eagle shield
  "ヴァイキングパンダ", // 19: special-20 — horned helmet, axe, runic shield
  "シェフパンダ",       // 20: special-21 — chef toque, wooden spoon, pot
  "フランス貴族パンダ", // 21: special-22 — white wig, ornate gold coat, fan
  "郵便屋さんパンダ",   // 22: special-23 — blue postal uniform, mail bag
  "灯台守パンダ",       // 23: special-24 — captain hat, lantern, lighthouse
  "探検家パンダ",       // 24: special-25 — aviator cap, map, compass
  "吟遊詩人パンダ",     // 25: special-26 — green hat with feather, lute
  "人形遣いパンダ",     // 26: special-27 — top hat, tuxedo, marionette
  "万博案内人パンダ",   // 27: special-28 — red guide uniform, flag, tickets
  "トルコ職人パンダ",   // 28: special-29 — fez, ornate vest, lantern, plate
  "スイス時計師パンダ", // 29: special-30 — Tirol hat, edelweiss, pocket watch, lederhosen
  "モンゴル騎手パンダ", // 30: special-31 — fur hat, bow and arrows, toy horse
  "フラダンサーパンダ", // 31: special-32 — flower lei, grass skirt
  "雪国郵便屋パンダ",   // 32: special-33 — red knit hat, winter coat, mailbag
  "西洋貴族パンダ",     // 33: special-34 — tricorn hat, ornate green coat, cane
  "執事パンダ",         // 34: special-35 — bowler hat, tuxedo, tea tray
];

// Keyed by stamp number 1..210 (matches PANDA_STAMPS keys in pandaStamps.ts).
export const PANDA_STAMP_NAMES: Record<number, string> = {
  // 1-15: emotions
  1: "笑顔パンダ",
  2: "泣き虫パンダ",
  3: "おこりんぼパンダ",
  4: "照れ屋パンダ",
  5: "びっくりパンダ",
  6: "ねぼすけパンダ",
  7: "元気パンダ",
  8: "おすましパンダ",
  9: "さみしがりパンダ",
  10: "はずかしがりパンダ",
  11: "ごきげんパンダ",
  12: "ぷんぷんパンダ",
  13: "しょんぼりパンダ",
  14: "きょとんパンダ",
  15: "ふくれっ面パンダ",
  // 16-45: daily life
  16: "朝寝坊パンダ",
  17: "歯みがきパンダ",
  18: "お風呂パンダ",
  19: "着替えパンダ",
  20: "朝ごはんパンダ",
  21: "通勤パンダ",
  22: "お昼寝パンダ",
  23: "おやつパンダ",
  24: "夕飯パンダ",
  25: "夜更かしパンダ",
  26: "読書パンダ",
  27: "テレビっ子パンダ",
  28: "お散歩パンダ",
  29: "お買い物パンダ",
  30: "おそうじパンダ",
  31: "お洗濯パンダ",
  32: "お料理パンダ",
  33: "お皿洗いパンダ",
  34: "歯医者さんパンダ",
  35: "美容院パンダ",
  36: "銀行パンダ",
  37: "郵便局パンダ",
  38: "病院パンダ",
  39: "スーパーパンダ",
  40: "コンビニパンダ",
  41: "カフェパンダ",
  42: "図書館パンダ",
  43: "公園パンダ",
  44: "駅パンダ",
  45: "バス停パンダ",
  // 46-85: hobbies
  46: "絵描きパンダ",
  47: "本好きパンダ",
  48: "料理上手パンダ",
  49: "音楽パンダ",
  50: "ピアノパンダ",
  51: "ギターパンダ",
  52: "歌うたいパンダ",
  53: "ダンスパンダ",
  54: "ヨガパンダ",
  55: "瞑想パンダ",
  56: "編み物パンダ",
  57: "釣り好きパンダ",
  58: "囲碁パンダ",
  59: "将棋パンダ",
  60: "チェスパンダ",
  61: "麻雀パンダ",
  62: "トランプパンダ",
  63: "パズルパンダ",
  64: "折り紙パンダ",
  65: "カメラパンダ",
  66: "旅行パンダ",
  67: "登山パンダ",
  68: "キャンプパンダ",
  69: "海釣りパンダ",
  70: "自転車パンダ",
  71: "ジョギングパンダ",
  72: "水泳パンダ",
  73: "テニスパンダ",
  74: "バスケパンダ",
  75: "サッカーパンダ",
  76: "野球パンダ",
  77: "卓球パンダ",
  78: "バドミントンパンダ",
  79: "スキーパンダ",
  80: "スケートパンダ",
  81: "スノボパンダ",
  82: "サーフィンパンダ",
  83: "ダイビングパンダ",
  84: "乗馬パンダ",
  85: "ボウリングパンダ",
  // 86-115: food
  86: "カレーパンダ",
  87: "ラーメンパンダ",
  88: "お寿司パンダ",
  89: "餃子パンダ",
  90: "焼肉パンダ",
  91: "お鍋パンダ",
  92: "天ぷらパンダ",
  93: "うどんパンダ",
  94: "そばパンダ",
  95: "パスタパンダ",
  96: "ピザパンダ",
  97: "ハンバーガーパンダ",
  98: "サンドイッチパンダ",
  99: "おにぎりパンダ",
  100: "パンケーキパンダ",
  101: "クレープパンダ",
  102: "ケーキパンダ",
  103: "アイスパンダ",
  104: "チョコパンダ",
  105: "クッキーパンダ",
  106: "プリンパンダ",
  107: "ドーナツパンダ",
  108: "わたあめパンダ",
  109: "かき氷パンダ",
  110: "タピオカパンダ",
  111: "コーヒーパンダ",
  112: "紅茶パンダ",
  113: "緑茶パンダ",
  114: "ジュースパンダ",
  115: "スムージーパンダ",
  // 116-131: seasons
  116: "春パンダ",
  117: "お花見パンダ",
  118: "桜パンダ",
  119: "新緑パンダ",
  120: "夏パンダ",
  121: "海パンダ",
  122: "プールパンダ",
  123: "花火パンダ",
  124: "秋パンダ",
  125: "もみじパンダ",
  126: "お月見パンダ",
  127: "焼き芋パンダ",
  128: "冬パンダ",
  129: "雪だるまパンダ",
  130: "こたつパンダ",
  131: "クリスマスパンダ",
  // 132-141: weather
  132: "晴れパンダ",
  133: "雨パンダ",
  134: "くもりパンダ",
  135: "風パンダ",
  136: "嵐パンダ",
  137: "虹パンダ",
  138: "朝焼けパンダ",
  139: "夕焼けパンダ",
  140: "星空パンダ",
  141: "満月パンダ",
  // 142-156: animals & nature
  142: "ちょうちょパンダ",
  143: "小鳥パンダ",
  144: "かえるパンダ",
  145: "金魚パンダ",
  146: "うさぎパンダ",
  147: "りすパンダ",
  148: "ハリネズミパンダ",
  149: "子ねこパンダ",
  150: "子いぬパンダ",
  151: "ひよこパンダ",
  152: "くまパンダ",
  153: "森パンダ",
  154: "川パンダ",
  155: "山パンダ",
  156: "お花畑パンダ",
  // 157-176: roles & work
  157: "学生パンダ",
  158: "先生パンダ",
  159: "警察官パンダ",
  160: "消防士パンダ",
  161: "看護師パンダ",
  162: "パン屋さんパンダ",
  163: "お花屋さんパンダ",
  164: "八百屋さんパンダ",
  165: "魚屋さんパンダ",
  166: "大工さんパンダ",
  167: "庭師パンダ",
  168: "探偵パンダ",
  169: "科学者パンダ",
  170: "数学者パンダ",
  171: "プログラマーパンダ",
  172: "デザイナーパンダ",
  173: "写真家パンダ",
  174: "作家パンダ",
  175: "詩人パンダ",
  176: "翻訳家パンダ",
  // 177-191: festivals & events
  177: "お誕生日パンダ",
  178: "お祝いパンダ",
  179: "結婚式パンダ",
  180: "卒業パンダ",
  181: "入学パンダ",
  182: "引っ越しパンダ",
  183: "旅立ちパンダ",
  184: "帰省パンダ",
  185: "お正月パンダ",
  186: "節分パンダ",
  187: "ひな祭りパンダ",
  188: "七夕パンダ",
  189: "ハロウィンパンダ",
  190: "バレンタインパンダ",
  191: "パーティーパンダ",
  // 192-206: communications & entertainment
  192: "おしゃべりパンダ",
  193: "お手紙パンダ",
  194: "電話パンダ",
  195: "メールパンダ",
  196: "写真パンダ",
  197: "自撮りパンダ",
  198: "配信パンダ",
  199: "ゲームパンダ",
  200: "アニメパンダ",
  201: "映画パンダ",
  202: "ライブパンダ",
  203: "観劇パンダ",
  204: "美術館パンダ",
  205: "神社参りパンダ",
  206: "お祭りパンダ",
  // 207-210: personalities
  207: "のんびりパンダ",
  208: "せっかちパンダ",
  209: "几帳面パンダ",
  210: "大胆パンダ",
};

// Returns the regular panda name for a given stamp number (1..210).
// Falls back to "パンダ" for unknown numbers.
export function getPandaStampName(stampNumber: number): string {
  return PANDA_STAMP_NAMES[stampNumber] ?? "パンダ";
}

// Returns the special panda name for a given index into PANDA_SPECIALS (0..34).
export function getSpecialPandaNameByIndex(index: number): string {
  const len = PANDA_SPECIAL_NAMES.length;
  if (!Number.isFinite(index) || index < 0) return PANDA_SPECIAL_NAMES[0];
  return PANDA_SPECIAL_NAMES[((index % len) + len) % len];
}

// Returns the panda name for a given sprint cell index, mirroring the
// mapping in getPandaImage / getSpecialPandaImage.
export function getPandaName(cellIndex: number, isSpecial: boolean): string {
  if (isSpecial) {
    const len = PANDA_SPECIALS.length;
    if (!Number.isFinite(cellIndex) || cellIndex < 1) return PANDA_SPECIAL_NAMES[0];
    const i = (((cellIndex - 1) % len) + len) % len;
    return PANDA_SPECIAL_NAMES[i] ?? "スペシャルパンダ";
  }
  const orderLen = PANDA_STAMP_ORDER.length;
  if (!Number.isFinite(cellIndex) || cellIndex < 1) return getPandaStampName(PANDA_STAMP_ORDER[0]);
  const i = (((cellIndex - 1) % orderLen) + orderLen) % orderLen;
  return getPandaStampName(PANDA_STAMP_ORDER[i]);
}
