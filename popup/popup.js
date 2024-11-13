document.addEventListener("DOMContentLoaded", () => {
    const display_domain = document.getElementById("displayDomain");
    const state = document.getElementById("switchToggle");
    const removeButton = document.getElementById("removeButton");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        try {
            const url = new URL(tab.url);
            display_domain.textContent = url.hostname;
        } catch (e) {
            display_domain.textContent = "";
            console.error("Ошибка получения домена:", e);
        }
    });

    chrome.storage.sync.get("enabled", (data) => {
        state.checked = data.enabled || false;
        state.classList.add("no-animation");

        setTimeout(() => {
            state.classList.remove("no-animation");
        }, 10);
    });

    state.addEventListener("change", () => {
        const new_state = state.checked;
        chrome.storage.sync.set({ enabled: new_state });
    });

    removeButton.addEventListener("click", () => {
        chrome.storage.sync.get("removeModeActive", (data) => {
            chrome.storage.sync.set({ removeModeActive: !data.removeModeActive });
        });
    });

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.removeModeActive) {
            removeButton.textContent = changes.removeModeActive.newValue ? "Cancel" : "Remove element";
        }
    });
});