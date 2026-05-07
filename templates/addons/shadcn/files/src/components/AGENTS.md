## Component Agent Policy (shadcn/ui)

```xml
	<frontendPolicy addon="shadcn">
	<skillUsage>
		<rule required="true">When editing or creating UI components here, load and follow the shadcn skill before implementation.</rule>
	</skillUsage>

	<frontend>
		<uiFramework required="true" scope="components">Build with native shadcn primitives whenever applicable.</uiFramework>
		<compositionRule required="true">Prefer composing existing shadcn primitives and local project components before introducing custom UI patterns.</compositionRule>
		<dialogRules required="true">
			<rule>Dialog actions belong in a sticky footer action area.</rule>
			<rule>Keep primary and secondary dialog actions anchored in the footer.</rule>
		</dialogRules>
	</frontend>
	</frontendPolicy>
```
