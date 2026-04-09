## Backend Agent Policy (Elysia Client)

```xml
	<backendPolicy addon="elysia">
	<skillUsage>
		<rule required="true">When editing Elysia client integration code here, load and follow the ElysiaJS skill before implementation.</rule>
	</skillUsage>

	<backend>
		<frameworkRule required="true" framework="elysiajs">Keep Elysia client wiring consistent with the server contract.</frameworkRule>
		<apiDesignRule required="true">Preserve type-safe client and server integration points.</apiDesignRule>
		<apiDesignRule required="true">When schema files under src/lib/db change, update the related backend operations scripts in scripts/ during the same task.</apiDesignRule>
	</backend>
	</backendPolicy>
```
