import dotenv from "dotenv";
dotenv.config();

const envPort = process.env.PORT || "8080";
const PORT = Number(envPort);
if (Number.isNaN(PORT)) throw new Error("PORT must be a number");

(async () => {
  const { default: app } = await import("./app");

  // Health check liviano: NO toca DB
  app.get("/healthz", (_req, res) => res.status(200).send("ok"));

  // Readiness: verifica DB en cada request
  app.get("/readyz", async (_req, res) => {
    try {
      const { default: KnexManager } = await import("./database/KnexConnection");
      try {
        // If already connected, this will succeed
        const db = KnexManager.get();
        await db.raw("select 1");
        return res.status(200).send("ready");
      } catch (innerErr) {
        // Not connected yet — try a single quick connect attempt (one-off)
        try {
          await KnexManager.connect();
          const db2 = KnexManager.get();
          await db2.raw("select 1");
          return res.status(200).send("ready");
        } catch (connectErr: any) {
          return res.status(503).send(`starting: ${connectErr?.message ?? connectErr}`);
        }
      }
    } catch (e: any) {
      return res.status(503).send(`starting: ${e?.message ?? e}`);
    }
  });

  app.listen(PORT, () => console.info(`Server listening on ${PORT}`));

  // Conectar a la DB en background con reintentos
  const { default: KnexManager } = await import("./database/KnexConnection");
  const maxRetries = 10;             // podés subirlo si querés
  const delayMs = 3000;
  for (let i = 1; i <= maxRetries; i++) {
    try {
      await KnexManager.connect();
      console.log("✅ Database connected");
      break;
    } catch (err) {
      console.error(`❌ DB connect attempt ${i}/${maxRetries} failed:`, (err as Error).message);
      if (i === maxRetries) {
        console.error("Giving up after max retries.");
        // process.exit(1); // opcional si querés que App Runner redepliegue
      } else {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
})();
