import { styled } from "@/theme";

export const StyledText = styled("span", {
	color: "$text-primary",

	variants: {
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
