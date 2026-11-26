# Trust, but verify

Use the two sections as two pages. Keep each page to about 350 words. Replace bracketed text. Insert a page break before Page 2 when exporting; Markdown viewers do not enforce page counts. Keep optional evidence in the team repository. Do not add a third submission item or an extra evidence-sheet attachment.

## Page 1: USP, architecture, and fallback video

**Project:** [name]  
**Team:** [names]  
**Repository and commit:** [URL / hash]  
**Demo entry point:** [documented local command or URL]

### Unique selling proposition (USP)

[Who uses this system? Which resource or workflow needs protection? What practical failure does the project address? Explain what distinguishes your working solution. Use at most four sentences.]

### Architecture

[Name actors, services, nodes, and data flows. Describe identity checks, authorization, key management, logs, and recovery. Include a small diagram if it fits. Name actual protocol and library versions. Distinguish working components from planned components.]

### Accessible five-minute fallback video link

**Video link:** [paste accessible URL]  
**Duration:** [five minutes]  
**Access checked:** [date; confirm reviewers can open the link without requesting permission]

[Show the working system, its main workflow, and the observed result. Explain the architecture briefly. Include relevant limits. The link belongs on this page; the video is not an extra document attachment.]

**Observed outcome:** [One short paragraph. Link supporting evidence in the team repository if useful.]

<div style="page-break-before: always;"></div>

## Page 2: One-page threat model

### Assets

[List protected data, identities, keys, authorization state, logs, and service availability as applicable. State which security property matters for each asset.]

### Adversaries

[Name relevant adversary types and their assumed access or capabilities. Distinguish an unauthorized caller, a compromised account, and a compromised service where applicable.]

### Trust boundaries

[Identify where data or authority crosses between users, services, nodes, storage, and administrators. State where the system checks identity and permissions.]

### Assumptions

[State dependencies on trusted components, administrator behavior, clocks, network conditions, key storage, and deployment configuration.]

### Defenses

[Map each main threat to a working defense and its evidence. State partial or untested protection explicitly. Separate protocol guarantees from your implementation's observed behavior.]

### Exclusions and remaining risks

[State unsupported cases and threats outside scope. Explain the largest remaining risk. Do not imply that synthetic practice events establish production security.]
