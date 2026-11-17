# Roles for the agent-briefs skill

The skill names three child roles: `reader`, `runner` and `writer`. This package ships no agents with those names, so the skill only works once these three definitions are installed. Without them, a dispatch to `reader` fails with `Unknown agent 'reader'`.

Copy the three files in this directory to `~/.pi/agent/agents/`, or to a project's `.pi/agents/`.

Two things in them are specific to the setup they were copied from:

- `defaultReads` tells each child to read the skill from `~/.pi/agent/skills/agent-briefs/SKILL.md` before it starts. Install the skill there, or change the path.
- `model`, and the model ids listed in the skill, are Anthropic ids. Change them if your provider differs.

All three roles can dispatch children: `reader` only other readers, `runner` and `writer` readers and runners. That needs `maxSubagentDepth` of 2 or more in the extension config.
