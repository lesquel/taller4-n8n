cd "C:\Users\lesqu\Documents\uleam\5\serviudores web\primer-parcial\mesaYa"; Start-Process cmd -ArgumentList "/k cd /d `"$pwd\ms-reservations`" && set MS_RESERVATIONS_DB_PORT=5433 && set REDIS_HOST=localhost && set RABBITMQ_URL=amqp://mesaya:mesaya_secret@localhost:5672 && npm run start:dev" -WindowStyle Normal





Start-Sleep -Seconds 5; cd "C:\Users\lesqu\Documents\uleam\5\serviudores web\primer-parcial\mesaYa"; Start-Process cmd -ArgumentList "/k cd /d `"$pwd\ms-tables`" && set MS_TABLES_DB_PORT=5433 && set RABBITMQ_URL=amqp://mesaya:mesaya_secret@localhost:5672 && npm run start:dev" -WindowStyle Normal




Start-Sleep -Seconds 5; cd "C:\Users\lesqu\Documents\uleam\5\serviudores web\primer-parcial\mesaYa"; Start-Process cmd -ArgumentList "/k cd /d `"$pwd\gateway`" && set JWT_SECRET=ea3f74d028d6456ae2deda19571c600e7a8c7cf09166280e0fd4376a5c7cda5ef36252e16ec9fa94236c0b99198b2708c40d3c5acb1d9ef99998a5c866b018d88 && set RABBITMQ_URL=amqp://mesaya:mesaya_secret@localhost:5672 && npm run start:dev" -WindowStyle Normal