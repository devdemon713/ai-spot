# 📋 MHT-CET Spot Round – Automatic Seat Allocation Rules
### WCE Sangli Spot Round Portal
### ✅ Verified against State CET Cell, Maharashtra official guidelines

---

## ⚠️ Important Corrections from Official Rules

> The following was verified against the **DTE Maharashtra / State CET Cell** official seat matrix and reservation rules.
> Some rules differ from common assumptions — read carefully.

---

## 🔑 What is Spot Round / ACAP?

- Spot Round = **Institute-Level Round** conducted **after all CAP rounds** are done
- Purpose: Fill seats that remain **vacant after CAP Rounds 1, 2, 3**
- Admissions are made **strictly on inter-se merit** (MHT-CET percentile)
- College prepares a **category-wise merit list** and calls students physically
- All reservation rules of Government of Maharashtra still apply

---

## 📐 Automatic Allocation Rules (Step by Step)

### STEP 1 — Sort by Merit (Percentile Descending)

```
Highest MHT-CET Percentile → Gets seat FIRST
Lowest MHT-CET Percentile  → Gets seat LAST
```
> If same percentile → sort by MHT-CET Score → then by SSC marks

---

### STEP 2 — Own Category Seat First, Then OPEN

```
SC student   → SC seat first   → if not available → OPEN seat
ST student   → ST seat first   → if not available → OPEN seat
OBC student  → OBC seat first  → if not available → OPEN seat
VJ/DT student→ VJ/DT seat first→ if not available → OPEN seat
NT-B student → NTB seat first  → if not available → OPEN seat
NT-C student → NTC seat first  → if not available → OPEN seat
NT-D student → NTD seat first  → if not available → OPEN seat
SEBC student → SEBC seat first → if not available → OPEN seat
OPEN student → OPEN seat only
```

> ✅ **VERIFIED** — Official rule. Reserved category students can be allotted OPEN seats if
> their own category seats are filled (by higher merit students of same category).

---

### STEP 3 — Ladies Quota (30% Horizontal Reservation)

```
Female student → First try Ladies (L) seat in own category
                 If not available → try General (G) seat in own category
                 If not available → try OPEN category (L then G)

Male student   → Only General (G) seats
```

> ✅ **VERIFIED** — Official 30% horizontal reservation for female candidates
>
> ⚠️ **EXCEPTION (Official):** The 30% Ladies quota does **NOT apply** to:
> - PWD (Persons with Disability) seats
> - DEF (Defence) seats
> - Orphan seats

---

### STEP 4 — Special / Horizontal Reservations (Checked Before Regular Seats)

| Reservation | % of Seats | Rule |
|-------------|-----------|------|
| **PWD** (Person with Disability) | **5%** | Min 40% disability. Applied horizontally across all categories. Ladies quota does NOT apply here. |
| **DEF** (Defence) | **5%** | Children of serving/ex-defence personnel domiciled in Maharashtra. Ladies quota does NOT apply. |
| **Orphan** | **1%** | Orphan candidates. Ladies quota does NOT apply. |
| **EWS** | **10%** | Additional/supernumerary seats (over and above sanctioned intake). Separate from main quota. |
| **Minority** | Varies | Seats in minority institutions only. Separate pool. |

> ⚠️ **IMPORTANT FIX:** PWD and DEF are **5% each** (not their own separate column per category).
> They are shown as rows in the seat matrix for accounting, but allocated from a **common reserved pool** if category-specific PWD/DEF seats are 0.

---

### STEP 5 — Priority Order for Each Student (System Logic)

```
For a Female PWD, SC student — System tries in this order:
  1. PWD SC seat (from PWD row, SC column, General)   ← No ladies quota in PWD
  2. PWD Common Reserved seat
  3. SC Ladies seat (State Level row)
  4. SC General seat (State Level row)
  5. OPEN Ladies seat (State Level row)
  6. OPEN General seat (State Level row)

For a Male OBC student — System tries in this order:
  1. OBC General seat (State Level row)
  2. OPEN General seat (State Level row)

For a Female OPEN student — System tries in this order:
  1. OPEN Ladies seat (State Level row)
  2. OPEN General seat (State Level row)
```

