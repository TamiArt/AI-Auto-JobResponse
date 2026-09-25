# Git conflict rule for JOBOS

When merging or rebasing this feature branch, keep only the newest JOBOS implementation from the feature branch for files changed by this work.

## Required conflict handling

1. Do not keep both versions of a conflicted file.
2. Do not restore the old implementation from the base branch.
3. In GitHub Desktop / VS Code / Git UI, choose the incoming/new feature version for a file when the conflict is between the old base implementation and this feature branch.
4. After resolving, verify that the file contains no Git conflict markers.
5. The final tree must contain one implementation per file: the new version only.

If a conflict is caused by independent work that must be preserved, resolve it by integrating the required behavior into the new feature version, then remove the old duplicate implementation. Never leave parallel old/new files as a workaround.
