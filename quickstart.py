"""Run the public lost-device scenario against a disposable demo project."""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ENTRIES = {
    "python": ("track4_service.py", "team_app.py"),
    "node": ("track4_service.cjs", "team_app.cjs"),
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("runtime", choices=ENTRIES, default="python", nargs="?")
    runtime = parser.parse_args().runtime
    entry, app = ENTRIES[runtime]
    with tempfile.TemporaryDirectory(prefix="track4-demo-") as folder:
        project = Path(folder)
        shutil.copyfile(ROOT / "starters" / runtime / entry, project / entry)
        shutil.copyfile(ROOT / "demo" / runtime / app, project / app)
        print(f"Running {runtime} practice service with fresh synthetic data.", flush=True)
        return subprocess.run(
            [sys.executable, str(ROOT / "validate.py"), "--entry", str(project / entry)],
            check=False,
        ).returncode


if __name__ == "__main__":
    sys.exit(main())
