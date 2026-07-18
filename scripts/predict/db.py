"""db.py — Conexión MySQL y acceso a datos para el pipeline de predicción.

Misma lógica de bucketing de tipos de delito que server/data/sesnsp.ts
(queryRealIncidencia), pero SIN el recorte automático a los últimos 3 años
que aplica ese helper — este pipeline usa el histórico completo (2015-2026).
"""

import os
import re
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

ROOT = Path(__file__).resolve().parents[2]

BUCKET_CASE_SQL = """
CASE
  WHEN tipo IN ('Homicidio','Feminicidio') THEN 'homicidios'
  WHEN tipo = 'Robo' THEN 'robos'
  WHEN tipo = 'Lesiones' THEN 'lesiones'
  WHEN bien_juridico = 'La libertad y la seguridad sexual' THEN 'violencia_sexual'
  WHEN tipo = 'Narcomenudeo' THEN 'narcomenudeo'
  ELSE 'otros'
END
"""


def get_database_url() -> str:
    """Lee DATABASE_URL de env o de .env en la raíz del repo (mismo parseo
    que scripts/load-sesnsp.ts, para no depender de una segunda fuente)."""
    if os.environ.get("DATABASE_URL"):
        return os.environ["DATABASE_URL"]
    env_path = ROOT / ".env"
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            m = re.match(r"^DATABASE_URL=(.*)$", line)
            if m:
                return m.group(1).strip().strip("\"'")
    raise RuntimeError("DATABASE_URL vacío — configúralo en .env antes de correr el pipeline")


def get_engine():
    url = get_database_url()
    # mysql2 (Node) usa "mysql://...", SQLAlchemy+PyMySQL necesita "mysql+pymysql://".
    sa_url = url.replace("mysql://", "mysql+pymysql://", 1)
    return create_engine(sa_url)


def load_incidencia_mensual(engine) -> pd.DataFrame:
    """Histórico COMPLETO agrupado mensual por (municipio, tipo de delito).
    Sin filtro de año — a diferencia de queryRealIncidencia() en Node."""
    query = text(f"""
        SELECT
            cve_muni,
            municipio,
            anio,
            mes,
            {BUCKET_CASE_SQL} AS tipo_delito,
            SUM(cantidad) AS cantidad
        FROM incidencia_delito
        GROUP BY cve_muni, municipio, anio, mes, tipo_delito
        ORDER BY cve_muni, tipo_delito, anio, mes
    """)
    return pd.read_sql(query, engine)


def write_predicciones(engine, df: pd.DataFrame) -> None:
    """Sobreescribe completo: TRUNCATE + INSERT (mismo patrón idempotente
    que scripts/load-sesnsp.ts)."""
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE predicciones_ml"))
        df.to_sql("predicciones_ml", conn, if_exists="append", index=False)
