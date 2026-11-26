# Trust, but verify: optional repository evidence sheet

Keep this optional sheet and its supporting evidence in the team repository. It is not a third submission item. Do not attach it as an extra submission document. The two-page brief contains the USP, architecture, accessible five-minute fallback video link, and one-page threat model.

Team: [name] | Commit: [hash] | Run: [ID] | Date/time: [UTC]

Environment: [OS, runtime, dependencies, node count, hardware]

Use one row per published goal. The headings below follow the supplied goal list. The suggested demonstrations are public practice guidance, not official thresholds. Record observed results separately from expected results. Link repository logs, commands, configuration, and timestamps that another person can use to repeat your work. Remove credentials and private data before sharing evidence.

Status values: `measured`, `partial`, `not tested`, `not supported`. Default status is `not tested`. Do not mark a goal measured from a design description alone. Add rows if a goal needs several measurements.

| Goal | Public demonstration and evidence to collect | Expected behavior you define before run | Actual result / status / evidence link |
| --- | --- | --- | --- |
| 1. Key rotation | Use the documented rotation interface. Record version IDs, activation times, and normal operations before and after rotation. | State transition rules and acceptable overlap. Do not include secret key values. | [not tested] |
| 2. Revocation across nodes | Use the documented revocation interface. Record normal access decisions on each named node, with clock uncertainty. Practice events `evt-016` to `evt-018` illustrate the outcome format only. | State when each node must stop access and how you calculate propagation delay. | [not tested] |
| 3. Crash recovery | In your local demo environment, stop and restart your own service through normal process controls. Record restart time and subsequent normal reads. | State which acknowledged data and policy state must survive. | [not tested] |
| 4. Backup integrity | Use documented backup and restore operations on synthetic data. Record backup ID, content digest, restore status, and normal read comparison. | State how restored content and authorization state must match the selected backup. | [not tested] |
| 5. Log integrity | Record the configured integrity mechanism and demonstrate its documented verification operation on exported synthetic logs. | State what verification detects and what it cannot detect. Plain logs alone do not establish tamper detection. | [not tested] |
| 6. Routine and suspicious activity | Process public events and compare your explanations with public labels. Include approved and unexpected changes, plus an isolated denial. | State classification rules and count mistakes on this practice set without claiming broader accuracy. | [not tested] |
| 7. Lateral movement | Show grouping of `evt-010` to `evt-012` by actor, session, time, and service edge. | Identify a candidate sequence and distinguish denied requests from successful access. | [not tested] |
| 8. Clock differences | Show raw and corrected timelines for `evt-015`. Record how your system obtains offset and uncertainty. | Preserve original timestamps and explain time comparisons within stated uncertainty. | [not tested] |
| 9. Replay and recipient binding | Document protocol freshness and intended-recipient checks. Use supported retry and recipient-selection interfaces with synthetic messages; record decisions and message IDs. | State duplicate handling and recipient matching rules. Record untested cases without claiming protection. | [not tested] |
| 10. Forward secrecy | Identify protocol, library version, key lifecycle, and supporting protocol documentation. Record whether session keys are erased as designed. | State the exact claim and its assumptions. Encryption or key rotation alone does not establish forward secrecy. | [not tested] |
| 11. Delivery under loss or reordering | Use your documented local test mode to delay or omit synthetic messages. Show `evt-013` and `evt-014` as the public ordering example. Record delivery and application outcomes separately. | State retry limits, ordering rules, duplicate rules, and final delivery guarantees. | [not tested] |
| 12. Session resumption (if supported) | Use documented session close and resume interfaces. Record normal access decisions and fresh policy checks after resumption. | State resumption lifetime and authorization rules. Mark not supported if absent. | [not tested] |

## Measurement record

Claim: [one precise claim]

Setup and input: [synthetic dataset or generated workload; version; seed if used]

Procedure: [numbered steps using documented interfaces]

Expected result: [state before the run]

Observed result: [counts, units, sample size, durations, failures]

Evidence: [relative path to logs or output; hash if available]

Limits: [clock error, missing nodes, untested scenarios, design-only claims]

Reviewer and reproduction date: [name / UTC date]
