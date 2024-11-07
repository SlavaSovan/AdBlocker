let state = false;

chrome.storage.sync.get("enabled", (data) => {
    state = data.enabled || false;
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.enabled) {
        state = changes.enabled.newValue
    }
});

chrome.webNavigation.onCommitted.addListener(
    (details) => {
        const url = new URL(details.url);

        const isExcluded = [
            "google.com",
            "yandex.ru",
            "bing.com"
        ].some(domain => url.hostname.includes(domain));

        if (state && !isExcluded && details.frameId === 0) {
            chrome.scripting.executeScript({
                target: { tabId: details.tabId },
                files: ["scripts/content.js"]
            });
        }
    }
);