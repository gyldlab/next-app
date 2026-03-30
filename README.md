# create-gyld-next

CLI foundation for scaffolding organization-approved Next.js projects from your own templates.

## Package Information

- **Package name**: `@gyldlab/create-next-app` (npm package)
- **Command name**: `create-gyld-next` (CLI command)
- **Repository**: `gyldlab/next-app`
- **License**: MIT

## Why this setup

- Uses TypeScript with strict settings for maintainable CLI code.
- Uses a modular command structure so you can grow from one template to many.
- Supports base templates and optional add-ons.
- Uses Prettier for formatting and style consistency.
- Keeps templates inside this repository for versioned, auditable defaults.
- Produces a dist output and bin entry that can be published to npm.

## Local development

Install dependencies:

```bash
bun install
```

Run the CLI in development mode:

```bash
bun run dev -- create my-app
bun run dev -- create my-app --template next --addons gsap-lenis
```

Disable the startup banner when needed:

```bash
GYLDLAB_CLI_NO_BANNER=1 bun run dev -- create my-app
```

Set custom banner brand text:

```bash
GYLDLAB_CLI_BRAND="YOUR BRAND" bun run dev -- create my-app
```

Set custom banner font (figlet font name):

```bash
GYLDLAB_CLI_FONT="ANSI Shadow" bun run dev -- create my-app
```

List templates:

```bash
bun run dev -- templates
```

Build the CLI:

```bash
bun run build
```

Type-check, lint, test:

```bash
bun run typecheck
bun run lint
bun run test
```

Run the GSAP/skills scaffold smoke test:

```bash
bun run smoke:gsap-lenis
```

## Usage examples

After building, run from dist:

```bash
node dist/cli.js my-app
node dist/cli.js my-app --template next
node dist/cli.js my-app --template next --addons gsap-lenis
node dist/cli.js templates
```

If this package is published, users can run:

```bash
npx @gyldlab/create-next-app my-app
# Or install globally
npm install -g @gyldlab/create-next-app
create-gyld-next my-app
```

## Publishing to npm

To publish this package to npm:

1. Build the package:
   ```bash
   bun run build
   ```

2. Login to npm:
   ```bash
   npm login
   ```

3. Publish (first time):
   ```bash
   npm publish --access public
   ```

4. Publish updates:
   ```bash
   # Update version in package.json first
   npm publish
   ```

Users will then be able to run:
```bash
npx @gyldlab/create-next-app my-app
```

## Add your own templates

Add base templates under `templates/base/`.
Each base template folder should include a `template.json` manifest file:

```json
{
  "id": "next",
  "name": "Your Template Name",
  "description": "Short description of when to use this template.",
  "default": true
}
```

Add-ons live under `templates/addons/` with an `addon.json` manifest file.

## Project structure

```text
src/
	cli.ts
	commands/
	core/
	utils/
templates/
	base/
		next/
			template.json
			...project files
	addons/
		gsap-lenis/
			addon.json
			files/
```
