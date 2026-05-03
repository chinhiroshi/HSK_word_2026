# 中国語マスター (Chinese Master)

## Overview
中国語マスター is a mobile vocabulary learning application designed to help users master Chinese words. It features intuitive browsing of vocabulary, audio pronunciations, progress tracking, and interactive shuffle tests. The app aims to provide a comprehensive and engaging platform for Chinese language learners, from beginners to advanced students. It operates on a freemium model, offering HSK1 content fully free and gating advanced features for HSK2-6 behind a subscription, making it accessible while providing premium content.

## User Preferences
I want iterative development. Ask before making major changes. I prefer clear and concise explanations.

## System Architecture
The application is built with React Native and Expo, utilizing a minimal Express.js backend for static serving. Data persistence is handled locally using AsyncStorage. The UI/UX features a calming teal primary color and warm coral secondary color, with distinct success and alert indicators.

Key architectural decisions include:
- **Dual Memorization Tracking**: Separate tracking for text-based and audio-based memorization allows for varied learning styles.
- **Freemium Model Integration**: Subscription management is handled via RevenueCat, offering HSK1 for free and gating advanced features like detailed examples, full audio playback, and advanced tests for higher HSK levels. The RevenueCat API key auto-switches based on environment: Expo Go uses the test key (`test_...`) so the SDK initializes in Test Store mode without errors, while EAS production builds use the real Apple key. Detection is via `Constants.appOwnership === "expo"` in `client/contexts/SubscriptionContext.tsx`.
- **Dynamic Content Delivery**: Word data is categorized by HSK level (1-6), with varying word counts.
- **Notification System**: Two distinct reminder types (study and sprint) are managed, with user-configurable timings and personalized messages.
- **Sprint Learning Cycle**: A 7-day, 29-cell snake grid map guides users through a structured learning path involving study, review, and test sessions, culminating in special stamp rewards.
- **Panda Stamp Library**: 210 regular panda stamps (panda-stamp-1.png … panda-stamp-210.png) covering emotions (joy, anger, sadness) and fun daily-life scenes, cycled deterministically via `getPandaImage(cellIndex, false)`. 35 special costume-themed stamps (panda-stamp-special.png … panda-stamp-special-35.png) awarded on test clears, cycled via `getSpecialPandaImage(cellIndex)`. Both helpers live in `client/data/pandaStamps.ts`.
- **Social Sharing**: Integration with `react-native-view-shot` and `expo-sharing` allows users to share their achievements (panda stamps, progress, quotes) as PNG images. The shared card includes the App Store link (placeholder defined in `client/constants/links.ts` as `APP_STORE_URL` — must be updated with the real Apple App ID before launch). Comment input uses `KeyboardAwareScrollViewCompat` so the share button stays visible above the keyboard.
- **Onboarding and Tutorial**: A guided onboarding process includes an introductory tutorial sprint for new users, ensuring a smooth start.
- **Text-to-Speech (TTS)**: `expo-speech` is used for native Chinese pronunciation of words and example sentences.
- **Analytics (PostHog)**: `posthog-react-native` is initialized in `client/lib/analytics.ts` using `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`). An anonymous UUID `distinctId` is generated per device and stored in AsyncStorage (`@chinese_master_analytics_distinct_id_v1`); no user PII is collected. Consent state (`unknown` | `granted` | `denied`) is persisted under `@chinese_master_analytics_consent_v1` and defaults to opt-out — `capture()`/`captureScreen()` no-op until the user grants consent. A consent dialog (`AnalyticsConsentDialog` in `client/App.tsx`) is shown after onboarding completes (1.2 s delay) or on next launch for existing users with no decision yet. Events fired before the consent decision (e.g. `onboarding_completed`) are queued in memory and flushed on grant, or dropped on deny. A toggle in `ProfileScreen` lets users opt in or out at any time. Screen views are auto-tracked via `NavigationContainer.onReady` + `onStateChange` using the current route name. Custom learning events captured: `word_marked_memorized`, `word_marked_unmemorized`, `sprint_test_answer` (with `hsk_level` + `correct`), `sprint_test_completed` (with `hsk_level`, `accuracy`, `percentage`, `passed`), `quiz_answer`, `speak_button_pressed`, `audio_play` (from both `AudioPlaybackScreen` and `SprintAudioPlaybackScreen`), `onboarding_completed`, `paywall_shown`, `subscription_started`. Session replay is disabled (`enableSessionReplay: false`); IDFA is not collected since no native IDFA module is bundled, so no iOS App Tracking Transparency prompt is required.

### Analytics setup
Register the PostHog credentials as secrets / environment variables before deployment:

- `EXPO_PUBLIC_POSTHOG_API_KEY` — your PostHog project API key (required to enable analytics; without it, the SDK is not initialized and the consent dialog is suppressed).
- `EXPO_PUBLIC_POSTHOG_HOST` — optional; defaults to `https://us.i.posthog.com`. Set to `https://eu.i.posthog.com` for the EU cloud, or your self-hosted host.

Both must be exposed at build time via the `EXPO_PUBLIC_` prefix so they're inlined into the JS bundle. They can also be supplied through `app.json`'s `expo.extra.posthogApiKey` / `expo.extra.posthogHost`.

## External Dependencies
- **RevenueCat (react-native-purchases)**: For in-app purchase and subscription management.
- **AsyncStorage**: Local data persistence.
- **Expo**: Core framework for React Native development, including `expo-speech` for TTS.
- **Feather Icons (@expo/vector-icons)**: For UI iconography.
- **Google Fonts (Nunito)**: For consistent typography.