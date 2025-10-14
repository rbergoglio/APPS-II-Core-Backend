// src/database/KnexConnection.ts
import knex, { Knex } from "knex";

class KnexManager {
  private static knexInstance: Knex | null = null;

  static async connect(cfg?: Knex.Config, connections?: number): Promise<Knex> {
    if (this.knexInstance) return this.knexInstance;

    // 1) Prioriza DATABASE_URL; si no existe, usa SQL_*
    const connection: string | Knex.StaticConnectionConfig =
      process.env.DATABASE_URL ||
      {
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

    const finalConfig: Knex.Config = cfg || {
      client: "pg",
      connection,
      pool: {
        min: 1,
        max: connections || 15,
        idleTimeoutMillis: 20_000,
        acquireTimeoutMillis: 30_000,
      },
      migrations: { tableName: "knex_migrations" },
    };

    // Log seguro del host (sin credenciales) para verificar que no sea 127.0.0.1
    try {
      const host =
        typeof finalConfig.connection === "string"
          ? new URL(finalConfig.connection as string).hostname
          : (finalConfig.connection as Knex.StaticConnectionConfig)?.host;
      console.log("[Knex] host:", host);
    } catch {
      /* ignore */
    }

    this.knexInstance = knex(finalConfig);
    try {
      await this.knexInstance.raw("select 1");
      console.info("✅ Knex connection established");
    } catch (error) {
      console.error("❌ Failed to establish Knex connection:", error);
      this.knexInstance = null;
      throw error;
    }

    return this.knexInstance;
  }

  static get(): Knex {
    if (!this.knexInstance) {
      throw new Error("Knex connection has not been established. Call connect() first.");
    }
    return this.knexInstance;
  }

  static async disconnect(): Promise<void> {
    if (this.knexInstance) {
      await this.knexInstance.destroy();
      this.knexInstance = null;
      console.info("Knex connection closed");
    }
  }
}

export default KnexManager;
