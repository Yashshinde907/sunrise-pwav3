# 🌅 Sunrise Realty PWA — Complete CRM & Lead Tracker

> A production-grade Progressive Web App for the Sunrise Realty team, Pune.
> Mobile-first, installable, works offline, Google Sheets as database.

---

## 📁 File Structure

```
sunrise-pwa/
├── index.html          ← App shell + all HTML (474 lines)
├── manifest.json       ← PWA installable config
├── sw.js               ← Service Worker (offline caching)
├── Code.gs             ← Google Apps Script backend (435 lines)
├── icon-192.png        ← App icon
├── icon-512.png        ← App icon (large)
├── css/
│   └── style.css       ← All styles, mobile-first (278 lines)
└── js/
    ├── config.js       ← API URL, SYNC_MS, generateUID()
    ├── utils.js        ← $(), ls(), apiFetch(), showToast(), etc.
    ├── loader.js       ← Reusable Loader component (progress bar, skeleton, global)
    ├── auth.js         ← Login, Signup, Logout, Heartbeat, Profile Drawer
    ├── data.js         ← fetchAll(), all filters (Today/Week/LastWeek/Range/All)
    ├── render.js       ← renderDash(), renderLeadsFeed(), renderChart()
    ├── forms.js        ← Daily report, Leads, Feedback, Export (XLSX + PDF)
    ├── admin.js        ← Users, Teams, Audit, Backup/Restore, Settings
    └── main.js         ← bootApp(), goSec(), navigation, pull-to-refresh
```

---

## 🗄️ Google Sheets Structure

### Required Sheets (exact names, exact column order):

#### Users
| A: UserID | B: Username | C: Password | D: Role | E: Designation | F: FullName | G: Phone | H: Email | I: Status | J: Team |
|-----------|-------------|-------------|---------|----------------|-------------|---------|---------|---------|------|
| SR1X2Y3Z | admin | admin | Admin | admin | admin | 1234567890 | abc@gmail.com | active | LionSquad |

#### Sheet1 (Daily Tracking)
| A: Timestamp | B: EmployeeName | C: UserID | D: Username | E: Designation | F: TotalCalls | G: ConnectedCalls | H: Visits | I: Bookings | J: CreatedPosts | K: PostCounts | L: PostUploads | M: TargetsCompleted | N: Email | O: PositiveClients |

#### Sheet2 (Positive Leads)
| A: Timestamp | B: EmployeeName | C: UserID | D: Username | E: ClientName | F: ContactNo | G: Feedback | H: Email | I: ScheduledDate | J: ScheduledTime | K: FollowUpCount | L: FeedbackHistory | M: Status |

> **Status column (M)**: `positive` or `negative`
> **FeedbackHistory (L)**: JSON array, e.g. `[{"ts":"...","text":"..."}]`

#### Settings
| A: Key | B: Value |
|--------|---------|
| Call_Target | 500 |
| Booking_Target | 2 |
| WA_Template | (blank) |
| SMS_Template | (blank) |
| Email_Template | (blank) |
| Email_Subject | (blank) |

#### Teams
| A: TeamName | B: Members(JSON) | C: Description | D: CreatedAt |
|-------------|-----------------|----------------|-------------|
| Lion Squad | ["geeta","prajyot","vaibhavi","yash","pratik"] | Yash SIR (TL) | 2026-08-04T... |

#### Auto-created sheets (by Code.gs):
- **AuditLogs** — `Timestamp | Actor | Action | Detail`
- **Sessions** — `Username | Status | UpdatedAt`
- **Backups** — `BackupID | Timestamp | DataType | Data(JSON)`

---

## 🚀 Deployment Steps

### Step 1 — Google Apps Script

1. Open your Google Sheet
2. Go to **Extensions → Apps Script**
3. Delete any existing code
4. Paste the entire contents of `Code.gs`
5. Click **Save** (💾)
6. Click **Deploy → New deployment**
7. Type: **Web App**
8. Execute as: **Me**
9. Who has access: **Anyone**
10. Click **Deploy** → Copy the URL

