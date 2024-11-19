(function () {
    let cur_dom = window.location.hostname;
    let whitelist_domains = [];
    let blacklist_id_cl = [];
    let removedElements = [];
    let removeModeEnabled = false;
    let lastHighlightedElement = null;

    //Получение фильтров (допустимые домены, нежелательные
    //классы или id)
    async function getFilters() {
        try {
            const response = await fetch(
                chrome.runtime.getURL('./resources/filters.json')
            );
            const data = await response.json();
            whitelist_domains = data.whitelist_of_doms;
            blacklist_id_cl = data.blacklist_id;
        } catch (e) {
            console.error("Не удалось загрузить filters.json:", e);
        }
    }

    // Проверка, ведет ли ссылка на какой-либо внешний источник
    function isExternalLink(url) {
        try {
            const link_dom = new URL(url).origin;
            return (
                !link_dom.includes(cur_dom) &&
                !whitelist_domains.some(
                    wt_dom => link_dom.includes(wt_dom)
                )
            );
        } catch (e) {
            return false;
        }
    }

    // Поиск и удаление контейнера с рекламой
    function findAndRemoveExternalContainer(element) {
        if (!element || !element.parentElement) return;

        if (['DIV', 'SECTION', 'ASIDE'].includes(element.tagName)) {
            const links = element.querySelectorAll('a');
            const hasOnlyExternalLinks = Array.from(links).every(
                link => isExternalLink(link.href)
            );

            if (hasOnlyExternalLinks) {
                const parent = element.parentElement;
                element.remove();
                removeEmptyContainers(parent);
                return;
            }
        }

        if (element.parentElement &&
            element.parentElement.tagName !== "P"
        ) {
            findAndRemoveExternalContainer(element.parentElement);
        }
    }

    // Удалние пустых контейнеров после удаления контейнера с внешней ссылкой
    function removeEmptyContainers(container) {
        if (!container || !container.parentElement) return;

        if (
            ['DIV', 'SECTION', 'ASIDE'].includes(container.tagName) &&
            container.innerText.trim() === ""
        ) {
            const parent = container.parentElement;
            container.remove();
            removeEmptyContainers(parent);
            return;
        }
    }

    // Удаление элементов по классам и айди из блэк-листа
    function removeAdsByClassAndId() {
        blacklist_id_cl.forEach(word => {
            const elems_by_class = document.querySelectorAll(
                `[class*='${word}']`
            );
            elems_by_class.forEach(element => {
                const parent = element.parentElement;
                element.remove();
                removeEmptyContainers(parent);
                return;
            });

            const elems_by_id = document.querySelectorAll(
                `[id*='${word}']`
            );
            elems_by_id.forEach(element => {
                const parent = element.parentElement;
                element.remove();
                removeEmptyContainers(parent);
                return;
            });
        });
    }

    // Удаление элементов iframe с внешним источником
    function removeIframes(element) {
        if (!element || !element.src) return;

        if (isExternalLink(element.src)) {
            const parent = element.parentElement;
            element.remove();
            removeEmptyContainers(parent);
            return;
        }
    }

    //Переход в режим ручнного удаления элементов
    function removeMode(isEnabled) {
        removeModeEnabled = isEnabled;

        if (removeModeEnabled) {
            document.addEventListener("mouseover", highlightElement);
            document.addEventListener("mouseout", removeHighlight);
            document.addEventListener("click", ElementToRemove, true);
        } else {
            removeLastHighlight()

            document.removeEventListener("mouseover", highlightElement);
            document.removeEventListener("mouseout", removeHighlight);
            document.removeEventListener("click", ElementToRemove, true);
        }
        return;
    }

    //Выделение элементов в режиме удаления
    function highlightElement(event) {
        if (removeModeEnabled) {
            removeLastHighlight();

            lastHighlightedElement = event.target;
            event.target.style.outline = "2px solid darkblue";
            event.target.style.backgroundColor = "#c8e3f0";
        }
        return;
    }

    //Удаление выделения элементов
    function removeHighlight(event) {
        if (removeModeEnabled) {
            event.target.style.outline = "";
            event.target.style.backgroundColor = "";
            lastHighlightedElement = null;
            return;
        }
        return;
    }

    //Добавление в список удалённых элементов
    function ElementToRemove(event) {
        if (removeModeEnabled) {
            event.preventDefault();
            event.stopPropagation();

            const element = event.target;

            const elementPath = getUniquePath(element);
            removedElements.push(elementPath);

            chrome.storage.sync.get([cur_dom], (data) => {
                const domainData = data[cur_dom] || [];
                domainData.push(elementPath);
                chrome.storage.sync.set({ [cur_dom]: domainData });
            });

            chrome.storage.sync.set({ removeModeActive: false })
        }
        return;
    }

    //Удаление последнего выделение с элемента
    function removeLastHighlight() {
        if (lastHighlightedElement) {
            lastHighlightedElement.style.outline = "";
            lastHighlightedElement.style.backgroundColor = "";
            lastHighlightedElement = null;
        }
        return;
    }


    //Создание пути к элементу для запоминания
    //удалённых элементов
    function getUniquePath(element) {
        const path = [];
        while (element && element.nodeType === Node.ELEMENT_NODE) {
            let selector = element.nodeName.toLowerCase();

            if (element.id) {
                selector += `#${element.id}`;
            } else {
                let sibling = element;
                let nth = 1;
                while ((sibling = sibling.previousElementSibling) !== null) {
                    if (sibling.nodeName.toLowerCase() === selector) nth++;
                }
                if (nth > 1) selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            element = element.parentElement;
        }
        return path.join(" > ");
    }

    //Удаление элемента
    function removeElements() {
        chrome.storage.sync.get([cur_dom], (data) => {
            const domain_data = data[cur_dom] || [];
            domain_data.forEach((path) => {
                const element = document.querySelector(path);
                if (element) {
                    element.remove();
                }
            });
        });
        return;
    }

    // Обработчик событий при изменениях в chrome.storage
    chrome.storage.onChanged.addListener((changes) => {
        if (changes[cur_dom] && !changes.removeModeActive) {
            removeElements();
        }
        if (changes.removeModeActive) {
            removeMode(changes.removeModeActive.newValue);
        }
    });


    chrome.storage.sync.get("enabled", (data) => {
        const state = data.enabled || false;

        if (state) {
            getFilters().then(() => {
                const observer = new MutationObserver(() => {
                    removeAdsByClassAndId();

                    document.querySelectorAll("iframe").forEach(
                        iframe => { removeIframes(iframe); }
                    );

                    document.querySelectorAll("a").forEach(
                        link => {
                            if (isExternalLink(link.href)) {
                                findAndRemoveExternalContainer(link);
                            }
                        }
                    );

                    removeElements();
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    });
})();