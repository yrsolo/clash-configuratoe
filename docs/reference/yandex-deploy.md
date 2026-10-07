# Деплой в собственный Яндекс Cloud

Полный первый запуск: Object Storage + Cloud Functions + API Gateway. Начните с [регистрации](yandex-registration.md). Команды ниже выполняются **в корне репозитория в PowerShell**. На macOS/Linux используйте PowerShell 7: команды `yc`/`npm` остаются теми же, а скрипты запускаются через `pwsh -File` вместо `powershell -ExecutionPolicy Bypass -File`.

Инструкция и CLI-флаги сверены 7 октября 2026 года. Локальные тесты не заменяют проверку в вашем облаке: квоты, роли и доступность подписок нужно проверить после создания ресурсов.

## Схема размещения

```text
Браузер / Clash-клиент
        │ HTTPS, один домен API Gateway
        ├── / и /assets/* ──→ закрытый бакет frontend
        └── /api/* ────────→ функция workspace-bridge
                                ├── закрытый бакет workspace
                                └── подписки, при необходимости через HTTP(S)/SOCKS5 proxy
Бакет packages ──→ ZIP кода для создания версий функции
```

Три бакета разделяют статику, личные данные и пакеты. Доступ к статику даёт шлюз от своего сервисного аккаунта: публичный доступ на бакетах включать не нужно. Спецификация обслуживает все API-маршруты и статику на одном origin, поэтому CORS и отдельный публичный URL функции не требуются. Основание интеграций: [Object Storage в Gateway](https://yandex.cloud/ru/docs/api-gateway/concepts/extensions/object-storage), [Cloud Functions в Gateway](https://yandex.cloud/ru/docs/api-gateway/concepts/extensions/cloud-functions).

## 1. Проверьте инструменты и проект

```powershell
git --version
node --version
npm --version
yc --version
npm ci
npm ci --prefix serverless/workspace-bridge
npm run release-check
```

Локальная сборка использует Node.js 24/npm 11. Облачная функция использует `nodejs22`, `index.handler`, 512 MB и таймаут 120 секунд. `nodejs22` поддерживается сервисом на дату проверки: [среды выполнения](https://yandex.cloud/ru/docs/functions/concepts/runtime/).

Бинарник `serverless/workspace-bridge/bin/sing-box` нужен для ручной проверки серверов, рассчитан на Linux, а не на вашу локальную ОС. Скрипт пакует его вместе с `index.js`, `package.json`, `package-lock.json`; локальные `node_modules` и тесты в ZIP не входят. Зависимости устанавливаются при создании версии. Примечания о бинарнике — в [serverless/README.md](../../serverless/README.md).

## 2. Выберите свой каталог и имена

```powershell
$env:YC_FOLDER_ID = 'YOUR_FOLDER_ID'
yc config set folder-id $env:YC_FOLDER_ID

$env:YC_FRONTEND_BUCKET = 'my-unique-clash-web'
$env:WORKSPACE_BUCKET = 'my-unique-clash-workspace'
$env:YC_DEPLOY_BUCKET = 'my-unique-clash-packages'
```

Замените Folder ID и **все три имени** своими. Имена бакетов должны быть свободными; используйте короткий уникальный суффикс, латиницу, цифры и дефисы, без точек. Префикс `my-unique` — образец, а не готовое имя. Не продолжайте с чужими ID из старых рабочих заметок.

Команды исполняются вашим пользователем CLI с правами администратора/владельца **этого каталога**. Для ограниченной учётной записи отдельно потребуются права на создание IAM-аккаунтов/ключей, изменение прав, бакеты, функции, шлюзы и использование сервисных аккаунтов. Не выдавайте сервисным аккаунтам `admin` для обхода ошибок.

## 3. Создайте два сервисных аккаунта

```powershell
$runtime = yc iam service-account create --name clash-runtime --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать runtime account' }
$gateway = yc iam service-account create --name clash-gateway --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать gateway account' }
$env:YC_SERVICE_ACCOUNT_ID = $runtime.id
$env:YC_GATEWAY_SERVICE_ACCOUNT_ID = $gateway.id
```

Если они уже существуют, используйте `yc iam service-account get --name clash-runtime --format json` и аналогично для gateway, не создавайте дубликаты. Сохраните оба ID в своих заметках. Порядок создания аккаунтов соответствует [IAM-инструкции](https://yandex.cloud/ru/docs/iam/operations/sa/create).

## 4. Создайте закрытые бакеты и назначьте права

```powershell
yc storage bucket create --name $env:YC_FRONTEND_BUCKET --max-size 1073741824
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать frontend bucket' }
yc storage bucket create --name $env:WORKSPACE_BUCKET --max-size 1073741824
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать workspace bucket' }
yc storage bucket create --name $env:YC_DEPLOY_BUCKET --max-size 1073741824
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать packages bucket' }
```

1 GB здесь — стартовое ограничение объёма каждого бакета, его можно изменить. Оно не ограничивает расходы на обращения и функции. Не добавляйте `--public-read`, `--public-list`, `--public-config-read`.

В консоли выберите каталог → Object Storage → нужный бакет → управление доступом/права. Добавьте сервисный аккаунт и роль **на конкретный бакет**:

| Ресурс | Кому | Роль |
| --- | --- | --- |
| frontend | `clash-gateway` | `storage.viewer` |
| workspace | `clash-runtime` | `storage.editor` |
| packages | `clash-runtime` | `storage.viewer` |

Не назначайте gateway чтение workspace. Загрузку frontend и ZIP выполняет пользователь `yc`, а не эти runtime-аккаунты. На дату проверки роли конкретного бакета назначаются в консоли/API/Terraform; отдельной команды `yc storage bucket add-access-binding` нет. Роли и области доступа описаны в [Object Storage IAM](https://yandex.cloud/ru/docs/storage/security/).

У workspace разумно включить версионирование в консоли для восстановления случайно перезаписанных данных. Это увеличивает хранение старых версий; периодически контролируйте объём.

## 5. Создайте ключ S3 для runtime

```powershell
$access = yc iam access-key create --service-account-id $env:YC_SERVICE_ACCOUNT_ID --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать S3 key' }
$env:AWS_ACCESS_KEY_ID = $access.access_key.key_id
$env:AWS_SECRET_ACCESS_KEY = $access.secret
$env:S3_ENDPOINT = 'https://storage.yandexcloud.net'
```

Ключ нужен AWS S3 SDK внутри функции; одного `--service-account-id` функции этому коду недостаточно. Секрет выдаётся один раз. Сохраните его в менеджере паролей, не выводите `$access` в общий лог и не сохраняйте в Git. `access_key.id` — ID для управления ключом; `access_key.key_id` — именно значение `AWS_ACCESS_KEY_ID`. См. [статические ключи IAM](https://yandex.cloud/ru/docs/iam/operations/authentication/manage-access-keys).

При новом терминале восстановите переменные из менеджера паролей. Например, секрет можно вводить без отображения:

```powershell
$env:AWS_ACCESS_KEY_ID = Read-Host 'S3 key_id'
$secureKey = Read-Host 'S3 secret' -AsSecureString
$env:AWS_SECRET_ACCESS_KEY = [System.Net.NetworkCredential]::new('', $secureKey).Password
```

Корневой `.env.example` — справочный образец. Скрипты деплоя **не загружают `.env` автоматически**. Все `$env:...` должны быть выставлены в том же терминале. Никакие AWS-ключи нельзя помещать в `VITE_*`: эти значения попадут в браузерную сборку.

## 6. Создайте функцию и доступ для шлюза

```powershell
$function = yc serverless function create --name clash-workspace-bridge --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать функцию' }
$env:YC_FUNCTION_ID = $function.id
yc serverless function add-access-binding --id $env:YC_FUNCTION_ID --role functions.functionInvoker --subject "serviceAccount:$env:YC_GATEWAY_SERVICE_ACCOUNT_ID"
if ($LASTEXITCODE -ne 0) { throw 'Не удалось разрешить вызов функции' }
```

Роль `functions.functionInvoker` даёт вызов функции: [права Cloud Functions](https://yandex.cloud/ru/docs/functions/security/). Не делайте саму функцию публичной — внешний вход уже обеспечивает Gateway. Если функция существует, получите её ID через `yc serverless function get --name clash-workspace-bridge --format json`.

## 7. Выберите прямую загрузку или proxy

Начните с прямого доступа:

```powershell
$env:PROXY_URL = ''
```

Если облачная функция не может загрузить вашу подписку из-за сетевых ограничений, задайте **свой HTTP(S) CONNECT или SOCKS5 proxy**. Обновлённый `undici.ProxyAgent` (7.30+, установка по lock-файлу) принимает в том числе `socks5://`. Сервисные учётные данные proxy должны оставаться в окружении функции, а не в frontend или JSON-шаблоне. Локальный proxy устройства для этой задачи не подходит: сервер должен быть доступен из Яндекс Cloud. Соединение с реальным proxy в этой подготовке не проверялось.

```powershell
$secureProxy = Read-Host 'HTTP(S)/SOCKS5 proxy URL или Enter для прямого доступа' -AsSecureString
$env:PROXY_URL = [System.Net.NetworkCredential]::new('', $secureProxy).Password
```

Если URL содержит логин/пароль со спецсимволами, кодируйте их как части URL. Значения с запятой надо URL-кодировать: CLI передаёт environment в формате списка. После деплоя пробуйте реальную подписку через инспектор; факт загрузки YAML и факт соединения с прокси проверяются отдельно.

## 8. Упакуйте и создайте первую версию

```powershell
npm run deploy:workspace-bridge -- -DryRun -SkipGatewayUpdate
npm run deploy:workspace-bridge -- -SkipGatewayUpdate
```

Первая команда проверяет файлы и создаёт локальный ZIP без облачных действий. Вторая загружает ZIP в ваш packages-бакет и создаёт версию функции. Шлюза пока нет, поэтому `-SkipGatewayUpdate` обязателен. `$latest` присваивается Cloud Functions автоматически; не задавайте его через `--tags`. Бинарник делает пакет больше лимита прямой загрузки, поэтому используется Object Storage: [создание версии](https://yandex.cloud/ru/docs/functions/operations/function/version-manage).

На macOS/Linux:

```powershell
pwsh -File scripts/deploy-workspace-bridge.ps1 -DryRun -SkipGatewayUpdate
pwsh -File scripts/deploy-workspace-bridge.ps1 -SkipGatewayUpdate
```

Скрипт выводит ID новой версии, но не полный JSON окружения. Переменные всё равно доступны администраторам функции; не используйте shell tracing/transcript с секретами. Сохраните ID версии для отката. Если сборка версии завершилась ошибкой установки зависимостей, откройте её build log в консоли и исправьте ошибку до следующего шага.

## 9. Сгенерируйте спецификацию и создайте Gateway

```powershell
npm run gateway:render
$api = yc serverless api-gateway create --name clash-site --spec deploy/yandex/gateway.local.yaml --execution-timeout 120s --format json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Не удалось создать Gateway' }
$env:YC_GATEWAY_ID = $api.id
$env:YC_GATEWAY_SPEC = 'deploy/yandex/gateway.local.yaml'
```

Renderer берёт `YC_FUNCTION_ID`, `YC_GATEWAY_SERVICE_ACCOUNT_ID`, `YC_FRONTEND_BUCKET` и создаёт файл из [шаблона](../../deploy/yandex/gateway.openapi.template.yaml). Этот локальный файл игнорируется Git. В спецификации нет домена прежнего владельца. Используется payload format `2.0`, под который написан handler.

Откройте Gateway в консоли и скопируйте поле **Служебный домен**. Задайте полный HTTPS-origin без завершающего `/`:

```powershell
$env:PUBLIC_APP_URL = 'https://YOUR_GATEWAY_HOST'
```

Замените `YOUR_GATEWAY_HOST` фактическим доменом. Пока frontend не загружен, корень сайта может отвечать ошибкой отсутствующего объекта — это ожидаемо на этом шаге.

## 10. Соберите frontend для этого адреса

Vite читает env-файлы из `apps/web`, а не из корня репозитория. Создайте **только публичные** build-настройки:

```powershell
$publicSalt = [guid]::NewGuid().ToString('N')
@"
VITE_PUBLIC_APP_URL=$env:PUBLIC_APP_URL
VITE_WORKSPACE_API_BASE=/api/workspace
VITE_WORKSPACE_APP_SALT=$publicSalt
"@ | Set-Content -LiteralPath apps/web/.env.production.local -Encoding utf8
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed' }
npm run deploy:frontend -- -DryRun
npm run deploy:frontend
```

На macOS/Linux для загрузки: `pwsh -File scripts/deploy-frontend.ps1 -DryRun`, затем без `-DryRun`. Соль публичная, но её надо **сохранить неизменной** для дальнейших сборок, иначе прежние имя/код дадут другую идентичность workspace. Перед пересборкой убедитесь, что старые `VITE_*` переменные терминала не перекрывают файл. Используйте `.env.prod.example` как образец, не переносите корневой `.env` автора.

Upload-скрипт сначала загружает fingerprinted assets, потом `index.html` с `no-cache`. Старые assets автоматически не удаляются: это сохраняет возможность отката и загрузки уже открытых вкладок. Не загружайте исходники и env в frontend-бакет. Повторите `npm run deploy:workspace-bridge`, чтобы передать функции `PUBLIC_APP_URL` и обновить Gateway из локальной спецификации.

## 11. Выполните smoke-проверку

```powershell
Invoke-WebRequest -Uri "$env:PUBLIC_APP_URL/" -Method Head
try {
  Invoke-WebRequest -Uri "$env:PUBLIC_APP_URL/api/published/yaml" -ErrorAction Stop
} catch {
  # Без id/token ожидается HTTP 400 от bridge, а не HTML frontend.
  $_.Exception.Response.StatusCode
}
```

Ожидайте 200 на `/` и 400 на YAML без параметров. Затем в браузере:

1. Откройте DevTools → Network: файл `/assets/*.js` и CSS возвращают 200 и правильный Content-Type, не HTML-заглушку.
2. Создайте workspace, измените имя проекта, дождитесь сохранения, восстановите его во втором браузере с тем же именем/кодом.
3. Добавьте свою подписку по [инструкции](starter-configuration.md), включите источник и загрузите список серверов.
4. Выполните `Refresh stable publish link`. Полученный YAML URL должен отдавать YAML с реальными `proxies`, а share URL — редактор.
5. Измените безвредное правило, обновите публикацию и подписку в клиенте. URL должен остаться тем же.
6. Анонимно проверьте `https://storage.yandexcloud.net/ИМЯ_WORKSPACE_БАКЕТА/`: листинг и данные должны быть закрыты (обычно 403). В консоли также проверьте, что публичные флаги **всех трёх** бакетов выключены.

Это проверка готового развёртывания. Её должен выполнить владелец аккаунта; в рамках подготовки репозитория облачные ресурсы не создавались.

## 12. Необязательно: собственный домен

Используйте поддомен вроде `clash.example.com`. В Certificate Manager создайте сертификат, подтвердите владение и дождитесь `Issued`. В Gateway → Домены подключите поддомен и сертификат; у DNS-провайдера направьте CNAME на служебный домен Gateway. Для корневого домена схема DNS отличается. См. [официальное подключение домена](https://yandex.cloud/ru/docs/api-gateway/operations/api-gw-domains).

Проверьте HTTPS на новом домене, замените `VITE_PUBLIC_APP_URL` в build-файле и `PUBLIC_APP_URL` функции, пересоберите/загрузите frontend и функцию. Соль не меняйте. В существующих проектах обновите Formatter URL. При смене origin клиенты и локальные черновики автоматически не мигрируют: переимпортируйте новые YAML URL и сохраните JSON до переезда.

## Повторное обновление

Восстановите ID, имена бакетов, секреты runtime и `PUBLIC_APP_URL` в терминале; оставьте прежнюю соль в build-файле. Выполните `npm run release-check`, `npm run gateway:render`, `npm run deploy:workspace-bridge`, `npm run build`, `npm run deploy:frontend`. Проверяйте каждый exit code. При изменениях только статической части функцию обновлять необязательно. Откат, ротация ключей и диагностика — в [operations.md](operations.md).
