import type { ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HomeLine } from "@untitledui/icons";
import { Breadcrumbs } from "./breadcrumbs";

/**
 * Breadcrumbs built from the Figma "Breadcrumbs" component set
 * (Divider × Type × Breakpoint). The last item is the current page.
 *
 * The `Playground` is driven by the Controls panel. `Variants` reproduces the
 * Figma frame: every type × divider. Mobile vs desktop in Figma only differs by
 * spacing, which the component handles responsively (`md:`) — use the Mobile
 * viewport to compare.
 */

const types = ["text", "text-line", "button"] as const;
const dividers = ["chevron", "slash"] as const;

const Labeled = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-tertiary uppercase">{label}</span>
        {children}
    </div>
);

const Trail = () => [
    <Breadcrumbs.Item key="home" href="#" icon={HomeLine} aria-label="Home" />,
    <Breadcrumbs.Item key="settings" href="#">
        Settings
    </Breadcrumbs.Item>,
    <Breadcrumbs.Item key="workspace" href="#">
        Workspace
    </Breadcrumbs.Item>,
    <Breadcrumbs.Item key="members" href="#">
        Members
    </Breadcrumbs.Item>,
    <Breadcrumbs.Item key="team" href="#">
        Team
    </Breadcrumbs.Item>,
];

const meta = {
    title: "Application/Breadcrumbs",
    component: Breadcrumbs,
    tags: ["autodocs"],
    parameters: { layout: "centered" },
    args: { type: "text", divider: "chevron", maxVisibleItems: 3, children: null },
    argTypes: {
        type: { control: "select", options: types },
        divider: { control: "select", options: dividers },
        maxVisibleItems: { control: { type: "number", min: 2, max: 6 } },
        children: { control: false },
    },
    render: (args) => (
        <div className="w-120 max-w-full">
            <Breadcrumbs {...args}>{Trail()}</Breadcrumbs>
        </div>
    ),
} satisfies Meta<typeof Breadcrumbs>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Single interactive breadcrumb trail — edit props live in the Controls panel. Click "..." to expand. */
export const Playground: Story = {};

/** Every type × divider, matching the Figma component set. */
export const Variants: Story = {
    render: (args) => (
        <div className="flex w-120 max-w-full flex-col gap-10">
            {types.map((type) =>
                dividers.map((divider) => (
                    <Labeled key={`${type}-${divider}`} label={`${type} · ${divider}`}>
                        <Breadcrumbs {...args} type={type} divider={divider}>
                            {Trail()}
                        </Breadcrumbs>
                    </Labeled>
                )),
            )}
        </div>
    ),
};

/** No collapsing — every item visible. */
export const Expanded: Story = {
    args: { maxVisibleItems: undefined },
};
