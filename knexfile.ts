import type { Knex } from "knex";
import dotenv from "dotenv";
dotenv.config();

const isLocalHost = (h?: string) => h === "localhost" || h === "127.0.0.1";

// Si viene DATABASE_URL (desde Secrets Manager), usala tal cual.
// Si no, armamos la conexión con las variables SQL_* que ya tenés.
const url = process.env.DATABASE_URL;
const connection: string | Knex.StaticConnectionConfig =
  url
    ? { connectionString: url, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.SQL_HOST,
        port: process.env.SQL_PORT ? Number(process.env.SQL_PORT) : 5432,
        database: process.env.SQL_DB_NAME,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        ssl:
          process.env.SQL_HOST === "localhost" || process.env.SQL_HOST === "127.0.0.1"
            ? false
            : { rejectUnauthorized: false },
      };

const base: Knex.Config = {
  client: "postgresql",
  connection,
  pool: { min: 2, max: 10 },
  migrations: { tableName: "knex_migrations" },
};

const config: { [key: string]: Knex.Config } = {
  development: base,
  staging: base,
  production: base,
};

export default config;
