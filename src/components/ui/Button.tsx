import type { FC } from "react";
import { styled } from "@/theme";

type ButtonProps = {
	label: string;
	onClick?: () => void;
};

const StyledButton = styled("input", {
	color: "$text-inverse",
	borderRadius: "$basic",
	border: "none",
	padding: "$sm",
	cursor: "pointer",

	variants: {
		variant: {
			primary: {
				backgroundColor: "$interactive-primary",
				"&:hover": {
					backgroundColor: "$interactive-primary-hover",
				},
			},
		},
	},

	defaultVariants: {
		variant: "primary",
	},
});

export const Button: FC<ButtonProps> = ({ label, onClick }) => {
	return <StyledButton type="button" onClick={onClick} value={label} />;
};
