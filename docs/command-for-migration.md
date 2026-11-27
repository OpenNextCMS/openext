# Database migration commands (Next CMS)

## MongoDB → MySQL
```powershell
node --% scripts/switch-to-mysql.mjs --host=127.0.0.1 --port=3306 --user=root --password= --database=openext --force
```

## MySQL → MongoDB
```powershell
node --% scripts/switch-to-mongodb.mjs --type=uri --uri-file=atlas-uri.txt --mysql-host=127.0.0.1 --mysql-port=3306 --mysql-user=root --mysql-password= --mysql-database=openext
```

## MongoDB → PostgreSQL
```powershell
node --% scripts/switch-to-postgres.mjs --host=127.0.0.1 --port=5432 --user=postgres --password=YOUR_PASSWORD --database=nextcmsmains --force
```

## PostgreSQL → MongoDB
With `DB_TYPE=postgres` and `POSTGRES_*` in `.env`:
```powershell
node --% scripts/switch-to-mongodb.mjs --type=uri --uri-file=atlas-uri.txt
```

Restart the Next.js server after any switch.
