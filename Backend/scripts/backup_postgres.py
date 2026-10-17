import argparse
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


def required_setting(name):
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Defina {name} no ambiente antes de gerar o backup.")
    return value


def main():
    parser = argparse.ArgumentParser(description="Gera um backup customizado do PostgreSQL do MyBooks.")
    parser.add_argument("--directory", type=Path, default=Path("backups"), help="Pasta onde o arquivo será criado.")
    args = parser.parse_args()

    host = required_setting("DJANGO_DB_HOST")
    database = required_setting("DJANGO_DB_NAME")
    username = required_setting("DJANGO_DB_USER")
    password = required_setting("DJANGO_DB_PASSWORD")
    port = os.getenv("DJANGO_DB_PORT", "5432").strip() or "5432"
    sslmode = os.getenv("DJANGO_DB_SSLMODE", "require").strip() or "require"

    args.directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = args.directory / f"mybooks-{stamp}.dump"
    process_env = os.environ.copy()
    process_env["PGPASSWORD"] = password
    process_env["PGSSLMODE"] = sslmode

    command = [
        "pg_dump", "--format=custom", "--no-owner", "--no-privileges",
        "--host", host, "--port", port, "--username", username,
        "--file", str(backup_path), database,
    ]
    try:
        subprocess.run(command, env=process_env, check=True)
    except FileNotFoundError:
        raise SystemExit("pg_dump não foi encontrado. Instale as ferramentas cliente do PostgreSQL.")
    except subprocess.CalledProcessError as error:
        backup_path.unlink(missing_ok=True)
        raise SystemExit(f"pg_dump terminou com erro ({error.returncode}); o arquivo parcial foi removido.")

    if os.name != "nt":
        backup_path.chmod(0o600)
    print(f"Backup criado: {backup_path.resolve()}")


if __name__ == "__main__":
    main()