---

### STEP 6 — OMS (Outside Maharashtra State) Candidates

```
OMS candidates → Treated as OPEN category ONLY
               → Not eligible for any state reservation (SC/ST/OBC etc.)
               → Compete in OPEN seats only
```

> ✅ **VERIFIED** — Official rule from DTE Maharashtra

---

### STEP 6A — Branch Upgrade / Sliding (Existing WCE Students)

> ⚠️ **SPECIAL CASE — Must be handled manually by Admin**

When a student who is **already admitted at WCE Sangli** in a lower-preference branch wants to upgrade to a better branch (e.g., Mechanical → CSE) during the Spot Round:

**Rule:**
```
Student currently in Branch A (e.g., Mechanical - Aided)
wants to upgrade to  Branch B (e.g., CSE - Aided)

IF Branch B has a vacant seat eligible for the student's category:
  ✅ Branch B seat count  → DECREASES by 1  (new branch allocated)
  ✅ Branch A seat count  → INCREASES by 1  (old seat returned to pool)
  ✅ Student moves from Branch A to Branch B
```

**Example Scenario:**
```
Rahul is already studying CSE (Aided) at WCE.
A CSE (Unaided) seat becomes vacant.
Rahul upgrades → CSE (Aided) gets +1 seat back in pool
              → CSE (Unaided) gets -1 seat (Rahul's new branch)
```

**How Admin handles this:**
1. Cancel the student's existing Branch A allocation → Branch A gets +1 seat back automatically
2. Allocate the student to Branch B via Manual Allocation → Branch B gets -1 seat
3. Both changes reflect live in real-time for all users

**Important points:**
- The upgrade is only valid if the student's merit (percentile) qualifies for Branch B
- Reservation category rules still apply — student must be eligible for that seat type
- The freed Branch A seat immediately becomes visible to all pending students



### STEP 7 — Domicile Requirement

```
All reservation benefits (SC/ST/OBC/NT/SEBC/EWS etc.)
→ ONLY for Maharashtra domicile candidates with valid certificates
→ Non-Creamy Layer (NCL) certificate required for OBC/VJ/NT/SBC/EWS
→ Caste validity certificate required
```

---

### STEP 8 — Seat Allocation is Immediate and Live

```
When a student is allocated:
  ✅ Seat count decreases by 1 in real-time
  ✅ All students watching see the update instantly (WebSocket)
  ✅ Student status: PENDING → ALLOCATED
  ✅ Admin sees updated counts immediately
```

---

## 🧮 Official Reservation Percentages

| Category | % of Seats | Notes |
|----------|-----------|-------|
| SC (Scheduled Caste) | **13%** | Caste + domicile certificate required |
| ST (Scheduled Tribe) | **7%** | Tribe + domicile certificate required |
| VJ/DT (NT-A) | **3%** | Nomadic Tribe A |
| NT-B | **2.5%** | Nomadic Tribe B |
| NT-C | **3.5%** | Nomadic Tribe C |
| NT-D | **2%** | Nomadic Tribe D |
| OBC | **19%** | NCL certificate required |
| SBC (Special Backward Class) | **2%** | ⚠️ Was called SEBC in portal — verify |
| EWS | **10%** | **Supernumerary** (extra seats, not from main intake) |
| OPEN (Unreserved) | ~40% | All candidates eligible |
| **Ladies (Horizontal)** | **30%** | Across all categories EXCEPT PWD/DEF/Orphan |
| **PWD (Horizontal)** | **5%** | Across all categories, no ladies quota |
| **DEF (Horizontal)** | **5%** | Across all categories, no ladies quota |
| **Orphan** | **1%** | Separate pool |

