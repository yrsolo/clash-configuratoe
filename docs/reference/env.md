# Переменные окружения

## Frontend: публичные build-настройки

Vite работает из `apps/web` и читает env-файлы **там**. Для разработки скопируйте корневой `.env.dev.example` в `apps/web/.env.local`; для production — `.env.prod.example` в `apps/web/.env.production.local`. Эти значения встраиваются при сборке. Корневой `.env` автоматически не подключён ни к Vite, ни к PowerShell-деплою.

| Переменная | Значение/умолчание | Назначение |
| --- | --- | --- |
| `VITE_PUBLIC_APP_URL` | Browser origin при отсутствии | HTTPS-origin для share/YAML URL, без конечного slash |
| `VITE_WORKSPACE_API_BASE` | `/api/workspace` | Workspace и связанный publish API; используйте один origin |
| `VITE_WORKSPACE_APP_SALT` | `clash-workspace-v1` | Публичная соль хеша доступа; фиксируйте для установки |

`APP_ENV`, `APP_NAME`, `VITE_PUBLIC_APP_TITLE` в старых образцах не управляют текущей логикой. Не добавляйте секреты в `VITE_*`. Наличие образца не означает обязательность переменной. Обычный локальный гостевой редактор запускается без env-файла.

## Cloud Function: runtime

| Переменная | Обязательность | Назначение |
| --- | --- | --- |
| `WORKSPACE_BUCKET` | Да | Закрытый бакет данных |
| `AWS_ACCESS_KEY_ID` | Да | `key_id` статического ключа S3 runtime-аккаунта |
| `AWS_SECRET_ACCESS_KEY` | Да, секрет | Secret этого ключа |
| `S3_ENDPOINT` | Нет | По умолчанию `https://storage.yandexcloud.net` |
| `PROXY_URL` | Нет, может содержать секрет | HTTP(S) CONNECT или SOCKS5 proxy для upstream; пусто = прямой fetch. Требуется установленный по lock-файлу undici 7.30+ |
| `PUBLIC_APP_URL` | Нет | Origin приложения, чтобы не направлять запросы к своему formatter через внешний proxy |

Прикрепление сервисного аккаунта к функции не заменяет S3-ключи для текущего кода. Ключи остаются на serverless-границе. Запросы inspect/publish refresh могут немедленно загружать upstream-подписки; это сетевые операции из облака.

## Локальные helpers деплоя

| Переменная | Назначение |
| --- | --- |
| `YC_FUNCTION_ID` | Функция workspace-bridge |
| `YC_SERVICE_ACCOUNT_ID` | Runtime-аккаунт новой версии |
| `YC_GATEWAY_SERVICE_ACCOUNT_ID` | Отдельный аккаунт gateway: функция + frontend |
| `YC_FRONTEND_BUCKET` | Бакет собранного frontend |
| `YC_DEPLOY_BUCKET` | Бакет ZIP-пакетов |
| `YC_DEPLOY_OBJECT` | Необязательно; по умолчанию `deployments/workspace-bridge.zip` |
| `YC_GATEWAY_ID` | Существующий Gateway для обновления; на первом деплое функция использует `-SkipGatewayUpdate` |
| `YC_GATEWAY_SPEC` | Необязательно; по умолчанию `deploy/yandex/gateway.local.yaml` |
| `YC_FOLDER_ID` | Переменная инструкции для выбора каталога CLI; сами helpers её не читают |

Helpers читают окружение процесса, а не `.env`. `gateway:render` требует Function ID, gateway account ID и frontend bucket. `deploy:workspace-bridge` без `-SkipGatewayUpdate` заранее проверяет наличие Gateway ID и готового spec, затем упаковывает/загружает код и создаёт версию. `-DryRun` не обращается к облаку. Для dry run функции без spec используйте также `-SkipGatewayUpdate`.

Подробности: [деплой](yandex-deploy.md). Прежний локальный `.env` считайте скомпрометированным; в Git он игнорируется, но это не отменяет перевыпуск старых реквизитов.
