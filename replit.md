# 中国語マスター (Chinese Master)

## Overview
A mobile vocabulary learning app for Chinese language study. Users can browse Chinese words, listen to pronunciations, track memorization progress, and take shuffle tests to reinforce learning.

## Features
- **Study Screen**: Browse Chinese vocabulary in 50-word groups
  - Group cards show memorized/unmemorized counts
  - Click group to view word list
  - Each word card shows: Chinese word, example sentence, TTS button
  - Filter by: All / Memorized / Unmemorized (marked)
  - Mark words with flag (unmemorized) or check (memorized) buttons
- **Audio Learning**: Same as Study but Chinese characters hidden
  - Tap card to reveal Chinese word and example sentence
  - Audio-first learning approach
- **Audio Playback**: Continuous vocabulary audio playback
  - Sequence: Chinese 1x → Japanese 1x → Chinese 3x → English 1x
  - Filter for unmemorized words only
  - Set starting position for playback
- **Word Detail**: View word details with example sentences
- **Profile**: Track learning progress with statistics and reset functionality
- **Text-to-Speech**: Native Chinese pronunciation for all words and sentences

## Tech Stack
- **Frontend**: React Native with Expo
- **Backend**: Express.js (minimal, for static serving)
- **Storage**: AsyncStorage for local data persistence
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
- **4 Bottom Tabs**: 学習, 音声学習, 音声再生, プロフィール
- **Stack Screens**: WordDetail, WordList (pushed from Study tab)

## Color Palette
- Primary: #5B8C85 (Calming teal)
- Secondary: #E8956F (Warm coral)
- Success: #10B981 (Green - memorized)
- Alert: #F59E0B (Amber - not memorized)
- Background: #FAFAF9 (Light), #111827 (Dark)

## Data Model
```typescript
interface Word {
  id: string;
  word: string;          // Chinese characters
  pinyin: string;        // Romanization
  translation: string;   // Japanese meaning
  exampleSentence: string;
  examplePinyin: string;
  exampleTranslation: string;
  isMemorized: boolean;
  unmemorizedCount: number;  // Track how many times marked as unmemorized
  videoIds: string[];
}
```

## Workflows
- `Start Backend`: Runs Express server on port 5000
- `Start Frontend`: Runs Expo dev server on port 8081

## Development Notes
- Text-to-speech uses `zh-CN` locale for Mandarin Chinese
- Data persisted in AsyncStorage with `@chinese_master_` prefix, version "3"
- Test questions generated from unmemorized words only
- Haptic feedback on key interactions
- Mark logic: Flag button marks word as "not memorized" (increments count)
- Clearing mark sets isMemorized=true and unmemorizedCount=0