> ⚠️ **NOTE on SEBC:** SEBC (Maratha quota) was 10% but has been subject to Supreme Court
> orders and stays. Check the current year's official seat matrix for actual SEBC seat counts.
> The portal uses SEBC as a category — this is correct per the seat matrix format used by CET Cell.

---

## 📊 Reading the Seat Matrix (Official Format)

```
COLLEGE: 06007 — Walchand College of Engineering, Sangli
TYPE: Government-Aided Autonomous

CHOICE CODE | COURSE NAME      | SI | MS | MIN | AI | INST | ORPHAN
0600719110  | Civil Engineering| 60 | 2  |  0  | 0  |  1   |   0

CATEGORY → OPEN   SC    ST   VJ/DT  NTB   NTC   NTD   OBC  SEBC  TOTAL
           G   L  G  L  G  L  G  L  G  L  G  L  G  L  G  L  G  L  G+L
State Lvl  3   0  0  0  2  1  0  0  0  0  0  1  1  0  0  1  0  0   9
PWD        0   0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0   0
PWD Common Reserved: 0
DEF        0   0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0  0   0
DEF Common Reserved: 0
EWS Seats: 0     TFWS Choice Code: ...  TFWS Seats: 0
```

**Columns explained:**
- **SI** = Sanctioned Intake (total approved seats)
- **MS** = Management/Minority Seats
- **MIN** = Minority seats
- **AI** = All India quota seats
- **INST** = Institute-level seats
- **ORPHAN** = Orphan quota seats
- **G** = General (all candidates)
- **L** = Ladies (female candidates only — 30% rule)
- **TFWS** = Tuition Fee Waiver Scheme (merit-based, for economically weak)
- **EWS** = Economically Weaker Section (supernumerary)

---

## ✅ What Our Portal Does Correctly

| Rule | Status |
|------|--------|
| Merit-based sorting (percentile descending) | ✅ Implemented |
| Own category first, then OPEN fallback | ✅ Implemented |
| Ladies seat tried before General for females | ✅ Implemented |
| PWD special pool | ✅ Implemented |
| DEF special pool | ✅ Implemented |
| EWS seats | ✅ Implemented |
| Minority seats | ✅ Implemented |
| Orphan seats | ✅ Implemented |
| Real-time seat count updates (WebSocket) | ✅ Implemented |
| Admin manual override | ✅ Implemented |

## ⚠️ Known Differences / Manual Steps Required

| Item | Note |
|------|------|
| **NCL/Caste certificate verification** | Not automated — admin verifies physically |
| **Domicile verification** | Not automated — admin verifies physically |
| **SEBC legal status** | Admin must check current year's official seat matrix |
| **EWS supernumerary** | In real CAP, EWS seats are over and above SI — portal currently treats as regular row |
| **Candidate physical presence** | Spot round requires physical reporting to college — portal handles digital part only |
| **Daily reporting to CET Cell** | College must report daily admission status to State CET Cell |

---

## 🔄 Round Lifecycle

```
DEMO MODE
   ↓ Admin clicks "Initialize New Round"
SETUP MODE ← Admin enters ACTUAL vacancy data from CET Cell seat matrix
   ↓ Admin clicks "Start Round"
ACTIVE     ← Allocations begin (auto or manual)
   ↓ Admin clicks "End Round"
COMPLETED
```

---

## 🔗 Official References

- **State CET Cell Maharashtra:** https://cetcell.mahacet.org
- **DTE Maharashtra:** https://dtemaharashtra.gov.in
- **Seat Matrix Published by:** State CET Cell after each CAP round
- **Rule Book:** Information Brochure for BE/B.Tech Admissions (published annually)

---

## 🔑 Portal Credentials

```
Admin   → admin@wce.ac.in  / admin123
Student → rahul@demo.com   / demo123 (demo)
```

```
Frontend → http://localhost:5173
Backend  → http://localhost:5000
```

---
*WCE Sangli Spot Round Portal — Based on State CET Cell, Maharashtra Rules 2024-25*
*Always verify with the official Information Brochure for the current academic year*
