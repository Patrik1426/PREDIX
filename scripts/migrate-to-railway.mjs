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

const TABLES = [
  'users',
  'user_sessions',
  'role_permissions',
  'alertas',
  'incidencia_delictiva',
  'incidencia_delito',
  'incidencia_victima',
  'incident_attachments',
  'audit_log',
  'secret_vault',
  'secret_audit_log',
  'secret_rotation_history',
  'sesnsp_sync_log',
];

async function migrate() {
  const localConn = await mysql.createConnection(LOCAL_DB);
  const railwayConn = await mysql.createConnection(RAILWAY_DB);

  try {
    for (const table of TABLES) {
      console.log(`\n[${table}] leyendo...`);
      const [rows] = await localConn.query(`SELECT * FROM ${table}`);

      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`  → vacía, skip`);
        continue;
      }

      console.log(`  → ${rows.length} registros`);

      // Obtener columnas que existen en destino
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
            const v = r[col];
            return v === null ? 'NULL' :
              typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` :
              typeof v === 'boolean' ? (v ? 1 : 0) :
              typeof v === 'object' ? `'${JSON.stringify(v).replace(/'/g, "''")}'` :
              String(v);
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

    console.log('\n✓ Migracion completada');
  } finally {
    await localConn.end();
    await railwayConn.end();
  }
}

migrate().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
