# Config Studio Roadmap & Planned Plugins 🗺️

План развития экосистемы **Config Studio** и официальных плагинов.

---

## 📋 Запланированные плагины и функции

### 1. 🐳 Плагин: Docker & Compose Manager (`config-studio-docker`)
Полноценное управление контейнерами и сценариями Docker Compose прямо из интерфейса редактора.

#### Ключевой функционал:
- **Контекстные кнопки в панели инструментов** (активируются при открытии `docker-compose.yml`, `compose.yaml`, `Dockerfile`):
  - 🚀 **Compose Up (`-d`)** — фоновый запуск стека сервисов.
  - ⬇️ **Compose Down** — корректная остановка и удаление контейнеров и сетей.
  - 🔄 **Compose Pull & Restart** — обновление образов и перезапуск контейнеров в 1 клик.
  - 📋 **Live Logs Viewer** — стриминг логов сервисов в нижнюю панель (Bottom Panel) в реальном времени с поддержкой паузы и фильтрации.
  - 🔍 **Status & Containers Dashboard** (`docker compose ps` / `docker ps`) — интерактивный список контейнеров со статусами (Up/Exited), портами и кнопками перезапуска каждого сервиса по отдельности.
- **Поддержка синтаксиса и AST**:
  - Сниппеты для директив Compose (`services`, `volumes`, `networks`, `environment`, `healthcheck`, `deploy`).
  - Outline Provider для быстрого перехода к отдельным сервисам в дереве структуры документа.
- **Требуемые разрешения**: `ui.panels`, `terminal.exec`.

---

### 2. 📡 Плагин: Remote Server Agent — Broadcast & Multicast с функцией Approve
Расширение для плагина [`config-studio-remote-agent`](https://github.com/EdvardBaldanov/config-studio-remote-agent) для кластерного управления.

#### Ключевой функционал:
- **Тегирование и группы серверов**: разделение парка серверов по тегам (`prod`, `staging`, `edge`, `backend`).
- **Синхронная рассылка (Multicast / Broadcast)**: отправка отредактированного конфига сразу на несколько или все подключенные серверы.
- **Интерактивный экран подтверждения (Approve Modal)**:
  - Визуальный просмотр Diff (изменений).
  - Pre-flight детекция дрифта (проверка хешей и предупреждение, если файл на сервере был отредактирован локально).
  - Выборочное включение/исключение серверов чекбоксами.
  - Кнопка **«Approve & Deploy»**.
- **Отказоустойчивость**: автосоздание `.bak` копий на целевых узлах и детальный отчет доставки (Success/Failed).

---

## 🌟 Текущий статус экосистемы

- [x] **v1.1.0**: Чистое ядро редактора, гибридная система установки плагинов (Каталог в 1 клик, URL, ZIP, папка).
- [x] **v1.1.1**: Хотфикс визуального оформления тумблеров плагинов (контрастная рамка, фон, индикатор статуса).
- [x] **[config-studio-web-devkit](https://github.com/EdvardBaldanov/config-studio-web-devkit)**: HTML/PHP Live Preview, сервер :8085, сниппеты Monaco.
- [x] **[config-studio-remote-agent](https://github.com/EdvardBaldanov/config-studio-remote-agent)**: Мультисерверное переключение из шапки редактора.
- [x] **[config-studio-plugin-docs](https://github.com/EdvardBaldanov/config-studio-plugin-docs)**: Официальное руководство разработчика плагинов, спецификация манифеста и TypeScript SDK.
