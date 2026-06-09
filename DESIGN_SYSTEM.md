# Megha Smart - Visual Design Guide

## 🎨 Design System Overview

### Color Palette

**Primary Colors**
```
Primary Navy Blue    #0051ba    ████ (Main brand color)
Primary Dark Navy    #003f8f    ████ (Darker shade)
Primary Light Blue   #1e7bff    ████ (Accent/hover)
Cyan Accent         #00d4ff    ████ (Highlights)
```

**Semantic Colors**
```
Success Green        #10b981    ████ (Active, OK status)
Warning Amber        #f59e0b    ████ (Warning)
Danger Red          #ef4444    ████ (Error, Alert)
```

**Neutral Colors**
```
Very Dark Navy      #0f172a    ████ (Sidebar background)
Light Gray          #f0f4f8    ████ (Page background)
Border Gray         #e5e7eb    ████ (Borders)
Text Dark           #1f2937    ████ (Primary text)
Text Light          #6b7280    ████ (Secondary text)
White               #ffffff    ████ (Cards, inputs)
```

---

## 📐 Typography System

### Font Family
```
System Fonts: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', etc.
```

### Font Sizes & Weights
```
Logo/Brand Title    32px  700 (Bold)
Page Heading (H1)   32px  700 (Bold)
Section Title (H2)  20px  700 (Bold)
Card Title (H3)     18px  700 (Bold)
Body Text           15px  400 (Regular)
Labels              14px  600 (Semibold)
Small Text          13px  500 (Medium)
```

### Usage
- **Headings**: Use font-weight 700 (bold)
- **Labels**: Use font-weight 600 (semibold)
- **Body**: Use font-weight 400 (regular)
- **Code**: Monospace font (Courier New)

---

## 🎭 Component Design

### Buttons

**Primary Button**
- Background: #0051ba (Navy Blue)
- Hover: #003f8f (Darker)
- Padding: 14px 24px
- Border Radius: 10px
- Font Weight: 600
- Transition: 0.3s ease
- Box Shadow on Hover: 0 12px 24px rgba(0, 81, 186, 0.3)

**Secondary Button**
- Background: white
- Border: 1px solid #e5e7eb
- Color: #0051ba
- Hover: Background becomes primary color

**Small Button**
- Padding: 8px 14px
- Font Size: 12px
- Used in card footers

---

### Cards

**Standard Card**
- Background: white
- Border: 1px solid #e5e7eb
- Border Radius: 14px
- Padding: 24px
- Box Shadow: 0 2px 8px rgba(0, 0, 0, 0.08)
- Hover Shadow: 0 8px 24px rgba(0, 0, 0, 0.12)

**Stat Card**
- Same as standard card
- Border-left: 5px solid primary color
- Gradient overlay on top-right

**Device Card**
- More rounded (14px)
- Hover: Lift effect (translateY -8px)
- Header: Gradient background
- Footer: Gradient background

---

### Forms

**Input Fields**
- Padding: 12px 44px (with icon)
- Border: 2px solid #e5e7eb
- Border Radius: 10px
- Focus: Border changes to primary color
- Focus Shadow: 0 0 0 4px rgba(0, 81, 186, 0.1)

**Labels**
- Font Size: 14px
- Font Weight: 600
- Margin Bottom: 8px

---

### Tables

**Header Row**
- Background: Linear gradient (light gray)
- Font Size: 12px (uppercase)
- Font Weight: 700
- Letter Spacing: 0.3px
- Padding: 16px

**Data Rows**
- Padding: 14px 16px
- Border-bottom: 1px solid #e5e7eb
- Hover: Background becomes light gray

**Badges**
- Font Size: 12px
- Font Weight: 600
- Padding: 6px 14px
- Border Radius: 20px
- Success: Green background, dark green text
- Warning: Amber background, dark amber text
- Danger: Red background, dark red text

---

### Alerts

