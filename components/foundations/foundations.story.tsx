import type { ReactNode } from "react";
import { useState } from "react";
// Vite `?raw` gives us the token file as a string, so this overview stays in
// sync with styles/theme.css automatically — no hardcoded token lists.
import themeCss from "../../styles/theme.css?raw";

// Parse "--name: value;" declarations from the light-mode @theme block
// (everything before the dark-mode `@layer base` section).
const lightBlock = themeCss.split("@layer base")[0];
const decls = [...lightBlock.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)].map((m) => ({
    name: m[1],
    value: m[2].trim(),
}));

const colors = decls.filter((d) => d.name.startsWith("--color-"));
const brandRamp = colors.filter((d) => /^--color-brand-\d+$/.test(d.name));
const bgColors = colors.filter((d) => d.name.startsWith("--color-bg-"));
const textColors = colors.filter((d) => d.name.startsWith("--color-text-"));
const fgColors = colors.filter((d) => d.name.startsWith("--color-fg-"));
const borderColors = colors.filter((d) => d.name.startsWith("--color-border-"));
const shadows = decls.filter((d) => d.name.startsWith("--shadow-") && !d.name.includes("mockup"));

const durations = decls.filter((d) => d.name.startsWith("--transition-duration-"));
const easings = decls.filter((d) => d.name.startsWith("--ease-"));
const motionDefaults = decls.filter((d) => d.name.startsWith("--default-transition-"));

// Literal class strings so Tailwind's scanner generates them, and so this page shows the
// exact presets the components use rather than a lookalike.
const presets = [
    {
        name: "Popover",
        used: "Dropdown, Select, Tooltip, Date picker, nav account card, slim sidebar",
        enter: "duration-moderate ease-out animate-in fade-in slide-in-from-top-0.5",
        exit: "duration-fast ease-out animate-out fade-out slide-out-to-top-0.5",
    },
    {
        name: "Modal",
        used: "Modal overlay and panel",
        enter: "duration-slower ease-out animate-in fade-in zoom-in-95",
        exit: "duration-slow ease-out animate-out fade-out zoom-out-95",
    },
    {
        name: "Drawer",
        used: "Slideout menu, mobile nav",
        enter: "duration-slower ease-drawer animate-in fade-in slide-in-from-right",
        exit: "duration-slow ease-drawer animate-out fade-out slide-out-to-right",
    },
];

// Full literal class names so Tailwind's scanner generates them.
const typeScale = [
    "text-display-2xl",
    "text-display-xl",
    "text-display-lg",
    "text-display-md",
    "text-display-sm",
    "text-display-xs",
    "text-xl",
    "text-lg",
    "text-md",
    "text-sm",
    "text-xs",
];

const weights = [
    { cls: "font-normal", label: "Regular · 400" },
    { cls: "font-medium", label: "Medium · 500" },
    { cls: "font-semibold", label: "Semibold · 600" },
    { cls: "font-bold", label: "Bold · 700" },
];

const Page = ({ children }: { children: ReactNode }) => (
    <div className="min-h-screen w-full bg-primary p-8 text-primary">
        <div className="mx-auto flex max-w-7xl flex-col gap-14">{children}</div>
    </div>
);

const Section = ({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) => (
    <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold text-primary">{title}</h2>
            {hint && <p className="text-sm text-tertiary">{hint}</p>}
        </div>
        {children}
    </section>
);

const Swatch = ({ name, value }: { name: string; value: string }) => (
    <div className="flex flex-col gap-1.5">
        <div className="h-16 w-full rounded-md ring-1 ring-black/10 ring-inset" style={{ background: `var(${name})` }} />
        <span className="text-xs font-medium text-secondary">{name.replace("--color-", "")}</span>
        <span className="font-mono text-[11px] text-quaternary">{value}</span>
    </div>
);

const SwatchGrid = ({ items }: { items: { name: string; value: string }[] }) => (
    <div className="grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {items.map((d) => (
            <Swatch key={d.name} {...d} />
        ))}
    </div>
);

