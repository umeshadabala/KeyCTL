"""One JSON request per process. Team code owns all application behavior."""
import json
import sys

from team_app import dispatch


def main() -> int:
    try:
        request = json.load(sys.stdin)
        if not isinstance(request, dict):
            raise ValueError("Request must be an object")
        response = dispatch(request)
        if not isinstance(response, dict):
            raise ValueError("Response must be an object")
        encoded = json.dumps(response, allow_nan=False)
    except Exception:
        # Do not print request data or exception details that could contain secrets.
        print("Request failed; inspect team application locally.", file=sys.stderr)
        return 1
    sys.stdout.write(encoded + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
