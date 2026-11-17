import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import registerSubagentExtension from "../../src/extension/index.ts";
import { SUBAGENT_CHILD_ENV } from "../../src/runs/shared/child-runtime-config.ts";
import { getAsyncPromptAuditRun, processAsyncPromptAuditStore, registerAsyncPromptAudit } from "../../src/runs/foreground/prompt-audit.ts";
import type { SubagentState } from "../../src/shared/types.ts";
import { createEventBus, makeMinimalCtx } from "../support/helpers.ts";

type Handler = (event: unknown, ctx: unknown) => unknown;

/** One extension instance, as a Pi runtime loads it: register, then session_start. close() runs session_shutdown, as /reload does. */
async function loadExtension(cwd: string, sessionFile: string) {
	const handlers = new Map<string, Handler[]>();
	const pi = new Proxy({
		events: createEventBus(),
		on(event: string, handler: Handler) { handlers.set(event, [...(handlers.get(event) ?? []), handler]); },
		sendMessage() {},
		getSessionName() { return undefined; },
	}, { get: (target, prop) => prop in target ? target[prop as keyof typeof target] : () => undefined });
	const ctx = {
		...makeMinimalCtx(cwd),
		isIdle: () => true,
		hasUI: false,
		sessionManager: { getSessionId: () => path.basename(sessionFile), getSessionFile: () => sessionFile, getEntries: () => [], getBranch: () => [] },
	};
	const childEnv = process.env[SUBAGENT_CHILD_ENV];
	delete process.env[SUBAGENT_CHILD_ENV];
	try {
		registerSubagentExtension(pi as never);
	} finally {
		if (childEnv !== undefined) process.env[SUBAGENT_CHILD_ENV] = childEnv;
	}
	const fire = async (event: string, payload: unknown) => {
		for (const handler of handlers.get(event) ?? []) await handler(payload, ctx);
	};
	await fire("session_start", { reason: "startup" });
	return { reload: async () => fire("session_shutdown", { reason: "reload" }), switchSession: async () => fire("session_start", { reason: "resume" }) };
}

describe("async Prompt Audit across /reload", () => {
	it("keeps a running async run's prompt after the extension reloads or the session restarts, scoped to its session", async () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-prompt-audit-reload-"));
		const sessionFile = path.join(dir, "session.jsonl");
		const runId = `reload-audit-${Date.now()}`;
		let cleanup: (() => Promise<void>) | undefined;
		try {
			const first = await loadExtension(dir, sessionFile);
			// What runAsyncPath records for an extension-owned state: the state is bound to the process store.
			const boundState = { asyncPromptAudits: processAsyncPromptAuditStore() } as SubagentState;
			registerAsyncPromptAudit(boundState, { runId, index: 0, sessionId: sessionFile, authoredTask: "RELOAD_SENTINEL task", effectivePrompt: "RELOAD_SENTINEL task" });

			await first.switchSession();
			assert.ok(getAsyncPromptAuditRun(boundState, runId, sessionFile), "a session restart keeps the record");

			await first.reload();
			const second = await loadExtension(dir, sessionFile);
			cleanup = second.reload;
			const afterReload = { asyncPromptAudits: processAsyncPromptAuditStore() } as SubagentState;
			assert.equal(getAsyncPromptAuditRun(afterReload, runId, sessionFile)?.prompts.get(0)?.authoredTask, "RELOAD_SENTINEL task", "the reloaded extension sees the record");
			assert.equal(getAsyncPromptAuditRun(afterReload, runId, path.join(dir, "other.jsonl")), undefined, "other sessions still cannot see it");
		} finally {
			await cleanup?.();
			processAsyncPromptAuditStore().delete(runId);
			fs.rmSync(dir, { recursive: true, force: true });
		}
	});
});
