<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

## Agent Operating Policy (XML)

```xml
	<agentPolicy version="1.1">
	<problemSolving>
		<complexProblemDecomposition required="true" trigger="complex-task">
			<trigger>Apply this workflow whenever the task is complex.</trigger>
			<atomSteps>
				<step order="1">State the logical component.</step>
				<step order="2">Validate independence from other atoms; if dependent, explicitly declare dependency.</step>
				<step order="3">Verify correctness of the atom before proceeding.</step>
			</atomSteps>
			<synthesis>After all atoms are validated and verified, synthesize them into the final answer, implementation, or recommendation.</synthesis>
		</complexProblemDecomposition>
		<assumptionHandling required="true">
			<rule>Do not invent missing business rules, workflows, or acceptance criteria.</rule>
			<rule>If missing information has material impact, clarify first; otherwise state the assumption explicitly.</rule>
		</assumptionHandling>
	</problemSolving>

	<architecture>
		<principles required="true" scope="project">
			<principle>DRY (Do Not Repeat Yourself)</principle>
			<principle>Component reusability</principle>
		</principles>
		<focus>These principles are core focus areas at project level.</focus>
		<reuseWorkflow required="true">
			<step order="1">Search for existing reusable components, hooks, utilities, schemas, or server modules before creating new ones.</step>
			<step order="2">Extend, compose, or parameterize existing modules when practical.</step>
			<step order="3">Create new abstractions only when they improve clarity, reuse, or maintainability.</step>
		</reuseWorkflow>
		<images required="true">
			<rule>For SVG sources, add the unoptimized prop to next/image — Next.js auto-applies this when src ends in .svg, but explicit is required for clarity.</rule>
			<rule>Set width and height to match the SVG's actual aspect ratio. Do not use equal or arbitrary values; mismatched intrinsic dimensions cause a browser aspect-ratio warning.</rule>
			<rule>Do not use the priority prop — deprecated in Next.js 16. Use loading="eager" for above-fold images instead.</rule>
			<rule>For light/dark SVG variants, use CSS display toggling (dark:hidden / dark:block). Do not conditionally render with JS.</rule>
		</images>
	</architecture>

	<clarificationPolicy>
		<whenToAskQuestions>
			<condition>User request is not concrete or is ambiguous.</condition>
			<condition>Requested functionality can affect multiple areas or modules.</condition>
			<condition>Office-related workflow requests have broad cross-feature impact.</condition>
			<condition>Acceptance criteria, business rules, or data flow are materially unclear.</condition>
		</whenToAskQuestions>
		<action required="true">Use the askQuestions tool to gather missing details before implementation and proceed confidently after clarification.</action>
	</clarificationPolicy>

	<executionPolicy>
		<scopeControl required="true">
			<rule>Do not drift into unrelated refactors or speculative changes.</rule>
			<rule>Fix root causes when practical instead of applying surface-level patches.</rule>
			<rule>Keep changes minimal, targeted, and consistent with existing project patterns.</rule>
		</scopeControl>
		<qualityGates required="true">
			<rule>Pre-commit quality gates are blocking: staged-file formatting/lint fixes, repo lint with zero warnings, strict typecheck, strict file-size audit, and build must all pass before commit.</rule>
			<rule>Do not bypass structural quality gates with eslint-disable comments, rule downgrades, or new broad exemptions unless the user explicitly approves a justified exception.</rule>
		</qualityGates>
		<warningResolution required="true">
			<rule>When file-size, max-lines, or max-lines-per-function issues appear, preserve behavior by extracting one responsibility at a time into smaller modules, hooks, helpers, or leaf components instead of rewriting the flow wholesale.</rule>
			<rule>Keep existing public props, return shapes, side effects, and data flow stable while decomposing. Move render branches, derived state, loaders, action factories, and form sections out of large files before changing logic.</rule>
			<rule>For dashboard route work, keep extractions colocated under src/app/dashboard/_components and src/app/dashboard/_types unless the abstraction is genuinely reused outside the route.</rule>
			<rule>For type-management issues, tighten or reuse existing shared types and move repeated interfaces into dedicated types modules. Do not add duplicate ad-hoc type definitions to silence lint pressure.</rule>
			<rule>After each substantive extraction, validate the touched slice first, then rerun the broader lint, typecheck, and build gates before concluding the task.</rule>
		</warningResolution>
		<validation required="true">
			<step order="1">Inspect existing code and patterns before editing.</step>
			<step order="2">Validate impacted areas after implementation using relevant checks, tests, or direct reasoning.</step>
			<step order="3">If validation cannot be executed, state the limitation explicitly.</step>
		</validation>
	</executionPolicy>

	<instructionPriority>
		<priority level="1">If the request is ambiguous, under-specified, multi-module, or office-related with broad impact, use askQuestions before implementation.</priority>
		<priority level="2">Load and follow the most relevant skill guidance before implementation when a domain-specific skill applies.</priority>
		<priority level="3">If the task is complex, apply atomic problem decomposition before solving.</priority>
		<priority level="4">At project level, preserve DRY and component reusability as core architecture constraints.</priority>
		<priority level="5">Validate the impacted area before concluding the task.</priority>
	</instructionPriority>

	<conflictResolution>
		<rule>When multiple rules apply, resolve them in this order: clarify first, load the relevant skill, decompose if complex, implement within architecture constraints, then validate.</rule>
	</conflictResolution>
	</agentPolicy>
```
