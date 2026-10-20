"""
Генератор постов для товаров.

Очень простой сайт на Flask:
- без базы данных,
- без нейросетей,
- пост собирается по шаблону из полей формы.

Запуск:
    pip install flask
    python app.py
Затем откройте в браузере: http://127.0.0.1:5000
"""

from flask import Flask, render_template, request

app = Flask(__name__)


# ============================================================
#  НАСТРОЙКИ СТИЛЯ (можно свободно менять тексты ниже)
#  Именно здесь настраивается «голос» генератора:
#  тон, длина, эмодзи, заголовки, СТА и хэштеги.
#  Полное описание стиля — в файле voice.md.
# ============================================================

# --- ТОН: фразы-открывашки основного текста для каждого настроения ---
OPENERS = {
    "friendly": ["Привет! Хотим поделиться находкой —", "Друзья, у нас новость —"],
    "sales":    ["Внимание, это важно —", "Только посмотрите, что у нас есть —"],
    "expert":   ["Коротко и по делу:", "Разбираем по фактам —"],
    "fun":      ["Так, всё, рассказываю!", "Внимание, объявление номер один —"],
}

# --- Названия настроений для списка на странице ---
MOOD_NAMES = {
    "friendly": "Дружелюбный · тёплый тон",
    "sales":    "Продающий · с акцентом на выгоду",
    "expert":   "Экспертный · по делу",
    "fun":      "Лёгкий · с юмором",
}

# --- ЭМОДЗИ: наборы для украшения заголовка и случайного акцента ---
EMOJIS = {
    "friendly": ["✨", "💛", "🌿", "🤍"],
    "sales":    ["🔥", "⚡", "🏷️", "💥"],
    "expert":   ["🧐", "📄", "✅", "📊"],
    "fun":      ["😄", "🎉", "🙈", "🎩"],
}

# --- СТАЙЛ ЗАГОЛОВКОВ: шаблоны={name} подставится название товара ---
TITLE_TEMPLATES = {
    "friendly": "✨ {name} — то, что вам понравится",
    "sales":    "🔥 {name} — хит, который стоит взять",
    "expert":   "🧐 {name}: коротко о главном",
    "fun":      "😄 {name} — мы не смогли промолчать",
}

# --- СТИЛЬ СТА (призыв к действию) ---
CTA_PHRASES = {
    "friendly": "Заглядывайте к нам за «{name}» 💛 И пишите в комментариях, если есть вопросы!",
    "sales":    "👉 Пишите «ХОЧУ» в комментарии или в личные сообщения — забронируем для вас!",
    "expert":   "Нужны детали? Задайте вопрос в комментариях — ответим по фактам.",
    "fun":      "Жмите «подробнее» быстрее, пока не передумали! 😜",
}

# --- ПРАВИЛА ДЛЯ ХЭШТЕГОВ: общие теги к настроению ---
BASE_HASHTAGS = {
    "friendly": ["#полезныенаходки", "#нашвыбор"],
    "sales":    ["#акция", "#успейкупить"],
    "expert":   ["#обзор", "#пользам"],
    "fun":      ["#весёлыйпост", "#советдня"],
}

# --- ДЛИНА: максимум слов в описании, остальное обрежется ---
MAX_DESCRIPTION_WORDS = 60

# --- ХЭШТЕГИ: максимум тегов в посте ---
MAX_HASHTAGS = 6


# ============================================================
#  ГЕНЕРАТОР (базовая редакторская логика по разделам)
# ============================================================

def cut_text(description: str) -> str:
    """Обрезает описание до MAX_DESCRIPTION_WORDS слов (настройка длины)."""
    words = description.split()
    if len(words) <= MAX_DESCRIPTION_WORDS:
        return description
    return " ".join(words[:MAX_DESCRIPTION_WORDS]) + "…"


def make_title(mood: str, name: str) -> str:
    """Заголовок поста по шаблону настроения."""
    return TITLE_TEMPLATES[mood].format(name=name)


def make_main_text(mood: str, name: str, description: str) -> str:
    """Основной текст: представление товара + описание пользователя."""
    opener = OPENERS[mood][0]  # берём первую фразу настроения
    emoji = EMOJIS[mood][0]
    main = f"Знакомьтесь — «{name}». {opener} {cut_text(description)} {emoji}"
    return main


def make_benefit(price: str) -> str:
    """Блок «польза/выгода». Если поле пустое — раздел не добавляем."""
    if not price.strip():
        return ""
    return f"❗ Почему это выгодно: {price.strip()}"


def make_hashtags(name: str, mood: str) -> str:
    """Хэштеги: слова из названия + общие теги настроения, до MAX_HASHTAGS."""
    name_tags = ["#" + word.capitalize() for word in name.split() if word.isalpha()][:3]
    tags = (name_tags + BASE_HASHTAGS[mood])[:MAX_HASHTAGS]
    return " ".join(tags)


def make_cta(mood: str, name: str) -> str:
    """Призыв к действию по настроению."""
    return CTA_PHRASES[mood].format(name=name)


def build_post(form) -> str:
    """Собирает готовый пост из всех разделов."""
    name = form.get("name", "").strip() or "наш товар"
    description = form.get("description", "").strip()
    price = form.get("price", "")
    mood = form.get("mood", "friendly")
    if mood not in OPENERS:  # защита от неизвестного значения
        mood = "friendly"

    parts = [
        make_title(mood, name),
        make_main_text(mood, name, description),
        make_benefit(price),
        make_cta(mood, name),
        make_hashtags(name, mood),
    ]
    # Пустые разделы пропускаем, разделы разделяем пустой строкой.
    return "\n\n".join(part for part in parts if part)


# ============================================================
#  МАРШРУТЫ
# ============================================================

@app.route("/", methods=["GET", "POST"])
def index():
    error = ""      # сообщение об ошибке для формы
    post = ""       # готовый пост
    form = {"name": "", "description": "", "price": "", "mood": "friendly"}

    if request.method == "POST":
        form = {
            "name": request.form.get("name", ""),
            "description": request.form.get("description", ""),
            "price": request.form.get("price", ""),
            "mood": request.form.get("mood", "friendly"),
        }
        # Валидация: описание товара обязательно
        if not form["description"].strip():
            error = "Добавьте описание товара"
        else:
            post = build_post(form)

    return render_template("index.html", error=error, post=post, form=form, moods=MOOD_NAMES)


if __name__ == "__main__":
    # debug=True — удобно для учёбы: сайт сам перезагружается при правках кода
    app.run(debug=True, port=5001)
