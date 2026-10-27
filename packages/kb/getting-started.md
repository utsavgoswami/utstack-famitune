---
type: Reference
title: Getting started — Famitune Knowledgebase
description: Starting point for the Famitune Knowledgebase OKF bundle.
tags: [getting-started]
status: stable
generated: { by: muse-wonder/1.0, at: 2026-10-27T04:52:02Z }
---

# Overview

This bundle (`@famitune/kb`, directory `packages/kb/`) is the Famitune
knowledgebase: an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format)
(OKF) v0.2 bundle — a directory of markdown files with YAML frontmatter,
versioned with the code it describes. One concept is one file; the file path
minus `.md` is the concept ID.

Start from the bundle-root [index](/index.md) for progressive disclosure, then
follow links only into the concepts relevant to your task. Weigh what you read:
a concept with no `verified` entry is unverified, and a concept past its
`stale_after` date should be checked before relying on it.

# Contents

- [Hackathon](/hackathon/index.md) — hackathon knowledge, starting with the
  [Meta Global AI Developer Hackathon — Participant Guide](/hackathon/meta-global-ai-developer-hackathon.md).

# Authoring

- Every non-reserved `.md` file must carry parseable YAML frontmatter with a
  non-empty `type`.
- Record where knowledge came from in `sources`, who produced it in
  `generated`, and cross-link related concepts with standard markdown links
  (bundle-relative `/path/to/concept.md` preferred).
- `index.md` files list a directory's contents; `log.md` records lifecycle
  events only (creation, deprecation, supersession, regeneration, verification).
- Validate before committing: run the OKF validator with `--strict` against
  `packages/kb/`.
