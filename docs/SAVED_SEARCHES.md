# Saved searches — storage contract

This module provides the persistence layer for named search presets before the UI is connected.

## Behavior

- Stores search criteria in the current browser using local storage; no account or server is required.
- Keeps up to 20 presets to avoid unbounded browser storage growth.
- A case-insensitive, whitespace-normalized name identifies a preset. Saving the same name updates that preset while preserving its ID and creation timestamp.
- Preserves filters, selected sources, and selected Telegram channel names; duplicate source/channel entries are normalized.
- Rejects empty names, empty queries, and empty source selections.
- Treats malformed JSON, invalid entries, blocked storage, and storage quota errors as recoverable conditions. Search functionality must not depend on storage availability.
- Does not contact providers, refresh vacancies, or submit applications.

## Privacy and limitations

Presets remain in the browser profile where they were created. They do not sync across devices or browsers, and clearing browser site data may remove them. This is intentional until JOBOS has an explicitly chosen persistence backend.

## Next integration step

Connect these functions to the search screen: save the current filter state under a user-provided name, list and apply saved presets, and allow deletion with a clear confirmation. Keep recent-search history separate from named presets.
