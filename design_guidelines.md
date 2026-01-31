# Chinese Language Learning App Design Guidelines

## 1. Brand Identity

**Purpose**: A focused Chinese vocabulary learning app that helps users track memorization progress through word lists, example sentences, audio pronunciation, and interactive tests.

**Aesthetic Direction**: **Soft/Calming with Educational Clarity**
- Clean typographic hierarchy inspired by language learning apps
- Gentle color palette to reduce study fatigue
- Spacious layouts that don't overwhelm
- Memorable element: Text-to-speech buttons with pulse animation when speaking

**Personality**: Patient teacher - encouraging, clear, and distraction-free.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (4 tabs)
- **学習** (Study) - Main word list with memorization tracking
- **テスト** (Test) - Shuffle quiz modes for unmemorized words
- **動画** (Videos) - Browse all video content by word
- **プロフィール** (Profile) - User progress, settings, preferences

All screens use stack navigation within their tabs.

## 3. Screen Specifications

### Study Screen (学習 Tab)
**Purpose**: View Chinese word list and mark memorization status

**Layout**:
- Transparent header with app logo and title
- Scrollable list of word cards
- Floating action button for practice mode toggle

**Components**:
- Word cards showing: Chinese characters (large), pinyin, Japanese translation
- Each card has: checkbox (left), speak button (teal), video count badge, chevron
- Tap card to navigate to Word Detail screen
- FAB toggles between all words / unmemorized only

### Word Detail Screen (Modal)
**Purpose**: View single word with pronunciation and example sentence

**Components**:
- Word section: Large Chinese characters, speak button, pinyin, translation, status badge
- Example section: Sentence with pinyin, translation, speak button
- Video section: Horizontal scrolling thumbnails
- Toggle button: "暗記済みにする" / "未暗記に戻す"

### Test Select Screen (テスト Tab)
**Purpose**: Choose test type for unmemorized words

**Components**:
- Header with title and description
- Unmemorized count badge
- Two test option cards:
  - 単語テスト (Word Test) - See word, choose meaning
  - 例文リスニングテスト (Sentence Test) - Hear sentence, choose meaning

### Test Screen (Quiz)
**Purpose**: Interactive quiz with immediate feedback

**Components**:
- Progress bar showing question count
- Question area: Chinese word or sentence with speak button
- Four multiple choice options
- Immediate feedback: green checkmark or red X
- Next button / results screen

### Profile Screen (プロフィール Tab)
**Purpose**: View progress statistics and app settings

**Components**:
- User avatar and display name
- Progress card: bar, percentage, total/memorized/unmemorized counts
- Future features section with icons
- Reset progress button

## 4. Color Palette

**Primary**: `#5B8C85` (Calming teal - trust, focus, growth)
**Secondary**: `#E8956F` (Warm coral accent - encouragement)
**Background Light**: `#FAFAF9` (Soft warm white)
**Background Dark**: `#111827` (Deep navy)
**Surface**: `#FFFFFF` (Light) / `#1F2937` (Dark)
**Text Primary**: `#1F2937` (Light) / `#F9FAFB` (Dark)
**Text Secondary**: `#6B7280` (Light) / `#9CA3AF` (Dark)
**Success (Memorized)**: `#10B981` (Green)
**Alert (Not Memorized)**: `#F59E0B` (Amber, not red - less punishing)
**Border**: `#E5E7EB` (Light) / `#374151` (Dark)

## 5. Typography

**Font**: Nunito (Google Font - friendly, legible, educational feel)
**Type Scale**:
- Display: 32px, Bold (screen titles)
- Heading: 24px, Bold (word cards)
- Chinese Word: 42px, Bold (detail screen)
- Subheading: 18px, SemiBold (section headers)
- Body: 16px, Regular (translations, descriptions)
- Caption: 14px, Regular (metadata, pinyin)

## 6. Interactive Elements

**Speak Button**:
- Circular button with volume icon
- Primary color background, white icon
- Pulse animation when speaking
- Three sizes: small (32px), medium (44px), large (56px)

**Word Cards**:
- White surface with subtle border
- Memorized cards: left border accent (Success color, 4px width)
- Pressed state: scale to 0.98
- Contains speak button inline with word

**Test Options**:
- Full-width cards with border
- Selected correct: green border and background tint
- Selected incorrect: amber border and background tint

**Floating Action Button**:
- Primary color background
- Icon toggles between target (practice) and list (all)
- Shadow with 0.10 opacity

## 7. Animations

**Speak Button Pulse**:
- Repeating scale 1.0 → 1.1 → 1.0 while speaking
- Spring animation

**Checkmark Bounce**:
- When marking as memorized: scale 1.0 → 1.3 → 1.0 over 400ms
- Haptic feedback on mark

**Test Feedback**:
- FadeIn animation for feedback section
- Spring animation for score circle

## 8. Assets

1. **icon.png** - App icon with book and checkmark
2. **splash-icon.png** - Simplified version for launch screen
3. **empty-study.png** - Celebration illustration (all words memorized)
4. **empty-videos.png** - Video placeholder illustration
5. **avatar-default.png** - Friendly default avatar
6. **sample-thumbnail-*.png** - Sample video thumbnails

## 9. Accessibility

- All interactive elements have testID for automation
- Speak buttons provide audio alternative to visual content
- Sufficient color contrast ratios
- Haptic feedback for important actions
- Clear visual feedback states
