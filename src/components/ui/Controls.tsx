import { styled } from "@/theme";

const BUTTON_SIZE = "44px";

export const ControlButton = styled("button", {
	boxSizing: "border-box",
	alignItems: "center",
	justifyContent: "center",
	display: "inline-flex",
	gap: "$sm",
	height: BUTTON_SIZE,
	minHeight: BUTTON_SIZE,
	maxHeight: BUTTON_SIZE,
	flexShrink: 0,
	padding: "0 10px",
	border: "none",
	borderRadius: "$inner",
	background: "$surface",
	color: "$text-primary",
	fontFamily: "$body",
	fontSize: "$small",
	fontWeight: "$normal",
	lineHeight: "28px",
	cursor: "pointer",
	whiteSpace: "nowrap",
	"&:hover": { background: "$soft" },
	"&:disabled": { opacity: 0.35, cursor: "not-allowed" },
	"& svg": { flexShrink: 0, width: "20px", height: "20px" },
	variants: {
		context: {
			panel: {
				background: "transparent",
				color: "inherit",
				"&:hover": { background: "$panel-hover" },
				"&[aria-pressed='true'], &[aria-current='page']": {
					background: "$panel-active",
					color: "$panel-active-text",
				},
			},
			editor: {
				background: "transparent",
				color: "$text-primary",
				"&:hover": { background: "$soft" },
			},
		},
		icon: {
			true: {
				width: BUTTON_SIZE,
				minWidth: BUTTON_SIZE,
				maxWidth: BUTTON_SIZE,
				flex: `0 0 ${BUTTON_SIZE}`,
				padding: 0,
			},
		},
		appearance: {
			ghost: { background: "transparent" },
			danger: {
				color: "$status-error",
				"&:hover:not(:disabled)": { background: "$status-error-soft" },
			},
		},
	},
	compoundVariants: [
		{
			context: "panel",
			icon: true,
			css: {
				background: "$panel-input",
				"&:disabled": {
					opacity: 1,
					background: "$panel-input",
					"& svg": { opacity: 0.35 },
				},
			},
		},
		{
			context: "panel",
			appearance: "danger",
			css: {
				color: "$panel-danger",
				"&:hover:not(:disabled)": { background: "$panel-hover" },
			},
		},
	],
});

export const IconButton = styled(ControlButton, {
	defaultVariants: { icon: true },
});

export const ControlPanel = styled("div", {
	display: "inline-flex",
	gap: "3px",
	padding: "$xs",
	border: "none",
	borderRadius: "$basic",
	background: "$panel",
	color: "$panel-text",
});

export const PanelButton = styled(ControlButton, {
	defaultVariants: { context: "panel" },
});

export const PanelIconButton = styled(PanelButton, {
	defaultVariants: { icon: true },
});

export const fieldSurfaceStyles = {
	border: "1px solid $border-default",
	borderRadius: "$inner",
	background: "$canvas",
	color: "$text-primary",
	fontFamily: "$number",
	fontSize: "$normal",
	lineHeight: "1.75rem",
} as const;

export const TextInput = styled("input", {
	...fieldSurfaceStyles,
	width: "100%",
	minWidth: 0,
	padding: "0.25rem $sm",
	minHeight: "2.375rem",
	"&:focus, &:focus-visible": { outline: "none" },
	"&::placeholder": { color: "$text-muted", opacity: 1 },
	variants: {
		context: {
			panel: {
				background: "$panel-input",
				color: "$panel-text",
				borderColor: "$panel-border",
				"&::placeholder": { color: "$panel-text", opacity: 1 },
			},
		},
	},
});
