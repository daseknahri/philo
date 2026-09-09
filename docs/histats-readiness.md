# Histats Readiness

This site can use Histats as a lightweight live-traffic counter while monetization approval or traffic testing is in progress. Keep it env-controlled so analytics can be enabled, replaced, or removed without editing theme files.

## Recommended Setup

Use a hidden or invisible Histats counter. Avoid visible badges because they make the site look older and less polished.

Coolify env after the hidden counter code is ready:

```env
HISTATS_ENABLE=1
HISTATS_CODE_BASE64=
HISTATS_EXCLUDE_ADMINS=1
```

Keep `HISTATS_ENABLE=0` until `HISTATS_CODE_BASE64` contains the real encoded snippet.

`HISTATS_EXCLUDE_ADMINS=1` keeps logged-in admins out of the counter, so use a private/incognito browser when testing live hits.

## Encode The Code

Paste the full Histats snippet into PowerShell and encode it:

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(@'
PASTE_HISTATS_CODE_HERE
'@))
```

Put the result into `HISTATS_CODE_BASE64`.

## Acceptance Checks

- With `HISTATS_ENABLE=0`, no Histats code appears publicly.
- With `HISTATS_ENABLE=1` and `HISTATS_CODE_BASE64` filled, the code appears in the public page footer.
- Logged-in WordPress admins are not counted when `HISTATS_EXCLUDE_ADMINS=1`.
- Public posts, homepage, and legal pages can be tracked because Histats is analytics, not an ad unit.

## How To Use It

Use Histats as the fast dashboard for live visitors, pages per visit, Facebook referrers, mobile share, and top URLs.
