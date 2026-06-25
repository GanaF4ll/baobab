---
name: Technical Precision
colors:
  surface: '#fff8f5'
  surface-dim: '#ebd6c7'
  surface-bright: '#fff8f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#fff1e8'
  surface-container: '#ffeadb'
  surface-container-high: '#fae4d5'
  surface-container-highest: '#f4dfcf'
  on-surface: '#241910'
  on-surface-variant: '#50453e'
  inverse-surface: '#3a2e24'
  inverse-on-surface: '#ffeee2'
  outline: '#82746d'
  outline-variant: '#d4c3ba'
  surface-tint: '#785741'
  primary: '#321a08'
  on-primary: '#ffffff'
  primary-container: '#4a2f1b'
  on-primary-container: '#bd967c'
  inverse-primary: '#e9bea2'
  secondary: '#466365'
  on-secondary: '#ffffff'
  secondary-container: '#c6e6e8'
  on-secondary-container: '#4a686a'
  tertiary: '#3b1400'
  on-tertiary: '#ffffff'
  tertiary-container: '#5c2402'
  on-tertiary-container: '#dc895f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdcc5'
  primary-fixed-dim: '#e9bea2'
  on-primary-fixed: '#2c1605'
  on-primary-fixed-variant: '#5e402b'
  secondary-fixed: '#c9e8ea'
  secondary-fixed-dim: '#adccce'
  on-secondary-fixed: '#002022'
  on-secondary-fixed-variant: '#2f4b4d'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb693'
  on-tertiary-fixed: '#341000'
  on-tertiary-fixed-variant: '#733512'
  background: '#fff8f5'
  on-background: '#241910'
  surface-variant: '#f4dfcf'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  mono-label:
    fontFamily: Geist Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 64px
  max-width: 1280px
---

## Brand & Style

This design system embodies a "Warm Minimalist" aesthetic, blending the rigorous, logical structure of technical documentation with the tactile comfort of high-quality stationery. It is designed for professional environments—specifically engineering, architecture, and developer tools—where clarity and focus are paramount, but where a cold, clinical atmosphere is avoided in favor of a sophisticated, earth-toned workspace.

The style leverages **Minimalism** with a heavy emphasis on intentional whitespace and precise alignment. The visual narrative is one of "The Digital Drafting Table," evoking the feeling of a clean, well-organized physical desk. Every element serves a functional purpose, and the aesthetic appeal is derived from the balance of proportions and the quality of the typography rather than decorative flourishes.

## Colors

The palette is rooted in a natural, grounded light mode. The foundation is a warm, paper-like cream (`#F5EBDD`), which reduces eye strain compared to pure white while providing a high-end, tactile feel.

- **Primary Tone**: A deep espresso (`#4A2F1B`) is used for maximum legibility and structural hierarchy.
- **Secondary Tone**: A muted slate-teal (`#3D5A5C`) provides a "technical" counterpoint to the warm base, used for secondary actions and data visualization.
- **Accent Tone**: A refined rust (`#A65D37`) is reserved for primary calls to action and critical highlights.
- **Neutral/Surface**: Container layers utilize subtle shifts in saturation (`#EFE4D3`) rather than grey scales to maintain the organic warmth. Borders are kept low-contrast (`#D9CDBA`) to guide the eye without creating visual clutter.

## Typography

This design system exclusively employs **Geist**, a typeface engineered for precision and readability. The mono-spaced influence in Geist’s design reinforces the technical nature of the product.

- **Headlines**: Use tight letter spacing and heavier weights to create "anchor points" on the page.
- **Body**: Generous line height (1.6) is applied to ensure long-form technical content remains digestible.
- **Labels**: Small-caps or uppercase labels with increased letter spacing are used for metadata and categorizations to distinguish them from actionable text.
- **Mono-variants**: Where precise data or code snippets are displayed, Geist Mono should be used to maintain the "engineer’s notebook" aesthetic.

## Layout & Spacing

The layout philosophy is a **Fixed Grid** system that centers the content to maintain focus. We use an 8px base grid (subdivided into 4px units for micro-adjustments) to ensure mathematical consistency across all components.

- **Desktop**: A 12-column grid with 24px gutters. Content is contained within a 1280px max-width to prevent line lengths from becoming unreadable on ultra-wide monitors.
- **Tablet**: An 8-column grid with 24px margins.
- **Mobile**: A 4-column fluid grid with 16px margins. 

Vertical rhythm is strictly maintained; spacing between logical sections should always be a multiple of 8px, typically using `xl` (40px) to separate major content blocks.

## Elevation & Depth

To maintain a "Technical Precision" vibe, this system avoids heavy, blurry shadows. Instead, it utilizes **Tonal Layers** and **Low-Contrast Outlines** to convey hierarchy.

- **Surface 0 (Background)**: The base `#F5EBDD` cream.
- **Surface 1 (Cards/Containers)**: A slightly darker tint `#EFE4D3`. These are defined by a 1px solid border (`#D9CDBA`) rather than a shadow.
- **Surface 2 (Popovers/Modals)**: These use the same background as Surface 1 but incorporate a very crisp, short shadow (4px blur, 10% opacity of the primary text color) to indicate they are floating above the drafting table.
- **Interactions**: Elements do not "lift" on hover; instead, they change fill color or border weight, emphasizing a mechanical, flat-surface interaction model.

## Shapes

The shape language is **Soft** yet disciplined. A universal corner radius of `0.25rem` (4px) is applied to buttons, inputs, and small containers. This slight rounding takes the edge off the "brutalist" sharp corners while remaining far more professional than high-radius "pill" shapes.

- **Standard Elements**: 4px radius.
- **Large Containers/Cards**: 8px radius (`rounded-lg`).
- **Data Tags/Chips**: 4px radius (keep consistent with buttons).

## Components

- **Buttons**: Primary buttons use the Espresso (`#4A2F1B`) fill with the Cream (`#F5EBDD`) text. Secondary buttons are outlined with 1px Espresso and no fill.
- **Input Fields**: Rectangular with a 1px border. On focus, the border thickens to 2px and changes to the Teal-Grey secondary color. Labels are always positioned above the field in `label-md` style.
- **Chips/Tags**: Small, subtle containers with a `#D9CDBA` border and `mono-label` typography. Used for versioning, status, or categories.
- **Cards**: Minimal padding (24px). Borders are mandatory. Use a subtle header area with a horizontal divider to separate titles from body content.
- **Lists**: Technical lists should use custom Espresso-colored square bullets or mono-spaced numbering to reinforce the grid-based aesthetic.
- **Progress Bars**: Thin (4px height) with the Rust accent color (`#A65D37`) for the filled portion and the background surface color for the track.