# Rice Mill Dashboard — Analysis & Tech Stack Plan

## Excel Structure Overview

The Excel has **5 sheets**: [Dashboard](file:///Users/atharvaudavant/development/Mill%20dashboard/dashboard/src/app/page.tsx#116-691), `Data_Entry`, `Database`, `Sheet1`, `Admin_Panel`.

For Phase 1, the three key sheets are:

| Sheet | Purpose | Size |
|-------|---------|------|
| `Database` | Master ledger — each row is a paddy lot received at the mill | 76 columns × 1000 rows |
| `Data_Entry` | Input form — fields map 1:1 into a new `Database` row | 74 rows (label + value pairs) |
| [Dashboard](file:///Users/atharvaudavant/development/Mill%20dashboard/dashboard/src/app/page.tsx#116-691) | Summary metrics — aggregates from `Database` via `SUMIF` | 12 rows × 6 columns |

---

## Dashboard Sheet — Metric Breakdown

The Dashboard computes **12 summary metrics** from the `Database` sheet. Below is every cell, how it's calculated, and what it means.

### Row Layout

| Row | Label (A) | Value (B) | Rate (C) | Revenue (D) | 68% Value (E) | Bags at 290kg (F) |
|-----|-----------|-----------|----------|-------------|----------------|---------------------|
| 1 | Mill Qty | `SUMIF(Database!K:K, "<>#DIV/0!")` | ₹2369/q | B1 × C1 | B1 × 68% | E1 / 290 |
| 2 | Total Quality + Moisture | `SUMIF(Database!BM:BM, "<>#DIV/0!") / 100` | ₹1900/q | B2 × C2 | B2 × 68% | E2 / 290 |
| 3 | Percentage | [(B2 / (B1 + B2)) × 100](file:///Users/atharvaudavant/development/Mill%20dashboard/dashboard/src/app/api/dashboard/route.ts#21-121) | — | — | — | — |
| 4 | Quality | `SUMIF(Database!BK:BK, "<>#DIV/0!") / 100` | [(B4 / (B2+B1)) × 100](file:///Users/atharvaudavant/development/Mill%20dashboard/dashboard/src/app/api/dashboard/route.ts#21-121) | B4 × C2 | B4 × 68% | — |
| 5 | Moisture | `SUMIF(Database!BL:BL, "<>#DIV/0!") / 100` | [(B5 / (B1+B2)) × 100](file:///Users/atharvaudavant/development/Mill%20dashboard/dashboard/src/app/api/dashboard/route.ts#21-121) | B5 × C2 | B5 × 68% | — |
| 6 | Gross | `SUMIF(Database!U:U, "<>#DIV/0!")` | — | — | — | — |
| 7 | Tare | `SUMIF(Database!V:V, "<>#DIV/0!")` | — | — | — | — |
| 8 | Net (KG) | `SUMIF(Database!W:W, "<>#DIV/0!")` | — | — | — | — |
| 9 | Net (Quintal) | [(B6 − B7) / 100](file:///Users/atharvaudavant/development/Mill%20dashboard/dashboard/src/app/api/dashboard/route.ts#21-121) | — | — | — | — |
| 10 | Gunny | `SUMIF(Database!X:X, "<>#DIV/0!") / 100` | — | — | — | — |
| 11 | Packet | `SUMIF(Database!M:M, "<>#DIV/0!")` | — | — | — | — |
| 12 | TP Accepted (SBP) | `SUMIF(Database!F:F, "<>#DIV/0!")` | — | B12 × C2 | B12 × 68% | E12 / 290 |

### Key Concepts

- **Mill Qty** = Final milled quantity in quintals (after all quality/moisture deductions). Source: `Database!K` = `Database!BN / 100`.
- **Quality cutting** = Deduction for poor grain quality (broken grains, discoloration, foreign matter etc.). Calculated per-packet across 8 packet types.
- **Moisture cutting** = Deduction for excess moisture in 4 of the 8 packet types.
- **Total Quality + Moisture** = Sum of quality + moisture cuts per lot (`BK + BL = BM`), aggregated across all lots.
- **Percentage** = Ratio of total deductions to total usable quantity — a key operational KPI.
- **68%** = Recovery rate assumption (rice yield from paddy).
- **290** = Bag weight in KG — used to convert to number of rice bags.
- **TP Accepted** = Token Permit quantity accepted from the government scheme (SBP = State Buffer Purchase).
- **Rates**: ₹2369/quintal (Mill Qty rate), ₹1900/quintal (deduction rate).

---

## Database Sheet — Column Map (76 Columns)

### Core Identification (A–I)
| Col | Header | Description |
|-----|--------|-------------|
| A | Excel SI No | Auto-increment |
| B | Sl No | Lot serial number |
| C | Date | Date of receipt |
| D | Society | Cooperative society name (with code) |
| E | Vehicle No | Transport vehicle |
| F | TP Accepted | Token Permit quantity (quintals) |
| G | Farmer Name | Paddy seller |
| H | Token Name | Name(s) on the government token |
| I | Token No | Government token number |

### Quantity & Weight (J–X)
| Col | Header | Formula/Description |
|-----|--------|---------------------|
| J | Token Qty (Quintal) | Quantity on token |
| K | Mill Qty (Quintal) | `= BN / 100` (final milled qty) |
| L | Balance | `= K − J` (mill qty − token qty) |
| M | Total Packet | Total bags received |
| N | Plastic Packet | Count of plastic bags |
| O | Gunny Adv. | Gunny bags advanced |
| P | Gunny Dep. | `= Q − R` (deposited minus rejected) |
| Q | Gunny Cal. | `= M − N` (total − plastic) |
| R | Rej. Gunny | Rejected gunny bags |
| S–T | Freight Paid Date/Amount | Logistics tracking |
| U | Gross (KG) | Gross weight |
| V | Tare (KG) | Vehicle/bag weight |
| W | Net (KG) | `= U − V` |
| X | Packet (KG) calculated | `= ROUND((Q×0.7) + (N×0.3), 0)` |

### Quality Cutting — 8 Packet Types (Y–BJ)
Each packet type has up to 3 fields: quality %, count, total cutting.

- **Packets 1–4** (Y–AX): Have both quality cutting AND moisture cutting (6 cols each)
  - Quality: `ROUND(((U−V−X)/M × count) × (quality%/100), 0)`
  - Moisture: Same formula with moisture % and moisture count
- **Packets 5–8** (AY–BJ): Quality cutting only (3 cols each)
  - `ROUND(qty × count, 0)`

### Aggregates (BK–BV)
| Col | Header | Formula |
|-----|--------|---------|
| BK | Quality Cut | `SUM(Z, AC, AI, AO, AU, BA, BD, BG, BJ)` |
| BL | Moisture Cut | `SUM(AF, AL, AR, AX)` |
| BM | Total Quality Cutting | `= BK + BL` |
| BN | Mill Qty Calculated | `= U − V − X − BM` (in KG) |
| BO–BQ | Farmer Code, PPC Name, Mobile | Reference fields |
| BR | MC | Moisture content |
| BS | Percentage | `= (BM / (U−V)) × 100` |
| BT | Comment | Free text |
| BU | Gunny Dep (Due to gross weight) | Special case |
| BV | Pkt Avg | `= (K × 100) / M` |

---

## Data_Entry Sheet — Form Structure

The `Data_Entry` sheet (74 rows, 2 columns) is the input form. Column A = field labels, Column B = input values or formulas. It mirrors the `Database` columns and includes the same quality/moisture cutting calculations for a single lot being entered.

---

## Proposed Tech Stack

### Frontend (Dashboard Web App)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | **Next.js 15** (App Router) | SSR for fast initial load, API routes for backend |
| Language | **TypeScript** | Type safety for complex rice mill data models |
| Styling | **Vanilla CSS** with CSS variables | Full control over the premium dashboard design |
| Charts | **Recharts** or **Chart.js** | Lightweight, React-native charting for KPI visualizations |
| State | React built-in (`useState`, `useContext`) | Dashboard is read-heavy, no complex client state needed |

### Backend & Data

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Database | **PostgreSQL** (via Supabase or self-hosted) | Relational data with strong aggregation queries |
| ORM | **Prisma** | Type-safe queries matching the 76-column schema |
| API | **Next.js API Routes** | Co-located backend, simplifies deployment |
| Auth | **NextAuth.js** | Supports the Admin/Operator roles from `Admin_Panel` sheet |

### Phase 1 Scope — Dashboard View Only

Since Phase 1 focuses on the **visual dashboard only**, we will:
1. Seed the database from the Excel `Database` sheet
2. Build API endpoints that replicate the 12 Dashboard formulas as SQL aggregation queries
3. Create a stunning, responsive dashboard UI with:
   - **KPI cards** for Mill Qty, TP Accepted, Quality+Moisture %, Net Quantity
   - **Revenue summary** cards showing computed values at ₹2369 and ₹1900 rates
   - **Weight breakdown** visualization (Gross → Tare → Net → Gunny)
   - **Quality vs Moisture** split chart
   - **Recovery metrics** (68% yield, bag counts at 290kg)

### Phase 2 Scope — Dedicated Lot Records Page with CRUD

The user requested moving the "Lot Records" table from the main dashboard to its own dedicated page with CRUD (Create, Read, Update, Delete) capabilities.

1. **New Route**: Create `/records` page.
2. **Dashboard Update**: Remove the Lot Records table from the main dashboard ([/page.tsx](file:///Users/atharvaudavant/mill-dashboard/dashboard/src/app/page.tsx)). Add a prominent navigation link/button to the new `/records` page.
3. **Data Management Strategy (Phase 2)**:
   - Since we are currently using a static JSON file (`database.json`), we will implement a lightweight Node.js API (Next.js App Router API or Server Actions) to read/write to this JSON file.
   - *Note: This is a stepping stone before migrating to a full PostgreSQL database in the future.*
4. **CRUD Features on `/records`**:
   - **Read**: Display the table with all records (similar to the current view).
   - **Create**: A form (or modal) to add a new paddy lot record.
   - **Update**: Ability to edit an existing record (e.g., inline editing or a modal).
   - **Delete**: Ability to remove a record with confirmation.
5. **State Management**: After a CRUD operation, the dashboard API must reflect the updated JSON data so metrics stay accurate.

## Verification Plan

### Browser-based Verification
- Launch the dev server and visually verify all 12 dashboard metrics render correctly
- Cross-check computed values against the Excel formulas using known test data from the seeded database
- Verify responsive layout on desktop and mobile viewports

### Manual Verification
- Compare dashboard KPI values with Excel-computed values by opening both side by side
- The user can verify that the numbers match their operational data
