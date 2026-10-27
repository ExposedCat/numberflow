import type { FC } from "react";
import { ControlButton } from "./Controls";

type ButtonProps = {
	label: string;
	onClick?: () => void;
};

export const Button: FC<ButtonProps> = ({ label, onClick }) => (
	<ControlButton type="button" onClick={onClick}>
		{label}
	</ControlButton>
);
