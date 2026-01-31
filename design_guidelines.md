# Vocabulary Learning App Design Guidelines

## 1. Brand Identity

**Purpose**: A focused vocabulary learning app that helps users track memorization progress through word lists and video examples.

**Aesthetic Direction**: **Soft/Calming with Editorial Clarity**
- Clean typographic hierarchy inspired by educational apps
- Gentle color palette to reduce study fatigue
- Spacious layouts that don't overwhelm
- Memorable element: Large, satisfying checkmark animations when marking words as "memorized"

**Personality**: Patient teacher - encouraging, clear, and distraction-free.

## 2. Navigation Architecture

**Root Navigation**: Tab Bar (3 tabs)
- **Study** (Home) - Main word list with memorization tracking
- **Videos** - Browse all video content by word
- **Profile** - User progress, settings, preferences

All screens use stack navigation within their tabs.

## 3. Screen Specifications

### Study Screen (Home Tab)
**Purpose**: View word list and mark memorization status

**Layout**:
- Transparent header with search bar (right side: filter icon)
- Scrollable list of word cards
- Top inset: headerHeight + Spacing.xl
- Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- Word cards showing: word text (large), translation, memorization status
- Each card has checkbox/checkmark icon (left), video count indicator (right)
- Tap card to navigate to Word Detail screen
- Floating action button (bottom right): "Practice Mode" - filters to show only unmemorized words

**Empty State**: When all words memorized, show "empty-study.png" with celebratory message

### Word Detail Screen (Modal)
**Purpose**: View single word with videos and mark memorization

**Layout**:
- Standard navigation header with back button, title (word), heart icon (favorite - future feature)
- Scrollable content area
- Submit button in header (checkmark to mark memorized/unmemorized)

**Components**:
- Word section: Large word text, translation, pronunciation guide
- Video section: Horizontal scrolling list of video thumbnails
- Tap thumbnail to play video in full-screen player
- Bottom: Large toggle button "Mark as Memorized/Not Memorized" with satisfying animation

### Videos Screen (Videos Tab)
**Purpose**: Browse all videos organized by word

**Layout**:
- Default header with title "Videos"
- Scrollable list grouped by word
- Top inset: Spacing.xl
- Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- Section headers for each word
- Grid of video thumbnails (2 columns) under each word
- Video count badge on each thumbnail

**Empty State**: Show "empty-videos.png" when no videos available

### Profile Screen (Profile Tab)
**Purpose**: View progress statistics and app settings

**Layout**:
- Default header with title "Profile", settings icon (right)
- Scrollable content
- Top inset: Spacing.xl
- Bottom inset: tabBarHeight + Spacing.xl

**Components**:
- User avatar (generated preset) and display name
- Progress statistics: Total words, Memorized count, Percentage complete
- Progress bar visualization
- Theme selector (Light/Dark/System)
- Data management: Export/Import word lists (future)

## 4. Color Palette

**Primary**: `#5B8C85` (Calming teal - trust, focus, growth)
**Secondary**: `#E8956F` (Warm coral accent - encouragement)
**Background**: `#FAFAF9` (Soft warm white)
**Surface**: `#FFFFFF`
**Text Primary**: `#1F2937`
**Text Secondary**: `#6B7280`
**Success (Memorized)**: `#10B981` (Green)
**Alert (Not Memorized)**: `#F59E0B` (Amber, not red - less punishing)
**Border**: `#E5E7EB`

## 5. Typography

**Font**: Nunito (Google Font - friendly, legible, educational feel)
**Type Scale**:
- Display: 32px, Bold (screen titles)
- Heading: 24px, Bold (word cards)
- Subheading: 18px, SemiBold (section headers)
- Body: 16px, Regular (translations, descriptions)
- Caption: 14px, Regular (metadata, counts)

## 6. Visual Design

**Word Cards**:
- White surface with subtle border (Border color)
- No drop shadow
- Pressed state: scale to 0.98, opacity 0.7
- Memorized cards: left border accent (Success color, 4px width)

**Floating Action Button**:
- Background: Primary color
- Icon: White
- Exact shadow: shadowOffset {width: 0, height: 2}, shadowOpacity 0.10, shadowRadius 2
- Pressed: scale 0.95

**Checkmark Animation**:
- When marking as memorized: Scale bounce effect (1.0 → 1.3 → 1.0) over 400ms
- Color transition from Alert to Success
- Haptic feedback on mark

## 7. Assets to Generate

1. **icon.png** - App icon featuring a stylized book with checkmark overlay in Primary/Secondary colors (home screen)
2. **splash-icon.png** - Simplified version of app icon (launch screen)
3. **empty-study.png** - Illustration of graduation cap or trophy with confetti (Study screen when all words memorized)
4. **empty-videos.png** - Illustration of video play symbol with "No videos yet" vibe (Videos screen empty state)
5. **avatar-default.png** - Simple friendly avatar for Profile screen (circular, neutral character)
6. **sample-thumbnail-1.png** - Sample video thumbnail showing person speaking (Word Detail mock data)
7. **sample-thumbnail-2.png** - Sample video thumbnail showing text/scene (Word Detail mock data)

**Style Guide for Assets**: Soft illustrations with rounded shapes, use Primary and Secondary colors, minimal detail, friendly and encouraging mood.

---

**Additional Feature Suggestions**:
- **Spaced Repetition**: Show words you haven't reviewed in a while first
- **Favorites**: Heart icon to favorite important words
- **Daily Goal**: Set target number of words to memorize per day
- **Streaks**: Track consecutive days of study