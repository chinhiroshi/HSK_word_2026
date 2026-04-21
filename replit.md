# 中国語マスター (Chinese Master)

## Overview
A mobile vocabulary learning app for Chinese language study. Users can browse Chinese words, listen to pronunciations, track memorization progress, and take shuffle tests to reinforce learning.

## Features
- **Study Screen (文字暗記)**: Browse Chinese vocabulary in 50-word groups
  - Group cards show memorized/unmemorized counts
  - Click group to view word list
  - Each word card shows: Chinese word, example sentence, TTS button
  - Filter by: All / Memorized / Unmemorized (marked)
  - Mark words with flag (unmemorized) or check (memorized) buttons
  - Uses text memorization tracking (textMemorized, textUnmemorizedCount)
- **Audio Learning (音声暗記)**: 50-word groups like Study but with hidden Chinese characters
  - Group cards showing audio memorization progress
  - Eye icon in header toggles visibility for all cards in group
  - Tap card to reveal Chinese word and example sentence
  - Audio-first learning approach with separate tracking
  - Uses audio memorization tracking (audioMemorized, audioUnmemorizedCount)
- **Audio Playback**: Continuous vocabulary audio playback
  - Sequence: Chinese 1x → Japanese 1x → Chinese example 2x → Japanese example 1x → Chinese example 2x → English 1x
  - Filter for unmemorized words only
  - Set start AND end position for playback range
  - Free users limited to first 50 words (except HSK1 which is fully free); premium banner links to Paywall
- **Subscription (Freemium Model)**:
  - HSK1 is completely free (all groups accessible)
  - HSK2-6: First 50 words per level are free (Group 1), Groups 2+ require ¥380/month subscription
  - Locked groups show lock icon + "プレミアムで解放" text
  - Tapping locked group opens Paywall modal
  - SubscriptionContext manages state via RevenueCat SDK (react-native-purchases)
  - RevenueCat handles purchase, restore, and entitlement checking ("premium" entitlement)
  - API key passed via app.config.js extra → Constants.expoConfig.extra.revenueCatApiKey
  - On web: RevenueCat runs in Preview API Mode (limited functionality expected)
  - On iOS/Android via Expo Go: Full RevenueCat Preview API Mode with mock purchases
  - PaywallScreen shows real pricing from RevenueCat offerings, with loading states
  - ProfileScreen shows premium upgrade card or active subscription badge
- **Onboarding Tutorial Sprint**: After initial onboarding (intro pages + HSK level select), new users are routed to SprintSetup → a 3-word TutorialSprintScreen → "はじめての一歩" panda stamp reward modal → main Sprint screen.
  - Storage flags: `@chinese_master_tutorial_sprint_done`, `@chinese_master_tutorial_stamp_earned`
  - Existing-user protection: on app launch, if onboarding is already complete, tutorial is auto-marked done so existing users never see it
  - Tutorial uses first 3 words of selected HSK level; does NOT modify SprintData or word memorization state
  - Routes via `SprintSetup` with `fromOnboarding: true` param → `navigation.replace("TutorialSprint")` after setup
  - TutorialSprint stamp uses `panda-stamp-1.png` and is independent of `specialStamps` array
- **Sprint (スプリント)**: Stamp-rally style 7-day learning cycle with snake grid map
  - 29-cell snake grid (4 columns) showing learning progress as a map
  - Setup: Choose daily study time (15/30/45 min or custom) to determine words/day
  - 7-day cycle: Day 1,2 = study; Day 3 = review; Day 4,5 = study; Day 6 = review; Day 7 = test
  - Study session: Show word cards, mark as memorized/unmemorized
  - Test session: Multiple-choice quiz; ≥70% correct = clear + special stamp
  - Skip: If ≥70% of session words already labeled, user can skip with auto-stamp
  - Streak tracking across days; special stamp for Day 7 test clear
  - SprintContext manages state; stored at `@chinese_master_sprint`
- **Word Detail**: View word details with example sentences, English translations, and part of speech (品詞)
- **Profile**: Track learning progress with separate statistics
  - HSK級セレクター (1〜6級): 学習する単語レベルを切り替え
  - 各級の進捗は独立して管理される
  - 文字暗記 section: 暗記済み / 暗記必要 / 未暗記 counts
  - 音声暗記 section: 暗記済み / 暗記必要 / 未暗記 counts
  - Reset functionality for all data
- **Text-to-Speech**: Native Chinese pronunciation for all words and sentences

