# 中国語マスター (Chinese Master)

## Overview
中国語マスター is a mobile vocabulary learning application designed to help users master Chinese words. It features intuitive browsing of vocabulary, audio pronunciations, progress tracking, and interactive shuffle tests. The app aims to provide a comprehensive and engaging platform for Chinese language learners, from beginners to advanced students. It operates on a freemium model, offering HSK1 content fully free and gating advanced features for HSK2-6 behind a subscription, making it accessible while providing premium content.

## User Preferences
I want iterative development. Ask before making major changes. I prefer clear and concise explanations.

## System Architecture
The application is built with React Native and Expo, utilizing a minimal Express.js backend for static serving. Data persistence is handled locally using AsyncStorage. The UI/UX features a calming teal primary color and warm coral secondary color, with distinct success and alert indicators.

Key architectural decisions include:
- **Dual Memorization Tracking**: Separate tracking for text-based and audio-based memorization allows for varied learning styles.
- **Freemium Model Integration**: Subscription management is handled via RevenueCat, offering HSK1 for free and gating advanced features like detailed examples, full audio playback, and advanced tests for higher HSK levels.
- **Dynamic Content Delivery**: Word data is categorized by HSK level (1-6), with varying word counts.
- **Notification System**: Two distinct reminder types (study and sprint) are managed, with user-configurable timings and personalized messages.
- **Sprint Learning Cycle**: A 7-day, 29-cell snake grid map guides users through a structured learning path involving study, review, and test sessions, culminating in special stamp rewards.
- **Panda Stamp Library**: 210 regular panda stamps (panda-stamp-1.png … panda-stamp-210.png) covering emotions (joy, anger, sadness) and fun daily-life scenes, cycled deterministically via `getPandaImage(cellIndex, false)`. 35 special costume-themed stamps (panda-stamp-special.png … panda-stamp-special-35.png) awarded on test clears, cycled via `getSpecialPandaImage(cellIndex)`. Both helpers live in `client/data/pandaStamps.ts`.
- **Social Sharing**: Integration with `react-native-view-shot` and `expo-sharing` allows users to share their achievements (panda stamps, progress, quotes) as PNG images.
- **Onboarding and Tutorial**: A guided onboarding process includes an introductory tutorial sprint for new users, ensuring a smooth start.
- **Text-to-Speech (TTS)**: `expo-speech` is used for native Chinese pronunciation of words and example sentences.

## OTA (Over-The-Air) Updates
EAS Updateによるアプリ内自動更新が有効。
- **EAS Project ID**: `871e0fc5-7b8c-4679-9141-2cdf27cbada4`
- **Update URL**: `https://u.expo.dev/871e0fc5-7b8c-4679-9141-2cdf27cbada4`
- **Runtime Version Policy**: `appVersion`（アプリバージョンごとにOTA更新を管理）
- **Channel**: `production`（本番ビルド向け）
- **配信コマンド**: `npx eas-cli update --branch production --message "説明文"`
- アプリ起動時に自動チェック → 更新があれば即ダウンロード＆再起動（`__DEV__`モードでは無効）

## External Dependencies
- **RevenueCat (react-native-purchases)**: For in-app purchase and subscription management.
- **AsyncStorage**: Local data persistence.
- **Expo**: Core framework for React Native development, including `expo-speech` for TTS.
- **Feather Icons (@expo/vector-icons)**: For UI iconography.
- **Google Fonts (Nunito)**: For consistent typography.