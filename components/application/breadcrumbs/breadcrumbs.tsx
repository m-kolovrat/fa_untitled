"use client";

import type { FC, ReactElement, ReactNode } from "react";
import { Children, createContext, isValidElement, useContext, useState } from "react";
import { ChevronRight, SlashDivider } from "@untitledui/icons";
import type { BreadcrumbsProps as AriaBreadcrumbsProps, LinkProps as AriaLinkProps } from "react-aria-components";
import { Breadcrumb as AriaBreadcrumb, Breadcrumbs as AriaBreadcrumbs, Button as AriaButton, Link as AriaLink } from "react-aria-components";
import { cx, sortCx } from "@/utils/cx";
import { isReactComponent } from "@/utils/is-react-component";

type BreadcrumbType = "text" | "text-line" | "button";
type BreadcrumbDivider = "chevron" | "slash";

const BreadcrumbsContext = createContext<{ type: BreadcrumbType; divider: BreadcrumbDivider }>({ type: "text", divider: "chevron" });

export const styles = sortCx({
    common: {
        list: "flex flex-wrap items-center",
        item: "flex items-center",
        link: "flex cursor-pointer items-center justify-center text-sm font-semibold whitespace-nowrap text-quaternary outline-focus-ring transition focus-visible:outline-2 focus-visible:outline-offset-2 *:data-icon:size-5 *:data-icon:text-fg-quaternary *:data-icon:transition",
    },
    types: {
        text: {
            root: "",
            list: "gap-1.5 md:gap-2",
            item: "gap-1.5 md:gap-2",
            shape: "rounded-xs",
            link: "hover:text-tertiary_hover hover:*:data-icon:text-fg-quaternary_hover",
            current: "cursor-default text-brand-secondary *:data-icon:text-fg-brand-primary",
        },
        "text-line": {
            root: "border-y border-secondary py-2",
            list: "gap-1.5 md:gap-2 md:pl-2",
            item: "gap-1.5 md:gap-2",
            shape: "rounded-xs",
            link: "hover:text-tertiary_hover hover:*:data-icon:text-fg-quaternary_hover",
            current: "cursor-default text-brand-secondary *:data-icon:text-fg-brand-primary",
        },
        button: {
            root: "",
            list: "gap-0.5 md:gap-1",
            item: "gap-0.5 md:gap-1",
            shape: "rounded-sm px-2 py-1",
            link: "hover:bg-primary_hover hover:text-tertiary_hover hover:*:data-icon:text-fg-quaternary_hover",
            current: "cursor-default bg-primary_hover text-tertiary_hover *:data-icon:text-fg-quaternary_hover",
        },
    },
    iconOnly: {
        text: "",
        "text-line": "",
        button: "p-1",
    },
    dividers: {
        chevron: "size-4 shrink-0 text-fg-quaternary",
        slash: "size-5 shrink-0 text-fg-quaternary",
    },
});

const Divider = () => {
    const { divider } = useContext(BreadcrumbsContext);
    const Icon = divider === "slash" ? SlashDivider : ChevronRight;

    return <Icon aria-hidden="true" className={styles.dividers[divider]} />;
};

interface BreadcrumbItemProps extends Omit<AriaLinkProps, "children" | "className"> {
    /** Leading icon. An item with an icon and no children renders icon-only — pass `aria-label`. */
    icon?: FC<{ className?: string }> | ReactNode;
    children?: ReactNode;
    className?: string;
}

const BreadcrumbItem = ({ icon: Icon, children, className, ...props }: BreadcrumbItemProps) => {
    const { type } = useContext(BreadcrumbsContext);
    const isIconOnly = Boolean(Icon) && !children;

    return (
        <AriaBreadcrumb className={cx(styles.common.item, styles.types[type].item)}>
            {({ isCurrent }) => (
                <>
                    <AriaLink
                        {...props}
                        className={cx(
                            styles.common.link,
                            styles.types[type].shape,
                            isCurrent ? styles.types[type].current : styles.types[type].link,
                            isIconOnly && styles.iconOnly[type],
                            className,
                        )}
                    >
                        {isReactComponent(Icon) && <Icon data-icon aria-hidden="true" />}
                        {isValidElement(Icon) && Icon}
                        {children}
                    </AriaLink>
                    {!isCurrent && <Divider />}
                </>
            )}
        </AriaBreadcrumb>
    );
};

/** Collapsed-items placeholder. Pressing it reveals the hidden breadcrumbs. */
const BreadcrumbEllipsis = ({ onPress }: { onPress: () => void }) => {
    const { type } = useContext(BreadcrumbsContext);

    return (
        <AriaBreadcrumb className={cx(styles.common.item, styles.types[type].item)}>
            <AriaButton
                aria-label="Show all breadcrumbs"
                onPress={onPress}
                className={cx(styles.common.link, styles.types[type].shape, styles.types[type].link)}
            >
                ...
            </AriaButton>
            <Divider />
        </AriaBreadcrumb>
    );
};

interface BreadcrumbsProps extends Omit<AriaBreadcrumbsProps<object>, "children" | "items" | "className"> {
    /** Visual style. `text-line` adds top and bottom borders. */
    type?: BreadcrumbType;
    /** Separator between items. */
    divider?: BreadcrumbDivider;
    /**
     * Collapse the middle items into "..." once there are more than this many.
     * The first `maxVisibleItems - 1` items and the current (last) item stay visible.
     */
    maxVisibleItems?: number;
    children: ReactNode;
    className?: string;
}

const BreadcrumbsRoot = ({ type = "text", divider = "chevron", maxVisibleItems, children, className, ...props }: BreadcrumbsProps) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const items = Children.toArray(children).filter(isValidElement) as ReactElement[];
    const shouldCollapse = !isExpanded && maxVisibleItems !== undefined && maxVisibleItems >= 2 && items.length > maxVisibleItems;

    const visibleItems = shouldCollapse
        ? [...items.slice(0, maxVisibleItems - 1), <BreadcrumbEllipsis key="ellipsis" onPress={() => setIsExpanded(true)} />, items[items.length - 1]]
        : items;

    return (
        <BreadcrumbsContext.Provider value={{ type, divider }}>
            <nav aria-label="Breadcrumbs" className={cx(styles.types[type].root, className)}>
                <AriaBreadcrumbs {...props} className={cx(styles.common.list, styles.types[type].list)}>
                    {visibleItems}
                </AriaBreadcrumbs>
            </nav>
        </BreadcrumbsContext.Provider>
    );
};

export const Breadcrumbs = BreadcrumbsRoot as typeof BreadcrumbsRoot & {
    Item: typeof BreadcrumbItem;
};
Breadcrumbs.Item = BreadcrumbItem;