## Tech Stack
- **Frontend**: React Native with Expo
- **Backend**: Express.js (minimal, for static serving)
- **Storage**: AsyncStorage for local data persistence
- **Subscription**: RevenueCat (react-native-purchases) for in-app purchases
- **TTS**: expo-speech for Chinese pronunciation
- **Fonts**: Nunito (Google Fonts)
- **Icons**: Feather Icons (@expo/vector-icons)

## Project Structure
```
client/
├── App.tsx              # Root component with providers
├── components/          # Reusable UI components
│   ├── WordCard.tsx     # Word list item with speak button
│   ├── SpeakButton.tsx  # Text-to-speech trigger
│   ├── VideoThumbnail.tsx
│   ├── EmptyState.tsx
│   ├── ProgressBar.tsx
│   └── ...
├── screens/             # Screen components
│   ├── StudyScreen.tsx  # Word list with filtering
│   ├── WordDetailScreen.tsx # Single word view
│   ├── TestSelectScreen.tsx # Test type selection
│   ├── TestScreen.tsx   # Quiz interface
│   ├── VideosScreen.tsx # Video gallery
│   └── ProfileScreen.tsx # Stats and settings
├── navigation/          # React Navigation setup
│   ├── RootStackNavigator.tsx
│   ├── MainTabNavigator.tsx
│   └── [Stack navigators for each tab]
├── lib/                 # Utility functions
│   ├── storage.ts       # AsyncStorage operations
│   ├── speech.ts        # TTS wrapper
│   └── testUtils.ts     # Quiz generation
├── data/
│   └── mockData.ts      # Sample Chinese vocabulary
├── types/
│   └── index.ts         # TypeScript interfaces
└── constants/
    └── theme.ts         # Colors, spacing, typography

server/
├── index.ts             # Express server
└── routes.ts            # API routes (minimal)
```

## Navigation Structure
- **5 Bottom Tabs**: 文字学習, 音声学習, 音声再生, スプリント, プロフィール
- **Stack Screens**: WordDetail, WordList (from Study), AudioWordList (from Audio Learning), SprintSetup, SprintStudySession, SprintTest (from Sprint)

## Color Palette
- Primary: #5B8C85 (Calming teal)
- Secondary: #E8956F (Warm coral)
- Success: #10B981 (Green - memorized)
- Alert: #F59E0B (Amber - not memorized)
- Background: #FAFAF9 (Light), #111827 (Dark)

## Data Model
```typescript
type HskLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface Word {
  id: string;
  hskLevel: HskLevel;       // HSK level (1-6)
  word: string;              // Chinese characters
  pinyin: string;            // Romanization
  translation: string;       // Japanese meaning
  translationEn?: string;    // English meaning
  posJa?: string;            // Part of speech (Japanese, e.g. 動詞)
  posEn?: string;            // Part of speech (English, e.g. verb)
  exampleSentence: string;
  examplePinyin: string;
  exampleTranslation: string;
  exampleEnglish?: string;   // English example translation
  longExample?: string;      // Extended example sentence (Chinese)
  longExampleTranslation?: string; // Extended example translation (Japanese)
  longExampleEnglish?: string;     // Extended example translation (English)
  // Dual memorization tracking
  textMemorized: boolean;         // Text memorization status
  textUnmemorizedCount: number;   // Text "needs work" counter
  audioMemorized: boolean;        // Audio memorization status
  audioUnmemorizedCount: number;  // Audio "needs work" counter
  // Legacy fields (kept for compatibility)
  isMemorized: boolean;
  unmemorizedCount: number;
  videoIds: string[];
}
```

## Workflows
- `Start Backend`: Runs Express server on port 5000
- `Start Frontend`: Runs Expo dev server on port 8081

## Development Notes
- Text-to-speech uses `zh-CN` locale for Mandarin Chinese
- Data persisted in AsyncStorage with `@chinese_master_` prefix, version "10"
- Per-level storage: `@chinese_master_words_hsk{N}` for each level, `@chinese_master_hsk_level` for selected level
- All HSK levels have data: HSK1 (150), HSK2 (150), HSK3 (300), HSK4 (600), HSK5 (1300), HSK6 (2500)
- All HSK words include longExample and longExampleTranslation fields for extended example sentences
- Dual memorization system: text (文字暗記) and audio (音声暗記) tracked separately
- Three states per type: 暗記済み (memorized), 暗記必要 (needs work), 未暗記 (not started)
- Mark logic accepts "text" or "audio" type parameter for storage functions
- Audio playback sequence includes example sentences for reinforcement
- Haptic feedback on key interactions
