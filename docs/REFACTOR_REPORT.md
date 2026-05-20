# ShoeStore Refactor Report

Date: 2026-05-21  
Scope: Full-project cleanup, restructure, and standardization (functionality preserved).

## 1. Removed files

| File | Reason |
|------|--------|
| `src/App.css` | Unused (styles via Tailwind in `index.css`) |
| `backend/routers/_accounting_origin.py` | Temporary extract from `origin/main` |

## 2. Created files

| File | Purpose |
|------|---------|
| `src/lib/auth.js` | Token helpers, RBAC (`roleHasAccess`), admin landing paths |
| `src/lib/api.js` | Shared `apiFetch`, `fetchCurrentUser` |
| `src/lib/constants.js` | Store filters (`SHOE_SIZES`, `PRICE_RANGES`) |
| `src/lib/format.js` | `formatCurrency` helper |
| `src/components/guards/AdminGuard.jsx` | Reusable admin route guard |
| `src/layouts/AppLayout.jsx` | Shell: header, cart, RBAC nav, outlet context |
| `src/pages/store/ProductListPage.jsx` | Home product listing + filters |
| `src/pages/store/StorePages.jsx` | Detail, checkout, profile wrappers |
| `src/pages/admin/AdminPages.jsx` | Admin page wrappers |
| `src/pages/LoginPage.jsx` | Login route |
| `src/routes/router.jsx` | React Router configuration |
| `backend/core/config.py` | `SECRET_KEY`, `DEBUG_MODE`, JWT settings |
| `backend/core/__init__.py` | Package marker |
| `backend/services/payroll_service.py` | Payroll domain logic (moved from root) |
| `backend/services/__init__.py` | Package marker |
| `backend/routers/payroll.py` | Salary/payroll API (split from accounting) |
| `backend/scripts/_payroll_endpoints.py` | Source template for payroll router |
| `backend/scripts/merge_payroll_router.py` | Build script for `payroll.py` |
| `.env.example` | Environment variable template |
| `docs/REFACTOR_REPORT.md` | This report |

## 3. Renamed / moved (logical)

| From | To |
|------|-----|
| Monolithic `src/App.jsx` (~470 lines) | `App.jsx` (7 lines) + `layouts/`, `pages/`, `routes/` |
| `backend/payroll_service.py` (logic) | `backend/services/payroll_service.py` |
| Payroll routes in `accounting.py` | `backend/routers/payroll.py` |

`backend/payroll_service.py` kept as a **re-export shim** for backward compatibility.

## 4. Refactored modules

- **`src/App.jsx`**: Router entry only.
- **`backend/routers/accounting.py`**: Accounting, reports, promotions only (~332 lines).
- **`backend/routers/auth.py`**: Config from `core.config`.
- **`backend/main.py`**: Registers `payroll_router`; removed unused `Depends` import.
- **`src/components/Login.jsx`**: Uses `setToken` from `lib/auth.js`.

## 5. Dependency changes

| Change | Detail |
|--------|--------|
| **Moved** | `lucide-react` → `dependencies` (used at runtime in many components) |
| **Removed** | None (no unused npm packages removed in this pass) |
| **Added** | None |

## 6. Architecture improvements

```text
src/
  lib/           # auth, api, constants, format
  layouts/       # AppLayout (cart, RBAC nav)
  pages/         # route-level pages (store + admin)
  routes/        # router definition
  components/    # feature UI (unchanged names)

backend/
  core/          # configuration
  services/      # payroll_service (domain logic)
  routers/       # auth, products, orders, warehouse, accounting, payroll, system
```

- **Separation of concerns**: Payroll API isolated from accounting.
- **Single payroll formula**: `services/payroll_service.py` remains source of truth.
- **Frontend API/RBAC**: Centralized in `src/lib/`.

## 7. Performance improvements

- Smaller `App.jsx` bundle chunking potential via route-level files (no lazy loading added yet).
- No database query changes in this pass (payroll logic unchanged).

## 8. Remaining technical debt

- Admin components still use local `fetch` + token state; migrate to `src/lib/api.js` incrementally.
- `POST /api/promotions` still exists on both `orders` and `accounting` routers (duplicate route risk).
- Cart remains in-memory on the client (no backend cart persistence).
- ~20% test-design gaps (PDF invoice, balance sheet, POS voucher, etc.) — see prior audit.
- No automated tests mapped to `docs/architecture/test_design.md`.
- Large admin components (`SalesManagement`, `AccountingManagement`, …) not yet split.

## 9. Remaining risks

- **API compatibility**: Payroll paths unchanged (`/api/salaries/*`); behavior should match pre-split accounting.
- **Import path**: Code importing `payroll_service` at repo root still works via shim.
- **BOM**: If `accounting.py` was saved with UTF-8 BOM on Windows, watch for edge-case import issues (currently clean).

## 10. Verification performed

- `npm run build` — success
- `python -m py_compile` on `main.py`, `payroll.py`, `accounting.py`, `auth.py`, `services/payroll_service.py` — success

Recommended manual smoke test: login as `ketoan@shoestore.vn` → `/admin/salary` → load payroll, timesheet, finalize, CSV export.
