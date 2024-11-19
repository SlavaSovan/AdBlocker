document.addEventListener("DOMContentLoaded", () => {
    const display_domain = document.getElementById("displayDomain");
    const state = document.getElementById("switchToggle");
    const removeButton = document.getElementById("removeButton");
    const tabList = document.querySelectorAll(".tab");
    const contentSections = document.querySelectorAll(".tab-content");
    let cur_dom = "";

    //Отображение домена текущей страницы в окне popup,
    //переключение вкладок окна popup
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        try {
            const url = new URL(tab.url);
            cur_dom = url.hostname
            display_domain.textContent = cur_dom;
        } catch (e) {
            display_domain.textContent = "";
            console.error("Ошибка получения домена:", e);
        }

        tabList.forEach((tab, index) => {
            tab.addEventListener("click", () => {
                tabList.forEach((t) => t.classList.remove("active"));
                contentSections.forEach((section) =>
                    section.classList.remove("active")
                );

                tab.classList.add("active");
                contentSections[index].classList.add("active");

                if (index === 1) {
                    loadRemovedElements(cur_dom);
                }
            });
        });
    });

    //Убирает анимацию с тумблера вкл./выкл. при открытии
    //окна popup
    chrome.storage.sync.get("enabled", (data) => {
        state.checked = data.enabled || false;
        state.classList.add("no-animation");

        setTimeout(() => {
            state.classList.remove("no-animation");
        }, 10);
    });

    //Обработчик событий на тумблер (реализация 
    //включения и выключения расширения)
    state.addEventListener("change", () => {
        const new_state = state.checked;
        chrome.storage.sync.set({ enabled: new_state });
    });

    //Обработчик событий на кнопку перехода в режим ручного удаления
    removeButton.addEventListener("click", () => {
        chrome.storage.sync.get("removeModeActive", (data) => {
            chrome.storage.sync.set({ removeModeActive: !data.removeModeActive });
        });
    });

    //Изменение кнопки после перехода в режим ручного удаления
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.removeModeActive) {
            removeButton.textContent = changes.removeModeActive.newValue ? "Cancel" : "Remove element";
        }
    });

    //Функция вывода списка удалённых элементов и добавление кнопки
    //восстановления удалённых элементов
    function loadRemovedElements(domain) {
        const remList = document.getElementById("removedList");
        remList.innerHTML = "";

        chrome.storage.sync.get([domain], (data) => {
            const removedElements = data[domain] || [];
            removedElements.forEach((path, index) => {
                const li = document.createElement("li");
                li.textContent = path;

                const restoreButton = document.createElement("button");
                restoreButton.textContent = "Restore";
                restoreButton.classList.add("rstr_btn")
                restoreButton.addEventListener("click", () => {
                    removedElements.splice(index, 1);
                    chrome.storage.sync.set({ [domain]: removedElements });
                    loadRemovedElements(domain);
                });

                li.appendChild(restoreButton);
                remList.appendChild(li);
            });
        });
    }
});