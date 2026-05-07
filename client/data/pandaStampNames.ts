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
  // 121-190: artwork-verified individual scenes (rewritten from theme groups
  // to match what the actual sticker shows — see assets/images/panda-stamp-N.png)
  121: "クレヨン泣きべそパンダ",
  122: "バースデーロウソクパンダ",
  123: "夜空お願いパンダ",
  124: "釣れない泣きパンダ",
  125: "書類山積みパンダ",
  126: "電車間に合えパンダ",
  127: "汗だく走りパンダ",
  128: "ブランコひとりパンダ",
  129: "ポスト投函パンダ",
  130: "小鳥に手振りパンダ",
  131: "シロップパンケーキパンダ",
  132: "ホットコーヒーパンダ",
  133: "竹に抱きつき夢パンダ",
  134: "鼻歌皿洗いパンダ",
  135: "泡風呂アヒルパンダ",
  136: "ランタン読書パンダ",
  137: "布団ダイブパンダ",
  138: "ポップコーン映画パンダ",
  139: "ゲーム熱中パンダ",
  140: "感動の涙パンダ",
  141: "キャンバスお絵描きパンダ",
  142: "野菜炒めパンダ",
  143: "ラーメンすすりパンダ",
  144: "たこ焼きパンダ",
  145: "シロップかき氷パンダ",
  146: "アイスコーンパンダ",
  147: "熱いお茶ふーふーパンダ",
  148: "メロンソーダパンダ",
  149: "ピザ一切れパンダ",
  150: "火鍋パンダ",
  151: "浮き輪プールパンダ",
  152: "砂のお城パンダ",
  153: "元気ジャンプパンダ",
  154: "マラソン給水パンダ",
  155: "サイクリングパンダ",
  156: "スケボーパンダ",
  157: "ラケット振りパンダ",
  158: "焚き火マシュマロパンダ",
  159: "テント探検パンダ",
  160: "星空寝転びパンダ",
  161: "スキー滑走パンダ",
  162: "雪玉ころころパンダ",
  163: "雪合戦パンダ",
  164: "そり滑りパンダ",
  165: "落ち葉ジャンプパンダ",
  166: "貝がら拾いパンダ",
  167: "波しぶきびっくりパンダ",
  168: "うつ伏せお昼寝パンダ",
  169: "苗植えパンダ",
  170: "水やりパンダ",
  171: "モップ掃除パンダ",
  172: "子パンダお世話パンダ",
  173: "子猫なでなでパンダ",
  174: "犬の散歩パンダ",
  175: "うさぎ抱っこパンダ",
  176: "小鳥なつくパンダ",
  177: "金魚のぞきパンダ",
  178: "本の山読書パンダ",
  179: "蓮の花瞑想パンダ",
  180: "自撮りカメラパンダ",
  181: "ランドセル通学パンダ",
  182: "カエル相合傘パンダ",
  183: "浴衣花火パンダ",
  184: "スイカ割りパンダ",
  185: "紅葉ながめパンダ",
  186: "きのこ狩りパンダ",
  187: "雪だるま作りパンダ",
  188: "餅つきパンダ",
  189: "福豆まきパンダ",
  190: "ハート抱っこパンダ",
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
