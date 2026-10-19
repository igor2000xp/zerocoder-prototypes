/* ============================================================
   AI-дайджест — вся интерактивность сайта
   1. Поиск и фильтр по тегам
   2. Появление карточек при прокрутке
   3. Наклон карточек за курсором
   4. Свечение за курсором
   5. Шапка и полоска прогресса
   6. Форма подписки и конфетти
   ============================================================ */

// Короткие помощники, чтобы код ниже читался легче
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

// Если человек попросил систему уменьшить анимации — уважаем это
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------
   1. Поиск и фильтр по тегам
   ------------------------------------------------------------ */

const searchInput = $("#search");
const chips = $$(".tag-chip");
const cards = $$(".card");
const visibleCount = $("#visibleCount");
const emptyState = $("#emptyState");
const resetButton = $("#resetFilters");

let activeTag = "all";
let searchQuery = "";

function filterCards() {
    let visible = 0;

    cards.forEach((card) => {
        const tags = card.dataset.tags.split("|");

        // Ищем по заголовку, описанию и тегам
        const title = card.querySelector(".card-title").textContent;
        const description = card.querySelector(".card-desc").textContent;
        const text = `${title} ${description} ${tags.join(" ")}`.toLowerCase();

        const matchesTag = activeTag === "all" || tags.includes(activeTag);
        const matchesSearch = text.includes(searchQuery);
        const shouldShow = matchesTag && matchesSearch;

        card.classList.toggle("is-hidden", !shouldShow);

        if (shouldShow) {
            visible += 1;
        }
    });

    visibleCount.textContent = visible;
    emptyState.hidden = visible > 0;
}

searchInput.addEventListener("input", (event) => {
    searchQuery = event.target.value.trim().toLowerCase();
    filterCards();
});

chips.forEach((chip) => {
    chip.addEventListener("click", () => {
        // Снимаем активность со всех кнопок и включаем на нажатой
        chips.forEach((item) => {
            item.classList.remove("is-active");
            item.setAttribute("aria-pressed", "false");
        });

        chip.classList.add("is-active");
        chip.setAttribute("aria-pressed", "true");

        activeTag = chip.dataset.tag;
        filterCards();

        // На телефоне прокручиваем строку тегов к выбранной кнопке
        chip.scrollIntoView({
            block: "nearest",
            inline: "center",
            behavior: reduceMotion ? "auto" : "smooth",
        });
    });
});

function resetFilters() {
    activeTag = "all";
    searchQuery = "";
    searchInput.value = "";

    chips.forEach((chip, index) => {
        const isFirst = index === 0;
        chip.classList.toggle("is-active", isFirst);
        chip.setAttribute("aria-pressed", String(isFirst));
    });

    filterCards();
    searchInput.focus();
}

resetButton.addEventListener("click", resetFilters);

// Клавиша "/" быстро ставит курсор в поиск, Escape — очищает его
document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);

    if (event.key === "/" && !typing) {
        event.preventDefault();
        searchInput.focus();
    }

    if (event.key === "Escape" && document.activeElement === searchInput) {
        searchInput.value = "";
        searchQuery = "";
        filterCards();
        searchInput.blur();
    }
});

/* ------------------------------------------------------------
   2. Плавное появление карточек при прокрутке
   ------------------------------------------------------------ */

if (reduceMotion) {
    $$(".reveal").forEach((element) => element.classList.add("is-visible"));
} else {
    const revealObserver = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    revealObserver.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    $$(".reveal").forEach((element) => revealObserver.observe(element));
}

/* ------------------------------------------------------------
   3. Наклон карточек за курсором (только на компьютере)
   ------------------------------------------------------------ */

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (finePointer) {
    cards.forEach((card) => {
        card.addEventListener("pointermove", (event) => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;

            // Эти переменные использует подсветка внутри карточки (CSS)
            card.style.setProperty("--mx", `${x * 100}%`);
            card.style.setProperty("--my", `${y * 100}%`);

            card.style.transform =
                `perspective(900px) rotateX(${(0.5 - y) * 4}deg) ` +
                `rotateY(${(x - 0.5) * 4}deg) translateY(-4px)`;
        });

        card.addEventListener("pointerleave", () => {
            card.style.transform = "";
        });
    });
}

