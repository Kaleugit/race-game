# Parsing a Claude Code transcript

Claude Code stores each session as a `.jsonl` file under
`~/.claude/projects/-<encoded-project-path>/<session-id>.jsonl`. Each
line is one JSON record.

## Record shape

Each record has a top-level `type`. The two interesting ones for
incident analysis are:

- `type: "user"` — user prompts AND tool results. Real user prompts
  have `message.content` as a string OR as a list containing `{type:
  "text", text: ...}`. Tool results have `message.content` as a list
  of `{type: "tool_result", content: ...}` entries.
- `type: "assistant"` — assistant turns. `message.content` is a list
  of `{type: "text"|"tool_use", ...}` entries.

To separate true user input from tool result echoes, filter on the
presence of a `text`-type content block at the top level (true user)
vs `tool_result` (echo).

## Quick extraction

The skill's analyst should run this Python snippet on the transcript
to get a numbered list of real user prompts and assistant text turns:

```python
import json, sys
from pathlib import Path

path = Path(sys.argv[1])
n = 0
for raw in path.read_text().splitlines():
    try:
        d = json.loads(raw)
    except Exception:
        continue
    t = d.get("type")
    msg = d.get("message", {})
    if not isinstance(msg, dict):
        continue
    content = msg.get("content", "")

    is_real_user = False
    parts = []
    if t == "user":
        if isinstance(content, str):
            is_real_user = True
            parts = [content]
        elif isinstance(content, list):
            for c in content:
                if isinstance(c, dict) and c.get("type") == "text":
                    is_real_user = True
                    parts.append(c.get("text", ""))
    elif t == "assistant" and isinstance(content, list):
        for c in content:
            if isinstance(c, dict) and c.get("type") == "text":
                parts.append(c.get("text", ""))

    text = "\n".join(parts).strip()
    if not text:
        continue
    if text.startswith("<system") or text.startswith("Caveat:"):
        continue

    n += 1
    label = "USER" if (t == "user" and is_real_user) else "ASSISTANT"
    print(f"===== #{n} {label} =====")
    print(text)
    print()
```

Run with `python3 /tmp/parse.py <path-to-jsonl>` (or inline via a heredoc).

## Citation convention

Reference messages as `#<n> USER` or `#<n> ASSISTANT`, where `<n>` is
the sequential index produced by the parser above. The index is stable
within a transcript but not across transcripts. Always include the
transcript filename or session id once at the top of the report.

## Large transcripts

If the transcript is large (more than ~200 messages), the parser output
may exceed Claude Code tool result limits. In that case:

- Save the parsed output to a file (`python3 /tmp/parse.py file.jsonl > /tmp/parsed.txt`).
- Read `/tmp/parsed.txt` in chunks.
- Identify message indices to cite, then quote only those for the report.

## What to look for

Scan user messages for these phrases — they typically mark a divergence:

- "não foi isso que eu pedi"
- "falha grave" / "isso foi um erro"
- "não esqueça de" / "lembre de" (repeated correction)
- "ao invés de" / "em vez de" (re-directing the agent)
- "stop" / "pare" / "espera"
- "explique melhor" / "não entendi" (signals confusion not the agent's fault)

Repetition of the same correction across multiple user turns is the
strongest signal of a `governance-gap` — the rule needed exists in the
human's head but not in the project's governance.