**High Severity**
- Border-left color: Red (#ef4444)
- Background: Very light red (rgba)
- Icon: 🔴

**Medium Severity**
- Border-left color: Amber (#f59e0b)
- Background: Very light amber (rgba)
- Icon: 🟠

**Low Severity**
- Border-left color: Blue (#3b82f6)
- Background: Very light blue (rgba)
- Icon: 🟡

---

### Badges & Status Indicators

**Status Badge - Active**
- Filled green circle with animation
- Pulse animation (2s infinite)
- Text: "Active"

**Status Badge - Inactive**
- Empty circle
- Amber color
- Text: "Inactive"

---

## 🎬 Animation System

### Transition Duration
- Quick interactions: 0.2s
- Standard transitions: 0.3s
- Slower animations: 0.5s
- Timing function: ease (default)

### Animations

**Float Animation** (Logo)
```css
@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
}
Duration: 6s
Timing: ease-in-out
Iteration: infinite
```

**Pulse Animation** (Status dot)
```css
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}
Duration: 2s
Timing: (default)
Iteration: infinite
```

**Hover Effects**
- Buttons: translateY(-2px) with shadow
- Cards: translateY(-8px) with shadow
- Menu items: translateX(4px)

---

## 📐 Spacing System

### Standard Spacing Values
```
4px    - Micro spacing
8px    - Minimal spacing
12px   - Small spacing
16px   - Standard spacing
20px   - Medium spacing
24px   - Large spacing
32px   - Extra large spacing
```

### Card Padding
- Standard: 24px
- Dense: 16px
- Spacious: 32px

### Gap Spacing
- Small: 8px (tight)
- Medium: 12px (standard)
- Large: 16px (spacious)
- Extra Large: 20px or more

---

## 🌍 Responsive Design

### Breakpoints

**Desktop** (1024px+)
- Full layout with fixed sidebar (280px)
- Main content: calc(100% - 280px)
- Sidebar visible at all times

**Tablet** (768px - 1023px)
- Horizontal sidebar at top
- Full width content below
- Sidebar shrinks

**Mobile** (480px - 767px)
- Sidebar: horizontal with icons only
- Text labels hidden
- Stacked layout

**Small Mobile** (<480px)
- Minimal sidebar
- Single column layout
- Touch-optimized spacing

---

## 🎨 Theme Elements

### Login Page
- Split-screen design
- Left: Brand showcase with features
- Right: Login form
- Background: Gradient (Navy Blue)
- Professional appearance

### Sidebar
- Fixed position
- Gradient background
- Navigation items with hover effects
- Active state with glow
- Logout button at bottom

### Main Dashboard
- Header with subtitle
- Stat cards grid
- Quick action buttons
- Professional layout

### Data Pages
- Table view with pagination
- Device grid view (cards)
- Alert list view
- Status indicators throughout

---

## 🔤 Icon System

### Icons Used (Emoji)
```
📊 Dashboard
👥 Clients
🏘️ Community
🏪 Retail
🚨 Alerts
✉️ Email
🔐 Password
🔓 Logout
✓ Success/Check
✓ Resolve
👁️ Monitor
📋 Details
🔴 High severity
🟠 Medium severity
🟡 Low severity
✅ Active/OK
```

---

## 📊 Data Visualization

### Device Status Indicators
- **Active**: Green with pulsing dot
- **Inactive**: Amber color

### Alert Severity
- **High**: Red (🔴) - Urgent
- **Medium**: Amber (🟠) - Warning
- **Low**: Blue (🟡) - Info

### Capacity Progress Bar
- Gradient fill (Navy to Light Blue)
- Smooth animation on update
- Shows percentage

---

## 💡 Design Principles

1. **Clarity**: Clean, easy to understand
2. **Consistency**: Same elements look same
3. **Professional**: Business-appropriate
4. **Responsive**: Works on all devices
5. **Accessible**: Good contrast, readable
6. **Modern**: Current design trends
7. **Fast**: Smooth animations, quick load
8. **Scalable**: Easy to customize

---

## 🎯 Brand Guidelines

### Logo & Branding
- Use "Megha Smart" consistently
- MS- prefix for device IDs
- Professional navy blue (#0051ba)
- Clean, modern aesthetic

### Typography
- System fonts (no custom fonts)
- Professional hierarchy
- Clear readable sizes
- Consistent weights

### Color Usage
- Primary: Navy blue for main elements
- Accent: Light blue for highlights
- Semantic: Green/Amber/Red for status
- Neutral: Grays for background

### Imagery
- Emoji for visual enhancement
- Icons in sidebar/buttons
- Professional appearance
- Consistent style

---

## 📝 CSS Architecture

```
:root (variables)
  ├── Colors
  ├── Shadows
  └── Typography

Global Styles
  ├── HTML/Body
  ├── General elements
  └── Links

Login Page
  ├── Login body
  ├── Login wrapper
  ├── Left side (branding)
  └── Right side (form)

Main Layout
  ├── Container
  ├── Sidebar
  └── Main content

Components
  ├── Cards
  ├── Buttons
  ├── Forms
  ├── Tables
  ├── Badges
  ├── Alerts
  ├── Pagination
  └── Grids

Responsive
  ├── Tablet rules (768px)
  └── Mobile rules (480px)
```

---

## 🚀 Implementation Notes

1. **No External Libraries**: All CSS is custom
2. **No Frameworks**: Pure CSS3
3. **Performance**: Lightweight and fast
4. **Maintainable**: Well-organized and documented
5. **Customizable**: Easy to change colors/spacing
6. **Scalable**: Can add new components easily

---

**Megha Smart Design System**
*Professional, Modern, and User-Friendly* ✨

Version 1.0
Created: February 2026
