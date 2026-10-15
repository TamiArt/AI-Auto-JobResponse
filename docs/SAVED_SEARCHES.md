# Saved searches — storage and UI contract

## Behavior

- Saves named search presets in the current browser using local storage; no account or server is required.
- Keeps up to 20 presets to avoid unbounded browser storage growth.
- The search screen can save the current form filters under a user-provided name, list saved presets, reapply a preset, and delete it.
- A case-insensitive, whitespace-normalized name identifies a preset. Saving the same name updates that preset while preserving its ID and creation timestamp.
- Preserves query, location/area, salary bounds and currency, work mode, employment type, experience, publication window, sort order, selected sources, and configured Telegram channels.
- Keeps named presets separate from recent-search history and starred vacancies.
- Rejects empty names, empty queries, and empty source selections.
- Treats malformed JSON, invalid entries, blocked storage, and storage quota errors as recoverable conditions. Search functionality must not depend on storage availability.
- Does not contact providers, refresh vacancies, or submit applications.

## Privacy and limitations

Presets remain in the browser profile where they were created. They do not sync across devices or browsers, and clearing browser site data may remove them. This is intentional until JOBOS has an explicitly chosen persistence backend.

## Follow-up work

- Add explicit feedback if browser storage is unavailable or full, rather than silently treating a save as durable.
- Add cross-device sync only after a backend and account/privacy model are selected.
- Add optional scheduled refresh/notifications only after source usage policies and delivery permissions are verified.
