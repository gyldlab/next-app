## Backend Script Policy (Elysia Operations)

```xml
	<backendScriptPolicy addon="elysia">
	<skillUsage>
		<rule required="true">When editing backend scripts here, load and follow the ElysiaJS skill before implementation.</rule>
	</skillUsage>

	<maintenance>
		<rule required="true">Keep scripts/db-seed.ts synchronized with the current schema and bootstrap data requirements as the project grows.</rule>
		<rule required="true">When tables, columns, or auth bootstrap behavior change, update the affected scripts in the same task.</rule>
		<rule required="true">Keep script helpers flat under scripts/; do not introduce scripts/_lib unless the user explicitly asks for that structure.</rule>
		<rule required="true">Prefer Bun-native APIs such as Bun.password, Bun.$, Bun.write, Bun.spawn, and Bun stdin/stdout patterns instead of Node built-in modules for script internals.</rule>
		<rule required="true">Use Effect for script configuration, resource lifecycles, and error handling when it improves operational robustness.</rule>
	</maintenance>
	</backendScriptPolicy>
```
