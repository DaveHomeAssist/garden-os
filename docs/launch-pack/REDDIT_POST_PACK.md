# Reddit Post Pack

## r/selfhosted
### Title
Zero-backend garden planner built as standalone HTML tools

### Body
I built Garden OS with a strict constraint: every tool must run as a standalone HTML file.

- no backend
- no frameworks
- no build step
- local-first data

Latest release adds explainable crop scoring and portable `.gos.json` workspace files.

Instead of only showing a score, it now explains why a placement scores the way it does and highlights the limiting factor.

Live: https://davehomeassist.github.io/garden-os/
Source: https://github.com/DaveHomeAssist/garden-os

Would love feedback from anyone who values durable, infra-free tools.

---

## r/opensource
### Title
Garden OS v4.4: explainable raised-bed planning with zero dependencies

### Body
Garden OS is an open-source planning system focused on reasoning, not just layout.

The scoring model now shows factor-level breakdowns (sun/support/shade/access/season/structure/adjacency) and identifies the limiting factor automatically.

Architecture constraints:
- no backend
- no framework
- no build pipeline
- local-first workspaces with `.gos.json` export/import

Demo: https://davehomeassist.github.io/garden-os/
Repo: https://github.com/DaveHomeAssist/garden-os

Open to technical critique on scalability and model design.

---

## r/homelab
### Title
Local-first planning tool with deterministic scoring and portable save files

### Body
Garden OS is a browser-native project that avoids infrastructure entirely.

Everything runs client-side. Workspaces stay local and can be exported as `.gos.json` files.

The interesting part is explainable scoring: instead of "trust the number," each score is decomposed and the limiting variable is called out.

If you care about software longevity and low-ops architecture, I would value feedback.

Live: https://davehomeassist.github.io/garden-os/
Repo: https://github.com/DaveHomeAssist/garden-os
