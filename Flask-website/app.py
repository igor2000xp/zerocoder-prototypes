"""
AI-дайджест для новичков — небольшой сайт на Flask.

Запуск:
    python app.py

После запуска открой в браузере:
    http://127.0.0.1:5000
"""

import json
from pathlib import Path

from flask import Flask, render_template

# Папка, в которой лежит этот файл (нужно, чтобы путь к JSON работал всегда)
BASE_DIR = Path(__file__).resolve().parent

app = Flask(__name__)


def load_content():
    """Читаем content.json и возвращаем данные."""
    with open(BASE_DIR / "content.json", encoding="utf-8") as file:
        return json.load(file)


@app.route("/")
def index():
    """Главная страница: передаём карточки и теги в HTML-шаблон."""
    content = load_content()
    cards = content["cards"]

    # Собираем список уникальных тегов в том же порядке, что и в карточках
    tags = []
    for card in cards:
        for tag in card["tags"]:
            if tag not in tags:
                tags.append(tag)

    return render_template(
        "index.html",
        cards=cards,
        tags=tags,
        meta=content["meta"],
    )


if __name__ == "__main__":
    # debug=True автоматически перезапускает сервер после изменений в коде
    app.run(debug=True)
