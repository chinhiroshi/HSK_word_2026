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
  // 1-120: artwork-verified individual scenes (matches assets/images/panda-stamp-N.png)
  1: "キラキラ笑顔パンダ",
  2: "竹もぐもぐ眠りパンダ",
  3: "びっくり口開けパンダ",
  4: "メガネ博士パンダ",
  5: "ヘッドホン音楽パンダ",
  6: "照れ赤面パンダ",
  7: "バンザイ歓喜パンダ",
  8: "もじもじはずかしパンダ",
  9: "ハート目こいパンダ",
  10: "ふくれ不機嫌パンダ",
  11: "音符ダンスパンダ",
  12: "目つむり大喜びパンダ",
  13: "バスケユニフォームパンダ",
  14: "ハチマキ瞑想パンダ",
  15: "ゴーグル水泳パンダ",
  16: "テニスラケットパンダ",
  17: "ヘルメット自転車パンダ",
  18: "赤道着カンフーパンダ",
  19: "赤マフラースケートパンダ",
  20: "赤シャツサッカーパンダ",
  21: "リュック登山パンダ",
  22: "リボン新体操パンダ",
  23: "ラーメン丼パンダ",
  24: "巻き寿司パンダ",
  25: "竹もぐもぐお座りパンダ",
  26: "コック帽ケーキパンダ",
  27: "ソフトクリームパンダ",
  28: "タピオカドリンクパンダ",
  29: "小籠包パンダ",
  30: "中華鍋炒めパンダ",
  31: "イチゴ抱っこパンダ",
  32: "虹色キャンディーパンダ",
  33: "桜花冠パンダ",
  34: "麦わら砂遊びパンダ",
  35: "紅葉舞いパンダ",
  36: "雪だるまパンダ",
  37: "花壇水やりパンダ",
  38: "虹空お祝いパンダ",
  39: "星空寝そべりパンダ",
  40: "蝶々追いかけパンダ",
  41: "ひまわり畑パンダ",
  42: "水玉傘長靴パンダ",
  43: "宇宙飛行士パンダ",
  44: "料理長スプーンパンダ",
  45: "忍者パンダ",
  46: "お医者さんごっこパンダ",
  47: "星柄魔法使いパンダ",
  48: "ヒーローマントパンダ",
  49: "花冠妖精パンダ",
  50: "海賊宝の地図パンダ",
  51: "侍鎧パンダ",
  52: "画家パレットパンダ",
  53: "星キラキラ歓喜パンダ",
  54: "竹の夢パンダ",
  55: "びっくり大口開けパンダ",
  56: "笑い転げ涙パンダ",
  57: "考え事吹き出しパンダ",
  58: "ウインクグッジョブパンダ",
  59: "投げキッスパンダ",
  60: "紙吹雪パーティーパンダ",
  61: "竹ジャンプパンダ",
  62: "赤りんごパンダ",
  63: "バースデーケーキパンダ",
  64: "プレゼント開封パンダ",
  65: "花びらお座りパンダ",
  66: "表彰状パンダ",
  67: "虹空みあげパンダ",
  68: "風船束パンダ",
  69: "シャボン玉吹きパンダ",
  70: "まんまるお座りパンダ",
  71: "宝箱コインパンダ",
  72: "三輪車パンダ",
  73: "金魚鉢パンダ",
  74: "お花畑スキップパンダ",
  75: "パーティーハット紙吹雪パンダ",
  76: "サッカードリブルパンダ",
  77: "手紙涙パンダ",
  78: "星空お昼寝パンダ",
  79: "浴衣扇子パンダ",
  80: "月見お座りパンダ",
  81: "朝陽バンザイパンダ",
  82: "トランポリンパンダ",
  83: "風車おもちゃパンダ",
  84: "合掌お祈りパンダ",
  85: "桃ハグパンダ",
  86: "綱渡りパンダ",
  87: "ハートジャンプパンダ",
  88: "トロフィーパンダ",
  89: "サムズアップパンダ",
  90: "ひまわり花束パンダ",
  91: "プンプン腕組みパンダ",
  92: "寝坊目覚ましパンダ",
  93: "渋滞ハンドルパンダ",
  94: "ゲーム苦戦パンダ",
  95: "冷や汗ぽたぽたパンダ",
  96: "辛いお菓子パンダ",
  97: "スマホ涙パンダ",
  98: "積み木崩壊パンダ",
  99: "不在通知パンダ",
  100: "勉強疲れパンダ",
  101: "頭抱え汗パンダ",
  102: "洗濯物山パンダ",
  103: "胸ドキドキパンダ",
  104: "うつ伏せダウンパンダ",
  105: "泥んこお座りパンダ",
  106: "電車駆け込みパンダ",
  107: "ゴミ袋パンダ",
  108: "試験用紙パンダ",
  109: "鏡のイケメンパンダ",
  110: "転びかけパンダ",
  111: "雨宿りお座りパンダ",
  112: "涙ひとしずくパンダ",
  113: "割れたクッキーパンダ",
  114: "はてな疑問パンダ",
  115: "バイバイ引っ越しパンダ",
  116: "枯れ野菜水やりパンダ",
  117: "空っぽ弁当パンダ",
  118: "雨傘お散歩パンダ",
  119: "落ち葉お座りパンダ",
  120: "ノート涙パンダ",
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
  // 191-210: artwork-verified seasonal events & milestones
  191: "雛祭り着物パンダ",
  192: "お花見弁当パンダ",
  193: "兜こいのぼりパンダ",
  194: "七夕短冊パンダ",
  195: "月見団子パンダ",
  196: "ハロウィン魔女パンダ",
  197: "お茶会パンダ",
  198: "クリスマスサンタパンダ",
  199: "年越しそばパンダ",
  200: "初日の出合掌パンダ",
  201: "マラソン走者パンダ",
  202: "かくれんぼパンダ",
  203: "ピクニック弁当パンダ",
  204: "キャンプ焚き火パンダ",
  205: "卒業証書パンダ",
  206: "花束お祝いパンダ",
  207: "赤ちゃんパンダ抱っこパンダ",
  208: "紋付き袴パンダ",
  209: "大花束プレゼントパンダ",
  210: "世界旅行パンダ",
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