### Step 2 — Update API URL

Open `js/config.js` and replace the `API` constant with your deployment URL:
```js
const API = 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
```

### Step 3 — Host the PWA

Upload the entire `sunrise-pwa/` folder to any static host:

| Host | Steps |
|------|-------|
| **GitHub Pages** | Push to GitHub repo → Settings → Pages → Deploy from main |
| **Netlify** | Drag & drop folder to [netlify.com/drop](https://app.netlify.com/drop) |
| **Vercel** | `npx vercel` in the folder |

### Step 4 — Install on Phone

1. Open the hosted URL in **Chrome** (Android) or **Safari** (iPhone)
2. **Android**: Menu → "Add to Home Screen"
3. **iPhone**: Share button → "Add to Home Screen"

---

## ✨ Features

| Feature | Details |
|---------|---------|
| **UserID dedup** | Records aggregated by `UserID` (primary) or `username` (fallback) — no duplicate rows per person |
| **Signup page** | New users self-register with auto-generated UserID (format: `SRxxxxxxxx`) |
| **Login** | Username + password, locked account detection |
| **Dashboard** | KPIs: Calls, Visits, Bookings, Positive Leads |
| **Ranked Performance** | Sorted: Bookings → Visits → Positive → Follow-ups → Connected Calls |
| **Export Performance** | Export ranked table with active filters as XLSX or PDF |
| **Export Full Data** | Export all daily + leads data as XLSX or PDF |
| **7 Time Filters** | Today, Yesterday, This Week, **Last Week (Mon–Sun)**, Month, Year, Date Range, All |
| **Designation Filters** | All / Sales / Telecaller / Digital |
| **Team Filters** | Dynamic pills from Teams sheet |
| **Positive → Negative** | Toggle client status, tracked per lead, red card styling |
| **Follow-up tracking** | Increment counter per client, shown in feed + performance table |
| **Feedback history** | JSON array of timestamped entries per client |
| **Message templates** | WhatsApp, SMS, Email with `{name}` `{phone}` `{agent}` placeholders |
| **Multi-client leads** | Submit multiple clients in a single form |
| **User management** | Add, edit, lock/unlock, force logout, remove users |
| **Teams management** | Create, edit, delete teams with member selection |
| **Audit log** | Every action logged with timestamp, actor, action, detail |
| **Backup & Restore** | Full backup stored in Google Sheet; restore Settings + Teams |
| **Auto-sync** | 5-minute automatic data refresh |
| **Pull-to-refresh** | Touch gesture to refresh immediately |
| **Offline support** | Service worker caches app shell assets |
| **Mobile-first** | Bottom tab bar on mobile, sidebar on desktop |
| **Hamburger menu** | Right-side drawer with all navigation on mobile |

---

## ♿ Accessibility (ARIA)

- `role="progressbar"` on top progress bar
- `aria-busy="true"` on skeleton containers during loading  
- `aria-live="polite"` on toast notifications
- `aria-label` on all icon-only buttons
- `role="dialog" aria-modal="true"` on all modals
- `role="tablist"` on bottom tab bar

---

## 🔐 Security Notes

- Passwords stored in Google Sheets plain-text (use Google Sheet's access controls)
- Lock accounts via admin panel to prevent unauthorized access
- Force logout instantly via Sessions sheet
- All admin actions logged in AuditLogs
- New signups default to `Agent` role (no admin access without promotion)

---

## 🛠️ Updating After Code.gs Changes

After editing `Code.gs`:
1. Click **Deploy → Manage deployments**
2. Select existing deployment → Edit (✏️)
3. Set Version: **New version**
4. Click **Deploy**
5. The URL stays the same — no frontend change needed

---

## 📱 Tested Environments

- ✅ Chrome (Android) — full PWA install
- ✅ Safari (iOS 16+) — home screen install
- ✅ Chrome (Windows/Mac) — desktop sidebar layout
- ✅ Firefox (Android) — works without install

---

## 📞 Support

Sunrise Realty, Pune  
Internal Tool — Built for team use only  
