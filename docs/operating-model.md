# Operating Model

## Public project boundary

Public docs should explain the project for a general developer audience. Private planning notes, local machine paths, and internal session logs should not be copied into public-facing docs.

## Recommended workflow

1. Plan the next small task.
2. Preview commands before running them.
3. Safe-run only low-risk verification commands.
4. Review the result.
5. Resume from the latest log in the next session.

## Suggested repository shape

```text
README.md
CHANGELOG.md
docs/
examples/
src/
tests/
.tricycle/        # local generated workspace; ignored by git
```
