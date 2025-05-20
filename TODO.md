TODO (for next session):

* Toolbar popup info not updating while navigating (SPA/ticker changes)
* ROI table populates but then disappears on some refreshes (likely React re-render or MutationObserver timing)
* Modal box and ROI tables stuck with previous stock data until full page refresh (not syncing with ticker navigation)
* Call Income not accurate on AAPL stock (verify extraction, calculation, and Yahoo data format parsing for call premiums)
* Modal box and cell data not updating properly when expiration date changes (data lags or is stale)

- Investigate and robustly handle Yahoo page dynamic updates so tool remains persistent, up-to-date, and always in sync with the current ticker and expiration selection.

(Focus: strengthen event handling, storage sync, DOM observation, expiration dropdown monitoring, and ensure precise parsing/calculation for all ROI elements)
