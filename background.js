chrome.webNavigation.onCommitted.addListener(
    (details) => {
        const url = new URL(details.url);

        const isExcluded = [
            "google.com",
            "yandex.ru",
            "bing.com"
        ].some(domain => url.hostname.includes(domain));

        if (!isExcluded && details.frameId === 0) {
            chrome.scripting.executeScript({
                target: { tabId: details.tabId },
                files: ["content.js"]
            });
        }
    }
);