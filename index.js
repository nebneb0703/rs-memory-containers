function set_theme(is_dark) {
    const html = document.documentElement.classList;

    if (is_dark) {
        html.add("theme-dark");
        html.remove("theme-light");
    } else {
        html.add("theme-light");
        html.remove("theme-dark");
    }
}

function init_theme() {
    const stored = localStorage.getItem("theme");

    if (stored) {
        set_theme(stored == "dark");
        return;
    }

    const theme = window.matchMedia("(prefers-color-scheme: dark)");

    set_theme(theme.matches);
    theme.addEventListener("change", event => set_theme(event.matches));
}

function toggle_theme() {
    const html = document.documentElement.classList;

    html.toggle("theme-light");
    html.toggle("theme-dark");

    localStorage.setItem("theme", html.contains("theme-dark") ? "dark" : "light");
}

init_theme();