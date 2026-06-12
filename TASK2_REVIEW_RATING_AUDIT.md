# Task 2: Review and Rating System Audit

## Overview
A strict audit was conducted on the Review and Rating System components, backend APIs, and database structures.

## Requirement Checklist

| Requirement | Status | Notes |
| :--- | :--- | :--- |
| **1–5 star ratings** | **PASS** | `StarRating.jsx` provides interactive 1-5 stars. `reviewController.js` validates bounds. |
| **Text review** | **PASS** | `ReviewForm.jsx` handles text input. Checked for empty submissions. |
| **Photo upload** | **PASS** | File input accepts images, preview generated, size limited to 5MB. Encoded to DataURL. |
| **Review replies** | **PASS** | Users can reply to existing reviews. Handled via `addReply` in controller. |
| **Helpful votes** | **PASS** | Implemented with a `Helpful` button and `helpfulCount` tracking. |
| **Flag inappropriate review** | **PASS** | Modal allows users to flag reviews with specific reasons. Sent to `review_flags`. |
| **Admin/moderator review page** | **PASS** | `Moderator.jsx` implemented for admins to dismiss flags or permanently delete reviews. |
| **Sorting** | **PASS** | Supported: `newest`, `highest` (highest rated), `helpful` (most helpful). |
| **Backend APIs** | **PASS** | `reviewRoutes.js` and `adminRoutes.js` correctly mapped to `reviewController.js` and `adminController.js`. |
| **Database tables** | **PASS** | SQL queries explicitly reference `reviews`, `review_replies`, and `review_flags` tables. |
| **Frontend UI** | **PASS** | Clean and modular architecture (`ReviewSection`, `ReviewList`, `ReviewForm`, `StarRating`). |
| **Edge cases** | **PASS** | Guest prompts to login, file type/size validation, and moderator role guards correctly implemented. |
| **Tests** | **FAIL** | No tests found for the Review and Rating system in the backend test suite (`runTests.js`). |

## Missing Issues
- **Missing Automated Tests**: The backend test suite (`backend/src/scripts/runTests.js`) focuses entirely on the Cancellation/Refund system and Flight Status. There are **zero** automated tests covering review creation, reply threads, helpful vote incrementing, and moderation actions.

## UI Proof Needed
To fully sign off on the UX, the following visual proofs (screenshots or recordings) are required:
1. Submitting a review with a photo attached.
2. The sorting dropdown reordering the review list.
3. The flagging modal and submission flow.
4. The Moderator dashboard displaying flagged reviews and the delete/keep actions.

## Scoring
**Score: 90/100**

## Final Verdict
**APPROVED WITH CONDITIONS.** The feature is exceptionally well-implemented across the full stack with great attention to edge cases and UI component separation. However, to ensure long-term stability, automated tests for the review and moderation flows must be added to the test suite before calling it 100% complete.
