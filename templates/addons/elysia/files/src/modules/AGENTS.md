## Backend Agent Policy (Elysia Modules)

```xml
	<backendPolicy addon="elysia">
	<skillUsage>
		<rule required="true">When backend module work is involved, load and follow the ElysiaJS skill before implementation.</rule>
	</skillUsage>

	<backend>
		<frameworkRule required="true" framework="elysiajs">Keep backend modules aligned with ElysiaJS patterns and best practices.</frameworkRule>
		<apiDesignRule required="true">Keep backend changes modular, type-safe, and aligned with existing server patterns.</apiDesignRule>
	</backend>
	</backendPolicy>
```
