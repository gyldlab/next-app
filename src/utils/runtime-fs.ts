import type { Dirent } from "fs";
import { chmod, cp, lstat, mkdir, readdir, readlink, rename, rm, symlink } from "fs/promises";

export { chmod, cp, lstat, mkdir, readdir, readlink, rename, rm, symlink };
export type { Dirent };

export async function readTextFile(path: string): Promise<string> {
  return Bun.file(path).text();
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await Bun.write(path, content);
}
