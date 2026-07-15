import mysql from 'mysql2/promise';
import { config } from 'dotenv';

config();

const parseDbUrl = (url: string) => {
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

      if (Array.isArray(rows) && rows.length === 0) {
        console.log(`  → vacía, skip`);
        continue;
      }

      console.log(`  → ${(rows as any[]).length} registros`);

      // Insert en lotes de 1000
      const batchSize = 1000;
      for (let i = 0; i < (rows as any[]).length; i += batchSize) {
        const batch = (rows as any[]).slice(i, i + batchSize);
        const cols = Object.keys(batch[0]).join(', ');
        const vals = batch.map(r =>
          '(' + Object.values(r).map(v =>
            v === null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
          ).join(', ') + ')'
        ).join(', ');

        try {
          await railwayConn.query(`INSERT INTO ${table} (${cols}) VALUES ${vals}`);
          console.log(`  ✓ lote ${Math.ceil((i + batchSize) / batchSize)}/${Math.ceil((rows as any[]).length / batchSize)}`);
        } catch (e) {
          console.error(`  ✗ error lote ${i}: ${(e as Error).message}`);
        }
      }
    }

    console.log('\n✓ Migracion completada');
  } finally {
    await localConn.end();
    await railwayConn.end();
  }
}

migrate().catch(console.error);
