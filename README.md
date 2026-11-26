# Trust, but verify

**Track 4 participant toolkit | Yugaantar DevForge | v1.0.0**

Start with a lost-device case. An owner can read a synthetic file. After revocation the same owner loses access, a second owner can still read their own file, and an audit record explains the denied request. Run the example, then connect your implementation to the same interface.

## First run

1. [Download toolkit v1.0.0 as a ZIP](https://github.com/BUTTERFINGERS7498/trust-but-verify-toolkit/archive/refs/tags/v1.0.0.zip), extract it, and open a terminal in the folder containing `quickstart.py`.
2. Install Python 3.12 or use an existing Python 3.12 environment. The local checker uses the standard library. The optional JavaScript demo also needs Node.js (24.11.1 matches the judging runtime).
3. Run the Python demo:

   ```sh
   python quickstart.py
   ```

4. To try the JavaScript version, run:

   ```sh
   python quickstart.py node
   ```

A successful run exits with code 0. Each run starts with fresh synthetic data. Rerun the command to reset the practice scenario. The mock service stores practice data in temporary files. Run your own code on your machine. The local checker starts processes directly with your user's permissions.

## Connect your repository

1. Choose [Python](starters/python) or [Node.js](starters/node). Copy that starter's adapter and application stub to the root of **your team's repository**. Keep exactly one supported adapter at the root.
2. Connect the stub's dispatch function to your application. Use the [versioned adapter contract](docs/adapter-v1.md) for request fields, response examples, runtime constraints and persistence. The [demo applications](demo) illustrate the public read and revocation scenario.
3. From the toolkit folder, point the validator at your adapter:

   ```sh
   python validate.py --entry "../my-project/track4_service.py"
   ```

   For Node.js, use your `track4_service.cjs` path. A fresh starter needs your implementation before the behavior checks can pass.
4. Record the setup command, dependencies, expected outputs and known limitations in your repository README.

## Prepare your submission

| Resource | Use it for |
| --- | --- |
| [Practice data and labels](practice) | Compare expected alerts with routine administration, unexpected access and out-of-order events. |
| [Evidence sheet and project brief template](templates) | Link each of the 12 goals to evidence or a limitation. Prepare a PDF of at most two pages with the one-page threat model and a link to the five-minute fallback demo. |
| [Official track page](https://rentry.co/uio6w6kn) | Confirm event rules, scoring and submission requirements. |

Submit the **public URL of the repository your team created during the hackathon** and the **two-page project brief PDF** through the organizer's submission process. Keep the toolkit separate from your competition submission.

## What a pass means

The public validator checks setup, read decisions, returned content, revocation, unaffected peer access and audit correlation on the lost-device scenario. It does not award points. The official worker also has a protected-read cryptography check. Distributed revocation, key rotation, messaging, detection quality and other checklist goals need evidence beyond this local run.
