## Frontend Agent Policy (shadcn/ui)

```xml
	<frontendPolicy addon="shadcn">
	<skillUsage>
		<rule required="true">When UI work involves shadcn patterns or components, load and follow the shadcn skill before implementation.</rule>
	</skillUsage>

	<frontend>
		<uiFramework required="true" scope="all-ui">Use native shadcn components for all UI implementations whenever applicable.</uiFramework>
		<compositionRule required="true">Prefer composing existing shadcn primitives and existing project components before introducing custom UI patterns.</compositionRule>
		<dialogRules required="true">
			<rule>For dialog-related functionality, always use shadcn dialog patterns with a sticky footer dialog action area.</rule>
			<rule>Keep primary and secondary dialog actions anchored in the footer so actions stay visible and consistent.</rule>
		</dialogRules>
	</frontend>

	<instructionPriority>
		<priority level="1">Load and follow the shadcn skill before implementing UI work.</priority>
		<priority level="2">Use native shadcn components before introducing custom UI patterns.</priority>
	</instructionPriority>
	</frontendPolicy>
```
