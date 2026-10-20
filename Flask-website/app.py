"""
AI-дайджест для новичков — небольшой сайт на Flask.

Запуск:
    python app.py

После запуска открой в браузере:
    http://127.0.0.1:5000
"""

import json
import os
import socket
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


def port_is_free(port):
    """Проверяем, можно ли занять порт для сайта.

    На macOS порт 5000 «держит» системный AirPlay Receiver (ControlCenter).
    Он слушает все адреса сразу, а сайту нужен только 127.0.0.1 — поэтому
    проверяем так же, как это делает сам Flask (с флагом SO_REUSEADDR):
    если проверить удалось — Flask тоже сможет запуститься.
    """
    probe = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        probe.bind(("127.0.0.1", port))
        return True
    except OSError:
        return False
    finally:
        probe.close()


def choose_port():
    """Возвращаем первый свободный порт из списка."""
    preferred = 5000
    for port in (5000, 5001, 5002, 8000):
        if port_is_free(port):
            if port != preferred:
                print(
                    f"Порт {preferred} занят другим приложением. "
                    f"Сайт откроется по адресу: http://127.0.0.1:{port}"
                )
            return port
    return preferred


if __name__ == "__main__":
    # debug=True автоматически перезапускает сервер после изменений в коде.
    # Порт выбираем один раз и запоминаем в переменной окружения,
    # чтобы при перезапусках отладчика адрес сайта не менялся.
    port = int(os.environ.get("DIGEST_PORT", "0")) or choose_port()
    os.environ["DIGEST_PORT"] = str(port)

    app.run(debug=True, host="127.0.0.1", port=port)
