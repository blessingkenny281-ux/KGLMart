(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!reduceMotion) {
        const currentUrl = new URL(window.location.href);
        if (currentUrl.searchParams.get("transition") === "1") {
            currentUrl.searchParams.delete("transition");
            window.history.replaceState(null, "", currentUrl);
            document.body.classList.add("auth-transition-enter");
            window.setTimeout(() => {
                document.body.classList.remove("auth-transition-enter");
            }, 260);
        }
    }

    document.querySelectorAll("[data-auth-transition]").forEach((link) => {
        link.addEventListener("click", (event) => {
            if (reduceMotion || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

            event.preventDefault();
            document.body.classList.add("auth-transition-leave");
            window.setTimeout(() => {
                const destination = new URL(link.href);
                destination.searchParams.set("transition", "1");
                window.location.href = destination.href;
            }, 180);
        });
    });
})();
