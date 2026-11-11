# INF2-2884 Resources Categories

Implemented on `inf2-2857` as requested. Both frontend and backend changes are needed.

## Storage and API

Category is the display name for the existing `targetModule` field. Uploads continue
sending `targetModule`; the document list and mobile Resources API continue reading it.
There is no separate Category field or data migration.

- `GET /api/v1/documents-config/categories?projectId=<id>` returns `projectId`,
  `revision` and ordered `categories` with `name`, `isActive`, `documentCount`.
- `PUT /api/v1/documents-config/categories` accepts `projectId`, `revision`, and
  `categories: [{ name, originalName?, isActive }]`. Existing rows retain their
  `originalName` during editing; new rows omit it.

The five defaults are Training, Product Pitch, Information Schemes, Additional
Information and Content. Existing customized lists, including empty lists, are
preserved. Counts include Active and Inactive documents across all designations
and pages, excluding soft-deleted records.

Names are trimmed, limited to 24 characters and checked for case-insensitive
uniqueness on both sides. The server rejects removal of categories with documents
and stale saves. Renames update the project's matching documents in one pipeline,
including simultaneous name swaps; they preserve document versions, status and
acknowledgements. Legacy module configuration routes share validation/removal checks.

Access requires module-config read/update permission and project/account scope.
The document's category configuration and upload database insert use the same
transaction lock so uploads cannot race with category removal/renaming. MongoDB
must support transactions (replica set or sharded cluster). No migration command
is necessary for the existing configuration records.

## Frontend

Manage categories is in Upload Documents and uses a centered native dialog. All
changes remain local until Save; Cancel/Close/Escape discard the draft. Row errors
explain disabled saves; populated categories have a disabled Remove button.
Successful saves refresh all designation dropdowns and document rows; partially
filled upload forms retain their other values when a category is renamed. A keyed
page resets category state when navigating between projects.

## Running locally

Restart/reload the updated `whynest` infield-core service and ensure the frontend's
`BACKEND_URL` points to it. A 404 on the categories endpoint means the running
backend does not include these changes. Keep transaction support enabled in MongoDB.

Verification includes frontend validation/API tests, backend category planning,
project authorization, count/removal/persistence tests and browser checks with
fixture data. Live database and mobile-device integration are not exercised by
these unit/browser fixture checks.

Final checks: 7 frontend tests and 26 backend tests pass with normal diagnostics,
plus frontend ESLint and TypeScript. A shared CodeSequence ID generic was corrected
to match its string ID. The full backend TypeScript check was stopped after an
extended run; it has not been verified to completion.
