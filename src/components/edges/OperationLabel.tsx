import type { ChangeEvent, FC } from "react";
import { styled } from "@/theme";

export type Operation = "+" | "-" | "*" | "/";

type OperationLabelProps = {
	value: Operation | null;
	onChange: (value: Operation | null) => void;
};

const StyledSelect = styled("select", {
	fontSize: "$normal",
	padding: "$sm",
	borderRadius: "$basic",
	border: "1px solid #ccc",
	background: "white",
});

export const OperationLabel: FC<OperationLabelProps> = ({
	value,
	onChange,
}) => {
	const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
		const next = e.currentTarget.value as Operation | null;
		onChange(next);
	};

	return (
		<StyledSelect
			value={value ?? undefined}
			onChange={handleChange}
			className="nodrag nowheel nopan"
		>
			<option value={"+"}>+</option>
			<option value={"-"}>-</option>
			<option value={"*"}>*</option>
			<option value={"/"}>/</option>
		</StyledSelect>
	);
};
