# Compatibility baselines

These files are snapshots of the accepted Product, Order, and Inventory contracts at commit `595c2e1597293819956849b467f6c37c86b1d525` (`info.version` 1.0.0). The pipeline compares each current provider specification with its matching snapshot using `oasdiff`.

Do not regenerate snapshots automatically or edit them alongside ordinary specification changes. Update one only when the team intentionally accepts the candidate as the new compatibility baseline, and review that change separately from API implementation. Keep `info.version` and the source release or commit aligned so provider and consumer repositories can pin the same immutable contract version.
