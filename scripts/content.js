(function () {
    let cur_dom = window.location.hostname;
    let whitelist_domains = [];
    let blacklist_id_cl = [];

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
            elems_by_class.forEach(elem => {
                const parent = elem.parentElement;
                elem.remove();
                removeEmptyContainers(parent);
                return;
            });

            const elems_by_id = document.querySelectorAll(
                `[id*='${word}']`
            );
            elems_by_id.forEach(elem => {
                const parent = elem.parentElement;
                elem.remove();
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
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
            });
        }
    });
})();