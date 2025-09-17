import { styled } from "@/theme";

export const StyledText = styled("span", {
	color: "$text-primary",

	variants: {
		color: {
			primary: { color: "$text-primary" },
			inverse: { color: "$text-inverse" },
			muted: { color: "$text-muted" },
		},
		variant: {
			small: {
				fontSize: "$small",
			},
			normal: {
				fontSize: "$normal",
			},
			large: {
				fontSize: "$large",
			},
			heading: {
				fontSize: "$header",
			},
		},
	},

	defaultVariants: {
		variant: "normal",
	},
});