/* ------------------------------------------------------------
   4. Мягкое свечение, которое следует за курсором
   ------------------------------------------------------------ */

let glowFrame = null;

window.addEventListener("pointermove", (event) => {
    if (!finePointer || glowFrame) {
        return;
    }

    const mouseX = event.clientX;
    const mouseY = event.clientY;

    glowFrame = requestAnimationFrame(() => {
        document.documentElement.style.setProperty("--glow-x", `${mouseX}px`);
        document.documentElement.style.setProperty("--glow-y", `${mouseY}px`);
        glowFrame = null;
    });
});

/* ------------------------------------------------------------
   5. Шапка и полоска прогресса прокрутки
   ------------------------------------------------------------ */

const header = $("#siteHeader");
const progressBar = $("#progressBar");

function updateScrollUI() {
    header.classList.toggle("is-scrolled", window.scrollY > 12);

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? window.scrollY / scrollable : 0;

    progressBar.style.transform = `scaleX(${Math.min(progress, 1)})`;
}

window.addEventListener("scroll", updateScrollUI, { passive: true });
updateScrollUI();

/* ------------------------------------------------------------
   6. Форма подписки
   ------------------------------------------------------------ */

const subscribeForm = $("#subscribeForm");
const emailInput = $("#email");
const formNote = $("#formNote");
const defaultNote = formNote.textContent.trim();

function burstConfetti() {
    const panel = $(".subscribe-panel");
    const colors = ["#c9ff4f", "#5ce1ff", "#b18cff", "#ff6fae", "#ffe066"];

    for (let i = 0; i < 24; i += 1) {
        const piece = document.createElement("span");
        piece.className = "confetti";
        piece.style.left = `${45 + Math.random() * 10}%`;
        piece.style.top = "56%";
        piece.style.background = colors[i % colors.length];

        // Каждая частица летит в свою сторону
        piece.style.setProperty("--x", `${(Math.random() - 0.5) * 560}px`);
        piece.style.setProperty("--y", `${-80 - Math.random() * 180}px`);
        piece.style.setProperty("--r", `${Math.random() * 720}deg`);

        panel.appendChild(piece);
        setTimeout(() => piece.remove(), 1400);
    }
}

subscribeForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    const submitButton = subscribeForm.querySelector("button");

    if (!isValid) {
        formNote.textContent = "Похоже, в адресе опечатка. Проверь и попробуй ещё раз.";
        formNote.classList.add("is-error");
        emailInput.classList.add("is-error");
        emailInput.focus();
        return;
    }

    // Демо-форма: никуда ничего не отправляем, просто показываем успех
    formNote.textContent = "Готово! Ты в списке. Первое письмо придёт в пятницу ✦";
    formNote.classList.remove("is-error");
    formNote.classList.add("is-success");
    emailInput.classList.remove("is-error");

    burstConfetti();
    subscribeForm.reset();
    submitButton.disabled = true;
    submitButton.textContent = "Ты в списке ✓";

    setTimeout(() => {
        submitButton.disabled = false;
        submitButton.textContent = "Хочу в дайджест ✦";
        formNote.textContent = defaultNote;
        formNote.classList.remove("is-success");
    }, 5000);
});

// Если пользователь начал исправлять email — убираем красную подсказку
emailInput.addEventListener("input", () => {
    emailInput.classList.remove("is-error");

    if (formNote.classList.contains("is-error")) {
        formNote.textContent = defaultNote;
        formNote.classList.remove("is-error");
    }
});

/* ------------------------------------------------------------
   Мелочи
   ------------------------------------------------------------ */

$("#year").textContent = new Date().getFullYear();
