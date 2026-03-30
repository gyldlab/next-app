import pc from "picocolors";
import { getAddons, getBaseTemplates } from "../core/templates.js";

export async function runListTemplatesCommand(): Promise<void> {
  const templates = await getBaseTemplates();
  const addons = await getAddons();

  if (templates.length === 0 && addons.length === 0) {
    console.log(pc.yellow("No templates or add-ons were found in templates/."));
    return;
  }

  if (templates.length > 0) {
    console.log("Base templates:\n");
    for (const template of templates) {
      const defaultTag = template.default ? " (default)" : "";
      console.log(`- ${template.id}${defaultTag}`);
      console.log(`  ${template.name}`);
      console.log(`  ${template.description}\n`);
    }
  }

  if (addons.length > 0) {
    console.log("Add-ons:\n");
    for (const addon of addons) {
      console.log(`- ${addon.id}`);
      console.log(`  ${addon.name}`);
      console.log(`  ${addon.description}\n`);
    }
  }
}
