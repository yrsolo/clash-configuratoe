# Serverless bridge

`workspace-bridge/index.js` — поддерживаемая Cloud Function: workspace load/save/delete, опубликованные JSON/YAML, formatter и source inspection. AWS S3 SDK работает с закрытым Object Storage, а необязательный HTTP(S) CONNECT proxy — с upstream-подписками. Реальные реквизиты передаются через runtime env, не frontend.

## Развёртывание

Полная инструкция: [свой Яндекс Cloud](../docs/reference/yandex-deploy.md). Шаблон маршрутов живёт в [deploy/yandex](../deploy/yandex/gateway.openapi.template.yaml), а не во временном `work/now`.

`npm run deploy:workspace-bridge -- -DryRun -SkipGatewayUpdate` проверяет/пакует локально. Для первого деплоя без dry run сохраняйте `-SkipGatewayUpdate`; для существующего Gateway установите свои ID/spec и запускайте обычный helper. Он передаёт nodejs22, index.handler, 512 MB и 120 секунд, загружает ZIP через Object Storage и останавливается при ошибке CLI. Упаковка исключает локальные зависимости, fixtures, env и чужие файлы.

Облачная сборка устанавливает зависимости из package.json/lock-файла. Для локальных тестов отдельно выполните `npm ci --prefix serverless/workspace-bridge`, затем `npm run test:bridge` из корня. Сам Linux-runtime на Windows этими тестами не запускается.

## Встроенный sing-box

Ручная кнопка Run probe запускает `bin/sing-box` из копии в `/tmp`. Бинарник имеет ELF-заголовок, размер 67 384 232 байта; Go build metadata указывает `github.com/sagernet/sing-box v1.13.4` и Go 1.25.8. SHA-256 текущего файла:

`9367bca5f8113bdac67ad966a7b5fbf1b432e1b63d6a34d6a0e8c17e1140070b`

Метаданные и хеш идентифицируют файл в этом репозитории, но не доказывают совпадение с официальным релизом. Upstream: [SagerNet/sing-box](https://github.com/SagerNet/sing-box). Перед заменой сверяйте архитектуру Linux, источник и checksum, сохраняйте сведения о версии/лицензии. Проверка реального запуска происходит только в целевой Linux-среде. Ошибка probes не обязательно означает ошибку загрузки подписки: это разные пути.

Архив деплоя по умолчанию — `artifacts/tmp/workspace-bridge.zip`, игнорируется Git. Не раздавайте локальную папку serverless вместе с credentials/зависимостями; передавайте исходный репозиторий и создавайте свои env по [справочнику](../docs/reference/env.md).
