# Basic workflow example

```bash
ct init
ct plan "Add a small regression test" --scope "one focused test" --acceptance "test fails before fix" --verification "npm test"
ct run --preview "npm test"
ct run --safe "git status"
ct review --status pass --next "Write the first implementation slice"
ct resume
```
