---
name: Lumina Learning
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#494454'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#7b7486'
  outline-variant: '#cbc3d7'
  surface-tint: '#6d3bd7'
  primary: '#6b38d4'
  on-primary: '#ffffff'
  primary-container: '#8455ef'
  on-primary-container: '#fffbff'
  inverse-primary: '#d0bcff'
  secondary: '#b4136d'
  on-secondary: '#ffffff'
  secondary-container: '#fd56a7'
  on-secondary-container: '#600037'
  tertiary: '#006577'
  on-tertiary: '#ffffff'
  tertiary-container: '#008096'
  on-tertiary-container: '#f9fdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e9ddff'
  primary-fixed-dim: '#d0bcff'
  on-primary-fixed: '#23005c'
  on-primary-fixed-variant: '#5516be'
  secondary-fixed: '#ffd9e4'
  secondary-fixed-dim: '#ffb0cd'
  on-secondary-fixed: '#3e0022'
  on-secondary-fixed-variant: '#8c0053'
  tertiary-fixed: '#acedff'
  tertiary-fixed-dim: '#4cd7f6'
  on-tertiary-fixed: '#001f26'
  on-tertiary-fixed-variant: '#004e5c'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
---

## Brand & Style

The design system is centered on an approachable, high-energy learning environment. It targets a modern audience of lifelong learners and students, evoking feelings of progress, clarity, and optimism.

The visual style is **Corporate / Modern** with a strong **Glassmorphism** influence. It utilizes soft, multi-layered depth and vibrant accents to break away from traditional academic coldness. The interface feels tactile yet digital, using high-quality 3D assets and generous whitespace to reduce cognitive load during study sessions. Key characteristics include:
- Soft, diffused lighting and depth.
- Vibrant gradients that signal activity and achievement.
- A high-polish aesthetic that feels premium yet accessible.

## Colors

The palette is anchored by a core **Vivid Violet** (#8B5CF6) used for primary actions and brand recognition. **Magenta** (#EC4899) serves as a secondary accent for gamification elements and high-priority highlights. 

- **Primary:** Used for main buttons, active navigation states, and progress indicators.
- **Secondary/Accent:** Used for "Go Premium" features, rewards, and "Daily Quest" highlights.
- **Surface & Background:** The UI utilizes a tiered white-on-gray approach. Pure white (#FFFFFF) is reserved for interactive cards, while a very light gray-blue (#F8FAFC) creates the base canvas for the application.
- **Semantic Colors:** Success states utilize a soft mint green, while information states lean into the cyan/tertiary range.

## Typography

This design system uses a dual-font strategy. **Plus Jakarta Sans** provides a friendly, geometric personality for all headings and display text. **Inter** is utilized for body copy and labels to ensure maximum legibility at smaller scales.

- **Headlines:** Should always use heavier weights (600+) to establish a clear content hierarchy.
- **Body Text:** Maintain generous line-heights (1.5x+) to ensure long-form educational content is easy to digest.
- **Labels:** Used for metadata (e.g., "5/5 Completed") and navigation; these often use a slightly heavier weight or uppercase styling for distinction.

## Layout & Spacing

The design system employs a **Fluid Grid** model with a base unit of **4px**. On mobile devices, a 20px side margin is enforced to keep content away from screen edges.

- **Card Containers:** Use `lg` (24px) padding to create a sense of premium space.
- **Vertical Rhythm:** Sections are separated by `xl` (32px) spacing to clearly distinguish between modules like "Continue Watching" and "Daily Quests".
- **Density:** The layout is intentionally "loose" to prevent the interface from feeling overwhelming during complex learning tasks.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**.

1.  **Level 0 (Base):** Background color (#F8FAFC).
2.  **Level 1 (Cards):** Pure white surfaces with a very soft, large-radius shadow (Blur: 20px, Opacity: 4%, Color: #000).
3.  **Level 2 (Popovers/Overlays):** Increased shadow spread and a subtle 1px border (#F1F5F9) to define edges.
4.  **Glassmorphism:** Navigation sidebars and promotional banners use a 20px backdrop-blur with a 70% opacity white/tinted fill to maintain context of the underlying layers.

## Shapes

The shape language is highly organic and friendly. 
- **Standard Cards:** Use `rounded-lg` (16px) for a modern, soft appearance.
- **Primary Buttons:** Use `rounded-xl` (24px) or full pill shapes to make them feel inviting to touch.
- **Input Fields:** Follow the card roundedness (16px) to maintain a unified container language.
- **Progress Rings:** Use rounded stroke caps to reinforce the soft aesthetic.

## Components

### Buttons
- **Primary:** Solid violet background with white text. High-contrast, pill-shaped.
- **Ghost:** Transparent background with a subtle border or text-only for secondary navigation.
- **Premium:** Gradient-filled (Violet to Magenta) to signify special value.

### Cards
- White background, 16px corner radius, soft ambient shadow.
- Content should be padded by 24px.
- Use internal "tags" (chips) for status indicators like "Complete" or "Points".

### Progress Bars & Rings
- **Rings:** Use a thick stroke (8px-12px) with a secondary color for the track and the primary color for the progress. Include a central percentage label.
- **Linear Bars:** Rounded caps on both the track and the progress indicator.

### Input Fields
- Large height (56px) for easy mobile tapping.
- Backgrounds should be slightly off-white or have a light gray border to stand out against white cards.
- Search bars include a leading icon with a low-opacity neutral color.

### Navigation
- **Bottom Bar (Mobile):** Glassmorphic background with active states highlighted by a change in icon color to primary violet and a subtle dot indicator.
