let cur_dom = window.location.hostname;

function isExternalLink(url) {
    try {
        const link_dom = new URL(url).hostname;
        return !link_dom.includes(cur_dom);
    } catch (e) {
        return false;
    }
}

function findAndRemoveExternalContainer(element) {
    // Если элемент пустой или корневой, выходим
    if (!element || !element.parentElement) return;

    // Проверяем, является ли текущий элемент контейнером
    if (['DIV', 'SECTION', 'ASIDE'].includes(element.tagName)) {
        const links = element.querySelectorAll('a');
        const hasOnlyExternalLinks = Array.from(links).every(link =>
            isExternalLink(link.href));

        if (hasOnlyExternalLinks) {
            parent = element.parentElement;
            element.remove();
            removeEmptyContainers(parent);
            return;
        }
    }

    findAndRemoveExternalContainer(element.parentElement);
}

function removeEmptyContainers(container) {
    // Удаляем элемент, если он пустой (не содержит дочерних элементов и текста)
    if (
        ['DIV', 'SECTION', 'ASIDE'].includes(container.tagName) &&
        container.innerText.trim() === ""
    ) {
        parent = container.parentElement;
        container.remove();
        removeEmptyContainers(parent);
        return;
    }
}

const observer = new MutationObserver(() => {
    document.querySelectorAll('a').forEach(link => {
        if (isExternalLink(link.href) && !(link.parentElement.tagName === 'p')) {
            findAndRemoveExternalContainer(link);
        }
    });
});
observer.observe(document.body,
    {
        childList: true,
        subtree: true
    });
