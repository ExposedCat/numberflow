import { styled } from "@/theme";

export const Box = styled("div", {
	display: "flex",

	variants: {
		column: {
			true: {
				flexDirection: "column",
			},
		},
		center: {
			true: {
				justifyContent: "center",
				alignItems: "center",
			},
		},
	},

	defaultVariants: {
		column: false,
		center: false,
	},
});
