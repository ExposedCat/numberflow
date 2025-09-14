import type { FC } from "react";
import { Button } from "@/components/ui/Button.tsx";
import { Box } from "../ui/Box";
import { StyledText } from "../ui/Typography";

export const Root: FC = () => {
	return (
		<Box column center>
			<StyledText variant="heading">React Essential</StyledText>
			<Button label="Click me" />
		</Box>
	);
};
