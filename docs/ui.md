# UI Coding Standards

## Rule: shadcn/ui components only

All UI in this project must be built exclusively from [shadcn/ui](https://ui.shadcn.com/) components. **Do not create custom UI components.**

This applies to every piece of visible UI: buttons, inputs, dialogs, cards, tables, badges, tooltips, navigation, forms — everything. If a shadcn/ui component exists for the job, use it.

## Adding components

Use the CLI to install any component you need:

```bash
npx shadcn@latest add <component-name>
```

Components are installed into `src/components/ui/`. Do not edit these files — they are owned by shadcn and may be re-generated.

The project configuration is in `components.json` (style: `radix-nova`, icon library: `lucide`).

## What is allowed

- shadcn/ui components from `@/components/ui/`
- Lucide icons (already configured as the icon library)
- Tailwind CSS utility classes applied directly to shadcn components via `className`
- shadcn/ui composition patterns (e.g., nesting `CardHeader` inside `Card`)

## What is not allowed

- Hand-written JSX components that replicate UI primitives (buttons, inputs, modals, etc.)
- Third-party component libraries (MUI, Chakra, Ant Design, etc.)
- Raw HTML elements styled with Tailwind to substitute for a shadcn/ui component that already covers the use case
- Copied/adapted shadcn source code placed outside `src/components/ui/`

## Rationale

A single component system keeps the design consistent, reduces maintenance surface, and avoids conflicting styling patterns across contributors.
