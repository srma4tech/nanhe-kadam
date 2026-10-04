# Phase 3 reconnaissance — curriculum and content validation

## Current state

`content/` contains only reserved empty folders, and `scripts/validate-content.mjs` is a placeholder that exits successfully without validating anything. There is no schema, curriculum, language completeness check, or content review checklist yet. The app is a static offline PWA, so the curriculum should be local JSON with no runtime fetch to external services.

## Design constraints

- Keep a 28-day four-week sequence in Hindi and English, organized by the agreed daily rhythm and gentle age-appropriate reinforcement.
- Include short activity/mission prompts, original rhyme/story titles or summaries, and paper-based parent-child demonstrations; do not include copyrighted lyrics or copied stories.
- Validate unique IDs, both language strings, required fields, allow-listed license/source values, and any local asset paths. Keep authoring and validation dependency-free.
- Include fixtures that intentionally fail validation, plus a human read-through checklist before declaring content child-ready.

## Verification limits

Automated checks can validate structure, IDs, language coverage, local paths, and license tags. They cannot judge reading level, cultural fit, factual accuracy, pronunciation, or whether an activity is engaging; those require a human bilingual review and are tracked separately.

