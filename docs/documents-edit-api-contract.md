# Resources document editing API contract

The backend working tree at `/home/naveen/Desktop/whynest` contains the Category,
YouTube, edit and assignment APIs described below. Reported validation/404 errors
indicate the running backend may not include those changes. Confirm the frontend's
`BACKEND_URL` and deploy/restart the updated infield-core service before enabling
the full flow. Local source presence alone does not verify deployment.

## Read assignments

`GET /api/v1/documents/:id/assignments` returns `{ designationIds: string[] }` in
the standard success envelope. The frontend uses this endpoint as the authority.
The backend uses `assignmentFamilyId` for designation copies; `documentGroupId`
represents version lineage and must not be used to infer assignment families.

A 404 from an older deployment makes Also Assign To unavailable without blocking
metadata editing. Other lookup errors retain a retry option. There is no list-based
fallback, because matching version lineage, filenames or shared files is unsafe.
The backend must enforce assignment uniqueness atomically when saving.

## Edit a single row and optionally assign additional designations

`PATCH /api/v1/documents/:id`

For metadata/link edits, accept JSON:

```json
{
  "title": "Safety training",
  "category": "Training",
  "description": null,
  "fromDate": null,
  "toDate": null,
  "acknowledgementRequired": true,
  "alsoAssignTo": ["designation-3"]
}
```

For YouTube rows, the payload also includes `youtubeUrl`, `youtubeId` and
`youtubeKind` (`video` or `playlist`). The URL is canonicalized to a watch URL for
videos or a playlist page URL for playlists; video URLs containing `list` retain
only the video. Derive/verify ID and kind on the server as well.

For file replacement, accept multipart/form-data with a `file` part and a
`metadata` part containing the JSON above. Metadata nulls explicitly clear optional
fields; false explicitly disables acknowledgement. Omitting `file` retains the file.
Document Type, the row's designation, status, version and acknowledgement records
are not writable through this payload. Return the updated `DocumentRecord` using
the standard API response envelope.

Required server behavior:

- Validate project/admin access, trimmed Title and Category, date order, same document
  type and the 100 * 1024 * 1024 byte limit. MIME/extension checks in the browser are
  only early feedback; inspect files on the server.
- Save the edit and requested assignments atomically. Validate that additional
  designations belong to the project and enforce assignment uniqueness across all
  rows (including inactive ones). Reject conflicts without partial writes.
- Metadata-only edits and acknowledgement toggles retain the version and status.
  Compare normalized link content so submitting an unchanged URL does not publish
  a version. Replacing a file or changing the link increments this row's version
  exactly once and updates the stored file/link and size.
- New assignment rows use the saved values, same status and same stored file/link
  without re-uploading, start at v1 and have no acknowledgement records. Other
  existing rows are never updated by this operation or by a row status toggle.
- Keep acknowledgement records keyed to row/user/version. A new version requires
  acknowledgement again when enabled; preserve the earlier version's history.
  Turning acknowledgement on requires it for the current version; turning it off
  stops prompting without deleting records.
- Emit the INF2-2776 new-upload event only for changed content/new versions and new
  assignments, scoped to relevant recipients. Metadata-only edits and acknowledgement
  toggles must not emit it. The consuming app must refresh document metadata/content,
  prompt acknowledgement as needed and handle this event on next open.

## List and upload additions

`GET /api/v1/documents` must return all statuses with `data`, `total`, `page`, `limit`
and stable ordering. Include `category` as a separate field from `targetModule`.
File records retain `originalFileName`, `gcsPath`, `fileSize`, `documentVersion`.
YouTube records use `documentType: "YouTube"`, `youtubeUrl`, `youtubeId`, `youtubeKind`;
the UI labels the type "YouTube Link", shows a dash for Size and an Open action.
Older rows without Category open with an empty required Category field.

The reported running `POST /api/v1/documents/upload` endpoint rejected `category` with
`property category should not exist`. File uploads therefore retain the existing
accepted fields, and the upload form does not collect Category until the backend
supports persisting it. Category remains a separate field in the proposed edit
contract above; it must not be mapped onto `targetModule`.

For YouTube resources, the frontend sends the usual metadata plus `documentType:
"YouTube"`, `youtubeUrl`, `youtubeId`, `youtubeKind`, and no `file` part. No YouTube
Data API call is needed. Accept watch, youtu.be and shorts video URLs and explicit
playlist page URLs. Reject non-YouTube URLs, channels, searches and RD-prefixed
mix playlists. A video with playlist context is saved as the video only.

## Verification

Frontend unit tests cover date/required-field checks, replacement file type and size
boundaries, supported/rejected YouTube URLs, playlist/video parsing, later-page
requests, metadata clears and multipart payloads. Integration checks against the
backend and consuming app are still needed for versioning, independent assignment
rows, acknowledgement history, notification scope and content playback.
