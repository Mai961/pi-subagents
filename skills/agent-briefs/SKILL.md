---
name: agent-briefs
description: How to use Pi subagents. Covers the two ways to split a job (hand off the pieces, or do the core yourself and send out errands), the three child roles, the models to choose from, and what a brief needs. Read at the start of any job that is more than a quick answer.
---

# Pi Agent Briefs

This applies to whoever is reading it: the main session, or a child that can dispatch children of its own. The aim is the least cost and time for the job without losing accuracy. How you use subagents is your call. This skill gives the two ways people do it, the limits, the facts you cannot know, and the few things that protect accuracy.

## Two ways to use subagents

**Hand off the pieces (top-down).** You split the job before touching it, give whole pieces to children, and read their reports.

- It suits a wide job: several independent pieces that can run at once, a job too big for one context, or a review, which needs fresh eyes.
- Your context stays small and you stay responsive.
- The cost is the handoff. Each child knows only its brief, children cannot see each other's choices, you judge work you have not seen up close, and it uses several times more tokens.

**Do the core yourself and send out errands (bottom-up).** You work on the job, and when something bulky or peripheral comes up, a child fetches the answer: a search, a long file, log or transcript, a test or build run, a fact to check.

- It suits a job that is one connected piece. The understanding stays with you, so the design and the edits fit together.
- A handoff is a short question and a short answer, and the cheapest models can do it.
- The cost is that it is mostly serial, and it only works if you actually send the errands out. Reading bulky material into your own context and then handing the core to a cold child is the worst of both.

Choose per job, and mix them when that fits. Either way, raw material you only need a conclusion from belongs in a child's context, not yours.

Do not launch a child before you know what you are asking it. Size a job by the question, not by the volume of material: an audit is one child with a sampling plan unless full coverage is asked for.

## Leave a trace

These choices are audited later, so record them where the transcript keeps them. One line each:

- Before you start a job, write `Approach: <top-down | bottom-up | on my own>, because <reason>.`
- Begin every brief with `Why: <model>:<level>, because <reason>.`

## Roles

Roles are defined by what a child may do, not by the job. The job is whatever you write in the brief.

- `reader`: reads and searches files. Cannot run commands or change anything. May dispatch `reader` children.
- `runner`: also has a shell, for tests, builds, reproductions, measurements and log analysis. It is told not to change files; that is an instruction, not a sandbox. May dispatch `reader` or `runner` children.
- `writer`: also edits files. One writer per working tree. May dispatch `reader` or `runner` children.

Pick the lowest role that can finish the job. An investigation that needs to run something is a `runner`, not a `reader`. Nesting stops two levels below the main session; at the limit the runtime refuses the call and you finish the work yourself.

Model and thinking level are your call per dispatch: the cheapest, fastest combination that will still get this task right. Pass `model: "<id>:<level>"` using one of these ids exactly, never one from memory, or omit `model` to run the role as defined:

- `anthropic/claude-haiku-5-5`: cheapest and quickest (1/40 to 1/8 of Opus's price). Lookups, listings, mechanical edits with an exact target.
- `anthropic/claude-sonnet-5-5`: half of Opus's price. Routine, well-specified implementation, test runs, straightforward probes.
- `anthropic/claude-opus-5-5`: the usual worker. Multi-file implementation, investigations, correctness review.
- `anthropic/claude-fable-5-2`: strongest, twice Opus's price. The hardest root-cause hunts, reviews of load-bearing claims, design and tidiness judgement.

Thinking level runs from `low` to `max`; `high` is enough for most work, root-cause hunts included.

## Briefs

A child knows only what its brief says: not this conversation, not earlier tool output. Always give:

- the objective and what done looks like;
- anything you already know that it would otherwise have to rediscover: paths, commands, findings, decisions already made.

Add a don't-touch list when something could be damaged. Say what you need back when the role's standard report is not enough, such as a verdict line or a machine-readable file. Size the rest to the job: an errand can be one sentence.

The roles already report answer-first, with `path:line` citations and confirmed-versus-inferred labels, so a brief need not ask for that. For a change, done includes a real-use check: the change run the way the owner will use it, with the output quoted, or a reason it cannot run here.

## Running children

- You can dispatch one child, a few in parallel, or a `workflowScript` when the orchestration needs code: fan-out over a known list, loops, isolated parallel writes.
- Use a fresh context unless the runtime reports a prior child as resumable and the follow-up needs that child's context.
- Set `cwd` to the project the child should work in.
- From the main session, run async when you can make unrelated progress, and consume the result before work that depends on it.
- If you are a child yourself, run your children in the foreground with `async: false`; you cannot wait on a background run.
- Independent children must not share mutable state. Parallel writers need separate worktrees.
- In a sequence, paste the previous child's raw evidence into the next brief; do not paraphrase it.

## Checking results

Treat a child's output as evidence, not authority. Before relying on a conclusion, check the evidence it rests on: read the cited lines or output, and confirm the report answers the done-condition.

- A review is always a fresh child, never the one that did the work. For a claim everything rests on, brief it to refute that claim and end with `VERDICT: REFUTED | STANDS | UNDECIDED`.
- One clean review ends the cycle. Batch every blocking finding into one fix; do not re-review for polish.
- For three or more dispatches, keep a short ledger outside the tracked repository: objective, verified claims with citations, decisions, run status, open questions. Re-read it after compaction.

## Runtime facts

- A `failed` status or a "Background task failed" notice is not proof of a transport failure. Read the run's `meta.json` `acceptance` block first. "Acceptance rejected: ... evidence missing" means the child finished and its report missed the evidence checklist. Judge the child on its output.
- Never pass an explicit acceptance level to a `reader` or `runner`. `checked` and `verified` demand write-task evidence they cannot supply.
- When the runtime says a review is required "by reviewer", dispatch a fresh `reader` or `runner` for it; no role has that name.
- A resumed run keeps the model and thinking level it started with. Changing either needs a fresh launch.
- A brief containing `release`, `migration`, `migrate`, `security`, `data-loss`, `destructive`, `post-review` or `fix pass` is treated as risky and forces a review. Avoid those words in a routine brief, or expect it.
- Do not launch a nested `pi` from a child's shell, and do not leave orchestration prompt files where a child works; a nested session can start re-orchestrating the same job.
