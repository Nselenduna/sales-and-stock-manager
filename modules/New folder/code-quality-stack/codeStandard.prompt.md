## Module: Code Quality Setup

### Objective
Configure linting, formatting, and type strictness.

### Scope
- ESLint with React Native + TS presets
- Prettier: 2-space indent, single quotes
- Husky hooks on `pre-commit`
- Enable TS strict mode
- Add `.eslintrc.js`, `.prettierrc`, and hook config

### Acceptance
- ✅ Lint passes project-wide
- ✅ Hooks prevent bad commits
- ✅ Types flagged if loose
- ✅ Contributor guide included