const ReplayButton = ({ onClick }: { onClick: () => void }) => (
    <button
        onClick={onClick}
        className="w-fit cursor-pointer rounded-full bg-primary px-3.5 py-2 text-xs font-medium text-secondary ring-1 ring-primary transition ring-inset hover:bg-primary_hover"
    >
        Replay
    </button>
);

const MotionRow = ({ name, value, children }: { name: string; value: string; children: ReactNode }) => (
    <div className="flex flex-col gap-2 border-b border-secondary py-4 md:flex-row md:items-center md:gap-8">
        <span className="w-52 shrink-0 font-mono text-xs text-secondary">{name}</span>
        <span className="w-52 shrink-0 font-mono text-[11px] text-quaternary">{value}</span>
        <div className="min-w-0 flex-1">{children}</div>
    </div>
);

export default {
    title: "Foundations",
    parameters: { layout: "fullscreen" },
};

export const Colors = () => (
    <Page>
        <Section title="Brand ramp" hint="FA blue — canonical ramp (25–950) from the Figma “Untitled UI x Fa” variables.">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6 md:grid-cols-12">
                {brandRamp.map((d) => (
                    <Swatch key={d.name} {...d} />
                ))}
            </div>
        </Section>
        <Section title="Background" hint="bg-* — every token references the brand/neutral primitives.">
            <SwatchGrid items={bgColors} />
        </Section>
        <Section title="Text" hint="text-* semantic colors.">
            <SwatchGrid items={textColors} />
        </Section>
        <Section title="Foreground / icons" hint="fg-* — icons and non-text foreground.">
            <SwatchGrid items={fgColors} />
        </Section>
        <Section title="Border" hint="border-* — also used for ring-* and outline-*.">
            <SwatchGrid items={borderColors} />
        </Section>
    </Page>
);

export const Typography = () => (
    <Page>
        <Section title="Text styles" hint="Type scale from the --text-* tokens. UI font: Inter.">
            <div className="flex flex-col">
                {typeScale.map((cls) => (
                    <div key={cls} className="flex flex-col gap-1 border-b border-secondary py-4 md:flex-row md:items-baseline md:gap-8">
                        <span className="w-40 shrink-0 font-mono text-xs text-quaternary">{cls}</span>
                        <span className={`${cls} truncate font-semibold text-primary`}>The quick brown fox</span>
                    </div>
                ))}
            </div>
        </Section>
        <Section title="Weights" hint="Inter weights used across the system.">
            <div className="flex flex-col gap-3">
                {weights.map((w) => (
                    <div key={w.cls} className="flex items-baseline gap-8">
                        <span className="w-40 shrink-0 font-mono text-xs text-quaternary">{w.cls}</span>
                        <span className={`${w.cls} text-xl text-primary`}>{w.label}</span>
                    </div>
                ))}
            </div>
        </Section>
    </Page>
);

export const Effects = () => (
    <Page>
        <Section title="Shadows & effects" hint="--shadow-* tokens (elevation + skeuomorphic).">
            <div className="grid grid-cols-2 gap-6 rounded-2xl bg-secondary p-8 sm:grid-cols-3 md:grid-cols-4">
                {shadows.map((d) => (
                    <div key={d.name} className="flex flex-col items-center gap-3">
                        <div className="h-24 w-full rounded-xl bg-primary" style={{ boxShadow: `var(${d.name})` }} />
                        <span className="text-center text-xs font-medium text-secondary">{d.name.replace("--shadow-", "shadow-")}</span>
                    </div>
                ))}
            </div>
        </Section>
    </Page>
);

