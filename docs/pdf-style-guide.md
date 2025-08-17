# PDF Style Guide

## Layout Standards

### Page Format
- **Size**: A4 (210 × 297 mm)
- **Orientation**: Portrait
- **Margins**: 
  - Top: 25mm
  - Bottom: 20mm  
  - Left/Right: 20mm
- **Content Area**: 170 × 252mm

### Header & Footer
- **Header**: Organization name + reporting period (aligned left)
- **Footer**: "Page {n} of {N}" (centered)
- **Height**: Header 15mm, Footer 10mm
- **Typography**: 9pt, gray (#666666)

### Navigation
- **Bookmarks**: Auto-generated from section headings
- **Table of Contents**: Page 2, with page numbers
- **Hyperlinks**: Internal references to sections/tables

## Typography

### Heading Scale
```
H1: 18pt, bold, #1a1a1a (section titles)
H2: 14pt, bold, #1a1a1a (subsections)  
H3: 12pt, bold, #333333 (sub-subsections)
H4: 11pt, semibold, #333333 (table headers)
```

### Body Text
- **Font**: Source Sans Pro (embedded)
- **Size**: 10pt
- **Line Height**: 1.4
- **Color**: #1a1a1a
- **Paragraph Spacing**: 6pt after

### Number Formatting

#### English Locale
```
Large numbers: 1,234.56
Currency: €1,234.56
Percentages: 12.3%
Units: 1,234.56 kWh
```

#### French Locale  
```
Large numbers: 1 234,56
Currency: 1 234,56 €
Percentages: 12,3 %
Units: 1 234,56 kWh
```

## Tables

### Data Tables
- **Border**: 1pt solid #cccccc
- **Header Background**: #f5f5f5
- **Row Alternating**: White / #fafafa
- **Padding**: 8pt vertical, 12pt horizontal
- **Alignment**: Numbers right-aligned, text left-aligned

### Columns Structure

#### Activity Data Tables
```
Column 1: Category (40%)
Column 2: Quantity (20%)  
Column 3: Unit (15%)
Column 4: Emission Factor (25%)
```

#### Results Tables
```
Column 1: Emission Source (50%)
Column 2: Scope (15%)
Column 3: tCO₂e (20%)
Column 4: % of Total (15%)
```

### Footnotes
- **Position**: Bottom of page
- **Typography**: 8pt, #666666
- **Marker**: Superscript numbers
- **Usage**: Estimates, assumptions, data quality notes

## Quality & Accessibility

### Color Contrast
- **Text on White**: Minimum 4.5:1 ratio
- **Primary Text**: #1a1a1a (16.9:1 ratio)
- **Secondary Text**: #333333 (12.6:1 ratio)
- **Disabled Text**: #666666 (7.0:1 ratio)

### Text Accessibility
- **Selectable**: All text must be selectable (no rasterized text)
- **Embedded Fonts**: Source Sans Pro included in PDF
- **Language Tags**: PDF language set to report locale
- **Alt Text**: Charts and diagrams include descriptions

### File Size
- **Target**: < 2MB typical
- **Maximum**: < 5MB for complex reports
- **Optimization**: Images compressed to 150 DPI max
- **Font Subsetting**: Only used characters embedded

### PDF Technical Standards
- **Version**: PDF/A-1b compliant for archival
- **Metadata**: Title, author, subject, keywords populated
- **Security**: No password protection (accessibility)
- **Bookmarks**: Structured navigation tree

## Layout Examples

### Cover Page Layout
```
[Logo - top right]
[Report Title - centered, large]
[Organization Name - centered]
[Reporting Period - centered]
[Framework Version - bottom]
```

### Content Page Layout
```
[Header: Org Name | Period]
[Section Title]
[Body content with tables]
[Footer: Page n of N]
```

### Table Page Layout
```
[Section heading]
[Introductory paragraph]
[Data table with headers]
[Footnotes if applicable]
```

## Responsive Design Notes

### Multi-Column Content
- **Tables**: Break across pages cleanly
- **Charts**: Scale to fit page width (max 150mm)
- **Long Lists**: Use page breaks between logical groups

### Page Breaks
- **Avoid**: Orphan headers (heading alone at page bottom)
- **Prefer**: Keep table headers with at least 2 data rows
- **Force**: New sections start on new page

## Acceptance Criteria

### Visual Quality Checks
- [ ] **Layout**: Consistent margins and spacing throughout
- [ ] **Typography**: Proper heading hierarchy and font sizes
- [ ] **Tables**: Clean borders, proper alignment, readable headers
- [ ] **Navigation**: Working bookmarks and table of contents
- [ ] **Branding**: Organization logo and colors consistent

### Technical Quality Checks  
- [ ] **Contrast**: All text meets 4.5:1 minimum ratio
- [ ] **Selectable**: All text can be selected and copied
- [ ] **Embedded Fonts**: Source Sans Pro included in file
- [ ] **File Size**: Under 5MB for typical reports
- [ ] **PDF/A**: Compliant for long-term archival

### Localization Checks
- [ ] **Number Format**: Correct for report language (EN: 1,234.56 / FR: 1 234,56)
- [ ] **Currency**: Proper symbol placement (EN: €1,234.56 / FR: 1 234,56 €)  
- [ ] **Language Tag**: PDF language metadata matches content
- [ ] **Text Direction**: Left-to-right layout for EN/FR
- [ ] **Date Format**: Locale-appropriate formatting

### Accessibility Checks
- [ ] **Screen Reader**: Content readable by assistive technology
- [ ] **Keyboard Navigation**: Bookmarks accessible via keyboard
- [ ] **Alt Text**: Images and charts have descriptive text
- [ ] **Logical Order**: Content follows proper reading sequence
- [ ] **No Security**: No restrictions on text copying or printing
