## Backend Agent Policy (Elysia API)

```xml
	<backendPolicy addon="elysia">
	<skillUsage>
		<rule required="true">When backend work is involved, load and follow the ElysiaJS skill before implementation.</rule>
	</skillUsage>

	<backend>
		<frameworkRule required="true" framework="elysiajs">Keep route work aligned with ElysiaJS patterns and best practices.</frameworkRule>
		<apiDesignRule required="true">Keep backend changes modular, type-safe, and aligned with existing server patterns.</apiDesignRule>
	</backend>

	<instructionPriority>
		<priority level="1">Load and follow the ElysiaJS skill before implementing backend work.</priority>
		<priority level="2">Preserve modular, type-safe route design.</priority>
	</instructionPriority>
	</backendPolicy>
```
