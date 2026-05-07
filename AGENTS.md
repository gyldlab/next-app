<agentPolicy version="1.0">
  <problemSolving>
    <complexTask required="true">
      <step order="1">State the target, constraints, and affected surfaces.</step>
      <step order="2">Split the work into small units. Declare dependencies when units are not independent.</step>
      <step order="3">Solve and verify one unit at a time.</step>
      <step order="4">Synthesize only after the units are verified.</step>
    </complexTask>
    <assumptions required="true">
      <rule>Do not invent missing product rules, workflows, or acceptance criteria.</rule>
      <rule>If ambiguity changes scope, architecture, or behavior, clarify first. Otherwise state the assumption briefly.</rule>
    </assumptions>
  </problemSolving>

  <architecture>
    <runtime required="true">
      <rule>Prefer Bun-native APIs and Bun-first workflows.</rule>
      <rule>Use Bun.file, Bun.write, Bun.spawn, Bun.password, Bun.argv, Bun.$, and Bun test before Node-first alternatives.</rule>
      <rule>Do not add node: imports or Node-only dependencies when a Bun-native path exists.</rule>
      <rule>If a compatibility layer is unavoidable, isolate it in one utility instead of spreading it across the codebase.</rule>
    </runtime>
    <tests required="true">
      <rule>Keep automated tests under a dedicated test/ tree.</rule>
      <rule>Mirror the src/ structure inside test/ so ownership stays obvious.</rule>
      <rule>Do not leave test files in runtime folders unless the user explicitly asks for colocation.</rule>
    </tests>
    <types required="true">
      <rule>Keep shared types under src/types/ or a feature-owned types/ folder.</rule>
      <rule>Do not scatter shared interfaces, aliases, enums, or result shapes across random implementation files.</rule>
      <rule>Keep file-local types inline only when they are truly private to one file.</rule>
      <rule>Import shared types from one canonical types module instead of redefining them.</rule>
    </types>
    <reuse required="true">
      <rule>Search for existing commands, utilities, and template helpers before adding new ones.</rule>
      <rule>Extend existing abstractions when that keeps the CLI simpler.</rule>
      <rule>Avoid speculative abstractions.</rule>
    </reuse>
  </architecture>

  <execution>
    <scope required="true">
      <rule>Keep changes narrow and root-cause driven.</rule>
      <rule>Do not mix unrelated refactors into task work.</rule>
    </scope>
    <validation required="true">
      <step order="1">Validate the smallest affected slice first.</step>
      <step order="2">Run the narrowest relevant test, smoke, typecheck, or format check next.</step>
      <step order="3">Escalate to broader repo checks only after the touched slice passes.</step>
      <step order="4">If validation cannot run, state the blocker directly.</step>
    </validation>
  </execution>

  <priority>
    <item level="1">Correctness.</item>
    <item level="2">Bun-native implementation.</item>
    <item level="3">Clear test-folder and types-folder organization.</item>
    <item level="4">Minimal scope.</item>
    <item level="5">Verification.</item>
  </priority>

  <conflictResolution>
    <rule>Prefer correctness, then Bun-native choices, then organization rules, then convenience.</rule>
  </conflictResolution>
</agentPolicy>
