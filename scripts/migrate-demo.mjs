import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config({ path: join(dirname(fileURLToPath(import.meta.url)), '..', '.env') });

const parseDbUrl = (url) => {
  const u = new URL(url);
  return {
    host: u.hostname,
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1),
    port: parseInt(u.port || '3306'),
  };
};

const LOCAL_DB = parseDbUrl(process.env.LOCAL_DATABASE_URL || '');
const RAILWAY_DB = parseDbUrl(process.env.DATABASE_URL || '');

// Solo tablas necesarias para demostración
const TABLES = [
  'incidencia_delito',      // 378k registros base
  'incidencia_victima',     // 25k registros
  // 'alertas',             // skip: fecha formato issue, no crítica
];

async function migrate() {
  const localConn = await mysql.createConnection(LOCAL_DB);
  const railwayConn = await mysql.createConnection(RAILWAY_DB);

  try {
    // Limpiar tablas en destino
    console.log('Limpiando tablas destino...');
    for (const table of TABLES) {
      try {
        await railwayConn.query(`DELETE FROM ${table}`);
      } catch (e) {
        // ignore
      }
    }

    for (const table of TABLES) {
      console.log(`\n[${table}] leyendo...`);
      const [rows] = await localConn.query(`SELECT * FROM ${table}`);

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`  → vacía`);
        continue;
      }

      console.log(`  → ${rows.length} registros`);

      // Obtener columnas en destino
      const [colInfo] = await railwayConn.query(`DESCRIBE ${table}`);
      const destCols = new Set(colInfo.map(c => c.Field));

      // Insert en lotes de 500
      const batchSize = 500;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const allCols = Object.keys(batch[0]);
        const mapCols = allCols.filter(c => destCols.has(c));

        const vals = batch.map(r => {
          const rowVals = mapCols.map(col => {
            let v = r[col];
            if (v === null) return 'NULL';
            if (typeof v === 'string') {
              // Parse ISO dates
              if (v.match(/^\d{4}-\d{2}-\d{2}T/)) {
                return `'${v.substring(0, 19).replace(/T/, ' ')}'`;
              }
              return `'${v.replace(/'/g, "''")}'`;
            }
            if (typeof v === 'boolean') return v ? 1 : 0;
            if (typeof v === 'object') {
              return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
            }
            return String(v);
          });
          return '(' + rowVals.join(', ') + ')';
        }).join(', ');

        try {
          const cols = mapCols.join(', ');
          await railwayConn.query(`INSERT INTO ${table} (${cols}) VALUES ${vals}`);
          const loteNum = Math.ceil((i + batchSize) / batchSize);
          const totalLotes = Math.ceil(rows.length / batchSize);
          console.log(`  ✓ lote ${loteNum}/${totalLotes}`);
        } catch (e) {
          console.error(`  ✗ error lote ${Math.ceil(i / batchSize)}: ${e.message}`);
          throw e;
        }
      }
    }

    console.log('\n✓ Migracion demo completada');
  } finally {
    await localConn.end();
    await railwayConn.end();
  }
}

migrate().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
