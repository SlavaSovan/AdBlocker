document.addEventListener("DOMContentLoaded", () => {
    const display_domain = document.getElementById("displayDomain");

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tab = tabs[0];
        try {
            const url = new URL(tab.url);
            display_domain.textContent = url.hostname;
        } catch (e) {
            display_domain.textContent = "";
            console.error("Ошибка получения домена:", e);
        }
    });

    const state = document.getElementById("switchToggle");

    chrome.storage.sync.get("enabled", (data) => {
        state.checked = data.enabled || false;
    });

    state.addEventListener("change", () => {
        const new_state = state.checked;
        chrome.storage.sync.set({ enabled: new_state });
    });
});