export const Motion = () => {
    const [run, setRun] = useState(0);

    return (
        <Page>
            <Section
                title="Hover is instant — by design"
                hint="Not an omission. Every hover and state change resolves in 0ms with no easing, which makes the interface feel more responsive. The bare `transition` utility carries no duration of its own — it inherits the two defaults below, so retiming every hover in the library is a one-line change in theme.css."
            >
                <div className="flex flex-col gap-4">
                    {motionDefaults.map((d) => (
                        <div key={d.name} className="flex items-baseline gap-8">
                            <span className="w-52 shrink-0 font-mono text-xs text-secondary">{d.name}</span>
                            <span className="font-mono text-[11px] text-quaternary">{d.value}</span>
                        </div>
                    ))}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <span className="text-sm text-tertiary">Hover these — the change lands with no fade:</span>
                        <span className="cursor-default rounded-full bg-brand-solid px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-solid_hover">
                            Primary
                        </span>
                        <span className="cursor-default rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-secondary ring-1 ring-primary transition ring-inset hover:bg-primary_hover">
                            Secondary
                        </span>
                    </div>
                </div>
            </Section>

            <Section
                title="Durations"
                hint="For movement and overlays only — never hover. Exits are always one step faster than enters: the user has already committed, so the interface should get out of the way."
            >
                <ReplayButton onClick={() => setRun((n) => n + 1)} />
                <div className="flex flex-col">
                    {durations.map((d) => (
                        <MotionRow key={d.name} name={d.name.replace("--transition-duration-", "duration-")} value={d.value}>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-quaternary">
                                <div
                                    key={run}
                                    className="h-full w-full origin-left rounded-full bg-fg-brand-primary"
                                    style={{ animation: `fnd-sweep var(${d.name}) linear` }}
                                />
                            </div>
                        </MotionRow>
                    ))}
                </div>
            </Section>

            <Section
                title="Easing"
                hint="Tailwind's built-in ease-out and ease-in-out are overridden with stronger curves — the defaults are too weak to read as intentional. ease-linear stays Tailwind's own: correct for colour interpolation and progress. ease-in is deliberately unused, because starting slow delays the exact moment the user is watching."
            >
                <ReplayButton onClick={() => setRun((n) => n + 1)} />
                <div className="flex flex-col">
                    {easings.map((d) => (
                        <MotionRow key={d.name} name={d.name.replace("--ease-", "ease-")} value={d.value}>
                            <div className="relative h-8 w-full rounded-md bg-secondary">
                                <div
                                    key={run}
                                    className="absolute top-1.5 size-5 rounded-full bg-fg-brand-primary"
                                    style={{ animation: `fnd-travel 1.2s var(${d.name}) infinite alternate` }}
                                />
                            </div>
                        </MotionRow>
                    ))}
                </div>
            </Section>

            <Section
                title="Overlay presets"
                hint="Six surfaces used to carry six different timings. They now share three presets — these are the literal class strings the components use."
            >
                <ReplayButton onClick={() => setRun((n) => n + 1)} />
                <div className="grid gap-6 md:grid-cols-3">
                    {presets.map((p) => (
                        <div key={p.name} className="flex flex-col gap-3 rounded-xl bg-secondary p-5">
                            <div className="flex flex-col gap-1">
                                <span className="text-sm font-semibold text-primary">{p.name}</span>
                                <span className="text-xs text-tertiary">{p.used}</span>
                            </div>
                            <div className="flex h-28 items-center justify-center overflow-hidden rounded-lg">
                                <div key={run} className={`${p.enter} flex size-20 items-center justify-center rounded-lg bg-primary shadow-lg`}>
                                    <span className="text-xs text-quaternary">enter</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 font-mono text-[11px] leading-relaxed text-quaternary">
                                <span>in · {p.enter.split(" ").slice(0, 2).join(" ")}</span>
                                <span>out · {p.exit.split(" ").slice(0, 2).join(" ")}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Section>

            <Section
                title="Deliberately off-scale"
                hint="Two progress fills stay at 75ms because they track data rather than interaction — instant would advance them in visible jumps. The toggle knob keeps duration-moderate because its travel is the state change itself. Under prefers-reduced-motion every overlay degrades to a plain fade rather than disappearing entirely."
            >
                <div />
            </Section>

            <style>{`
                @keyframes fnd-sweep { from { transform: scaleX(0); } to { transform: scaleX(1); } }
                @keyframes fnd-travel { from { left: 0.375rem; } to { left: calc(100% - 1.625rem); } }
            `}</style>
        </Page>
    );
};
