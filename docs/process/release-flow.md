# Проверка и выпуск изменений

1. Обновите затронутую документацию и [план/результаты](../../work/now/README.md).
2. Установите зависимости: `npm ci`, `npm ci --prefix serverless/workspace-bridge`.
3. Выполните `npm run release-check`: локальные ссылки и структура docs, типы, schema/web и bridge-тесты, production build.
   При изменении helpers после сборки выполните `npm run test:deploy` (PowerShell): CLI подменён, облачных вызовов нет.
4. Проверьте `git diff`, новые файлы, отсутствие личных URL/секретов. Корневой README остаётся обзорным.
5. Зафиксируйте ограничения проверки в [evidence](../../work/now/evidence.md). Live smoke-check отмечайте отдельно от автоматических тестов.
6. При запросе выпуска используйте [пошаговую инструкцию Яндекс Cloud](../reference/yandex-deploy.md). Подготовка документации сама по себе не требует развёртывания.

## Помощники

- `npm run gateway:render` — создаёт игнорируемый локальный spec из переносимого шаблона.
- `npm run deploy:workspace-bridge -- -DryRun -SkipGatewayUpdate` — только локальная упаковка.
- `npm run deploy:workspace-bridge -- -SkipGatewayUpdate` — первая версия до создания Gateway.
- `npm run deploy:workspace-bridge` — новая версия и обновление существующего Gateway.
- `npm run deploy:frontend -- -DryRun` — показывает порядок загрузки готового dist.
- `npm run deploy:frontend` — assets, затем index с no-cache.

ZIP включает только runtime-файлы и загружается через packages-бакет; прямой `--source-path` не подходит для большого встроенного бинарника. `$latest` назначает сервис автоматически. Если обновление Gateway требуется, отсутствие ID/spec — ошибка до любых upload-команд, а не молчаливый пропуск.

npm deploy-команды используют Windows PowerShell. Для macOS/Linux запускайте соответствующие файлы через PowerShell 7 `pwsh -File`. Отмена/ошибка одной стадии не откатывает уже созданную версию: порядок проверки и возврат к предыдущей версии описаны в [эксплуатации](../reference/operations.md).
