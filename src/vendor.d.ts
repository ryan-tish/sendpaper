// turndown-plugin-gfm ships no types; we only use the combined `gfm` plugin (tables, strikethrough).
declare module "turndown-plugin-gfm" {
  import type TurndownService from "turndown";
  export const gfm: TurndownService.Plugin;
}
