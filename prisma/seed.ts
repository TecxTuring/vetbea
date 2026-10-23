// Cria (ou renova) a clínica de demonstração. Uso: npm run db:seed
import { DEMO_EMAIL, DEMO_SENHA, garantirDemo } from "../src/lib/demo";
import { db } from "../src/lib/db";

garantirDemo()
  .then(() => console.log(`✅ Demonstração pronta. Login: ${DEMO_EMAIL} / ${DEMO_SENHA}`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
