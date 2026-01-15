/**
 * Seed Script - Poblar Base de Datos con Datos de Prueba
 * Ejecutar: npx ts-node src/seed.ts
 */

import { DataSource } from "typeorm";
import { v4 as uuidv4 } from "uuid";

// Configuración de la conexión a db_mesas
const mesasDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5433", 10),
  username: process.env.DB_USER || "mesaya",
  password: process.env.DB_PASSWORD || "mesaya_secret",
  database: "db_mesas",
  synchronize: true,
});

// IDs fijos para referencia
const RESTAURANT_ID = "550e8400-e29b-41d4-a716-446655440100";
const SECTIONS = {
  TERRAZA: "550e8400-e29b-41d4-a716-446655440201",
  INTERIOR: "550e8400-e29b-41d4-a716-446655440202",
  VIP: "550e8400-e29b-41d4-a716-446655440203",
  BAR: "550e8400-e29b-41d4-a716-446655440204",
};

// Datos de mesas
const TABLES_DATA = [
  // Terraza (6 mesas)
  { number: 1, capacity: 2, sectionId: SECTIONS.TERRAZA, posX: 50, posY: 50 },
  { number: 2, capacity: 2, sectionId: SECTIONS.TERRAZA, posX: 150, posY: 50 },
  { number: 3, capacity: 4, sectionId: SECTIONS.TERRAZA, posX: 250, posY: 50 },
  { number: 4, capacity: 4, sectionId: SECTIONS.TERRAZA, posX: 50, posY: 150 },
  { number: 5, capacity: 6, sectionId: SECTIONS.TERRAZA, posX: 150, posY: 150 },
  { number: 6, capacity: 8, sectionId: SECTIONS.TERRAZA, posX: 250, posY: 150 },

  // Interior (8 mesas)
  { number: 7, capacity: 2, sectionId: SECTIONS.INTERIOR, posX: 50, posY: 50 },
  { number: 8, capacity: 2, sectionId: SECTIONS.INTERIOR, posX: 150, posY: 50 },
  { number: 9, capacity: 4, sectionId: SECTIONS.INTERIOR, posX: 250, posY: 50 },
  {
    number: 10,
    capacity: 4,
    sectionId: SECTIONS.INTERIOR,
    posX: 350,
    posY: 50,
  },
  {
    number: 11,
    capacity: 4,
    sectionId: SECTIONS.INTERIOR,
    posX: 50,
    posY: 150,
  },
  {
    number: 12,
    capacity: 6,
    sectionId: SECTIONS.INTERIOR,
    posX: 150,
    posY: 150,
  },
  {
    number: 13,
    capacity: 6,
    sectionId: SECTIONS.INTERIOR,
    posX: 250,
    posY: 150,
  },
  {
    number: 14,
    capacity: 8,
    sectionId: SECTIONS.INTERIOR,
    posX: 350,
    posY: 150,
  },

  // VIP (4 mesas)
  { number: 15, capacity: 4, sectionId: SECTIONS.VIP, posX: 50, posY: 50 },
  { number: 16, capacity: 6, sectionId: SECTIONS.VIP, posX: 200, posY: 50 },
  { number: 17, capacity: 8, sectionId: SECTIONS.VIP, posX: 50, posY: 150 },
  { number: 18, capacity: 10, sectionId: SECTIONS.VIP, posX: 200, posY: 150 },

  // Bar (4 mesas altas)
  { number: 19, capacity: 2, sectionId: SECTIONS.BAR, posX: 50, posY: 50 },
  { number: 20, capacity: 2, sectionId: SECTIONS.BAR, posX: 150, posY: 50 },
  { number: 21, capacity: 3, sectionId: SECTIONS.BAR, posX: 250, posY: 50 },
  { number: 22, capacity: 4, sectionId: SECTIONS.BAR, posX: 350, posY: 50 },
];

async function seedTables() {
  console.log("🌱 Iniciando seed de mesas...");

  await mesasDataSource.initialize();
  console.log("✅ Conexión a db_mesas establecida");

  const queryRunner = mesasDataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Verificar si ya hay datos
    const existingCount = await queryRunner.query(
      "SELECT COUNT(*) as count FROM tables"
    );
    if (parseInt(existingCount[0].count) > 0) {
      console.log(
        `⚠️  Ya existen ${existingCount[0].count} mesas en la base de datos.`
      );
      console.log("   Limpiando datos existentes...");
      await queryRunner.query("DELETE FROM tables");
    }

    // Insertar mesas
    for (const table of TABLES_DATA) {
      const id = uuidv4();
      await queryRunner.query(
        `
        INSERT INTO tables (id, "sectionId", number, capacity, "posX", "posY", width, height, status, "isAvailable", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, 100, 100, 'AVAILABLE', true, NOW(), NOW())
      `,
        [
          id,
          table.sectionId,
          table.number,
          table.capacity,
          table.posX,
          table.posY,
        ]
      );
    }

    console.log(`✅ ${TABLES_DATA.length} mesas insertadas correctamente`);

    // Mostrar resumen
    const summary = await queryRunner.query(`
      SELECT "sectionId", COUNT(*) as count, SUM(capacity) as total_capacity
      FROM tables
      GROUP BY "sectionId"
    `);

    console.log("\n📊 Resumen de mesas por sección:");
    const sectionNames: Record<string, string> = {
      [SECTIONS.TERRAZA]: "Terraza",
      [SECTIONS.INTERIOR]: "Interior",
      [SECTIONS.VIP]: "VIP",
      [SECTIONS.BAR]: "Bar",
    };

    for (const row of summary) {
      const name = sectionNames[row.sectionId] || row.sectionId;
      console.log(
        `   - ${name}: ${row.count} mesas (${row.total_capacity} personas)`
      );
    }
  } finally {
    await queryRunner.release();
    await mesasDataSource.destroy();
  }
}

// Ejecutar seed
seedTables()
  .then(() => {
    console.log("\n🎉 Seed completado exitosamente!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error en seed:", error);
    process.exit(1);
  });
